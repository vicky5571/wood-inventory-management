# ADR-0003: Loose String-Match Linkage for Contract-Record Association

**Date:** 2026-10-21
**Status:** Accepted
**Deciders:** Owner + AI pair session (client Q5=C confirmed)

---

## Context

With the introduction of the `PerhutaniContract` entity, we must decide how `WoodReceivingRecord` associates with contracts.

Existing data model: `WoodReceivingRecord.contractNumber: string` is a flat text field populated by operators during receiving entry. Historical records contain thousands of entries where `contractNumber` ranges from formal codes ("CTR-2026-01") to informal references ("Kontrak Perhutani Mei") to blank strings (non-contract purchases).

Not all receiving records are tied to Perhutani contracts — many are from private suppliers (toke, kayu rakyat) where no formal contract exists. These records still need the `contractNumber` field for free-text reference (e.g., PO numbers, note references).

Client (Q5): preferred option C — "dropdown untuk Perhutani, free-text untuk non-Perhutani".

---

## Decision

**Keep `WoodReceivingRecord.contractNumber: string` as a flat text field.** Do NOT add a foreign key `contractId` column to the receiving records table.

Association between a receiving record and a `PerhutaniContract` is derived at query time via case-insensitive string matching on normalized `contractNumber`:

```ts
export function computeFulfillmentSummary(
  contract: PerhutaniContract,
  // ...
  receivingRecords: WoodReceivingRecord[],
  today: Date = new Date()
): ContractFulfillmentSummary {
  const normContractNo = (contract.contractNumber || '').trim().toLowerCase();
  const matchingRecords = receivingRecords.filter((r) =>
    (r.contractNumber || '').trim().toLowerCase() === normContractNo
  );
  // ...
}
```

Receiving form uses `ContractCombobox` (HTML `<datalist>` element) which provides:
- **Dropdown suggestions** for Perhutani contracts (user picks → auto-populate `contractNumber` + optional supplier)
- **Free-text input fallback** for non-Perhutani records (user types any value)

---

## Rejected Alternatives

### Alternative A: Add FK column `contract_id` to `wood_receiving_records`
**Rejected because:**
- Requires migration of all historical records (impossible to accurately back-fill FKs from free-text strings).
- Breaks records whose `contractNumber` doesn't match any `PerhutaniContract` (non-Perhutani deals).
- Creates two sources of truth (FK + still-needed string field for non-FK records).
- Cascade behavior on contract deletion becomes problematic.

### Alternative B: Separate `contract_record_links` join table
**Rejected because:**
- Over-engineered for a 1-to-N relationship with no additional metadata needed.
- Requires maintaining link records separately from both parent entities.
- Does not solve the historical back-fill problem.

### Alternative C: Enforce `contractNumber` must match a `PerhutaniContract` or be empty
**Rejected because:**
- Breaks the non-Perhutani use case where `contractNumber` holds informal references (PO numbers, note refs).
- Would require blocking saves until matching contract exists, hostile to operator workflow.

---

## Consequences

### Positive
- **Zero migration disruption** — existing records continue working unchanged.
- **Historical back-fill is implicit** — any receiving record whose `contractNumber` string matches a newly-created `PerhutaniContract` instantly appears as "received against" that contract.
- **Non-Perhutani records fully supported** — free-text input preserves existing workflow.
- **Simple mental model** — "contract tracking is a derived view, not a hard FK".
- **`<datalist>` HTML native** provides autocomplete UX without custom dropdown code.

### Negative / Trade-offs
- **Typos break association** — if operator types "CTR-01" vs "CTR-001", records won't link to the contract.
  - Mitigation: `<datalist>` suggestions reduce typo risk; normalization strips whitespace and case.
- **Cannot enforce referential integrity at DB level** — a record with `contractNumber = "FAKE-999"` saves successfully even if no such contract exists.
  - Mitigation: Accepted trade-off; business reality allows informal/non-contract deals.
- **Query performance** — fulfillment summary requires full scan of receiving records to find matches.
  - Mitigation: Expected scale (<10k records per contract) is acceptable for in-memory filter; add index on normalized `contract_number` if performance degrades.
- **Rename risk** — if a `PerhutaniContract.contractNumber` is edited after records exist, existing records become orphaned.
  - Mitigation: UI should warn when editing a contract number that has linked records; or treat contract number as immutable after creation (TBD).

### Follow-up Obligations
- Future contracts entity edits MUST surface warning when `contractNumber` edit would orphan existing records.
- If typo problems emerge operationally, consider fuzzy match + "did you mean?" prompt in receiving form.
- Payment form grouping (ADR cross-ref: Weekly Payment Form) uses the same normalized string matching for grouping key.

---

## References

- Spec: `docs/superpowers/specs/2026-10-21-perhutani-contract-tracking-design.md` Section 8.1
- Plan: `docs/superpowers/plans/2026-10-21-perhutani-contract-tracking.md`
- Related: ADR-0001 (persistence), ADR-0004 (Broker entity uses similar loose linkage)
