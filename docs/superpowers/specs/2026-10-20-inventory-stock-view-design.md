# Design Spec: Inventory Stock View (Live Lot Balance Dashboard)

**Document:** `docs/superpowers/specs/2026-10-20-inventory-stock-view-design.md`
**Date:** 2026-10-20
**Status:** Draft — Pending Approval
**Related Plan:** `docs/superpowers/plans/2026-10-20-inventory-stock-view.md`
**Architecture:** Pure UI aggregation layer over existing `calculateLotStockBalance()` primitive. Zero new persistence. Dedicated `/inventory` route with filter/search coordinator (<250 LOC) and reusable KPI/table/toolbar subcomponents.

---

## 1. Executive Summary & Problem Statement

### 1.1 Context
The system already tracks inbound tally (`WoodReceivingRecord`) and outbound sales (`WoodSalesRecord`). The pure calculator `calculateLotStockBalance()` in `src/utils/stock-balance.ts` is proven in production via `SalesModal.tsx` and `/api/sales/route.ts`. However, operators have no aggregate view — they can only inspect one lot at a time through the sales entry flow.

### 1.2 Business Problem
Yard managers resort to manual Excel reconciliation to answer basic daily questions:
- "Berapa sisa stok di semua kavling TPK Timur?"
- "Kavling mana yang sudah kosong?"
- "Kavling mana yang paling penuh?"

Client explicitly flagged this as the single most urgent and simplest win among all feedback items.

### 1.3 Core Objectives
1. **Live aggregate view of all lots** at `/inventory` with yard, kavling, inbound/outbound/remaining columns.
2. **KPI strip** showing total active lots, total remaining m³, total remaining pieces, depleted count.
3. **Filter/search** by yard, kavling substring, and depleted visibility toggle.
4. **Zero schema changes** — pure composition over existing primitives.
5. **Strict Strangler Pattern** — coordinator <250 LOC, logic in pure helpers, UI in atomic subcomponents.

---

## 2. User Experience & Navigation Flow

```
[ Sidebar Nav ]
  ├── Ringkasan (/)
  ├── Buku Besar (/ledger)
  ├── Inventaris (/inventory)  <── NEW
  ├── Tally Lapangan (/tally)
  ├── Penjualan (/sales)
  └── ...

[ /inventory Page Layout ]
  ├── Header: "Inventaris Stok Kavling"
  │   Subtitle: "Sisa stok per kavling berdasarkan tally penerimaan dan penjualan."
  │
  ├── <InventoryKpiStrip>
  │     ├── Total Lot Aktif
  │     ├── Total Sisa Volume (m³)
  │     ├── Total Sisa Batang
  │     └── Lot Kosong (DEPLETED)
  │
  ├── <InventoryToolbar>
  │     ├── Search (yard + kavling substring)
  │     ├── Yard dropdown (populated from unique yards)
  │     └── ☐ Tampilkan kavling kosong (default: hidden)
  │
  └── <InventoryTable>
        ├── Columns: Yard | Kavling | Masuk (btg/m³) | Keluar (btg/m³) | Sisa (btg/m³) | Status
        ├── Sortable headers: Remaining Volume (default DESC), Kavling Code
        └── Status badge: IN_STOCK (green) | DEPLETED (gray)

[ Empty State ]
  "Belum ada data penerimaan. Mulai dari Buku Besar." → CTA to /ledger
```

---

## 3. Data Architecture & SSOT

### 3.1 SSOT Reuse (No New Types)
Existing `LotStockBalance` in `src/types/index.ts:L741-750` fully covers display needs:

```ts
export interface LotStockBalance {
  storageYard: string;
  kavlingNumber: string;
  inboundPieces: number;
  inboundVolumeM3: number;
  outboundPieces: number;
  outboundVolumeM3: number;
  remainingPieces: number;
  remainingVolumeM3: number;
}
```

No persistence changes. No new API routes. No new table.

### 3.2 New Pure Aggregation Helper

Add to `src/utils/stock-balance.ts`:

```ts
/**
 * Enumerates all unique (yard, kavling) pairs across inbound and sales records,
 * computes balance per pair via existing calculateLotStockBalance(),
 * and returns sorted by remainingVolumeM3 DESC.
 */
export function aggregateAllLotBalances(
  inboundRecords: WoodReceivingRecord[],
  salesRecords: WoodSalesRecord[],
): LotStockBalance[]
```

