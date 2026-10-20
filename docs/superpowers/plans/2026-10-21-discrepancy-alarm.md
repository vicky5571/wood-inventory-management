# Plan: Discrepancy Alarm (Negative-Only, OR Threshold)

**Date:** 2026-10-21
**Priority:** P1
**Status:** DRAFT
**Related Client Feedback:** Item #1

---

## 1. Context & Problem Statement

### 1.1 Current State
- Discrepancy fields exist: `volumeDiscrepancyM3`, `pieceDiscrepancy` computed in `src/utils/timber-calc.ts:L65-66`.
- Classifier `classifyDiscrepancy()` returns `'match' | 'surplus' | 'shortage'` (L160-163).
- UI (dashboard `KpiCards.tsx`, legacy `kpi-dashboard.ts`, `TallyDiscrepancyCard.tsx`, `SupplierCard.tsx`): shortage painted red, surplus painted green.
- Settings has `acceptableDiscrepancyThresholdPct: 2.0` (default) in `useSettings.ts:L12`, but **not used anywhere** for actual alarm gating.
- Negative input validation absent for `tallyPieces` / `tallyVolumeM3` / `deliveredPieces` / `deliveredVolumeM3`.

### 1.2 Client Spec (Finalized)
- Alarm trigger: `discrepancy < 0` AND (`|volumeDiscrepancyM3| > 1.5` OR `|discrepancyPct| > 2.0`) — **OR logic**.
- Visual warning only. No save blocking. No approval workflow.
- Surplus (tally > delivered) is NOT green/positive — treat as neutral/info, since surplus likely indicates document error, not profit.
- Within tolerance (minus but under both thresholds) → neutral badge, no alarm.
- Hard input validation: tally and delivered values cannot be negative.

### 1.3 Non-Goals (YAGNI)
- No alarm notification system (email/push) — visual only.
- No alarm history/log entity — rely on existing activity log if needed later.
- No per-supplier custom thresholds — global settings only (v1).

---

## 2. Design Decisions

### 2.1 Threshold Model
Deprecate single `acceptableDiscrepancyThresholdPct` field in favor of dual-threshold OR gate:

```ts
AppSettings {
  // DEPRECATE (keep for backward compat read, drop writes):
  acceptableDiscrepancyThresholdPct?: number;

  // NEW:
  discrepancyAlarmVolumeM3: number;    // default 1.5
  discrepancyAlarmPercent: number;     // default 2.0
}
```

Migration: on first load, if `discrepancyAlarmPercent` undefined but `acceptableDiscrepancyThresholdPct` present, carry old value forward as new percent threshold. Volume threshold initializes to default 1.5.

### 2.2 Alarm Classification
New type replaces `DiscrepancyStatus`:

```ts
export type DiscrepancySeverity =
  | 'MATCH'          // |diff| < epsilon
  | 'SURPLUS'        // diff > 0 (neutral, informational)
  | 'WITHIN_TOLERANCE'  // diff < 0 but within both thresholds
  | 'ALARM';         // diff < 0 AND (|volume| > vThresh OR |pct| > pThresh)
```

Keep `DiscrepancyStatus` as a deprecated alias for one release cycle.

### 2.3 Pure Classifier Signature

```ts
export interface DiscrepancyEvaluation {
  severity: DiscrepancySeverity;
  volumeDiscrepancyM3: number;
  volumeDiscrepancyPct: number;      // (tally - delivered) / delivered * 100
  pieceDiscrepancy: number;
  pieceDiscrepancyPct: number;
  isAlarm: boolean;
  reason?: string;                   // human-readable for tooltip (e.g. "Selisih -2.3 m³ (-3.1%) melebihi ambang")
}

export function evaluateDiscrepancy(input: {
  tallyVolumeM3: number;
  deliveredVolumeM3: number;
  tallyPieces: number;
  deliveredPieces: number;
  volumeThresholdM3: number;         // from settings
  percentThreshold: number;          // from settings
}): DiscrepancyEvaluation
```

Edge cases:
- `deliveredVolumeM3 === 0` → pct computation returns 0 (avoid div-by-zero), alarm only triggers on absolute volume threshold.
- `deliveredPieces === 0` → same guard for piece pct.
- Volume alarm checked against volume thresholds; piece alarm uses piece pct against same percent threshold (no separate piece volume threshold).

### 2.4 UI Badge Semantics (color overhaul)

| Severity | Color | Icon | Label |
|---|---|---|---|
| MATCH | gray-500 | check | "Match" |
| SURPLUS | blue-600 | info | "+X m³ (surplus)" |
| WITHIN_TOLERANCE | amber-500 | minus | "-X m³ (toleransi)" |
| ALARM | red-600 | triangle-alert | "-X m³ (-Y%) ALARM" |

Breaking change for existing green surplus. Flag in release notes.

### 2.5 Input Validation
New shared validator `validateDiscrepancyInputs()` returning `{ ok: boolean; errors: Record<string, string> }`. Applied at:
- `RecordModal.tsx` submit handler
- `/api/records` POST/PUT route handler
- Manifest multi-item form

