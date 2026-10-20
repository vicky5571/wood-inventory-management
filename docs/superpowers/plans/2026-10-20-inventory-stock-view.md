# Plan: Inventory Stock View (Live Lot Balance Dashboard)

**Date:** 2026-10-20
**Priority:** P0 (Client urgency — "paling mendesak justru yang paling simple, data inventaris")
**Status:** COMPLETED
**Related Client Feedback:** Item #8

---

## 1. Context & Problem Statement

### 1.1 Current State
- Pure calculator `calculateLotStockBalance()` already exists in `src/utils/stock-balance.ts` and is proven in production (used by `SalesModal.tsx` and `/api/sales/route.ts`).
- Interface `LotStockBalance` already defined in `src/types/index.ts:L741-750` (SSOT satisfied).
- **GAP:** No dedicated page or UI view that aggregates and displays all lot balances. Users can only inspect one lot at a time via the sales entry flow.

### 1.2 Why This Is P0
Client stated inventory visibility is the single most urgent and simplest win. Yard managers currently have no at-a-glance view of what wood remains in each kavling, forcing manual Excel reconciliation.

### 1.3 Non-Goals (YAGNI)
- No price master integration (defer to Plan #5).
- No contract stock view (defer to Plan #2 — Perhutani Contract).
- No production/sorting adjustments (defer to Plan #7).
- No historical balance time-travel (deferred until proven needed).

---

## 2. Architectural Approach

### 2.1 Reuse-First Principle
The calculator is already correct. This plan is **95% UI composition + 5% aggregation helper**. Zero changes to persistence or domain types.

### 2.2 New Aggregation Helper
Add one pure function to `src/utils/stock-balance.ts` (keeps calculators colocated):

```ts
export function aggregateAllLotBalances(
  inboundRecords: WoodReceivingRecord[],
  salesRecords: WoodSalesRecord[]
): LotStockBalance[]
```

- Enumerates all unique `(storageYard, kavlingNumber)` pairs across both inbound and sales.
- Returns an array sorted by remaining volume DESC.
- Pure, deterministic, testable in isolation.

### 2.3 Route & Component Layout
New App Router route: `app/inventory/page.tsx` (server component shell).

Component tree under `src/components/inventory/`:
```
InventoryView.tsx            # Coordinator (<250 lines, delegates to subcomponents)
├─ InventoryKpiStrip.tsx     # Total lots, total remaining m³, total pieces, depleted count
├─ InventoryToolbar.tsx      # Search (yard/kavling), filter by yard, show-depleted toggle
├─ InventoryTable.tsx        # Sortable table of LotStockBalance[]
└─ InventoryEmptyState.tsx   # When no records exist
```

### 2.4 Data Hook
Reuse existing `useWoodRecords` + `useWoodSalesRecords`. No new hooks required for v1. If reactivity performance becomes an issue, extract `useLotBalances` memo later.

### 2.5 Nav Integration
Add nav entry between `ledger` and `tally` in `src/components/layout/nav-config.ts`:
```ts
{ id: 'inventory', labelId: 'Inventaris', labelZh: '库存', href: '/inventory' }
```

---

## 3. Implementation Checklist

### Phase 1: Pure Logic (Test-First)
- [x] Write failing test `test/stock-balance-aggregate.test.ts` covering:
  - [x] Empty inputs → empty array
  - [x] Inbound only, no sales → remaining == inbound
  - [x] Mixed inbound + sales, same lot → correct deduction
  - [x] Multiple distinct lots → each returned once
  - [x] Case-insensitive yard/kavling matching (same normalization as `calculateLotStockBalance`)
  - [x] Sort order: remaining volume DESC
- [x] Implement `aggregateAllLotBalances()` in `src/utils/stock-balance.ts`
- [x] Run `node --test test/stock-balance-aggregate.test.ts` → confirm 0 failures

### Phase 2: UI Components
- [x] Create `src/components/inventory/InventoryTable.tsx`
  - Columns: Yard | Kavling | Inbound (btg/m³) | Outbound (btg/m³) | Remaining (btg/m³) | Status
  - Status badge: `IN_STOCK` (remaining > 0) | `DEPLETED` (remaining == 0)
  - Sortable headers on remaining volume & kavling code
- [x] Create `src/components/inventory/InventoryKpiStrip.tsx`
  - KPI cards: Total Active Lots | Total Remaining m³ | Total Remaining Pieces | Depleted Lots Count
- [x] Create `src/components/inventory/InventoryToolbar.tsx`
  - Search input (filters yard+kavling by substring)
  - Yard dropdown (populated from unique yards in data)
  - "Sembunyikan kavling kosong" checkbox toggle (default: hide depleted)
- [x] Create `src/components/inventory/InventoryEmptyState.tsx`
  - Shown when `inboundRecords.length === 0`
  - CTA link to `/ledger` to add first record
- [x] Create coordinator `src/components/inventory/InventoryView.tsx` (<250 lines)
  - Hooks: `useWoodRecords`, `useWoodSalesRecords`
  - Memo: `aggregateAllLotBalances(inbound, sales)`
  - Filter/search state local to coordinator
  - Delegates all rendering to subcomponents

### Phase 3: Route & Nav
- [x] Create `app/inventory/page.tsx` (minimal shell, renders `<InventoryView />`)
- [x] Add `inventory` entry to `src/components/layout/nav-config.ts`
- [x] Verify sidebar + mobile nav display new item correctly

### Phase 4: Verification
- [x] Run `npm run test` → 0 failures
- [x] Run `npm run build:check` → 0 TS errors, 0 build errors
- [x] Manual smoke test:
  - [x] Navigate to `/inventory` with empty data → empty state shows
  - [x] Add inbound record via `/ledger` → appears in inventory with full remaining
  - [x] Add sale via `/sales` → remaining decrements
  - [x] Sell entire lot → shows as DEPLETED (hidden by default toggle)
  - [x] Toggle "show depleted" → DEPLETED lots reappear
- [x] Confirm no coordinator file exceeds 250 lines

---

## 4. File Change Manifest

| File | Action | Lines (est.) |
|---|---|---|
| `src/utils/stock-balance.ts` | Modify (add 1 function) | +25 |
| `test/stock-balance-aggregate.test.ts` | Create | ~80 |
| `src/components/inventory/InventoryView.tsx` | Create | ~120 |
| `src/components/inventory/InventoryKpiStrip.tsx` | Create | ~60 |
| `src/components/inventory/InventoryToolbar.tsx` | Create | ~70 |
| `src/components/inventory/InventoryTable.tsx` | Create | ~130 |
| `src/components/inventory/InventoryEmptyState.tsx` | Create | ~30 |
| `app/inventory/page.tsx` | Create | ~15 |
| `src/components/layout/nav-config.ts` | Modify (1 entry) | +6 |

**Total new code:** ~540 lines across 7 new files + 2 touched files. No file exceeds 250-line God File limit.

---

## 5. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Performance on large record sets (10k+ records) | v1 uses full in-memory recompute. Acceptable at expected scale (<1k lots). Memoize via `useMemo` keyed on record arrays. |
| Yard/kavling normalization drift between calculator and new aggregator | Share normalization logic — new function MUST reuse same `.trim().toLowerCase()` keying as `calculateLotStockBalance`. |
| User confusion between "Inventaris" (new) and "Buku Besar" (existing ledger) | Nav label "Inventaris" + Chinese "库存" is unambiguous. Add short header subtitle on page: "Sisa stok per kavling berdasarkan tally penerimaan dan penjualan." |

---

## 6. Done Criteria

- All checkboxes in Section 3 ticked.
- `npm run test` + `npm run build:check` both green.
- Manual smoke test passes end-to-end.
- No existing feature regresses (ledger, sales, suppliers all still functional).
