# Plan: Cleanup SSOT Violations via Suffix Rename (Option B)

**Date:** 2026-10-21
**Priority:** P3 (Technical Debt)
**Status:** DRAFT
**Type:** Rename refactor + minimal SSOT exemption pattern expansion

> **Spec Requirement:** None. This is a mechanical rename refactor following drift-check conventions. Plans with prefix `cleanup-` are exempt from Spec-Plan pairing per `scripts/drift-check.ts` convention.

---

## 1. Context & Problem Statement

### 1.1 Current State
21 `SSOT_VIOLATION` entries in `scripts/drift-baseline.json`. The violations fall into two categories:

**Category A — True local shapes that just need suffix rename (no behavior change):**
These are helper types local to a specific module. They are not shared domain entities. The violation exists only because they don't match the current SSOT exemption suffix pattern (`Props`, `State`, `Config`, `Options`, `Context`, `Params`, `Result`).

**Category B — Actually domain types that should move to SSOT:**
These are shapes used (or likely to be used) by multiple modules.

### 1.2 Categorization of 21 Violations

| File | Type | Category | Recommended Rename |
|---|---|---|---|
| `src/components/analytics/chart-helpers.ts` | `VolumeTrendData` | A (chart-local) | `VolumeTrendChartData` → keep local, add `ChartData` suffix exemption |
| `src/components/analytics/chart-helpers.ts` | `SpeciesDonutData` | A | `SpeciesDonutChartData` |
| `src/components/analytics/chart-helpers.ts` | `SupplierBarData` | A | `SupplierBarChartData` |
| `src/components/analytics/sales-chart-helpers.ts` | `CustomerSalesData` | A | `CustomerSalesChartData` |
| `src/components/analytics/sales-chart-helpers.ts` | `InventoryFlowData` | A | `InventoryFlowChartData` |
| `src/components/layout/nav-config.ts` | `NavItem` | A (UI config) | Keep + add `NavItem` to exemption list OR rename `NavItemConfig` |
| `src/components/ledger/RecordTableCompactView.tsx` | `SortField` | A (local sort state) | `SortField` → rename to `RecordTableSortField` (keep local) |
| `src/components/ledger/RecordTableCompactView.tsx` | `SortDirection` | A | `RecordTableSortDirection` (keep local) |
| `src/components/ledger/SupplierCombobox.tsx` | `SupplierOption` | A (combobox-local) | `SupplierComboboxOption` (Options suffix matches exemption) |
| `src/context/NavigationContext.tsx` | `NavigationContextValue` | A | Rename to `NavigationContextShape` (Context suffix matches exemption after reorder) → actually `NavigationContextValue` ends with `Value`; rename to `NavigationContextConfig` or add `Value` to exemptions |
| `src/context/navigation-state.ts` | `NavigationAction` | A (reducer action) | `NavigationActionConfig` |
| `src/context/navigation-state.ts` | `RouteResolution` | A | `RouteResolutionResult` (Result suffix) |
| `src/persistence/sqlite/species-queries.ts` | `SqliteSpeciesRow` | A (SQL row shape) | `SqliteSpeciesRow` → add `Row` suffix to exemptions (DB row shapes are inherently local to persistence adapter) |
| `src/persistence/storage.ts` | `StorageAdapter` | A (adapter interface) | `StorageAdapter` → add `Adapter` suffix to exemptions (adapter pattern types are infrastructure, not domain) |
| `src/utils/discrepancy-validation.ts` | `DiscrepancyValidationInput` | A | Already ends with `Input` — add `Input` to exemptions |
| `src/utils/discrepancy.ts` | `EvaluateDiscrepancyInput` | A | Same — `Input` exemption covers |
| `src/utils/payment-form-grouping.ts` | `PaymentFormGroup` | B (shared aggregate) | **Move to `src/types/index.ts`** |
| `src/utils/payment-form-number.ts` | `FormNumberInput` | A | `Input` exemption covers |
| `src/utils/record-draft.ts` | `RecordDraftData` | A (localStorage shape) | `RecordDraftData` → `RecordDraftState` (State suffix) |
| `src/utils/record-draft.ts` | `ManifestDraftData` | A | `ManifestDraftState` |
| `src/utils/timber-calc.ts` | `DiscrepancyStatus` | B (legacy domain type) | **Move to `src/types/index.ts`** (already deprecated in favor of `DiscrepancySeverity` but still exported) |

