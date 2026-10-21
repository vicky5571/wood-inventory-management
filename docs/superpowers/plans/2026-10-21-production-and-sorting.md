# Plan: Sawmill Production & Stock Sorting Records

**Date:** 2026-10-21
**Priority:** P2
**Status:** COMPLETED
**Related Client Feedback:** Item #4

---

## 1. Context & Problem Statement

### 1.1 Current State
- System tracks inbound (`WoodReceivingRecord`) and outbound (`WoodSalesRecord`) only.
- No entity captures what happens **between** receipt and sale:
  - Sawmill operations converting logs into sawn timber (papan, balok, usuk)
  - Stock movement between kavlings (sortir, regrade, pindah TPK)
- Stock balance calculator (`calculateLotStockBalance`) only sees inbound - outbound. Internal transformations invisible.

### 1.2 Client Spec (Finalized from Q4)
- Two operation types: **sawmill production** (log -> sawn products) AND **stock sorting** (regrade/relocate existing stock).
- Both input manually by staff.
- Output product dimensions vary per batch (not standardized catalog) -> free-text with autocomplete from history.

### 1.3 Non-Goals (YAGNI)
- No work-order system / scheduling.
- No machine utilization tracking.
- No labor cost allocation.
- No multi-stage production (log -> rough-sawn -> planed). Single-step only.
- No automatic yield benchmarking / alerts.
- No standardized product catalog (free-text + autocomplete sufficient).

---

## 2. Domain Model

### 2.1 Entities

```ts
export type ProductionShift = 'PAGI' | 'SIANG' | 'MALAM';

/**
 * Sawmill Production Record: raw log -> sawn products.
 * Decrements source kavling stock by inputVolumeM3/inputPieces.
 * Does NOT increment any kavling (output goes to separate product inventory, future work).
 */
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
  outputProduct: string;               // e.g. "Papan 2x20x400cm" (free-text + autocomplete)
  outputVolumeM3: number;
  outputPieces: number;

  // Derived (computed, not stored but included for API convenience)
  yieldPercent: number;                // output/input * 100
  wasteVolumeM3: number;               // input - output

  operatorName: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Stock Sorting Record: move pieces between kavlings or regrade in place.
 * Decrements source kavling, increments target kavling by same quantity.
 * Zero-net impact on total stock; only redistribution.
 */
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

  reason: string;                      // free-text, e.g. "regrade A->B", "pindah TPK Timur"
  operatorName: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 2.2 Form Inputs

```ts
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

### 2.3 Stock Balance Calculator Update
`LotStockBalance` interface extended to account for internal movements:

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
  consumedPieces: number;              // sum of SawmillProductionRecord.inputPieces for this lot
  consumedVolumeM3: number;

  // NEW: stock sorting net flow
  transferredInPieces: number;         // sum of StockSortingRecord where target = this lot
  transferredInVolumeM3: number;
  transferredOutPieces: number;        // sum of StockSortingRecord where source = this lot
  transferredOutVolumeM3: number;

  // Updated derivation
  remainingPieces: number;             // inbound + transferredIn - outbound - consumed - transferredOut
  remainingVolumeM3: number;
}
```

### 2.4 Validation Rules
- `inputVolumeM3 > 0`, `inputPieces > 0` (positive required).
- `outputVolumeM3 >= 0`, `outputPieces >= 0` (zero allowed — total waste edge case).
- `outputVolumeM3 <= inputVolumeM3` (sanity: output cannot exceed input).
- Yield warning (not block): if `yieldPercent < 50%` or `> 95%`, show advisory ("Yield di luar rentang biasa, mohon verifikasi").
- Sorting: source != target (prevent self-transfer typo).
- Sorting: `volumeM3 > 0`, `pieces > 0`.
- Stock allowance (soft warning, not block): if production input or sort source exceeds current `remainingVolumeM3` of lot, show warning but allow save (manual adjustments happen offline too).

---

## 3. Architectural Approach

### 3.1 Separate Entities, Not Unified
Rejected: single `InternalMovement` entity with `type: 'PRODUCTION' | 'SORTING'`.

Rationale:
- Different field sets (production has yield/waste; sorting has target lot).
- Different UX flows (production is one-way consumption; sorting is bidirectional transfer).
- Separate SSOT interfaces prevent conditional field validation nightmares.

### 3.2 Routes & Components

Routes:
- `app/production/page.tsx` — sawmill production log
- `app/sorting/page.tsx` — stock sorting log

Components under `src/components/production/`:
```
ProductionView.tsx                   # Coordinator (<250 lines)
├─ ProductionKpiStrip.tsx            # Today's total input/output, avg yield
├─ ProductionToolbar.tsx             # Date range, species filter, shift filter
├─ ProductionTable.tsx               # Sortable table with yield badges
└─ ProductionEmptyState.tsx

