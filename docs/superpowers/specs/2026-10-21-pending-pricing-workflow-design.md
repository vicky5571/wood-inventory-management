# Design Spec: Pending Pricing Workflow (Nullable Price + Delayed Entry)

**Document:** `docs/superpowers/specs/2026-10-21-pending-pricing-workflow-design.md`
**Date:** 2026-10-21
**Status:** Draft — Pending Approval
**Related Plan:** `docs/superpowers/plans/2026-10-21-pending-pricing-workflow.md`
**Architecture:** `timberPricePerM3` becomes nullable (`number | null`) with NULL semantic = "not yet priced". Derived `PricingStatus` ('PENDING' | 'PRICED') computed on the fly, not stored. Dedicated `/pending-pricing` page with inline quick-edit. Null propagation through all calculators and aggregates — PENDING records excluded from financial totals, surfaced via separate KPI card.

---

## 1. Executive Summary & Problem Statement

### 1.1 Context
Timber prices are negotiated per shipment, often decided AFTER physical receipt. The current schema requires `timberPricePerM3: number` (non-null, defaults to 0.0 with CHECK constraint `>= 0`). This forces operators to either:
- Enter `0` as placeholder (ambiguous — is it free or pending?), OR
- Delay record entry until price is confirmed (loses tally data in interim), OR
- Enter a guess (corrupts financial totals).

### 1.2 Client Specification (Finalized from Q3)
- Price agreed **at delivery time**, per-record (each record has its own price).
- When price undecided: **leave blank, fill later**.
- No price master database (rejected as over-engineered).