### 1.3 Strategy

**Mixed approach:**
1. **Expand `SSOT_EXEMPT_SUFFIXES`** in `scripts/drift-check.ts` to include: `Input`, `Row`, `Adapter`, `ChartData`, `Shape`, `Value`, `Action`.
2. **Rename files** where current name doesn't match any sensible suffix (ChartData, State, Result, etc.).
3. **Move truly shared types** (`PaymentFormGroup`, `DiscrepancyStatus`) to `src/types/index.ts`.

This resolves all 21 violations without forcing premature abstraction.

### 1.4 Non-Goals
- No behavior changes.
- No new tests (behavior preserved).
- No change to runtime bundle size (just type-level renames + relocations).

---

## 2. Implementation Checklist

### Phase 1: Expand SSOT Exemption List
- [ ] Edit `scripts/drift-check.ts`:
  - Add to `SSOT_EXEMPT_SUFFIXES`:
    - `Input` (function input bags)
    - `Row` (DB row shapes in persistence adapters)
    - `Adapter` (adapter pattern interfaces)
    - `ChartData` (chart.js data payload shapes)
    - `Shape` (type shape documentation)
    - `Value` (context value types)
    - `Action` (reducer action types)
- [ ] Verify: `node scripts/drift-check.ts` should show fewer violations

### Phase 2: Move Truly Shared Types to SSOT
- [ ] Move `PaymentFormGroup` from `src/utils/payment-form-grouping.ts` to `src/types/index.ts`:
  - Add import where used
  - Remove `export interface` from source file
- [ ] Move `DiscrepancyStatus` from `src/utils/timber-calc.ts` to `src/types/index.ts`:
  - Add `@deprecated` JSDoc preserving existing deprecation note
  - Remove `export type` from source file
- [ ] Run `npm run build:check` → 0 errors (imports resolve)

### Phase 3: Rename Local Types (Category A — chart data)
- [ ] `src/components/analytics/chart-helpers.ts`:
  - `VolumeTrendData` → `VolumeTrendChartData`
  - `SpeciesDonutData` → `SpeciesDonutChartData`
  - `SupplierBarData` → `SupplierBarChartData`
  - Update all consumers (grep `grep -rn "VolumeTrendData\|SpeciesDonutData\|SupplierBarData" src/ app/`)
- [ ] `src/components/analytics/sales-chart-helpers.ts`:
  - `CustomerSalesData` → `CustomerSalesChartData`
  - `InventoryFlowData` → `InventoryFlowChartData`
  - Update consumers

### Phase 4: Rename Local Types (Category A — misc)
- [ ] `src/components/ledger/RecordTableCompactView.tsx`:
  - `SortField` → `RecordTableSortField`
  - `SortDirection` → `RecordTableSortDirection`
- [ ] `src/components/ledger/SupplierCombobox.tsx`:
  - `SupplierOption` → `SupplierComboboxOption` (OR keep as-is since `Options` suffix is already exempt — verify)
- [ ] `src/context/navigation-state.ts`:
  - `RouteResolution` → `RouteResolutionResult`
  - `NavigationAction` → `NavigationActionConfig` (OR add `Action` to exemption, which Phase 1 already does — then no rename needed)

### Phase 5: Rename Local Types (Category A — draft shapes)
- [ ] `src/utils/record-draft.ts`:
  - `RecordDraftData` → `RecordDraftState`
  - `ManifestDraftData` → `ManifestDraftState`
  - Update consumers

