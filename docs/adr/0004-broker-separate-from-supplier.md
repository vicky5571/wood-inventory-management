# ADR-0004: Broker as Separate Entity (Not Supplier Subtype)

**Date:** 2026-10-21
**Status:** Accepted
**Deciders:** Owner + AI pair session (client Q6=A confirmed)

---

## Context

Before this decision, `WoodReceivingRecord` carried a flat `brokerFee: number` field with no entity backing. Business questions like "total commission paid to Broker X this quarter" or "which brokers facilitate highest-value deals" were unanswerable.

Client confirmed (Q6=A) that broker role is distinct from supplier:
- **Supplier** = entity that OWNS the wood being delivered (private supplier, Perhutani KPH, etc.).
- **Broker** = third-party intermediary who CONNECTS buyer with supplier but owns no wood. Receives commission per transaction.

The question: should `Broker` be a separate entity, a subtype of `Supplier`, or share infrastructure?

---

## Decision

Create `Broker` as a **separate master entity**, structurally similar to but independent from `Supplier`.

```ts
export interface Broker {
  id: string;
  tenantId: string;
  code: string;                       // e.g. "BRK-001"
  name: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  taxId?: string;                     // NPWP
  defaultCommissionPerM3?: number;    // Prefill hint; actual stored per-record
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface WoodReceivingRecord {
  // ...existing fields
  brokerId?: string;                  // Optional FK (nullable)
  brokerFee: number;                  // Unchanged: actual commission amount
}
```

Linkage is **loose coupling with optional FK**:
- `brokerId` nullable (no broker is a valid state).
- Delete behavior: `ON DELETE SET NULL` — removing a broker nullifies the FK on existing records but preserves the historical `brokerFee` amount.
- Record retains `brokerFee` number even if `brokerId` is null (accommodates legacy records and advisory warnings).

---

## Rejected Alternatives

### Alternative A: Broker as subtype of Supplier (via discriminator field `role: 'SUPPLIER' | 'BROKER'`)
**Rejected because:**
- Confuses domain semantics — a broker is NOT a wood owner, mixing them into one table creates frequent conditional filtering.
- Supplier scorecard metrics (volume delivered, discrepancy rate) are meaningless for brokers.
- Broker scorecard metrics (total commission, deal count) are meaningless for suppliers.
- Future field additions diverge: suppliers need `defaultFreightRate`, brokers need `defaultCommissionPerM3`.

### Alternative B: Shared `Entity` abstraction with `role` relationship table
**Rejected because:**
- YAGNI. Current needs: 2 entity types (supplier, broker). Future (per client Q6+Q7): possibly 3rd type `LandOwner`. Three concrete entities is not enough to justify abstract machinery.
- Adds join complexity to every query.
- Masks domain intent — code becomes "Entity with role" instead of "Supplier" / "Broker".

### Alternative C: Keep brokerFee flat (no entity)
**Rejected because:**
- Does not answer client's reporting needs (per-broker commission totals, deal counts).
- Does not provide a contact directory for brokers.
- Does not enable per-broker default commission prefill in forms.

### Alternative D: Make Broker a `role` field on existing `Supplier` entity
**Rejected because:**
- Same problems as Alternative A.
- Would also require legacy data migration (which suppliers were "really" brokers?).
- Breaks existing supplier scorecard which assumes delivered volume.

---

## Consequences

### Positive
- Clear domain semantics — Supplier and Broker evolve independently.
- Broker scorecard metrics (`BrokerWithMetrics`) focus on commission + volume facilitated + primary suppliers.
- Supplier scorecard remains focused on delivery performance.
- Reuses proven patterns (CRUD, directory UI, combobox) from Supplier module as implementation template.
- Soft delete via `status = 'INACTIVE'` + `ON DELETE SET NULL` on FK keeps historical records intact.

### Negative / Trade-offs
- Code duplication between Supplier and Broker modules (CRUD routes, directory views, hooks).
  - Accepted trade-off: duplication at the level of two concrete entities is cheaper than premature abstraction. Pattern can be extracted later if a third similar entity emerges (likely: LandOwner).
- Operators must know whether a counterparty is a "supplier" or "broker" when entering records.
  - Mitigation: Receiving form has separate fields for each, with clear labels.
- Records with `brokerFee > 0` but no `brokerId` are legal but surface advisory warnings ("Komisi tidak terkait broker").
  - Mitigation: Non-blocking warning educates operators without impeding workflow.

### Follow-up Obligations
- When `LandOwner` entity is introduced (pending client Q7 clarification), re-evaluate whether a shared abstraction is finally justified.
- Supplier and Broker directory UI components should maintain visual consistency to signal they are "same family" of master data.
- Broker edits that change the name should NOT force any record updates (records are linked via `brokerId`, not name).

---

## References

- Spec: `docs/superpowers/specs/2026-10-21-broker-master-data-design.md`
- Plan: `docs/superpowers/plans/2026-10-21-broker-master-data.md`
- Related: ADR-0003 (similar loose-linkage pattern used for Contract-Record association)
