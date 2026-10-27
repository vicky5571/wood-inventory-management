# ADR-0015: Foreign Key Enforcement for Contract-Record Association

**Date:** 2026-10-27
**Status:** Accepted (Supersedes [ADR-0003](file:///Users/mac/Web%20Development/wood-inventory-management/docs/adr/0003-loose-contract-record-linkage.md))
**Deciders:** Senior Software Engineer + Pair Programming Session

---

## Context

ADR-0003 previously established loose string matching on `contractNumber` between `WoodReceivingRecord` and `PerhutaniContract`. While this accommodated informal references and non-contract deals without requiring immediate migrations, production usage revealed several failure modes:

1. **Typos and Minor Formatting Discrepancies**: Minor variations in dashes, spacing, or casing caused receiving records to fail fulfillment attribution, creating orphaned records.
2. **Contract Deletion or Rename**: Modifying or deleting a contract silently broke association without database-level notification or referential integrity.
3. **Payment Form Grouping Inaccuracies**: Grouping strictly by string `contractNumber` could fragment records into multiple weekly payment forms if formatting differed.

---

## Decision

1. **Add `contract_id` FK to `receiving_manifests`**:
   ```sql
   ALTER TABLE receiving_manifests
   ADD COLUMN contract_id TEXT REFERENCES perhutani_contracts(id) ON DELETE SET NULL;
   ```
2. **Preserve `contract_number TEXT`**:
   Keep `contract_number` as a denormalized display string and fallback for historical or non-contract records.
3. **FK-First Resolution Strategy**:
   - Manifest creation resolves `contract_id` by matching `contract_number` against `perhutani_contracts.contract_number`.
   - Contract fulfillment calculation (`computeFulfillmentSummary`) prioritizes exact FK match (`record.contractId === contract.id`), falling back to normalized string match only when `contractId` is absent.
   - Payment form grouping engine (`buildGroupingKey`) incorporates `contractId` when available for deterministic grouping.
4. **Referential Integrity Behavior**:
   `ON DELETE SET NULL` ensures historical receiving data and financial manifests are never lost when a contract is deleted or archived; they simply revert to unlinked status.

---

## Consequences

### Positive
- Strict referential integrity when associated with a registered Perhutani contract.
- Accurate contract fulfillment tracking immune to string formatting nuances.
- Safe deletion handling via `ON DELETE SET NULL`.
- Seamless backward compatibility with unlinked / non-contract records.

### Trade-offs
- Two columns exist on `receiving_manifests` (`contract_id` and `contract_number`). Application logic must maintain synchronization on insert.

---

## References

- Spec: `docs/superpowers/db-fix-02-contract-fk.md`
- Previous Decision: `docs/adr/0003-loose-contract-record-linkage.md`
