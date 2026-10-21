# Design Spec: Discrepancy Alarm (Negative-Only, OR Threshold)

**Document:** `docs/superpowers/specs/2026-10-21-discrepancy-alarm-design.md`
**Date:** 2026-10-21
**Status:** Draft — Pending Approval
**Related Plan:** `docs/superpowers/plans/2026-10-21-discrepancy-alarm.md`
**Architecture:** New pure evaluator `evaluateDiscrepancy()` with 4-level severity (MATCH/SURPLUS/WITHIN_TOLERANCE/ALARM). Dual-threshold OR gate (volume m³ OR percentage) applied only when discrepancy is negative. Visual warnings only — no save blocking. Hard input validation (non-negative tally and delivered values) at client + API boundaries. Backward-compatible wrapper preserves legacy `classifyDiscrepancy()` consumers.

---

## 1. Executive Summary & Problem Statement

### 1.1 Context
The system computes `volumeDiscrepancyM3` and `pieceDiscrepancy` fields (`src/utils/timber-calc.ts:L65-66`) and renders them as colored badges. Current logic:
- Green badge for surplus (tally > delivered).
- Red badge for shortage (tally < delivered).
- `AppSettings.acceptableDiscrepancyThresholdPct = 2.0` exists but is **never consumed** for alarm gating.
- No input validation blocks negative tally/delivered values.

### 1.2 Business Problem
In timber log operations:
- Surplus (tally > document) is NOT a positive event — it typically indicates document under-reporting or counting errors, requiring investigation.
- Small negative discrepancies within natural shrinkage tolerance should not trigger alarm fatigue.
- Only material negative discrepancies warrant operator attention.
- Negative input values corrupt ledger integrity silently.

### 1.3 Client Specification (Finalized)
- Alarm triggers only when discrepancy is **negative**.
- Alarm gated by OR threshold: `|volumeDiscrepancyM3| > 1.5` **OR** `|discrepancyPct| > 2.0`.
- Visual warning only — no save blocking, no approval workflow.
- Surplus = neutral/informational, not positive.
- Hard rejection of negative tally/delivered inputs.

### 1.4 Core Objectives
1. **New 4-level severity model** replacing binary surplus/shortage.
2. **Configurable dual threshold** in `AppSettings` with sane defaults (1.5m³ / 2.0%).
3. **Reusable `<DiscrepancyBadge>` component** consuming evaluator output.
4. **Hard input validation** at client (RecordModal) + API (POST/PUT routes).
5. **Dashboard KPI card** surfacing count of records in alarm state.
6. **Backward compatibility** — legacy `classifyDiscrepancy()` wrapper preserved.

---

## 2. User Experience Changes

### 2.1 Badge Color Overhaul

| Severity | Color | Icon | Label Example |
|---|---|---|---|
| MATCH | gray-500 | check | "Match" |
| SURPLUS | blue-600 | info | "+1.2 m³ (surplus)" |
| WITHIN_TOLERANCE | amber-500 | minus | "-0.8 m³ (toleransi)" |
| ALARM | red-600 | triangle-alert | "-2.3 m³ (-3.1%) ALARM" |

Breaking change for existing green surplus. Release note required.

### 2.2 Settings Page

Current: single input "Threshold Diskrepansi (%)".

New: two inputs with helper text:
- "Ambang Alarm Volume (m³)" — default 1.5
- "Ambang Alarm Persentase (%)" — default 2.0
- Helper: "Alarm aktif jika selisih **minus** DAN melebihi salah satu ambang (OR)."

### 2.3 Dashboard KPI

New card "Alarm Diskrepansi":
- Displays `recordsWithAlarmCount` from `DashboardMetrics`.
- Red tint when count > 0.
- Optional click-through to ledger filtered to alarm records (future enhancement).

### 2.4 Receiving Form Validation

- Inline error on negative inputs: "Nilai tidak boleh negatif".
- Save button disabled while validation errors present.
- API returns 400 with field-level error if client bypassed.

