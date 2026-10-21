# Plan: Pending Pricing Workflow (Nullable Price + Delayed Entry)

**Date:** 2026-10-21
**Priority:** P1
**Status:** COMPLETE
**Related Client Feedback:** Item #3

---

## 1. Context & Problem Statement

### 1.1 Current State
- `timberPricePerM3: number` is non-null in `WoodReceivingRecord` (`src/types/index.ts:L164`).
- SQLite constraint: `timber_price_per_m3 REAL NOT NULL DEFAULT 0.0 CHECK (timber_price_per_m3 >= 0)` (`migrations.ts:L109`).
- Dev quick-fill, seed data, and forms always provide a price (defaults or hardcoded).
- `0` is ambiguous — technically "free" but also used by placeholder flows. No clean "not yet priced" semantic.

### 1.2 Client Spec (Finalized from Q3a/Q3b)
- Price agreed **at delivery time**, per-record (each record can have its own price).
- When price not yet decided at input time: **leave blank, fill later**.
- No price master database (rejected as over-engineered).

### 1.3 Non-Goals (YAGNI)
- No price master, no historical price lookup, no effectiveFrom/effectiveTo semantics.
- No bulk pricing UI (quick-edit page is enough).
- No approval workflow for price entry.
- No price change audit log (standard activity log is sufficient).

---

## 2. Design Decisions

### 2.1 Nullable Field vs Sentinel `0`
**Choice: NULL.**

Rationale:
- `0` is a legitimate price value (promotional/sample lot) and must not conflate with "not priced".
- NULL carries explicit "unknown/pending" semantics in both SQL and TypeScript.
- Downstream calculators (`calculateTimberPayment`) treat null as "cannot compute" rather than "zero gross".

### 2.2 Derived Status (Not Stored)
```ts
export type PricingStatus = 'PENDING' | 'PRICED';

export function derivePricingStatus(timberPricePerM3: number | null | undefined): PricingStatus {
  return timberPricePerM3 == null ? 'PENDING' : 'PRICED';
}
```
Computed on the fly. No new column. Zero migration cost for status itself.

### 2.3 Calculator Behavior with NULL Price
`calculateTimberPayment()` and `computeRecordCalculations()` must handle null:
- `timberGrossTotal = null` when price is null
- `timberPphAmount = null`
- `timberNetPayable = null`
- `grandNetPayable = null` (freight + broker still computable but grand total requires timber portion)

Alternative: return 0 and let UI render "—". Rejected because downstream aggregates (`aggregateDashboardMetrics`) would silently under-count. NULL propagation is honest.

### 2.4 Dashboard Metric Changes
`DashboardMetrics` additions:
```ts
pendingPricingCount: number;
pendingPricingVolumeM3: number;
pendingPricingValueExposureIDR: number;  // optional, approximate using avg priced record cost/m³
```
`totalNetTimberPayable`, `totalGrandExpenditure`, `totalOutstandingPayable` exclude PENDING records (so numbers remain accurate for priced data). Separate "pending" KPIs make the gap visible.

### 2.5 Pending Pricing Page (`/pending-pricing`)
Dedicated page for yard managers/finance to fill prices in bulk:
- List of PENDING records sorted by `receiptDate` ASC (oldest first)
- Columns: Date | Supplier | Species | Kavling | Tally Volume | Price Input | Save
- Inline price edit (number input, enter to save, tab to next row)
- Optimistic update + toast on save
- Filter by supplier, species, date range
- Prominent empty state when zero pending

### 2.6 Receiving Form Change
`RecordModal.tsx` + manifest form:
- Price input accepts empty string → stored as NULL
- Label becomes "Harga per m³ (opsional)"
- Helper text: "Boleh dikosongkan, isi nanti saat harga disepakati."
- Form submission does NOT auto-coerce empty to 0.

### 2.7 Payment Form Integration (Plan #6)
Payment form generator will:
- Skip PENDING records entirely (cannot invoice unknown amount)
- Surface warning in payment UI: "N record tertunda harga, tidak termasuk dalam form"
- Documented in Plan #6, implemented together as Plan #5 dependency.

---

## 3. Implementation Checklist

### Phase 1: SSOT Types
- [x] Change `WoodReceivingRecord.timberPricePerM3: number` → `number | null`
- [x] Change `ReceivingItem.timberPricePerM3: number` → `number | null`
- [x] Change `ManifestItemInput.timberPricePerM3: number` → `number | null`
- [x] Change `RecordCalculationInput.timberPricePerM3: number` → `number | null`
- [x] Change `RecordCalculationOutput.timberGrossTotal/timberPphAmount/timberNetPayable/grandNetPayable: number` → `number | null`
- [x] Add `PricingStatus` type
- [x] Add dashboard metric fields: `pendingPricingCount`, `pendingPricingVolumeM3`, `pendingPricingValueExposureIDR`
- [x] Add activity actions: `RECORD_PRICED`