ProductionFormModal.tsx              # Create/edit (<250 lines)
├─ ProductSuggestionCombobox.tsx     # Autocomplete from historical outputProduct values
└─ ProductionYieldPreview.tsx        # Live yield/waste calc preview
```

Components under `src/components/sorting/`:
```
SortingView.tsx                      # Coordinator (<250 lines)
├─ SortingKpiStrip.tsx               # Today's transfers, volume moved, lot count affected
├─ SortingToolbar.tsx                # Date range, yard/kavling filter
├─ SortingTable.tsx                  # Source -> target flow
└─ SortingEmptyState.tsx

SortingFormModal.tsx                 # Create/edit (<250 lines)
├─ KavlingPickerDual.tsx             # Side-by-side source + target pickers
└─ SortingReasonCombobox.tsx         # Autocomplete from historical reasons
```

### 3.3 Autocomplete Combobox Pattern
Reuse pattern from `SpeciesCombobox.tsx` (proven):
- Debounced input
- Dropdown with history-learned suggestions
- Allow free-text submission (no "must select from list")
- Props: `value`, `onChange`, `suggestions: string[]`

Create generic base: `src/components/ui/LearningCombobox.tsx` consumed by both production (products) and sorting (reasons). Only create if 2+ consumers emerge — else inline the pattern. **YAGNI preference: inline first, extract later.**

### 3.4 Persistence
- SQLite: new tables `sawmill_production_records`, `stock_sorting_records`.
- Supabase: parallel migrations.
- Foreign key is soft (string match on `storageYard` + `kavlingNumber`), consistent with existing stock-balance normalization in `src/utils/stock-balance.ts`.

### 3.5 Stock Balance Integration
Update `src/utils/stock-balance.ts`:
- Extend `calculateLotStockBalance()` signature to accept optional `productionRecords` and `sortingRecords` arrays.
- Backward compatible: if omitted, behavior identical to current (inbound - outbound only).
- Update `aggregateAllLotBalances()` from Plan #1 to pass through new arrays.
- Add targeted test cases.

### 3.6 Hooks
Create:
- `src/hooks/useProductionRecords.ts` — CRUD + optimistic + soft-delete + undo toast
- `src/hooks/useSortingRecords.ts` — same pattern

Mirror `useWoodRecords.ts` structure. No shared abstraction.

### 3.7 Nav Integration
Add two entries to `src/components/layout/nav-config.ts`:
```ts
{ id: 'production', labelId: 'Produksi', labelZh: '生产', href: '/production' },
{ id: 'sorting', labelId: 'Sortir Stok', labelZh: '分拣', href: '/sorting' },
```

Position: between `sales` and `suppliers`.

---

## 4. Implementation Checklist

### Phase 1: SSOT Types
- [x] Add `ProductionShift`, `SawmillProductionRecord`, `SawmillProductionFormInput` to `src/types/index.ts`
- [x] Add `StockSortingRecord`, `StockSortingFormInput` to `src/types/index.ts`
- [x] Extend `LotStockBalance` with `consumedPieces/VolumeM3`, `transferredIn/OutPieces/VolumeM3`
- [x] Add activity actions: `PRODUCTION_CREATED/UPDATED/DELETED/RESTORED`, `SORTING_CREATED/UPDATED/DELETED/RESTORED`

### Phase 2: Pure Calculators (Test-First)
- [x] Create `test/stock-balance-production.test.ts`:
  - [x] Production consumes from source lot -> remaining decreases
  - [x] Multiple productions same lot -> cumulative decrement
  - [x] Production exceeding available stock -> remaining clamped to 0 (balance stays non-negative)
  - [x] Backward compat: calling without production arg -> original behavior
- [x] Create `test/stock-balance-sorting.test.ts`:
  - [x] Transfer source -> target: source decreases, target increases
  - [x] Multiple transfers between 3 lots -> correct distribution
  - [x] Self-transfer edge case (if somehow saved) -> zero net impact
- [x] Update `src/utils/stock-balance.ts`:
  - [x] `calculateLotStockBalance()` accepts optional production + sorting arrays
  - [x] `aggregateAllLotBalances()` propagates arrays
  - [x] Keep normalization consistent (`.trim().toLowerCase()`)
- [x] Create `src/utils/production-calc.ts`:
  - [x] `computeProductionYield(input, output)` -> `{ yieldPercent, wasteVolumeM3 }`
  - [x] `aggregateProductionMetrics(records, dateRange)` -> daily totals + avg yield
- [x] Create `test/production-calc.test.ts`:
  - [x] Yield 50-95% normal, outliers flagged
  - [x] Zero output -> 100% waste
  - [x] Input = output -> 100% yield (lossless, unlikely but valid)
  - [x] Division-by-zero guard when input = 0 (should not be allowed but defensive)
- [x] Run `node --test` -> 0 failures

### Phase 3: Persistence Layer
- [x] SQLite migration: create `sawmill_production_records` + `stock_sorting_records` tables
- [x] Supabase migration SQL in `supabase/migrations/XXXX_production_sorting.sql`
- [x] Implement `src/persistence/sqlite/production-queries.ts`
- [x] Implement `src/persistence/sqlite/sorting-queries.ts`
- [x] Implement `src/persistence/supabase/supabase-production-store.ts`
- [x] Implement `src/persistence/supabase/supabase-sorting-store.ts`
- [x] Add both adapters to persistence facade

### Phase 4: API Routes
- [x] `app/api/production/route.ts` — GET (list with filter), POST (create)
- [x] `app/api/production/[id]/route.ts` — GET, PUT, DELETE (soft)
- [x] `app/api/sorting/route.ts` — GET, POST
- [x] `app/api/sorting/[id]/route.ts` — GET, PUT, DELETE (soft)
- [x] Server-side validation per Section 2.4 rules
- [x] Tenant scoping

### Phase 5: Hooks
- [x] Create `src/hooks/useProductionRecords.ts`:
  - [x] CRUD, optimistic, soft-delete with undo toast
  - [x] Memoized `productSuggestions: string[]` derived from historical `outputProduct` values
- [x] Create `src/hooks/useSortingRecords.ts`:
  - [x] CRUD, optimistic, soft-delete with undo toast
  - [x] Memoized `reasonSuggestions: string[]` derived from historical `reason` values

### Phase 6: Production UI
- [x] `src/components/production/ProductionKpiStrip.tsx`
- [x] `src/components/production/ProductionToolbar.tsx`
- [x] `src/components/production/ProductionTable.tsx` (yield badge: green >=70%, amber 50-70%, red <50%)
- [x] `src/components/production/ProductionEmptyState.tsx`
- [x] `src/components/production/ProductSuggestionCombobox.tsx` (reuse pattern from `SpeciesCombobox`)
- [x] `src/components/production/ProductionYieldPreview.tsx` (live calc as user types)
- [x] `src/components/production/ProductionFormModal.tsx` (<250 lines; include stock allowance warning)
- [x] `src/components/production/ProductionView.tsx` (coordinator <250 lines)
- [x] `app/production/page.tsx` (route shell)

### Phase 7: Sorting UI
- [x] `src/components/sorting/SortingKpiStrip.tsx`
- [x] `src/components/sorting/SortingToolbar.tsx`
- [x] `src/components/sorting/SortingTable.tsx` (arrow visual: source -> target)
- [x] `src/components/sorting/SortingEmptyState.tsx`
- [x] `src/components/sorting/KavlingPickerDual.tsx` (side-by-side source + target)
- [x] `src/components/sorting/SortingReasonCombobox.tsx`
- [x] `src/components/sorting/SortingFormModal.tsx` (<250 lines; source != target validation)
- [x] `src/components/sorting/SortingView.tsx` (coordinator <250 lines)
- [x] `app/sorting/page.tsx` (route shell)

### Phase 8: Inventory Page Integration (Depends Plan #1)
- [x] Update `InventoryTable.tsx` to display additional columns:
  - "Dikonsumsi" (consumedVolumeM3)
  - "Transfer Masuk/Keluar" (transferred flows)
- [x] Update KPI strip to include total consumed + total transferred
- [x] Pass production + sorting arrays through `useWoodRecords` / separate hooks into aggregator

### Phase 9: Nav & Verification
- [x] Add `production` + `sorting` entries to `src/components/layout/nav-config.ts`
- [x] Run `npm run test` -> 0 failures
- [x] Run `npm run build:check` -> 0 TS/build errors
- [x] Confirm all coordinator files <250 lines
- [x] Manual smoke test:
  - [x] Create production record: input 10m³ / 20 batang from kavling A, output 7m³ / 15 batang "Papan 2x20x400cm"
  - [x] Yield shows 70%, waste 3m³
  - [x] Inventory view: kavling A remaining decreased by 10m³
  - [x] Create 2nd production with same product name -> autocomplete suggests "Papan 2x20x400cm"
  - [x] Create sorting: 5m³ from kavling A to kavling B
  - [x] Inventory view: kavling A -5m³ transferred out, kavling B +5m³ transferred in
  - [x] Try to sort A->A -> validation blocks save
  - [x] Try to produce 100m³ from kavling with 5m³ remaining -> soft warning shown, save allowed
  - [x] Delete production record -> undo toast works, inventory recomputes
  - [x] Production record with 30% yield -> red badge + advisory

---

## 5. File Change Manifest

| File | Action | Lines (est.) |
|---|---|---|
| `src/types/index.ts` | Modify (add 7 types + extend `LotStockBalance` + activity actions) | +120 |
| `src/utils/stock-balance.ts` | Modify (extend signatures, backward compat) | ~60 changed |
| `src/utils/production-calc.ts` | Create | ~110 |
| `test/stock-balance-production.test.ts` | Create | ~130 |
| `test/stock-balance-sorting.test.ts` | Create | ~140 |
| `test/production-calc.test.ts` | Create | ~110 |
| `src/persistence/sqlite/production-queries.ts` | Create | ~180 |
| `src/persistence/sqlite/sorting-queries.ts` | Create | ~180 |
| `src/persistence/sqlite/migrations.ts` | Modify (2 new tables) | +80 |
| `src/persistence/supabase/supabase-production-store.ts` | Create | ~200 |
| `src/persistence/supabase/supabase-sorting-store.ts` | Create | ~200 |
| `supabase/migrations/XXXX_production_sorting.sql` | Create | ~120 |
| `app/api/production/route.ts` | Create | ~100 |
| `app/api/production/[id]/route.ts` | Create | ~110 |
| `app/api/sorting/route.ts` | Create | ~100 |
| `app/api/sorting/[id]/route.ts` | Create | ~110 |
| `src/hooks/useProductionRecords.ts` | Create | ~220 |
| `src/hooks/useSortingRecords.ts` | Create | ~220 |
| `src/components/production/ProductionKpiStrip.tsx` | Create | ~90 |
| `src/components/production/ProductionToolbar.tsx` | Create | ~110 |
| `src/components/production/ProductionTable.tsx` | Create | ~160 |
| `src/components/production/ProductionEmptyState.tsx` | Create | ~35 |
| `src/components/production/ProductSuggestionCombobox.tsx` | Create | ~140 |
| `src/components/production/ProductionYieldPreview.tsx` | Create | ~70 |
| `src/components/production/ProductionFormModal.tsx` | Create | ~230 |
| `src/components/production/ProductionView.tsx` | Create | ~190 |
| `src/components/sorting/SortingKpiStrip.tsx` | Create | ~90 |
| `src/components/sorting/SortingToolbar.tsx` | Create | ~110 |
| `src/components/sorting/SortingTable.tsx` | Create | ~160 |
| `src/components/sorting/SortingEmptyState.tsx` | Create | ~35 |
| `src/components/sorting/KavlingPickerDual.tsx` | Create | ~140 |
| `src/components/sorting/SortingReasonCombobox.tsx` | Create | ~130 |
| `src/components/sorting/SortingFormModal.tsx` | Create | ~220 |
| `src/components/sorting/SortingView.tsx` | Create | ~190 |
| `app/production/page.tsx` | Create | ~15 |
| `app/sorting/page.tsx` | Create | ~15 |
| `src/components/inventory/InventoryTable.tsx` | Modify (Plan #1 integration) | ~40 changed |
| `src/components/inventory/InventoryView.tsx` | Modify (pass new arrays) | ~20 changed |
| `src/components/inventory/InventoryKpiStrip.tsx` | Modify (new KPIs) | ~25 changed |
| `src/components/layout/nav-config.ts` | Modify (2 entries) | +10 |

**Total:** ~4,200 new LOC + ~145 touched LOC across ~30 new files + ~5 touched files. No file exceeds 250-line limit.

**Note:** Second-largest plan after #6. Phase split option:
- **Sub-plan A (Production only)**: Phases 1 (production subset), 2 (production calc), 3 (production persistence), 4 (production API), 5 (production hook), 6 (production UI). Ships sawmill tracking.
- **Sub-plan B (Sorting only)**: Phases 1 (sorting subset), 2 (sorting calc), 3-5 (sorting persistence/API/hook), 7 (sorting UI). Ships stock transfers.
- **Sub-plan C (Inventory Integration)**: Phase 8 + 9. Ties both into live stock view.

Each sub-plan independently valuable and shippable.

---

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Stock balance now considers 4 flows (inbound, outbound, consumed, transferred) — complexity creep | Keep calculator a single pure function. Comprehensive test coverage per flow. Backward compat preserves existing consumers. |
| Users bypass sorting records and just adjust production input manually | Document in operator training. Soft warning in production form if input exceeds remaining. Not blocking (manual reality > rigid system). |
| Product name typos create fragmented autocomplete history | Case-insensitive deduplication in suggestions. Future: product master if proliferation becomes problematic. YAGNI for v1. |
| Sorting bidirectional updates risk double-counting | Explicit test: single sort record contributes to source `transferredOut` AND target `transferredIn`. Lot balance aggregation handles both without duplication. |
| Yield outside 50-95% advisory may be noisy for non-standard products | Thresholds configurable in `AppSettings` (future). v1: hard-coded with override via dismiss. |
| Deleting production record after output was already sold -> negative implied stock | Soft-delete only. Cannot hard-delete if any downstream record (sale) depends on inferred output. v1: don't enforce (output isn't tracked as separate inventory yet). Document limitation. |
| Scope creep into product inventory tracking (sawn timber as separate stock) | Explicitly rejected in Non-Goals. Output is "recorded" but not "tracked as sellable inventory". If needed later, dedicated plan. |
| Deleted contract (Plan #2) referenced by production/sorting notes field | Soft reference only (free text). No FK breakage. |

---

## 7. Done Criteria

- All checkboxes in Section 4 ticked.
- `npm run test` + `npm run build:check` both green.
- Manual smoke test passes end-to-end.
- Inventory view (Plan #1) accurately reflects all 4 stock flows.
- No regression in existing modules.
- Autocomplete learns from history across sessions.

---

## 8. Dependencies on Other Plans

- **Benefits from:** Plan #1 (Inventory View) — Phase 8 integrates into inventory table/KPIs.
- **Blocked by:** None technically. Can ship standalone; Plan #1 integration deferred if #1 not yet shipped.
- **Related:** None other.
