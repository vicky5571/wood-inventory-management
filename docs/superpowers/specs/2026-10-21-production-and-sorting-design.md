# Design Spec: Sawmill Production & Stock Sorting Records

**Document:** `docs/superpowers/specs/2026-10-21-production-and-sorting-design.md`
**Date:** 2026-10-21
**Status:** Draft — Pending Approval
**Related Plan:** `docs/superpowers/plans/2026-10-21-production-and-sorting.md`
**Architecture:** Two separate entities (`SawmillProductionRecord` + `StockSortingRecord`) with distinct UX and field sets. Free-text product output with history-learned autocomplete (reuses `SpeciesCombobox` pattern). Extends `LotStockBalance` with 4 flows (inbound, outbound, consumed, transferred) via backward-compatible optional arguments to existing `calculateLotStockBalance()`. Soft stock-allowance warnings only — no save blocking.

---

## 1. Executive Summary & Problem Statement

### 1.1 Context
The system tracks inbound (`WoodReceivingRecord`) and outbound (`WoodSalesRecord`) but has no entity capturing operations between these points:
- **Sawmill production**: converting round logs into sawn timber (papan, balok, usuk) with yield/waste.
- **Stock sorting**: moving pieces between kavlings for regrading, consolidation, or relocation.

Current `calculateLotStockBalance()` only sees inbound - outbound. Internal transformations are invisible, leading to inflated remaining stock figures.

### 1.2 Client Specification (Finalized from Q4)
- Two operation types: sawmill production AND stock sorting.
- Both input manually by staff.
- Output product dimensions vary per batch (not standardized catalog) → free-text with history-learned autocomplete.

### 1.3 Business Problem
- Yard inventory overstates reality when logs are consumed by sawmill without record.
- Regrade/relocate operations invisible → stock reports mismatch physical reality.
- No yield tracking → operators cannot evaluate sawmill efficiency.

### 1.4 Core Objectives
1. **Two separate entities** reflecting different operation semantics.
2. **Extend stock balance calculator** to account for consumption and transfers.
3. **Free-text product autocomplete** learning from history (reuses `SpeciesCombobox` pattern).
4. **Yield + waste computation** per production record with advisory badges.
5. **Soft stock warnings** (not blocking) — manual adjustments happen offline.
6. **Backward-compatible calculator** — existing callers unchanged.

---

## 2. User Experience & Navigation Flow

