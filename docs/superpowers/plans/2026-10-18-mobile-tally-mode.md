# Mobile Tally Mode & Field Ledger Synergy Implementation Plan (Phase 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide an ergonomic, high-contrast, touch-optimized field measuring interface for yard tallymen at `/tally`, seamlessly integrated with a responsive mobile card view inside `/ledger`.

**Architecture:** 
1. Core Calculation Engine: Add standard round log volumetric math ($0.7854 \times D^2 \times L \div 10,000$) to `src/utils/timber-calc.ts` to power the hybrid measurement pad.
2. Field Workstation Subcomponents: `TallyMeasurementPad.tsx` (< 200 LOC) provides rapid dimensional lumber ($T \times L \times P$) and round log ($D \times L$) calculation with $+1/+5/+10$ steppers; `TallyDiscrepancyCard.tsx` (< 120 LOC) renders real-time volumetric gap analysis against the Surat Jalan.
3. Dedicated Mobile Workstation Route: `app/tally/page.tsx` (< 200 LOC) integrates truck info, relational yard/kavling selectors, measurement pad, and direct manifest commitment via `defaultStorage` (`IndexedDbAdapter`) and background sync.
4. Ledger Mobile Card Feed: `RecordTableMobileView.tsx` (< 180 LOC) renders mobile cards for viewports < 768px, mounted inside `RecordTable.tsx` (< 220 LOC) alongside a quick-access shortcut to `/tally`.

**Tech Stack:** Node.js 26.8.1 (Native ESM & TypeScript), React 19, Tailwind CSS, Native IndexedDB (`window.indexedDB`), Native SQLite (`node:sqlite`).

**Spec:** `docs/superpowers/specs/2026-10-18-mobile-tally-mode-design.md`

## Global Constraints
- Maximum file size: keep all modules strictly under ~250 LOC (Strangler pattern on God files).
- Single Source of Truth (SSOT): all domain interfaces and entities must be imported from `src/types/index.ts`.
- Zero external dependencies: rely strictly on native Node.js 26 ESM, native browser APIs, Tailwind CSS, and Lucide icons.
- Backward compatibility: existing desktop ledger tables (`RecordTableExcelView`, `RecordTableCompactView`) and unpaginated/paginated APIs must continue to function without regressions.
- Automated test coverage: every task must provide automated tests executed via `node --test` with 0 failures.
- Language standard: source code, types, and git commits in English; user-facing labels remain bilingual Indonesian-Chinese.

---

### Task 1: Round Log Calculation Engine & Unit Tests

**Files:**
- Modify: `src/utils/timber-calc.ts`
- Test: `test/timber-calc.test.ts`

**Interfaces:**
- Produces in `src/utils/timber-calc.ts`:
  - `calculateRoundLogVolumeM3(diameterCm: number, lengthMeters: number, pieces?: number): number`
- Verifies:
  - Round log cylindrical cubic meter formula: $(0.7854 \times D^2 \times L \times \text{pieces}) / 10000$ rounded to 4 decimals.
  - Throws `RangeError` on negative inputs.
  - Returns `0` when any dimension or piece count is `0`.

- [x] **Step 1: Write failing unit test in `test/timber-calc.test.ts`**
  Asserts that `calculateRoundLogVolumeM3` accurately computes volume for typical log sizes (e.g., $D=40\,\text{cm}, L=4\,\text{m}, P=1 \implies 0.5027\,\text{m}^3$), handles zero inputs cleanly, and throws `RangeError` on negative inputs.
- [x] **Step 2: Run test to verify it fails**
  `node --test test/timber-calc.test.ts`
- [x] **Step 3: Implement `calculateRoundLogVolumeM3` in `src/utils/timber-calc.ts`**
  Add mathematical function and export with JSDoc comments. Keep `timber-calc.ts` < 250 LOC (currently 196 LOC).
