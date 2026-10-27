# ADR-0019: Species Name Canonical Sync — SSOT is `DEFAULT_TIMBER_SPECIES`

**Date:** 2026-10-28
**Status:** Accepted
**Deciders:** Owner + AI pair session

---

## Context

`lookupPriceForRecord()` performs exact case-insensitive string matching on `woodSpecies`.
The combobox on the receiving input form (`SpeciesCombobox`) reads its options from
`DEFAULT_TIMBER_SPECIES` in `src/utils/timber-species.ts`. The tabel harga form
(`PriceFormModal`) reads its dropdown from `TIMBER_SPECIES_CATALOGUE`, whose `commonName`
fields are already aligned with `DEFAULT_TIMBER_SPECIES`.

Despite this, four mismatches were found in the DB after a previous session did partial
fixes (wrong direction): `Jati / Teak` vs `Teak / Jati`, `Mahoni` vs `Mahoni / Mahogany`,
`Sengon / Albasia` vs `Sengon / Albizia`, `Keruing (克鲁)` vs `Keruing (克隆木)`. These
caused `lookupPriceForRecord` to return `matched: false` for 7 out of 13 combobox species
even when entries existed, silently falling through to "pending pricing".

There is no mechanism preventing a future operator or developer from saving a price entry
with a species name that deviates from the canonical list.

---

## Decision

`DEFAULT_TIMBER_SPECIES` in `src/utils/timber-species.ts` is the single source of truth
for all species name strings in the system. Any price entry written to the DB must use
exactly one of these names (or a custom free-text species not in the catalogue).

Enforcement is two-layer:
1. **`savePriceEntryToDb`** — after resolving `woodSpeciesName`, if the name matches a
   `TIMBER_SPECIES_CATALOGUE` entry case-insensitively, it is normalized to the canonical
   `commonName` before insertion. Custom species (no match in catalogue) are stored as-is.
2. **`PriceFormModal`** — the species select is already driven by `TIMBER_SPECIES_CATALOGUE`,
   so `woodSpecies` is always sourced from `commonName`. No UI change needed.

```ts
// In savePriceEntryToDb — normalization step (add before INSERT)
import { TIMBER_SPECIES_CATALOGUE } from '../../utils/timber-species.ts';

const canonical = TIMBER_SPECIES_CATALOGUE.find(
  (s) => s.commonName.toLowerCase() === woodSpeciesName.toLowerCase()
);
const normalizedName = canonical ? canonical.commonName : woodSpeciesName;
// use normalizedName for wood_species_name column
```

---

## Rejected Alternatives

### Alternative A: Fuzzy / partial matching in `lookupPriceForRecord`
**Rejected because:** Fuzzy matching hides data inconsistency instead of preventing it.
Two suppliers with similar-but-different species names would silently merge. The contract
is that exact names must match — this is a data quality problem, not a lookup strategy problem.

### Alternative B: Add DB CHECK constraint on `wood_species_name`
**Rejected because:** DB schema changes require migration coordination and would break
custom/free-text species that legitimate users enter. Normalization at the application
layer is sufficient and more flexible.

### Alternative C: Validate `woodSpecies` in `PriceFormModal` submit handler
**Rejected because:** The modal's select is already bound to `TIMBER_SPECIES_CATALOGUE`
— the problem can only arise via the persistence layer (seed data, direct API calls,
or future code paths). Validation in the modal adds noise with no new protection.

---

## Consequences

### Positive
- `lookupPriceForRecord` is guaranteed to match for any species that has an entry, as long
  as the receiving combobox and the price DB both source names from the same catalogue.
- Silent pricing failures become impossible for catalogue species.
- Backward compatible: custom free-text species are preserved as-is.

### Negative / Trade-offs
- One extra catalogue scan per `savePriceEntryToDb` call (O(13) — negligible).
- If `TIMBER_SPECIES_CATALOGUE` is updated in the future (new species added or renamed),
  existing DB rows with the old name will again fall out of sync. A migration script
  should be run whenever catalogue names change. This is documented as a follow-up obligation.

### Follow-up Obligations
- Whenever `DEFAULT_TIMBER_SPECIES` or `TIMBER_SPECIES_CATALOGUE` is edited, run a DB
  patch updating any rows with the old `wood_species_name` to the new canonical name.
- Consider adding a `scripts/sync-species-names.ts` utility for this purpose (out of scope here).

---

## References

- Spec: `docs/superpowers/specs/2026-10-28-species-name-sync-design.md`
- Plan: `docs/superpowers/plans/2026-10-28-species-name-sync.md`
- Related ADRs: ADR-0018 (price autofill — depends on this sync being correct)
- Root cause session: 4 DB mismatches diagnosed 2026-10-28, fixed via direct SQL UPDATE