```
[ Sidebar Nav ]
  ├── ...
  ├── Penjualan (/sales)
  ├── Produksi (/production)      <── NEW
  ├── Sortir Stok (/sorting)      <── NEW
  ├── Pemasok (/suppliers)
  └── ...

[ /production Page ]
  ├── <ProductionKpiStrip>
  │     ├── Total Produksi Hari Ini (m³ input)
  │     ├── Total Output Hari Ini (m³)
  │     ├── Rata-rata Yield Minggu Ini (%)
  │     └── Total Waste Minggu Ini (m³)
  │
  ├── <ProductionToolbar>
  │     ├── Date range filter
  │     ├── Species filter
  │     ├── Shift filter (Pagi/Siang/Malam)
  │     └── + Catat Produksi
  │
  └── <ProductionTable>
        ├── Columns: Tanggal | Shift | Source | Species | Input Vol | Produk Output | Output Vol | Yield% | Waste | Operator | Aksi
        └── Yield badge: >=70% green, 50-70% amber, <50% red

[ <ProductionFormModal> ]
  ├── Section 1: Tanggal & Shift
  │     ├── Tanggal Produksi
  │     └── Shift (opsional): Pagi | Siang | Malam
  │
  ├── Section 2: Input (dari stok log)
  │     ├── Source TPK + Kavling (dropdown)
  │     ├── Live stock badge: "Tersedia: X.XXXX m³ (Y btg)"
  │     ├── Species (combobox)
  │     ├── Input Volume (m³)
  │     └── Input Pieces (batang)
  │
  ├── Section 3: Output (produksi)
  │     ├── Produk Output: <ProductSuggestionCombobox>
  │     │     e.g. "Papan 2x20x400cm" (autocomplete from history)
  │     ├── Output Volume (m³)
  │     ├── Output Pieces
  │     └── <ProductionYieldPreview>
  │           Live calc: "Yield: 70% | Waste: 3.0 m³"
  │
  ├── Section 4: Operator & Catatan
  │     ├── Operator *
  │     └── Catatan
  │
  ├── Soft warnings:
  │     ├── "Input melebihi stok tersedia" (if applicable)
  │     ├── "Yield di luar rentang biasa, mohon verifikasi" (<50% or >95%)
  │     └── "Output melebihi input" (hard block)
  │
  └── Footer: [ Batal ] [ Simpan ]

[ /sorting Page ]
  ├── <SortingKpiStrip>
  │     ├── Total Transfer Hari Ini
  │     ├── Volume Dipindah (m³)
  │     └── Jumlah Lot Terdampak
  │
  ├── <SortingToolbar>: date range, yard filter, + Catat Sortir
  │
  └── <SortingTable>
        └── Columns: Tanggal | Species | Source → Target | Volume | Pieces | Reason | Operator | Aksi

[ <SortingFormModal> ]
  ├── Section 1: Tanggal & Species
  │
  ├── Section 2: <KavlingPickerDual>
  │     ├── Source (TPK + Kavling)  →  Target (TPK + Kavling)
  │     ├── Live stock badge pada source
  │     └── Validation: source != target
  │
  ├── Section 3: Jumlah
  │     ├── Volume (m³)
  │     └── Pieces (batang)
  │
  ├── Section 4: Alasan & Operator
  │     ├── Reason: <SortingReasonCombobox>
  │     │     e.g. "regrade A→B", "pindah TPK Timur"
  │     ├── Operator *
  │     └── Catatan
  │
  └── Footer: [ Batal ] [ Simpan ]
```

---

## 3. Data Architecture & SSOT Schema

### 3.1 Domain Interfaces (`src/types/index.ts`)

```ts
export type ProductionShift = 'PAGI' | 'SIANG' | 'MALAM';

export interface SawmillProductionRecord {
  id: string;
  tenantId: string;
  productionDate: string;              // YYYY-MM-DD
  shift?: ProductionShift;

  // Input (consumed from log stock)
  sourceStorageYard: string;
  sourceKavlingNumber: string;
  inputSpecies: string;
  inputVolumeM3: number;
  inputPieces: number;

  // Output (produced)
  outputProduct: string;               // Free-text + autocomplete
  outputVolumeM3: number;
  outputPieces: number;

  // Derived (computed server-side for API convenience)
  yieldPercent: number;                // output/input * 100
  wasteVolumeM3: number;               // input - output

  operatorName: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockSortingRecord {
  id: string;
  tenantId: string;
  sortingDate: string;                 // YYYY-MM-DD

  species: string;

  sourceStorageYard: string;
  sourceKavlingNumber: string;

  targetStorageYard: string;
  targetKavlingNumber: string;

  volumeM3: number;
  pieces: number;

  reason: string;                      // Free-text + autocomplete
  operatorName: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SawmillProductionFormInput {
  id?: string;
  productionDate: string;
  shift?: ProductionShift;
  sourceStorageYard: string;
  sourceKavlingNumber: string;
  inputSpecies: string;
  inputVolumeM3: number;
  inputPieces: number;
  outputProduct: string;
  outputVolumeM3: number;
  outputPieces: number;
  operatorName: string;
  notes?: string;
}

export interface StockSortingFormInput {
  id?: string;
  sortingDate: string;
  species: string;
  sourceStorageYard: string;
  sourceKavlingNumber: string;
  targetStorageYard: string;
  targetKavlingNumber: string;
  volumeM3: number;
  pieces: number;
  reason: string;
  operatorName: string;
  notes?: string;
}
```

### 3.2 Modified Interface