- [x] **Step 4: Run test to verify it passes**
  `node --test test/timber-calc.test.ts`
- [x] **Step 5: Verify LOC limit and TypeScript compile**
  `wc -l src/utils/timber-calc.ts` (< 250 LOC) && `npx tsc --noEmit`
- [x] **Step 6: Commit**
  `git add src/utils/timber-calc.ts test/timber-calc.test.ts && git commit -m "feat(timber-calc): add calculateRoundLogVolumeM3 formula with unit tests"`

---

### Task 2: Mobile Tally Workstation Components (MeasurementPad & DiscrepancyCard)

**Files:**
- Create: `src/components/tally/TallyMeasurementPad.tsx`
- Create: `src/components/tally/TallyDiscrepancyCard.tsx`
- Test: `test/tally-components.test.ts`

**Interfaces:**
- `TallyMeasurementPadProps`:
  ```ts
  export interface TallyMeasurementPadProps {
    onApplyMeasurement: (result: {
      volumeM3: number;
      pieces: number;
      measurementType: 'SAWN' | 'ROUND';
      dimensionSummary: string;
    }) => void;
    initialPieces?: number;
  }
  ```
- `TallyDiscrepancyCardProps`:
  ```ts
  export interface TallyDiscrepancyCardProps {
    deliveredVolumeM3: number;
    deliveredPieces: number;
    tallyVolumeM3: number;
    tallyPieces: number;
  }
  ```

- [x] **Step 1: Write failing component tests in `test/tally-components.test.ts`**
  Asserts that:
  - `TallyMeasurementPad` toggles between Sawn Timber mode and Round Log mode.
  - Stepper buttons (`+1`, `+5`, `+10`, `-1`) correctly adjust piece count.
  - Dimension presets auto-populate dimensions and update computed volume on the fly.
  - `TallyDiscrepancyCard` computes $\Delta V$ and $\Delta B$, displaying bilingual badges: `Cocok / 匹配` (green), `Surplus / 超出` (blue), and `Penyusutan / 亏损` (red).
  - Both components adhere to `< 200 LOC` and `< 120 LOC` constraints.
- [x] **Step 2: Run test to verify it fails**
  `node --test test/tally-components.test.ts`
- [x] **Step 3: Implement `TallyMeasurementPad.tsx` and `TallyDiscrepancyCard.tsx`**
  Implement both components using Tailwind CSS, bilingual labels, and Lucide icons.
- [x] **Step 4: Run test to verify it passes**
  `node --test test/tally-components.test.ts`
- [x] **Step 5: Verify LOC limits and TypeScript compile**
  `wc -l src/components/tally/TallyMeasurementPad.tsx src/components/tally/TallyDiscrepancyCard.tsx` && `npx tsc --noEmit`
- [x] **Step 6: Commit**
  `git add src/components/tally/ test/tally-components.test.ts && git commit -m "feat(tally): create TallyMeasurementPad and TallyDiscrepancyCard components"`

---

### Task 3: Dedicated Fullscreen Mobile Route (`app/tally/page.tsx`)

**Files:**
- Create: `app/tally/page.tsx`
- Test: `test/tally-page.test.ts`

**Interfaces:**
- Consumes:
  - `YardSelect`, `KavlingSelect` from `src/components/ledger/`
  - `TallyMeasurementPad`, `TallyDiscrepancyCard` from `src/components/tally/`
  - `useWoodRecords` / `defaultStorage` (`IndexedDbAdapter`)
  - `useAuth` for Level 1 write guard
- Produces:
  - Next.js Client Page at `/tally` (< 200 LOC).
  - High-contrast outdoor header with offline/online indicator.
  - Manifest construction and direct saving to IndexedDB / API sync.

- [ ] **Step 1: Write failing integration test in `test/tally-page.test.ts`**
  Asserts that:
  - `app/tally/page.tsx` exists and imports required subcomponents.
  - Adheres to `< 250 LOC` Strangler invariant.
  - Enforces `canWrite` (Level 1 / Owner) check for the commit button.
  - Form validation requires truck plate number, supplier, wood species, and storage yard.