### 1.3 Business Problem
- `0` cannot distinguish "free lot" (promotional/sample) from "pending".
- Dashboard financial totals silently include incorrect `Rp 0` from placeholder prices → under-reports expenditure.
- No workflow surface for "fill these prices later".
- Payment forms (Plan #6) cannot distinguish priced vs unpriced records.

### 1.4 Core Objectives
1. **Nullable `timberPricePerM3`** with NULL = "not yet priced" semantic.
2. **Derived `PricingStatus`** computed on the fly (no stored flag).
3. **Null propagation** through calculators — gross/pph/net/grand = null when price = null.
4. **Dashboard transparency** — PENDING records excluded from financial KPIs, counted separately.
5. **Dedicated workflow page** `/pending-pricing` with inline quick-edit.
6. **Dedicated API endpoint** `PATCH /api/records/[id]/price` for price-only updates with activity logging.

---

## 2. User Experience & Navigation Flow

```
[ Sidebar Nav ]
  ├── ...
  ├── Inventaris (/inventory)
  ├── Pending Harga (/pending-pricing)  <── NEW, with count badge
  └── ...

[ Receiving Form Modification ]
  ├── ...existing fields...
  ├── Harga per m³ (Opsional)
  │   Helper: "Boleh dikosongkan, isi nanti saat harga disepakati."
  └── ...

[ /pending-pricing Page ]
  ├── <PendingPricingKpiStrip>
  │     ├── Total Pending
  │     ├── Volume Tertunda (m³)
  │     └── Perkiraan Eksposur (Rp)
  │
  ├── <PendingPricingToolbar>
  │     ├── Search
  │     ├── Supplier filter
  │     └── Date range filter
  │
  └── <PendingPricingTable>
        ├── Columns: Tanggal | Supplier | Species | Kavling | Volume | Harga (input inline) | Preview Net | [ Simpan ]
        ├── Inline price input: enter-to-save, tab-to-next-row
        ├── Live preview of timber net as user types
        └── On save: row disappears, toast confirms

[ Ledger Table / Record Table ]
  ├── Price column shows "—" for PENDING records
  ├── New PENDING badge next to price
  └── Dashboard KPI card "Pending Harga" with click-through to /pending-pricing

[ Record Detail / Modal ]
  └── PENDING records show prominent banner: "Harga belum diisi"
      with CTA button "Isi Harga Sekarang"
```

---

## 3. Data Architecture & SSOT Schema

### 3.1 Type Modifications (`src/types/index.ts`)

```ts
export interface WoodReceivingRecord {
  // ...existing fields
  timberPricePerM3: number | null;    // CHANGED: nullable
  timberGrossTotal: number | null;    // CHANGED: nullable (propagated)
  timberPphAmount: number | null;     // CHANGED: nullable
  timberNetPayable: number | null;    // CHANGED: nullable
  grandNetPayable: number | null;     // CHANGED: nullable (depends on timber)
  // ...
}

export interface ReceivingItem {
  // ...existing fields
  timberPricePerM3: number | null;    // CHANGED: nullable
}

export interface ManifestItemInput {
  // ...existing fields
  timberPricePerM3: number | null;    // CHANGED: nullable
}

export interface RecordCalculationInput {
  // ...existing fields
  timberPricePerM3: number | null;    // CHANGED: nullable
}

export interface RecordCalculationOutput {
  timberGrossTotal: number | null;    // CHANGED: nullable
  timberPphAmount: number | null;
  timberNetPayable: number | null;
  freightGrossTotal: number;          // UNCHANGED
  freightNetPayable: number;          // UNCHANGED
  grandNetPayable: number | null;     // CHANGED: nullable
  // ...
}
```

### 3.2 New Types

```ts
export type PricingStatus = 'PENDING' | 'PRICED';

export interface DashboardMetrics {
  // ...existing fields
  pendingPricingCount: number;              // NEW
  pendingPricingVolumeM3: number;           // NEW
  pendingPricingValueExposureIDR: number;   // NEW: approx using avg priced rate
}
```

### 3.3 Relational Schema Migration

```sql
-- Remove NOT NULL + default. Update CHECK to allow NULL.
ALTER TABLE receiving_items ALTER COLUMN timber_price_per_m3 DROP NOT NULL;
ALTER TABLE receiving_items ALTER COLUMN timber_price_per_m3 DROP DEFAULT;

-- Postgres (Supabase):
ALTER TABLE receiving_items DROP CONSTRAINT receiving_items_timber_price_per_m3_check;
ALTER TABLE receiving_items ADD CONSTRAINT receiving_items_timber_price_per_m3_check
  CHECK (timber_price_per_m3 IS NULL OR timber_price_per_m3 >= 0);

-- SQLite: table recreation migration or ignore CHECK (SQLite enforces at insert time).
```

### 3.4 View Update (`src/persistence/sqlite/views-ddl.ts`)

```sql
CREATE VIEW IF NOT EXISTS receiving_items_calc AS
SELECT
  i.*,
  -- Return NULL when price is NULL (not 0)
  CASE WHEN i.timber_price_per_m3 IS NULL THEN NULL
       ELSE ROUND(i.tally_volume_m3 * i.timber_price_per_m3, 2) END AS timber_gross_total,
  CASE WHEN i.timber_price_per_m3 IS NULL THEN NULL
       ELSE ROUND((i.tally_volume_m3 * i.timber_price_per_m3) * (i.timber_pph_rate / 100.0), 2) END AS timber_pph_amount,
  CASE WHEN i.timber_price_per_m3 IS NULL THEN NULL
       ELSE ROUND((i.tally_volume_m3 * i.timber_price_per_m3) * (1 - i.timber_pph_rate / 100.0), 2) END AS timber_net_payable
FROM receiving_items i;
```

---

## 4. Pure Business Logic

### 4.1 Status Derivation (`src/utils/pricing-status.ts`)

```ts
export function derivePricingStatus(timberPricePerM3: number | null | undefined): PricingStatus {
  return timberPricePerM3 == null ? 'PENDING' : 'PRICED';
}
```

Note: `== null` catches both `null` AND `undefined`.

### 4.2 Null Propagation in Calculators

```ts
// src/utils/timber-calc.ts
export function calculateTimberPayment(
  volumeM3: number,
  pricePerM3: number | null,
  pphRatePercent: number = 0,
): { gross: number | null; pphAmount: number | null; netPayable: number | null } {
  if (pricePerM3 == null) {
    return { gross: null, pphAmount: null, netPayable: null };
  }
  // ...existing logic for non-null case
}

export function computeRecordCalculations(input: RecordCalculationInput): RecordCalculationOutput {
  const timber = calculateTimberPayment(input.tallyVolumeM3, input.timberPricePerM3, input.timberPphRate ?? 0);
  const freight = calculateFreightPayment(input.tallyVolumeM3, input.freightRatePerM3, input.freightPphAmount ?? 0);
  const broker = input.brokerFee ?? 0;

  const grandNetPayable = timber.netPayable == null
    ? null
    : Number((timber.netPayable + freight.netPayable + broker).toFixed(2));

  return {
    timberGrossTotal: timber.gross,
    timberPphAmount: timber.pphAmount,
    timberNetPayable: timber.netPayable,
    freightGrossTotal: freight.gross,
    freightNetPayable: freight.netPayable,
    grandNetPayable,
    // ...
  };
}
```

### 4.3 Dashboard Aggregation

```ts
export function aggregateDashboardMetrics(records: WoodReceivingRecord[]): DashboardMetrics {
  const priced = records.filter(r => r.timberPricePerM3 != null);
  const pending = records.filter(r => r.timberPricePerM3 == null);

  // Financial totals computed from PRICED only
  const totalNetTimberPayable = priced.reduce((s, r) => s + (r.timberNetPayable ?? 0), 0);
  // ...

  // Pending metrics
  const pendingPricingCount = pending.length;
  const pendingPricingVolumeM3 = pending.reduce((s, r) => s + r.tallyVolumeM3, 0);

  // Value exposure estimate: pendingVolume × avg price of PRICED records
  const avgPricePerM3 = priced.length > 0
    ? priced.reduce((s, r) => s + (r.timberPricePerM3 ?? 0), 0) / priced.length
    : 0;
  const pendingPricingValueExposureIDR = Math.round(pendingPricingVolumeM3 * avgPricePerM3);

  return {
    // ...existing + new fields
    pendingPricingCount,
    pendingPricingVolumeM3,
    pendingPricingValueExposureIDR,
  };
}
```

---

## 5. API Contracts

### 5.1 Existing Routes — Null Acceptance
- `POST /api/records`: accept `timberPricePerM3: null`, store as NULL.
- `PUT /api/records/[id]`: accept null.
- Multi-item manifest POST: each item's price nullable independently.

### 5.2 New Endpoint

| Method | Path | Purpose |
|---|---|---|
| PATCH | `/api/records/[id]/price` | Price-only update |

**Payload:**
```json
{ "timberPricePerM3": 2500000 }
```

**Response:** Updated record with recomputed calculations (gross, pph, net, grand).

**Validation:** If provided, must be `>= 0`. Explicit `null` also acceptable (reverts to PENDING).

**Side effects:**
- Activity log entry: `RECORD_PRICED` with before/after price.
- Dashboard KPIs recompute on next client sync.

---

## 6. Component Modular Decomposition (<250 LOC)

```
src/components/pricing/
├── PendingPricingView.tsx            # Coordinator
├── PendingPricingKpiStrip.tsx        # 3 KPIs
├── PendingPricingToolbar.tsx         # Search, filters
├── PendingPricingTable.tsx           # Inline edit with enter-to-save
└── PendingPricingEmptyState.tsx

src/utils/pricing-status.ts           # derivePricingStatus (~30 LOC)

Modified:
├── src/utils/timber-calc.ts          # Null propagation
├── src/components/ledger/RecordModal.tsx  # Optional price input
├── src/components/ledger/RecordFinancialsSection.tsx
├── src/components/ledger/RecordTable.tsx  # "—" display + PENDING badge
├── src/components/dashboard/KpiCards.tsx  # New pending KPI card
├── src/hooks/useWoodRecords.ts       # updateRecordPrice method
├── src/utils/records-csv.ts          # Null → blank cell
├── src/persistence/sqlite/*          # Null serialization
├── src/persistence/supabase/*        # Null serialization
└── src/components/layout/nav-config.ts  # +1 entry with badge

New API:
└── app/api/records/[id]/price/route.ts

New Page:
└── app/pending-pricing/page.tsx
```

---

## 7. Business Rules & Edge Cases

### 7.1 NULL vs 0 Distinction
- NULL = "price unknown, pending negotiation".
- `0` = valid price (promotional/sample lot).
- No bulk migration converts existing `0` → NULL. Preserves intentional free lots.

### 7.2 Null Propagation Chain
- `price = null` → `gross = null` → `net = null` → `grand = null`.
- `freight`, `broker` remain computable (unchanged).
- Dashboard totals exclude PENDING records entirely from financial sums.

### 7.3 Reverting Priced → Pending
- Allowed: user clears price input → stored as NULL again.
- Activity log entry: `RECORD_PRICED` with new value = null.

### 7.4 Interaction with Payment Form (Plan #6)
- Payment form generation SKIPS PENDING records with reason "price pending".
- Generation result reports count skipped + click-through link to `/pending-pricing`.

### 7.5 CSV Export
- NULL price → blank cell.
- NULL gross/net → blank cell.
- Preserves distinction between "not yet priced" and "zero".

---

## 8. Acceptance Criteria

1. Create record with empty price → saves as PENDING, badge visible.
2. Record list shows "—" for price column (not "Rp 0").
3. `/pending-pricing` lists the record.
4. Inline price input → row disappears from pending list, moves to PRICED.
5. Dashboard pending count decrements correctly.
6. Grand totals exclude PENDING records (don't inflate with zeros).
7. Activity log shows `RECORD_PRICED` entry with price value.
8. Edit priced record and clear price → reverts to PENDING.
9. CSV export: PENDING records have blank price/gross/net cells.
10. Nav badge shows pending count when > 0.
11. All coordinator files <250 LOC.
12. `node --test` passes with null-handling tests.

---

## 9. Non-Goals (YAGNI)

- No price master, no historical price lookup.
- No bulk pricing UI (inline edit sufficient).
- No approval workflow for price entry.
- No price change audit log beyond standard activity log.

---

## 10. Verification & Success Criteria

1. **Pure logic tests:**
   - `test/pricing-null.test.ts`: null price in calculator → null gross/pph/net, freight still computed, grand null.
   - Status derivation covers null/undefined/number cases.
   - Dashboard aggregation separates PRICED vs PENDING.
2. **Build gate:** `npm run build:check` → 0 errors (strict null handling enforced by TS).
3. **Smoke test:** Section 8 acceptance criteria.
4. **Zero regression:** Existing priced records display identically. `price = 0` records remain PRICED (not auto-converted to PENDING).

---

## 11. Dependencies

- **Blocks:** Spec #6 (Weekly Payment Form) — must skip PENDING records.
- **Related:** Spec #3 (Discrepancy Alarm) — both modify `DashboardMetrics`. Coordinate type additions.
