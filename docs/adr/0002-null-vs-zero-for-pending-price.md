# ADR-0002: NULL vs Zero Sentinel for Pending Timber Price

**Date:** 2026-10-21
**Status:** Accepted
**Deciders:** Owner + AI pair session (client Q3 confirmed)

---

## Context

Timber prices are frequently negotiated AFTER physical receipt — the truck arrives, tally is measured, then the owner and supplier discuss price later (sometimes days or weeks later).

The original schema required `timberPricePerM3: number` (non-null, default `0.0`, SQL CHECK `>= 0`). This created a fundamental ambiguity: when a record shows `price = 0`, we cannot distinguish:
- **"Free lot"** (promotional sample, courtesy delivery) — a legitimate zero price
- **"Not yet priced"** (pending negotiation) — a placeholder zero that should NOT be included in financial totals

The ambiguity causes downstream problems:
- Dashboard financial totals silently include `Rp 0` from pending records, understating actual expenditure.
- Payment form generation cannot distinguish ready-to-invoice vs needs-pricing records.
- Operators resort to using fake prices (e.g., `1`) to indicate pending, further corrupting data.

Client was asked: "What should happen when staff enter a receiving record but price hasn't been decided?"
Answer (Q3b): **"Kosongkan dulu, isi nanti saat harga keluar."** → Leave blank, fill later.

---

## Decision

Change `timberPricePerM3` field type to `number | null`. Treat `null` as the semantic marker for "pending pricing".

```ts
export interface WoodReceivingRecord {
  // ...
  timberPricePerM3: number | null;    // null = PENDING, number (including 0) = PRICED
  timberGrossTotal: number | null;    // null propagated when price is null
  timberNetPayable: number | null;    // null propagated
  grandNetPayable: number | null;     // null propagated
}

export type PricingStatus = 'PENDING' | 'PRICED';

export function derivePricingStatus(price: number | null | undefined): PricingStatus {
  return price == null ? 'PENDING' : 'PRICED';
}
```

Status is **derived** (computed from the price field), not stored. SQL schema permits NULL:

```sql
timber_price_per_m3 REAL CHECK (timber_price_per_m3 IS NULL OR timber_price_per_m3 >= 0)
```

---

## Rejected Alternatives

### Alternative A: Keep `number` with `0` as sentinel for pending
**Rejected because:** `0` is a legitimate price value for promotional/sample lots. Conflating two meanings into one value corrupts domain semantics and makes financial totals silently wrong.

### Alternative B: Add separate boolean field `isPending: boolean`
**Rejected because:** Redundant with NULL semantic. Two sources of truth risk divergence (price = 500000 but isPending = true?). Violates principle of orthogonal fields.

### Alternative C: Build a separate price master table
**Rejected because:** YAGNI per client Q3 — "price agreed at delivery time, per-record". No historical lookup needed. Over-engineered for stated requirements.

### Alternative D: Use a special sentinel number (e.g., `-1`)
**Rejected because:** Error-prone (easy to forget guard checks), fights the type system, requires `>= 0` CHECK removal which weakens validation.

---

## Consequences

### Positive
- Clear semantic distinction between "zero price" and "unknown price".
- Dashboard financial totals accurately reflect PRICED records only.
- Pending records surfaced via dedicated `/pending-pricing` workflow page.
- Payment form generation (ADR cross-ref: Weekly Payment Form) can cleanly skip PENDING records.
- TypeScript strict null checks catch any attempt to use the price without null-guarding.

### Negative / Trade-offs
- All consumers of `timberPricePerM3` (calculators, UI, CSV export, PDFs) must handle null.
- Null propagation chain: `price = null` → `gross = null` → `net = null` → `grand = null`.
- Dashboard aggregator must iterate records twice (PRICED subset for totals, PENDING subset for exposure metrics).
- CSV export must distinguish "blank cell" (NULL) from "Rp 0" (PRICED zero).

### Follow-up Obligations
- Any new financial calculator that depends on `timberPricePerM3` MUST handle null (test case required).
- Future UI components rendering price MUST display "—" or similar marker for null, not "Rp 0".
- Existing records with `price = 0` MUST NOT be auto-migrated to NULL (some are legitimate free lots).
- If similar "pending" semantics emerge for other fields (e.g., contract sortimen pricing), evaluate same approach via new ADR.

---

## References

- Spec: `docs/superpowers/specs/2026-10-21-pending-pricing-workflow-design.md`
- Plan: `docs/superpowers/plans/2026-10-21-pending-pricing-workflow.md`
- Related: ADR-0001 (dual-mode persistence — both SQLite and Supabase schemas updated to permit NULL)