- [ ] **Step 2: Run test to verify it fails**
  `node --test test/tally-page.test.ts`
- [ ] **Step 3: Implement `app/tally/page.tsx`**
  Build the streamlined mobile field workstation with sticky action footer and direct manifest saving.
- [ ] **Step 4: Run test to verify it passes**
  `node --test test/tally-page.test.ts`
- [ ] **Step 5: Verify LOC limits and TypeScript compile**
  `wc -l app/tally/page.tsx` (< 200 LOC) && `npx tsc --noEmit`
- [ ] **Step 6: Commit**
  `git add app/tally/page.tsx test/tally-page.test.ts && git commit -m "feat(tally): implement dedicated mobile tally workstation page"`

---

### Task 4: Ledger Mobile Card Feed & Mode Switcher (`RecordTableMobileView.tsx`, `RecordTable.tsx`)

**Files:**
- Create: `src/components/ledger/RecordTableMobileView.tsx`
- Modify: `src/components/ledger/RecordTable.tsx`
- Test: `test/record-table-mobile.test.ts`

**Interfaces:**
- Consumes: `RecordTableMobileViewProps`
- Produces:
  - `RecordTableMobileView.tsx` (< 180 LOC): renders incoming trucks as touch-friendly cards with plate, supplier, yard/kavling pills, delivered vs tally volume, payment badge, and action triggers (Edit, Delete, Cetak).
  - Upgraded `RecordTable.tsx` (< 220 LOC): adds mobile view mode toggle (`'excel' | 'compact' | 'mobile'`) and renders a prominent quick-action banner: `"📱 Mode Tally Lapangan (打开检尺工作台)"` linking to `/tally`.

- [ ] **Step 1: Write failing component test in `test/record-table-mobile.test.ts`**
  Asserts that:
  - `RecordTableMobileView.tsx` renders record cards with correct data attributes.
  - Edit and Delete actions are hidden or disabled when `canWrite = false`.
  - `RecordTable.tsx` supports `'mobile'` view mode.
  - `RecordTable.tsx` contains the shortcut banner linking to `/tally`.
  - Both files satisfy `< 250 LOC` ceiling.
- [ ] **Step 2: Run test to verify it fails**
  `node --test test/record-table-mobile.test.ts`
- [ ] **Step 3: Implement `RecordTableMobileView.tsx` and integrate into `RecordTable.tsx`**
  Build mobile card component and wire view switcher into `RecordTable.tsx`.
- [ ] **Step 4: Run test to verify it passes**
  `node --test test/record-table-mobile.test.ts test/record-table.test.ts`
- [ ] **Step 5: Verify LOC limits and TypeScript compile**
  `wc -l src/components/ledger/RecordTableMobileView.tsx src/components/ledger/RecordTable.tsx` && `npx tsc --noEmit`
- [ ] **Step 6: Commit**
  `git add src/components/ledger/RecordTableMobileView.tsx src/components/ledger/RecordTable.tsx test/record-table-mobile.test.ts && git commit -m "feat(ledger): add RecordTableMobileView and mobile tally shortcut banner"`

---

### Task 5: End-to-End Verification & Full Regression

**Files:**
- All touched files

- [ ] **Step 1: Run complete test suite**
  `npm test` (verify 420+ passing tests with 0 failures)
- [ ] **Step 2: Run Next.js production build**
  `npm run build:check` (verify 0 TypeScript, lint, or static generation errors across all 14 routes)
- [ ] **Step 3: Whole-plan code review**
  Perform diff inspection across all commits and confirm global constraints.
- [ ] **Step 4: Finalize and commit**
  `git commit --allow-empty -m "chore(release): complete Phase 6 Mobile Tally Mode and Field Ledger Synergy"`