**Algorithm:**
1. Build Set of `${normYard}||${normKavling}` keys from both arrays.
2. For each unique key, call `calculateLotStockBalance(inbound, sales, yard, kavling)`.
3. Sort DESC by `remainingVolumeM3`, tiebreak by `kavlingNumber` ASC.

**Complexity:** O((n+m) + k) where n=inbound, m=sales, k=unique lots. Acceptable at expected scale (<1000 lots).

**Normalization:** Must reuse `.trim().toLowerCase()` keying from `calculateLotStockBalance()` to prevent drift.

---

## 4. Component Modular Decomposition (<250 LOC Invariant)

```
src/components/inventory/
├── InventoryView.tsx            # Coordinator (<250 LOC) — hooks, state, memo, delegation
├── InventoryKpiStrip.tsx        # (~60 LOC) — 4 KPI cards
├── InventoryToolbar.tsx         # (~70 LOC) — search, yard filter, depleted toggle
├── InventoryTable.tsx           # (~130 LOC) — sortable table with status badges
└── InventoryEmptyState.tsx      # (~30 LOC) — zero-record CTA to /ledger

app/inventory/
└── page.tsx                     # (~15 LOC) — route shell, renders <InventoryView />

src/components/layout/
└── nav-config.ts                # +1 entry: { id: 'inventory', labelId: 'Inventaris', ... }

src/utils/
└── stock-balance.ts             # +1 function: aggregateAllLotBalances()

test/
└── stock-balance-aggregate.test.ts  # New test file
```

---

## 5. Business Rules & Edge Cases

### 5.1 Lot Enumeration
- Lot is "known" if it appears in ANY `WoodReceivingRecord.storageYard+kavlingNumber` OR any `WoodSalesRecord.storageYard+kavlingNumber`.
- A lot that exists only in sales records (orphan sale, no inbound) WILL appear with inbound = 0 and remaining = 0 (edge case indicating data integrity issue).

### 5.2 Normalization
- Yard and kavling matching is case-insensitive and whitespace-trimmed.
- Display uses first-seen capitalization from source records.

### 5.3 Sort Order
- Default: `remainingVolumeM3` DESC (fullest lots first).
- Tiebreak: `kavlingNumber` ASC (alphabetical).
- User-selectable: toggle to sort by remaining pieces or kavling code.

### 5.4 Depleted Visibility
- A lot is DEPLETED when `remainingVolumeM3 === 0 AND remainingPieces === 0`.
- Default: hidden from table (reduces noise).
- Toggle persists in `localStorage` key `inventory_show_depleted` (session-scoped).

### 5.5 Filter Behavior
- Search filters by substring match (case-insensitive) on `${yard} ${kavling}` concatenation.
- Yard dropdown is "ALL" plus unique yards; selecting narrows table.
- Filters apply AFTER depleted toggle.

### 5.6 Empty States
- Zero records anywhere → `<InventoryEmptyState>` with CTA to `/ledger`.
- Records exist but filters produce zero rows → inline "Tidak ada kavling yang cocok dengan filter."

---

## 6. Acceptance Criteria

1. New nav entry "Inventaris" appears between "Buku Besar" and "Tally Lapangan".
2. `/inventory` renders KPI strip, toolbar, and table.
3. KPIs reflect correct totals (sums of all non-depleted lot balances).
4. Table shows one row per unique (yard, kavling) pair.
5. Adding an inbound record via `/ledger` immediately appears in inventory table on navigation.
6. Adding a sale via `/sales` immediately decrements remaining stock on navigation.
7. Selling entire lot flips status to DEPLETED and hides from default view.
8. Toggle "show depleted" restores DEPLETED lots.
9. Search filter matches substring in yard or kavling.
10. Zero records shows empty state with working CTA to `/ledger`.
11. All coordinator files <250 LOC.
12. `node --test test/stock-balance-aggregate.test.ts` passes.

---

## 7. Non-Goals (YAGNI)

- No price integration (deferred to Plan #5 / Spec #5).
- No contract stock view (deferred to Plan #2 / Spec #2).
- No production/sorting adjustments (deferred to Plan #7 / Spec #7).
- No historical balance time-travel.
- No CSV export (future enhancement).

---

## 8. Verification & Success Criteria

1. **Pure logic test:** `test/stock-balance-aggregate.test.ts` covers empty inputs, single-lot, multi-lot, case-insensitivity, sort order.
2. **Build gate:** `npm run build:check` → 0 TS errors, 0 build errors.
3. **Smoke test:** Manual verification per Section 6 acceptance criteria.
4. **Zero regression:** Existing `/ledger`, `/sales`, `/suppliers` continue to function.