---

## 3. Data Architecture & SSOT

### 3.1 Type Additions (`src/types/index.ts`)

```ts
export type DiscrepancySeverity =
  | 'MATCH'              // |diff| < epsilon
  | 'SURPLUS'            // diff > 0 (neutral)
  | 'WITHIN_TOLERANCE'   // diff < 0 but within both thresholds
  | 'ALARM';             // diff < 0 AND (|volume| > vThresh OR |pct| > pThresh)

export interface DiscrepancyEvaluation {
  severity: DiscrepancySeverity;
  volumeDiscrepancyM3: number;
  volumeDiscrepancyPct: number;        // (tally - delivered) / delivered * 100
  pieceDiscrepancy: number;
  pieceDiscrepancyPct: number;
  isAlarm: boolean;
  reason?: string;                     // Tooltip text for ALARM
}

// @deprecated — use DiscrepancySeverity. Kept for backward compat.
export type DiscrepancyStatus = 'match' | 'surplus' | 'shortage';
```

### 3.2 Settings Schema Migration

```ts
export interface AppSettings {
  // DEPRECATED (read-only backward compat):
  acceptableDiscrepancyThresholdPct?: number;

  // NEW:
  discrepancyAlarmVolumeM3: number;    // default 1.5
  discrepancyAlarmPercent: number;     // default 2.0

  // ...existing fields
}
```

**Migration:** On first load, if `discrepancyAlarmPercent` undefined but `acceptableDiscrepancyThresholdPct` present, carry old value forward. Volume threshold initializes to 1.5.

### 3.3 DashboardMetrics Extension

```ts
export interface DashboardMetrics {
  // ...existing fields
  recordsWithAlarmCount: number;       // NEW
}
```

### 3.4 Relational Schema Update

```sql
ALTER TABLE app_settings ADD COLUMN discrepancy_alarm_volume_m3 REAL NOT NULL DEFAULT 1.5
  CHECK (discrepancy_alarm_volume_m3 > 0);
ALTER TABLE app_settings ADD COLUMN discrepancy_alarm_percent REAL NOT NULL DEFAULT 2.0
  CHECK (discrepancy_alarm_percent > 0);
-- acceptable_discrepancy_threshold_pct kept for one release cycle (nullable, read-only).
```

---

## 4. Pure Business Logic

### 4.1 Evaluator (`src/utils/discrepancy.ts`)

```ts
export function evaluateDiscrepancy(input: {
  tallyVolumeM3: number;
  deliveredVolumeM3: number;
  tallyPieces: number;
  deliveredPieces: number;
  volumeThresholdM3: number;           // from AppSettings
  percentThreshold: number;            // from AppSettings
}): DiscrepancyEvaluation
```

**Algorithm:**
1. Compute `volumeDiscrepancyM3 = tally - delivered`.
2. Compute `volumeDiscrepancyPct = delivered > 0 ? (diff / delivered) * 100 : 0`.
3. Same for pieces.
4. Determine severity:
   - `|diff| < 0.001` → MATCH
   - `diff > 0` → SURPLUS (regardless of magnitude)
   - `diff < 0 AND (|diff| > volThresh OR |pct| > pctThresh)` → ALARM
   - Else (`diff < 0` within tolerance) → WITHIN_TOLERANCE
5. If ALARM, compose human-readable `reason` string.

**Boundary semantics:** Strict `>` (NOT `>=`). Diff exactly `-1.5m³` or `-2.0%` is WITHIN_TOLERANCE, not ALARM.

**Edge cases:**
- `deliveredVolumeM3 === 0` → `volumeDiscrepancyPct = 0`; alarm only via volume threshold.
- `deliveredPieces === 0` → `pieceDiscrepancyPct = 0`.

### 4.2 Validator (`src/utils/discrepancy-validation.ts`)