### Phase 2: Pure Calculator Updates (Test-First)
- [x] Update `test/timber-calc.test.ts` or create new `test/pricing-null.test.ts`:
  - [x] `calculateTimberPayment` with null price → returns null gross/pph/net
  - [x] `computeRecordCalculations` with null price → timber & grand totals null, freight still computed
  - [x] `derivePricingStatus` null/undefined → PENDING; number → PRICED
  - [x] `aggregateDashboardMetrics` excludes PENDING from financial totals
  - [x] `aggregateDashboardMetrics` counts PENDING separately
  - [x] `pendingPricingValueExposureIDR` computed from avg of priced records
- [x] Modify `src/utils/timber-calc.ts`:
  - [x] `calculateTimberPayment` returns `{ gross: null, pphAmount: null, netPayable: null }` when price null
  - [x] `computeRecordCalculations` propagates nulls
  - [x] `aggregateDashboardMetrics` splits priced vs pending aggregation
- [x] Create `src/utils/pricing-status.ts` with `derivePricingStatus`
- [x] Run `node --test` → 0 failures

### Phase 3: Persistence Layer
- [x] SQLite migration: `ALTER TABLE receiving_items` drop NOT NULL constraint on `timber_price_per_m3`
  - Also update CHECK: `(timber_price_per_m3 IS NULL OR timber_price_per_m3 >= 0)`
- [x] Supabase migration SQL in `supabase/migrations/XXXX_nullable_pricing.sql`
- [x] Update view `receiving_items_calc` in `views-ddl.ts`:
  - Timber gross/pph/net return NULL when price NULL
  - Grand net payable returns NULL when timber net NULL
- [x] Update `supabase-record-store.ts`:
  - Serialize `null` instead of `|| 0` for `timberPricePerM3`
  - Deserialize preserving null
- [x] Update `sqlite/record-queries.ts` similarly

### Phase 4: API Routes
- [x] `app/api/records/route.ts` POST — accept null price, store as null
- [x] `app/api/records/[id]/route.ts` PUT — accept null price
- [x] New endpoint: `app/api/records/[id]/price/route.ts` PATCH
  - Payload: `{ timberPricePerM3: number }` (must be >= 0)
  - Updates only price field, triggers RECORD_PRICED activity
  - Returns updated record with recomputed calculations
- [x] Validation: price when provided must be non-negative

### Phase 5: Hook & State
- [x] Update `useWoodRecords.ts` to handle null price in CRUD operations
- [x] Add method `updateRecordPrice(id: string, price: number)` using PATCH endpoint
- [x] Optimistic update; rollback on error

### Phase 6: Receiving Form UI
- [x] Modify `src/components/ledger/RecordFinancialsSection.tsx` (or price input location):
  - Allow empty string input
  - Show "Opsional" badge
  - Helper text explaining pending workflow
- [x] Multi-item manifest form `ReceivingManifestForm` or equivalent — same treatment per row
- [x] Save handler: convert empty string → null (not 0)

### Phase 7: Pending Pricing Page
- [x] Create `src/components/pricing/PendingPricingTable.tsx`:
  - Inline price input per row with enter-to-save
  - Validation: >= 0
  - Shows computed timber net preview as user types
- [x] Create `src/components/pricing/PendingPricingToolbar.tsx`:
  - Search, supplier filter, date range filter
- [x] Create `src/components/pricing/PendingPricingKpiStrip.tsx`:
  - Total pending count, total pending volume, value exposure estimate
- [x] Create `src/components/pricing/PendingPricingEmptyState.tsx`:
  - "Tidak ada penerimaan tertunda harga. Semua record sudah dihargai."
- [x] Create `src/components/pricing/PendingPricingView.tsx` — coordinator (<250 lines)
- [x] Create `app/pending-pricing/page.tsx` — route shell

### Phase 8: Ledger & Dashboard Integration
- [x] `RecordTable.tsx` / `RecordTableCompactView.tsx`:
  - Show "—" instead of "Rp 0" when price null
  - Add PENDING badge in a new column or next to price
- [x] `KpiCards.tsx`:
  - New card "Pending Harga" with pending count + volume
  - Click-through → `/pending-pricing`
- [x] Record detail / modal:
  - Show prominent "Harga belum diisi" banner on PENDING records
  - CTA button "Isi Harga Sekarang"

### Phase 9: Nav Integration
- [x] Add `pending-pricing` entry to `src/components/layout/nav-config.ts`:
  - Position: after `inventory` or inside a "Finance" group (TBD)
  - Label: "Pending Harga" / "待定价"
  - Badge: show count when > 0

