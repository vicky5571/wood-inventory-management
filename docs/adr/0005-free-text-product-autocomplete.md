# ADR-0005: Free-Text Autocomplete Over Master Catalog for Production Products

**Date:** 2026-10-21
**Status:** Accepted
**Deciders:** Owner + AI pair session (client Q4 confirmed)

---

## Context

Sawmill production records capture the output product of each production run (e.g., "Papan 2x20x400cm", "Balok 6x12x300cm", "Usuk 4x6x400cm"). The question: should output product names be:

1. Selected from a predefined master catalog (`Product` entity with structured dimensions), OR
2. Entered as free text with autocomplete from history, OR
3. Fully free text with no autocomplete

Client was asked (Q4): "Produk hasil gergajian punya daftar standar atau tiap produksi beda-beda ukuran?"
Answer: **"Bisa berbeda-beda."** → No standardized dimensions; varies per batch.

Similar question applies to `StockSortingRecord.reason` field ("regrade A→B", "pindah TPK Timur", "konsolidasi lot kecil"). Reasons are highly contextual and vary by operator.

---

## Decision

Use **free-text input with history-learned autocomplete** for both:
- `SawmillProductionRecord.outputProduct`
- `StockSortingRecord.reason`

Autocomplete suggestions are **derived at render time** from distinct historical values in the respective record arrays. No separate master catalog entity. No forced normalization.

Pattern follows existing `SpeciesCombobox.tsx`:

```ts
// Hook provides memoized suggestion list
const { records: productionRecords } = useProductionRecords();
const productSuggestions = useMemo(() => {
  const set = new Set<string>();
  for (const r of productionRecords) {
    if (r.outputProduct?.trim()) set.add(r.outputProduct.trim());
  }
  return Array.from(set).sort();
}, [productionRecords]);

// Component uses <datalist> or custom dropdown with free-text input
<ProductSuggestionCombobox
  value={formData.outputProduct}
  onChange={(val) => setFormData({ ...formData, outputProduct: val })}
  suggestions={productSuggestions}
/>
```

---

## Rejected Alternatives

### Alternative A: `Product` master entity with structured fields
```ts
interface Product {
  id: string;
  name: string;              // "Papan"
  thicknessCm: number;       // 2
  widthCm: number;           // 20
  lengthCm: number;          // 400
  gradeOptions: string[];
}
```
**Rejected because:**
- Client explicitly stated dimensions vary per batch (Q4). A master catalog forces operators to either create new master entries for every batch (friction) or pick an inexact match (data corruption).
- Introduces CRUD surface, UI, migration — significant effort for no stated business need.
- Does not solve the actual pain point (output product tracking); only adds administrative overhead.
- YAGNI violation.

### Alternative B: Fully free text, no autocomplete
**Rejected because:**
- Causes fragmentation: "Papan 2x20x400cm" vs "Papan 2x20x400" vs "papan 2x20x400cm" vs "PAPAN 2x20x400".
- No learning across sessions — operators retype same values repeatedly.
- Reporting becomes impossible due to typo variants.

### Alternative C: Hybrid — autocomplete + optional structured master
**Rejected because:**
- Doubles implementation surface (both free-text and master paths).
- Operators would need training on when to use which.
- Premature optimization — if master catalog becomes needed, migration from history is straightforward (de-duplicate + normalize distinct values).

---

## Consequences

### Positive
- Zero schema overhead — one text field, no additional entity.
- Operators enter data in their natural vocabulary.
- Autocomplete prevents most typo fragmentation (suggestions appear on 1st character).
- Pattern is identical for `outputProduct` and `reason`, enabling code reuse.
- Reuses proven `SpeciesCombobox.tsx` pattern already understood by codebase.
- Easy migration path IF master catalog becomes necessary: de-duplicate historical values → create master entries → add nullable FK column.

### Negative / Trade-offs
- Minor typo variants still possible (first occurrence creates the "canonical" entry).
  - Mitigation: Case-insensitive deduplication in suggestion list. Operators learn to prefer existing suggestions.
- Cannot query by structured dimension (e.g., "all production with thickness > 3cm").
  - Mitigation: Not currently a stated requirement. If needed, migrate to master catalog via future ADR.
- Autocomplete scope is per-tenant, per-field — no cross-tenant catalog.
  - Accepted: tenant isolation preserved; cross-tenant catalogs raise multi-tenant data leakage concerns.

### Follow-up Obligations
- Monitor operationally for typo fragmentation. If distinct product names exceed ~50 per tenant with clear duplicates, consider ADR for master catalog migration.
- Keep normalization logic (`.trim()`, case-insensitive dedupe) consistent between `outputProduct` and `reason` autocomplete to ease future refactoring.

---

## References

- Spec: `docs/superpowers/specs/2026-10-21-production-and-sorting-design.md` Section 7.5
- Plan: `docs/superpowers/plans/2026-10-21-production-and-sorting.md`
- Related: `src/components/ledger/SpeciesCombobox.tsx` (reference implementation pattern)