```ts
export function validateDiscrepancyInputs(input: {
  tallyVolumeM3?: number;
  deliveredVolumeM3?: number;
  tallyPieces?: number;
  deliveredPieces?: number;
}): { ok: boolean; errors: Record<string, string> }
```

Rejects any negative value; zero is allowed. Returns field-keyed errors for inline display.

### 4.3 Legacy Wrapper

```ts
// src/utils/timber-calc.ts
export function classifyDiscrepancy(diff: number, tolerance: number = 0.001): DiscrepancyStatus {
  // ...existing logic, kept intact
}
```

New consumers use `evaluateDiscrepancy()`. Legacy consumers unchanged.

---

## 5. API Contracts

### 5.1 Validation Enforcement
- `POST /api/records`: reject payload with negative tally/delivered → HTTP 400 + field errors.
- `PUT /api/records/[id]`: same.
- `POST /api/records/manifest` (multi-item): validate each item.

### 5.2 Settings PATCH
`PATCH /api/settings`:
```json
{
  "discrepancyAlarmVolumeM3": 1.5,
  "discrepancyAlarmPercent": 2.0
}
```
Both must be `> 0`. Reject otherwise.

---

## 6. Component Modular Decomposition (<250 LOC)

```
src/utils/
├── discrepancy.ts                   # evaluateDiscrepancy() (~130 LOC)
├── discrepancy-validation.ts        # validateDiscrepancyInputs() (~60 LOC)
└── timber-calc.ts                   # Modified: alarm count aggregation + wrapper

src/components/ui/
└── DiscrepancyBadge.tsx             # Reusable 4-severity badge (~110 LOC)

Modified (color overhaul only):
├── src/components/dashboard/KpiCards.tsx
├── src/components/tally/TallyDiscrepancyCard.tsx
├── src/components/analytics/FinancialOutlayBreakdown.tsx
├── src/components/suppliers/SupplierCard.tsx
├── src/components/suppliers/SupplierTable.tsx
├── src/components/ledger/RecordTableCompactView.tsx
└── Legacy: src/components/kpi-dashboard.ts, src/components/record-table.ts

Modified (validation wiring):
├── src/components/ledger/RecordModal.tsx
├── src/components/ledger/ReceivingManifestForm.tsx (or equivalent)
├── app/api/records/route.ts
└── app/api/records/[id]/route.ts

Modified (settings):
├── app/settings/page.tsx
├── src/hooks/useSettings.ts
├── src/persistence/sqlite/activity-queries.ts (settings schema)
└── src/persistence/supabase/master-data-supabase.ts (settings schema)
```

---

## 7. Business Rules & Edge Cases

### 7.1 Threshold Boundary
- Strict `>` comparison. Alarm requires exceeding threshold, not matching it.
- Rationale: operators tend to round values; boundary values more likely represent exact matches than violations.

### 7.2 Zero Delivered Volume
- Pct guard prevents division by zero.
- Alarm can still fire via absolute volume threshold if `|tally - 0| > 1.5`.

### 7.3 Surplus Semantics
- Surplus NEVER triggers alarm (per client spec).
- Blue (not green) emphasizes "informational, requires attention but not negative".

### 7.4 Alarm Count Aggregation
`aggregateDashboardMetrics(records)` iterates records once, calls evaluator per record using current settings, increments counter when `isAlarm = true`. O(n) with O(1) per record.

### 7.5 Settings Update Propagation
- Threshold changes immediately re-color all displayed badges (reactive via React state).
- No persistent history of "which records were alarms under old threshold" — snapshot-in-time view.

---

## 8. Acceptance Criteria