```ts
export interface LotStockBalance {
  storageYard: string;
  kavlingNumber: string;

  // Existing
  inboundPieces: number;
  inboundVolumeM3: number;
  outboundPieces: number;
  outboundVolumeM3: number;

  // NEW: sawmill production consumption
  consumedPieces: number;
  consumedVolumeM3: number;

  // NEW: stock sorting net flow
  transferredInPieces: number;
  transferredInVolumeM3: number;
  transferredOutPieces: number;
  transferredOutVolumeM3: number;

  // Updated derivation
  remainingPieces: number;             // in + transferredIn - out - consumed - transferredOut
  remainingVolumeM3: number;
}
```

### 3.3 Relational Schema (SQLite)

```sql
CREATE TABLE IF NOT EXISTS sawmill_production_records (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  production_date TEXT NOT NULL,
  shift TEXT CHECK (shift IS NULL OR shift IN ('PAGI','SIANG','MALAM')),
  source_storage_yard TEXT NOT NULL,
  source_kavling_number TEXT NOT NULL,
  input_species TEXT NOT NULL,
  input_volume_m3 REAL NOT NULL CHECK (input_volume_m3 > 0),
  input_pieces INTEGER NOT NULL CHECK (input_pieces > 0),
  output_product TEXT NOT NULL,
  output_volume_m3 REAL NOT NULL CHECK (output_volume_m3 >= 0),
  output_pieces INTEGER NOT NULL CHECK (output_pieces >= 0),
  operator_name TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock_sorting_records (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sorting_date TEXT NOT NULL,
  species TEXT NOT NULL,
  source_storage_yard TEXT NOT NULL,
  source_kavling_number TEXT NOT NULL,
  target_storage_yard TEXT NOT NULL,
  target_kavling_number TEXT NOT NULL,
  volume_m3 REAL NOT NULL CHECK (volume_m3 > 0),
  pieces INTEGER NOT NULL CHECK (pieces > 0),
  reason TEXT NOT NULL,
  operator_name TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (NOT (source_storage_yard = target_storage_yard AND source_kavling_number = target_kavling_number))
);

CREATE INDEX idx_production_tenant_date ON sawmill_production_records(tenant_id, production_date);
CREATE INDEX idx_production_source_lot ON sawmill_production_records(tenant_id, source_storage_yard, source_kavling_number);
CREATE INDEX idx_sorting_tenant_date ON stock_sorting_records(tenant_id, sorting_date);
CREATE INDEX idx_sorting_source_lot ON stock_sorting_records(tenant_id, source_storage_yard, source_kavling_number);
CREATE INDEX idx_sorting_target_lot ON stock_sorting_records(tenant_id, target_storage_yard, target_kavling_number);
```

---

## 4. Pure Business Logic

### 4.1 Extended Stock Balance (`src/utils/stock-balance.ts`)

```ts
export function calculateLotStockBalance(
  inboundRecords: WoodReceivingRecord[],
  salesRecords: WoodSalesRecord[],
  yard: string,
  kavling: string,
  productionRecords?: SawmillProductionRecord[],  // NEW optional
  sortingRecords?: StockSortingRecord[],          // NEW optional
): LotStockBalance
```

**Algorithm:**
1. Existing: compute `inboundPieces/VolumeM3`, `outboundPieces/VolumeM3`.
2. NEW: filter `productionRecords` where source matches lot → sum `inputPieces/VolumeM3` → `consumedPieces/VolumeM3`.
3. NEW: filter `sortingRecords`:
   - Where source matches lot → sum → `transferredOutPieces/VolumeM3`.
   - Where target matches lot → sum → `transferredInPieces/VolumeM3`.
4. `remainingVolumeM3 = max(0, inbound + transferredIn - outbound - consumed - transferredOut)`.
5. Same formula for pieces.

**Backward compatibility:** If `productionRecords` and `sortingRecords` omitted, treated as empty arrays → behavior identical to current.

**Normalization:** Same `.trim().toLowerCase()` keying throughout.

### 4.2 Production Calculator (`src/utils/production-calc.ts`)

```ts
export function computeProductionYield(input: {
  inputVolumeM3: number;
  outputVolumeM3: number;
}): { yieldPercent: number; wasteVolumeM3: number }

export function aggregateProductionMetrics(
  records: SawmillProductionRecord[],
  dateRange?: { startDate: string; endDate: string },
): {
  totalInputVolumeM3: number;
  totalOutputVolumeM3: number;
  totalWasteVolumeM3: number;
  averageYieldPercent: number;
  recordCount: number;
}
```