### Phase 6: Verification
- [ ] `npm run build:check` → 0 errors (all type renames resolve correctly)
- [ ] `npm test` → 0 failures
- [ ] `node scripts/drift-check.ts` → verify `SSOT_VIOLATION` count = 0
- [ ] Regenerate baseline: `node scripts/drift-check.ts --write-baseline`
- [ ] Verify `drift-baseline.json` shows `SSOT_VIOLATION: 0`

---

## 3. File Change Manifest

| File | Action | Change |
|---|---|---|
| `scripts/drift-check.ts` | Modify | +7 entries in `SSOT_EXEMPT_SUFFIXES` |
| `src/types/index.ts` | Modify | +2 interfaces (PaymentFormGroup, DiscrepancyStatus) |
| `src/utils/payment-form-grouping.ts` | Modify | Remove local type, import from SSOT |
| `src/utils/timber-calc.ts` | Modify | Remove local type, import from SSOT |
| `src/components/analytics/chart-helpers.ts` | Modify | Rename 3 types |
| `src/components/analytics/sales-chart-helpers.ts` | Modify | Rename 2 types |
| `src/components/ledger/RecordTableCompactView.tsx` | Modify | Rename 2 types |
| `src/components/ledger/SupplierCombobox.tsx` | Modify (maybe) | Verify Options exemption, rename if needed |
| `src/context/navigation-state.ts` | Modify | Rename 2 types (or none if Action/Resolution exemptions added) |
| `src/utils/record-draft.ts` | Modify | Rename 2 types |
| `scripts/drift-baseline.json` | Modify (regenerate) | `SSOT_VIOLATION: 0` |

**Consumer files touched by renames** (grep-identified):
- Analytics chart consumer components (`VolumeTrendChart.tsx`, etc.)
- Ledger table (parent of `RecordTableCompactView`)
- Supplier combobox consumers
- Navigation context providers

Count estimated: ~15-20 consumer file touches, each 1-3 line edits.

**Total files touched:** ~30
**Behavior change:** zero
**Runtime impact:** zero

---

## 4. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Rename misses a consumer, breaks build | TypeScript strict mode catches at `npm run build:check`. Phase 6 verification gates. |
| Over-expanding exemption list weakens SSOT invariant | Each new exemption suffix has clear justification (DB rows, adapters, chart data, etc. are inherently module-local). Document rationale inline in `drift-check.ts`. |
| `PaymentFormGroup` move breaks internal consumers | Phase 2 explicitly runs `build:check` before proceeding to Phase 3. |
| Mixed strategy (rename + move + exempt) confusing | Each file in manifest has single clear action. Table in Section 1.2 documents rationale per type. |

---

## 5. Done Criteria

- Phase 1-6 all checked.
- `SSOT_VIOLATION: 0` in regenerated `drift-baseline.json`.
- `npm run build:check` and `npm test` both green.
- No behavior change (same bundle, same runtime, same tests pass).
- Commit message:
  ```
  cleanup(ssot): resolve 21 SSOT violations via rename and selective SSOT moves

  - Expand drift-check SSOT_EXEMPT_SUFFIXES to cover Input, Row, Adapter,
    ChartData, Shape, Value, Action.
  - Move PaymentFormGroup and DiscrepancyStatus to src/types/index.ts
    (shared across multiple modules).
  - Rename local chart data types with ChartData suffix.
  - Rename local sort state types with Table* prefix.
  - Rename local draft types with State suffix.

  Zero behavior change. SSOT_VIOLATION count: 21 → 0.

  Plan: docs/superpowers/plans/2026-10-21-cleanup-ssot-violations-rename.md
  ```

---

## 6. Dependencies

- **Blocks:** None.
- **Blocked by:** None.
- **Related:** `scripts/drift-check.ts` (modified in Phase 1), `scripts/drift-baseline.json` (regenerated in Phase 6).