1. Record with delivered=10, tally=10 → MATCH badge gray.
2. Record with delivered=10, tally=11 → SURPLUS badge blue (not green).
3. Record with delivered=100, tally=99.5 → WITHIN_TOLERANCE badge amber (0.5m³, 0.5%).
4. Record with delivered=100, tally=97 → ALARM badge red (3m³ > 1.5, 3% > 2%).
5. Record with delivered=10, tally=8.5 (diff -1.5m³ exact) → WITHIN_TOLERANCE (strict boundary).
6. Submit record with tally=-5 → inline error, submit blocked client-side.
7. POST `/api/records` with negative tally → HTTP 400 with field error.
8. Change settings volume threshold to 5.0 → previously ALARM records drop to WITHIN_TOLERANCE.
9. Dashboard "Alarm Diskrepansi" KPI shows correct count.
10. Legacy `classifyDiscrepancy()` consumers unchanged in behavior.
11. All coordinator files <250 LOC.
12. `node --test` passes.

---

## 9. Non-Goals (YAGNI)

- No email/push notification system.
- No alarm history/log entity (standard activity log sufficient).
- No per-supplier custom thresholds (global settings only).

---

## 10. Verification & Success Criteria

1. **Pure logic tests:**
   - `test/discrepancy-eval.test.ts`: all severities, boundary values, zero-delivered edge cases, OR logic.
   - `test/discrepancy-validation.test.ts`: positive, zero, negative inputs.
2. **Build gate:** `npm run build:check` → 0 errors.
3. **Smoke test:** Section 8 acceptance criteria.
4. **Zero regression:** Legacy badge renderings continue; `classifyDiscrepancy()` output unchanged.

---

## 11. Contract Verification Checklist (Grep-Able Audit)

### 11.1 SSOT Types
```bash
grep -c "export type DiscrepancySeverity" src/types/index.ts
grep -c "export interface DiscrepancyEvaluation" src/types/index.ts
# EXPECT: each 1

grep -c "discrepancyAlarmVolumeM3\|discrepancyAlarmPercent" src/types/index.ts
# EXPECT: >= 2 (both fields present in AppSettings)
```

### 11.2 Pure Logic
```bash
grep -c "export function evaluateDiscrepancy" src/utils/discrepancy.ts
# EXPECT: 1

grep -c "export function validateDiscrepancyInputs" src/utils/discrepancy-validation.ts
# EXPECT: 1

# Legacy wrapper preserved
grep -c "export function classifyDiscrepancy" src/utils/timber-calc.ts
# EXPECT: 1
```

### 11.3 UI Badge Component
```bash
ls src/components/ui/DiscrepancyBadge.tsx
grep -c "SURPLUS\|WITHIN_TOLERANCE\|ALARM\|MATCH" src/components/ui/DiscrepancyBadge.tsx
# EXPECT: >= 4 (all severity variants rendered)
```

### 11.4 Validation Wiring
```bash
# Client-side validation
grep -rn "validateDiscrepancyInputs" src/components/ledger/
# EXPECT: >= 1 match in RecordModal or similar

# Server-side validation
grep -rn "validateDiscrepancyInputs" app/api/records/
# EXPECT: >= 1 match in POST/PUT routes
```

### 11.5 Settings Migration
```bash
grep -c "discrepancyAlarmVolumeM3\|discrepancyAlarmPercent" src/hooks/useSettings.ts
# EXPECT: >= 2 (defaults set)

grep -c "discrepancyAlarmVolumeM3\|discrepancyAlarmPercent" src/persistence/sqlite/activity-queries.ts
grep -c "discrepancyAlarmVolumeM3\|discrepancyAlarmPercent" src/persistence/supabase/master-data-supabase.ts
# EXPECT: both schemas carry new fields
```

### 11.6 Dashboard KPI
```bash
grep -c "recordsWithAlarmCount" src/types/index.ts
# EXPECT: 1 (in DashboardMetrics)

grep -c "recordsWithAlarmCount" src/utils/timber-calc.ts
# EXPECT: >= 1 (aggregator computes it)
```

### 11.7 Tests & Overall Gate
```bash
ls test/discrepancy-eval.test.ts test/discrepancy-validation.test.ts
node --test test/discrepancy-eval.test.ts test/discrepancy-validation.test.ts 2>&1 | grep "fail 0"
npm run drift:check && npm test
# EXPECT: all green
```