Reject negatives server-side even if client bypasses.

---

## 3. Implementation Checklist

### Phase 1: SSOT Type & Settings Updates
- [ ] Update `AppSettings` interface in `src/types/index.ts` (deprecate old, add new fields)
- [ ] Add `DiscrepancySeverity` and `DiscrepancyEvaluation` types
- [ ] Mark old `DiscrepancyStatus` with `@deprecated` JSDoc
- [ ] Update `useSettings.ts` defaults: `discrepancyAlarmVolumeM3: 1.5`, `discrepancyAlarmPercent: 2.0`
- [ ] Add migration logic in settings loader (carry old pct forward)
- [ ] Update SQLite + Supabase settings schemas and store adapters

### Phase 2: Pure Calculator (Test-First)
- [ ] Create `test/discrepancy-eval.test.ts` covering:
  - [ ] Match: tally == delivered → MATCH severity, isAlarm=false
  - [ ] Surplus small: tally > delivered → SURPLUS, isAlarm=false
  - [ ] Surplus large: tally >> delivered → SURPLUS, isAlarm=false (surplus never alarms)
  - [ ] Within tolerance: diff = -0.5m³, -1% → WITHIN_TOLERANCE, isAlarm=false
  - [ ] Alarm by volume only: diff = -2m³, -0.5% → ALARM, isAlarm=true
  - [ ] Alarm by percent only: diff = -0.8m³, -3% → ALARM, isAlarm=true
  - [ ] Alarm by both: diff = -2m³, -5% → ALARM
  - [ ] Boundary: diff exactly -1.5m³ → NOT alarm (strict `>`)
  - [ ] Boundary: diff exactly -2.0% → NOT alarm
  - [ ] Zero delivered volume → pct=0, alarm only via volume threshold
  - [ ] Zero delivered pieces → pct=0 for piece side
- [ ] Implement `evaluateDiscrepancy()` in new file `src/utils/discrepancy.ts`
- [ ] Keep `classifyDiscrepancy()` as thin wrapper mapping new severity → legacy status (back-compat)
- [ ] Run `node --test test/discrepancy-eval.test.ts` → 0 failures

### Phase 3: Input Validation
- [ ] Create `src/utils/discrepancy-validation.ts` with `validateDiscrepancyInputs()`
- [ ] Create `test/discrepancy-validation.test.ts`:
  - [ ] All positive → ok=true, errors empty
  - [ ] Negative tally → ok=false, error on tally field
  - [ ] Negative delivered → ok=false, error on delivered field
  - [ ] Zero values allowed (not negative)
- [ ] Wire validator into `RecordModal.tsx` submit handler with inline error display
- [ ] Wire validator into multi-item manifest form (`ReceivingManifestForm`)
- [ ] Wire validator into `/api/records` route handlers (POST + PUT)

### Phase 4: UI Badge Component
- [ ] Create `src/components/ui/DiscrepancyBadge.tsx` consuming `DiscrepancyEvaluation`
  - Variants: MATCH (gray), SURPLUS (blue), WITHIN_TOLERANCE (amber), ALARM (red)
  - Tooltip shows `reason` on hover
  - Props: `evaluation: DiscrepancyEvaluation`, `unit: 'm³' | 'batang'`, `size?: 'sm' | 'md'`
- [ ] Replace color logic in:
  - [ ] `src/components/dashboard/KpiCards.tsx` (renderDiscrepancyBadge)
  - [ ] `src/components/tally/TallyDiscrepancyCard.tsx`
  - [ ] `src/components/ledger/RecordTableCompactView.tsx` (if displays discrepancy)
  - [ ] `src/components/analytics/FinancialOutlayBreakdown.tsx` (color only; keep rupiah exposure logic)
  - [ ] Legacy `src/components/kpi-dashboard.ts` and `src/components/record-table.ts` (if still rendered)
- [ ] Supplier scorecard: `SupplierCard.tsx` + `SupplierTable.tsx` — keep as % only but use new color mapping (negative discrepancy pct above threshold → red; below → amber; positive → blue)

### Phase 5: Settings UI
- [ ] Update `app/settings/page.tsx` form:
  - Replace single "Threshold Diskrepansi %" field with two inputs:
    - "Ambang Alarm Volume (m³)" — default 1.5
    - "Ambang Alarm Persentase (%)" — default 2.0
  - Add explanation: "Alarm aktif jika selisih **minus** DAN melebihi salah satu ambang (OR)."
- [ ] Validate: both must be > 0

### Phase 6: Dashboard KPI Enhancement
- [ ] `DashboardMetrics` interface — add `recordsWithAlarmCount: number`
- [ ] `aggregateDashboardMetrics()` in `timber-calc.ts` — compute alarm count per record using evaluator
- [ ] `KpiCards.tsx` — new card "Alarm Diskrepansi" showing `recordsWithAlarmCount` with red tint if > 0
- [ ] Click-through: filter ledger view to records where alarm active (optional, nice-to-have)