### Phase 10: Verification
- [x] Run `npm run test` → 0 failures
- [x] Run `npm run build:check` → 0 TS/build errors
- [x] Manual smoke test:
  - [x] Create record with empty price → saves as PENDING, badge visible
  - [x] Record list shows "—" for price column
  - [x] `/pending-pricing` shows the record
  - [x] Enter price inline → row disappears from pending list, moves to PRICED
  - [x] Dashboard pending count decrements
  - [x] Grand totals exclude PENDING records (don't inflate)
  - [x] Activity log shows RECORD_PRICED entry
  - [x] Edit priced record and clear price → reverts to PENDING

---

## 4. File Change Manifest

| File | Action | Lines (est.) |
|---|---|---|
| `src/types/index.ts` | Modify (nullable prices + status type + metrics) | +40 changed |
| `src/utils/timber-calc.ts` | Modify (null propagation) | ~50 changed |
| `src/utils/pricing-status.ts` | Create | ~30 |
| `test/pricing-null.test.ts` | Create | ~180 |
| `src/persistence/sqlite/migrations.ts` | Modify (nullable column + CHECK) | ~15 changed |
| `src/persistence/sqlite/views-ddl.ts` | Modify (null-aware view) | ~20 changed |
| `src/persistence/sqlite/record-queries.ts` | Modify (null serialization) | ~15 changed |
| `src/persistence/supabase/supabase-record-store.ts` | Modify (null serialization) | ~15 changed |
| `supabase/migrations/XXXX_nullable_pricing.sql` | Create | ~40 |
| `app/api/records/route.ts` | Modify (null acceptance) | ~15 changed |
| `app/api/records/[id]/route.ts` | Modify (null acceptance) | ~15 changed |
| `app/api/records/[id]/price/route.ts` | Create | ~70 |
| `src/hooks/useWoodRecords.ts` | Modify (price update method) | ~40 changed |
| `src/components/ledger/RecordFinancialsSection.tsx` | Modify (optional input) | ~25 changed |
| `src/components/ledger/RecordModal.tsx` | Modify (null handling on submit) | ~15 changed |
| `src/components/ledger/RecordTable.tsx` | Modify (price "—" + PENDING badge) | ~25 changed |
| `src/components/ledger/RecordTableCompactView.tsx` | Modify (price "—") | ~15 changed |
| `src/components/dashboard/KpiCards.tsx` | Modify (pending KPI card) | ~30 changed |
| `src/components/pricing/PendingPricingTable.tsx` | Create | ~180 |
| `src/components/pricing/PendingPricingToolbar.tsx` | Create | ~100 |
| `src/components/pricing/PendingPricingKpiStrip.tsx` | Create | ~80 |
| `src/components/pricing/PendingPricingEmptyState.tsx` | Create | ~30 |
| `src/components/pricing/PendingPricingView.tsx` | Create | ~180 |
| `app/pending-pricing/page.tsx` | Create | ~15 |
| `src/components/layout/nav-config.ts` | Modify (1 entry + badge support) | ~10 changed |
| `src/utils/records-csv.ts` | Modify (null → blank cell) | ~5 changed |

**Total:** ~900 new LOC + ~340 touched LOC across ~10 new files + ~15 touched files. No file exceeds 250-line limit.

---

## 5. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Null propagation breaks third-party consumers of API (CSV export, PDF, downstream reports) | Audit every consumer in Phase 2. Default render: "—" for display, blank cell for CSV. Document in CHANGELOG. |
| Dashboard financial totals silently drop when PENDING records exist | Explicit `pendingPricingValueExposureIDR` + separate KPI card ensures gap is visible, not hidden. |
| User forgets to fill prices → stale PENDING pile | Dashboard KPI card with pending count + nav badge. Weekly reminder (future, not v1). |
| Edge case: tally volume > 0 but price = null means no revenue recognized | By design. Document in operator training that PENDING records are not invoiceable until priced. |
| Migration backfill — existing records with price = 0 | Keep as 0 (treated as PRICED with zero value). Do NOT bulk-convert 0 → null, since some may be intentional free lots. |
| Payment form (Plan #6) breaks on NULL price | Plan #6 explicitly skips PENDING. Documented dependency. |
| Supabase view returns NULL where UI expected number | Update all consumers to accept `number | null`. TypeScript strict mode will enforce. |

---

## 6. Done Criteria

- All checkboxes in Section 3 ticked.
- `npm run test` + `npm run build:check` both green.
- Manual smoke test passes end-to-end.
- No regression: existing priced records display identically.
- PENDING records clearly distinguishable in all views.
- `/pending-pricing` functional with inline edit.
- Dashboard surfaces pending gap without silently hiding.

---

## 7. Dependencies on Other Plans

- **Blocks:** Plan #6 (Weekly Payment Form) — payment form must skip PENDING records.
- **Blocked by:** None.
- **Related:** Plan #3 (Discrepancy Alarm) — both touch `DashboardMetrics`. Coordinate type additions to avoid merge conflicts.