**Yield formula:** `(output / input) * 100`, guarded against `input == 0` → returns 0.
**Waste:** `input - output`, guarded ≥ 0.

**Yield badge thresholds (fixed in v1):**
- ≥ 70% → green
- 50-70% → amber
- < 50% → red (advisory)

### 4.3 Aggregate All Lot Balances (Spec #1 integration)

```ts
export function aggregateAllLotBalances(
  inboundRecords: WoodReceivingRecord[],
  salesRecords: WoodSalesRecord[],
  productionRecords?: SawmillProductionRecord[],  // NEW optional
  sortingRecords?: StockSortingRecord[],          // NEW optional
): LotStockBalance[]
```

Updated to enumerate yards/kavlings from all 4 record types (not just inbound + sales).

---

## 5. API Contracts

### 5.1 Production Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/production` | List with filters (date range, species, shift) |
| POST | `/api/production` | Create |
| GET | `/api/production/[id]` | Get single |
| PUT | `/api/production/[id]` | Update |
| DELETE | `/api/production/[id]` | Soft-delete |

### 5.2 Sorting Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/sorting` | List with filters |
| POST | `/api/sorting` | Create |
| GET | `/api/sorting/[id]` | Get single |
| PUT | `/api/sorting/[id]` | Update |
| DELETE | `/api/sorting/[id]` | Soft-delete |

**Validation (shared logic):**
- Production: `inputVolumeM3 > 0`, `inputPieces > 0`, `outputVolumeM3 >= 0`, `outputPieces >= 0`, `outputVolumeM3 <= inputVolumeM3` (hard block).
- Sorting: `volumeM3 > 0`, `pieces > 0`, source != target (hard block).
- Both: tenant scoping.

**Soft warnings (non-blocking, surfaced in response body):**
- Production yield < 50% or > 95%.
- Input exceeds current `remainingVolumeM3` of source lot.
- Sorting source stock insufficient.

---

## 6. Component Modular Decomposition (<250 LOC)

```
src/components/production/
├── ProductionView.tsx                 # Coordinator
├── ProductionKpiStrip.tsx
├── ProductionToolbar.tsx
├── ProductionTable.tsx
├── ProductionEmptyState.tsx
├── ProductSuggestionCombobox.tsx      # Autocomplete from history
├── ProductionYieldPreview.tsx         # Live calc preview
└── ProductionFormModal.tsx

src/components/sorting/
├── SortingView.tsx                    # Coordinator
├── SortingKpiStrip.tsx
├── SortingToolbar.tsx
├── SortingTable.tsx
├── SortingEmptyState.tsx
├── KavlingPickerDual.tsx              # Side-by-side source + target
├── SortingReasonCombobox.tsx
└── SortingFormModal.tsx

src/utils/
├── stock-balance.ts                   # MODIFIED: extend signatures
└── production-calc.ts                 # NEW

src/hooks/
├── useProductionRecords.ts
└── useSortingRecords.ts

src/persistence/sqlite/
├── production-queries.ts
└── sorting-queries.ts

src/persistence/supabase/
├── supabase-production-store.ts
└── supabase-sorting-store.ts

supabase/migrations/XXXX_production_sorting.sql

app/
├── production/page.tsx
├── sorting/page.tsx
├── api/production/route.ts
├── api/production/[id]/route.ts
├── api/sorting/route.ts
└── api/sorting/[id]/route.ts

Modified (Spec #1 integration):
├── src/components/inventory/InventoryTable.tsx    # +consumed/transferred columns
├── src/components/inventory/InventoryView.tsx     # Pass new arrays through
├── src/components/inventory/InventoryKpiStrip.tsx # +new KPIs
└── src/components/layout/nav-config.ts            # +2 entries
```

---

## 7. Business Rules & Edge Cases