### Phase 7: Verification
- [ ] Run `npm run test` → 0 failures
- [ ] Run `npm run build:check` → 0 TS/build errors
- [ ] Manual smoke test:
  - [ ] Create record with delivered=10, tally=10 → MATCH badge gray
  - [ ] Create record with delivered=10, tally=11 → SURPLUS badge blue
  - [ ] Create record with delivered=10, tally=9.5 → WITHIN_TOLERANCE amber (0.5m³, 5%... wait, that would alarm by pct. Use delivered=100, tally=99.5 → 0.5m³, 0.5% → within tolerance)
  - [ ] Create record with delivered=100, tally=97 → ALARM red (3m³ > 1.5, 3% > 2%)
  - [ ] Try to save with tally=-5 → inline error, submit blocked client-side
  - [ ] POST to /api/records with negative values → 400 response
  - [ ] Change settings volume threshold to 5.0 → previous ALARM records drop to WITHIN_TOLERANCE
  - [ ] Dashboard shows correct alarm count

---

## 4. File Change Manifest

| File | Action | Lines (est.) |
|---|---|---|
| `src/types/index.ts` | Modify (deprecate + add types) | +40 |
| `src/utils/discrepancy.ts` | Create (new evaluator) | ~130 |
| `src/utils/discrepancy-validation.ts` | Create | ~60 |
| `src/utils/timber-calc.ts` | Modify (`classifyDiscrepancy` wrapper, `aggregateDashboardMetrics` alarm count) | ~20 changed |
| `test/discrepancy-eval.test.ts` | Create | ~180 |
| `test/discrepancy-validation.test.ts` | Create | ~70 |
| `src/hooks/useSettings.ts` | Modify (defaults + migration) | ~15 changed |
| `src/persistence/sqlite/activity-queries.ts` | Modify (settings schema) | ~20 changed |
| `src/persistence/supabase/master-data-supabase.ts` | Modify (settings schema) | ~20 changed |
| `supabase/migrations/XXXX_discrepancy_thresholds.sql` | Create | ~30 |
| `src/components/ui/DiscrepancyBadge.tsx` | Create | ~110 |
| `src/components/dashboard/KpiCards.tsx` | Modify (new badge + alarm count card) | ~40 changed |
| `src/components/tally/TallyDiscrepancyCard.tsx` | Modify (swap color logic) | ~30 changed |
| `src/components/analytics/FinancialOutlayBreakdown.tsx` | Modify (color only) | ~10 changed |
| `src/components/suppliers/SupplierCard.tsx` | Modify (color mapping) | ~15 changed |
| `src/components/suppliers/SupplierTable.tsx` | Modify (color mapping) | ~15 changed |
| `src/components/ledger/RecordModal.tsx` | Modify (validation wiring) | ~25 changed |
| `src/components/kpi-dashboard.ts` (legacy) | Modify or remove if unused | ~20 changed |
| `src/components/record-table.ts` (legacy) | Modify or remove if unused | ~10 changed |
| `app/api/records/route.ts` | Modify (validation) | ~20 changed |
| `app/api/records/[id]/route.ts` | Modify (validation) | ~20 changed |
| `app/settings/page.tsx` | Modify (dual threshold inputs) | ~40 changed |

**Total:** ~460 new LOC + ~300 touched LOC across 4 new files + ~15 touched files. No file exceeds 250-line limit.

---

## 5. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Breaking visual change (green surplus → blue) confuses users | Add short banner in dashboard first release: "Warna indikator diskrepansi diperbarui — surplus kini biru (netral), merah hanya untuk alarm minus." Dismiss persistent via localStorage. |
| Settings migration edge case (old pct value = 0 or negative) | Clamp to minimum 0.1 during migration; log warning. |
| Legacy `classifyDiscrepancy` consumers break | Keep wrapper returning old `'match'/'surplus'/'shortage'` strings. New severity consumed only by new badge component. |
| Division by zero when deliveredVolumeM3 == 0 | Explicitly guarded in evaluator; pct returns 0. Volume threshold still applies. |
| Threshold strictness boundary (exactly 1.5m³, exactly 2.0%) | Spec uses strict `>` (NOT `>=`). Documented in test cases. |
| Alarm count aggregation performance on large record sets | Single-pass loop in `aggregateDashboardMetrics` already O(n); evaluator is O(1) per record. No index needed. |

---

## 6. Done Criteria

- All checkboxes in Section 3 ticked.
- `npm run test` + `npm run build:check` both green.
- Manual smoke test passes end-to-end.
- No regression: existing records display with new semantics but no data corruption.
- Settings page allows editing both thresholds; changes propagate to all badge displays.
- Validation blocks negative inputs client-side AND server-side.

---

## 7. Dependencies on Other Plans

- **Independent.** Can execute in parallel with any other plan.
- Settings schema change may conflict with Plan #5 (Pending Pricing) if that plan also touches `AppSettings`. Coordinate migration file naming.