### 7.1 Validation Rules
- Production: `outputVolumeM3 <= inputVolumeM3` (output cannot exceed input — sanity hard block).
- Production: `inputVolumeM3 > 0` AND `inputPieces > 0` (positive required).
- Production: `outputVolumeM3 >= 0` AND `outputPieces >= 0` (zero allowed for total-waste edge case).
- Sorting: source lot ≠ target lot (CHECK constraint + client validation).
- Sorting: `volumeM3 > 0`, `pieces > 0`.
- Stock allowance: input/source exceeds remaining → soft warning only (manual offline adjustments are reality).

### 7.2 Yield Advisory Thresholds
- Hard-coded in v1: `< 50%` or `> 95%` triggers warning.
- Thresholds configurable in `AppSettings` deferred to future enhancement.

### 7.3 Delete Behavior
- Soft-delete only; undo via toast (consistent with existing record patterns).
- No cascade — deleting production record simply removes from aggregates on next recompute.
- Hard-delete reserved for role level 3 + explicit confirmation.

### 7.4 Output Not Tracked as Inventory
- Sawmill output ("Papan 2x20x400cm" × 15 pieces) is RECORDED but NOT tracked as sellable inventory.
- Rationale: product inventory requires separate SKU catalog + pricing + sales flow — out of scope v1.
- Operators manually track sawn timber in Excel/paper for now.
- Future dedicated plan if demand emerges.

### 7.5 Autocomplete History
- `outputProduct` suggestions: distinct `outputProduct` values from historical records, case-insensitive deduplication.
- `reason` suggestions: distinct `reason` values from historical records.
- Learned per-tenant; isolated.
- Fragmentation risk: minor typos create new suggestions. Acceptable in v1; master catalog deferred.

### 7.6 Negative Implied Stock
- If production input or sort source exceeds remaining stock, inventory shows the lot with `remaining = 0` (clamped).
- Over-consumption is implicitly recorded via the production/sorting records; manual offline reconciliation reflects reality.

---

## 8. Acceptance Criteria

1. Nav entries "Produksi" and "Sortir Stok" appear in sidebar.
2. Create production: input 10m³ / 20 batang from kavling A, output 7m³ / 15 batang "Papan 2x20x400cm" → yield 70%, waste 3m³.
3. Inventory view: kavling A remaining decreased by 10m³ (via consumed flow).
4. Create 2nd production with same product name → autocomplete suggests "Papan 2x20x400cm".
5. Create sorting: 5m³ from kavling A to kavling B.
6. Inventory view: kavling A -5m³ transferred out, kavling B +5m³ transferred in.
7. Try to sort A→A → validation blocks save (both client and server).
8. Try to produce 100m³ from kavling with 5m³ remaining → soft warning shown, save allowed.
9. Try to produce output > input → hard block.
10. Delete production record → undo toast works, inventory recomputes.
11. Production with 30% yield → red badge + advisory message.
12. All coordinator files <250 LOC.
13. `node --test` passes stock-balance-production, stock-balance-sorting, production-calc tests.
14. Backward compat: `calculateLotStockBalance()` called without new args behaves identically to pre-change.

---

## 9. Non-Goals (YAGNI)

- No work-order system / scheduling.
- No machine utilization tracking.
- No labor cost allocation.
- No multi-stage production chains.
- No automatic yield benchmarking / alerts.
- No standardized product catalog.
- No tracking of sawn output as sellable inventory.

---

## 10. Verification & Success Criteria

1. **Pure logic tests:**
   - `test/stock-balance-production.test.ts`: consumption flow, cumulative decrements, clamping, backward compat.
   - `test/stock-balance-sorting.test.ts`: bidirectional transfer, multi-lot distribution, self-transfer edge.
   - `test/production-calc.test.ts`: yield formula, waste computation, division-by-zero guard, aggregate metrics.
2. **Build gate:** `npm run build:check` → 0 errors.
3. **Smoke test:** Section 8 acceptance criteria.
4. **Zero regression:** Existing inventory, ledger, sales, suppliers continue; `calculateLotStockBalance()` without new args produces identical output.

---

## 11. Dependencies

- **Benefits from:** Spec #1 (Inventory View) — Section 6 integration requires inventory UI to display new flows.
- **Blocked by:** None technically. Can ship standalone; inventory integration deferred if Spec #1 not yet live.
- **Related:** None other.
