# Implementation Plan: Full LMS IOH Design System Integration

**Initiative:** Modernize Wood Inventory Management UI/UX based on LMS IOH Design Reference  
**Spec Reference:** [`docs/frontend-design-spec.md`](file:///Users/mac/Web%20Development/wood-inventory-management/docs/frontend-design-spec.md)  
**Reference Repository:** `/Users/mac/Web Development/indosat/lms-isat`  
**Date:** 2026-10-15  
**Branch:** `vicky`  
**Status:** In Progress  

---

## 1. Goal & Architecture Overview

Elevate the entire user interface and user experience of `wood-inventory-management` to enterprise-grade standards matching the **Indosat Ooredoo Hutchison (IOH) LMS** platform. 

The implementation transitions the application into a cohesive, high-density industrial telemetry command center:
1. **Design Tokens & Typography:** Native Instrument Sans typography, OKLCH/Hex corporate palette (`#F9FAFB` canvas, `#101828` dark text, `#FFCC08` brand gold, `#ED1C24` alert red, `#00BB7F` surplus emerald).
2. **Sub-Metric Grid Architecture:** Adapting `lms-isat/resources/js/pages/summary/index.tsx` sub-metric mini-box cards for volumetric and financial reconciliation.
3. **Ergonomic Tally & Inspection Workflow:** Refined intake form modal with live dimensional auto-calculation and high-contrast reconciliation banner.
4. **Resilient Offline-First Ledger:** Zero layout shift, tabular monospace numbers, instant search filtering, and role-gated action controls.

---

## 2. Global Constraints & Codebase Invariants

- **Single Source of Truth (SSOT):** All domain entities (`WoodReceivingRecord`, `DashboardMetrics`, `RecordFilterCriteria`) must strictly import from `src/types/index.ts`. No duplicate inline interfaces.
- **God-File Prevention:** Every component file must remain concise (< 250 lines). Business math stays in pure functions (`src/utils/timber-calc.ts`).
- **Test-Driven Discipline:** Every new feature or refactor must be accompanied by unit or integration tests run via `node --test`.
- **Language Standard:** All source code, commit messages, comments, and technical plans must strictly remain in English.

---

## 3. File Structure & Scope Diff

```text
Modify:
  - app/globals.css                                  # Core design tokens and typography rules
  - app/layout.tsx                                   # Font preloading and global body shell
  - app/page.tsx                                     # Main dashboard orchestration and section anchors
  - src/components/dashboard/KpiCards.tsx            # Sub-metric mini boxes and volumetric hero
  - src/components/dashboard/SpeciesBar.tsx          # Proportional volume distribution and tooltips
  - src/components/ledger/Toolbar.tsx                # Quick filter pills, search input, and gold CTA
  - src/components/ledger/RecordTable.tsx            # High-density tabular ledger and status pills
  - src/components/ledger/RecordModal.tsx            # 4-step progressive inspection form and banner
  - src/components/layout/Navbar.tsx                 # Brand badge, facility status, and navigation tabs
  - src/components/layout/UserNav.tsx                # User profile, role badges, and logout modal

Create:
  - test/components/kpi-cards.test.ts                # Unit tests for KPI calculations and sub-boxes
  - test/components/toolbar-filters.test.ts          # Unit tests for search and species criteria
```

---

## 4. Phased Implementation Tasks

### Phase 1: KPI Cards Sub-Metric Mini-Boxes Refactor (ala `lms-isat`)

- [x] **Task 1.1: Write Unit Test for KPI Card Sub-Metric Calculations**
  - **File:** `test/kpi-cards.test.ts`
  - Verified metric calculations and variance formatting (Surplus vs Deficit).
  - Terminal test verification passed with 5/5 passing tests.

- [x] **Task 1.2: Implement `lms-isat` Sub-Metric Mini Boxes in `KpiCards.tsx`**
  - **File:** `src/components/dashboard/KpiCards.tsx`
  - Split each KPI card into structured sub-metric mini-boxes:
    - **Card 1 (Volume):** Hero m³ tally on top, with sub-boxes for `Surat Jalan (m³)` and `Selisih Fisik (+/- m³)`.
    - **Card 2 (Batang):** Total Batang on top, with sub-boxes for `SJ Batang` and `Selisih Batang`.
    - **Card 3 (Finansial):** Total Pengeluaran IDR on top, with sub-boxes for `Net Kayu` and `Net Ongkir`.
    - **Card 4 (Kavling):** Active Lots on top, with sub-boxes for `Total Rit` and `Status Lapangan`.
  - Added gradient headers `bg-gradient-to-br from-... to-white` matching `lms-isat/resources/js/pages/summary`.

---

### Phase 2: Species Volume Breakdown & Tooltip Enhancements

- [x] **Task 2.1: Enhance `SpeciesBar.tsx` Interaction & Monospace Precision**
  - **File:** `src/components/dashboard/SpeciesBar.tsx`
  - Added visual segment dividers, hover state illumination (`hover:brightness-110 hover:scale-y-110 transition-all`), and dimming of non-hovered segments.
  - Added sub-metric species cards matching `lms-isat` summary styling with tabular-nums percentage badges.
  - Added unit test suite in `test/species-bar.test.ts` verifying proportional distribution, multi-species datasets, and zero-record handling (3/3 passing).

---

### Phase 3: Ledger Toolbar Quick-Filter Pills & Feedback

- [ ] **Task 3.1: Write Unit Test for Toolbar Filter Criteria**
  - **File:** `test/components/toolbar-filters.test.ts`
  - Verify species selection and search query filtering.
- [ ] **Task 3.2: Implement Quick-Filter Species Pills in `Toolbar.tsx`**
  - **File:** `src/components/ledger/Toolbar.tsx`
  - In addition to the dropdown, render clickable quick-filter badges (`Semua`, `Teak`, `Mahoni`, `Meranti`, `Pine`) with active IOH gold highlight (`bg-[#ffc908] text-[#101828]` when selected).
  - Add clear search button (`<X />`) inside the search input when query is present.

---

### Phase 4: Ledger Table Ergonomics & Sorting

- [ ] **Task 4.1: Column Header Sorting (Date, Volume, Total)**
  - **File:** `src/components/ledger/RecordTable.tsx`
  - Add interactive sort toggles on `Penerimaan`, `Vol Tally`, and `Total Bayar`.
  - Maintain tabular monospace alignment and bilingual subheadings.
- [ ] **Task 4.2: Empty Search Result State Matching `lms-isat`**
  - Add clean empty state container with icon and "Reset Filter" quick action button.

---

### Phase 5: Intake & Inspection Modal Precision & Tally Matrix

- [ ] **Task 5.1: Physical Tally Dimension Calculator in `RecordModal.tsx`**
  - **File:** `src/components/ledger/RecordModal.tsx`
  - Add quick helper for dimensional calculation ($T \times L \times P \times \text{Batang} \div 1,000,000 = m^3$) to assist field operators entering raw log measurements.
  - Ensure real-time reconciliation banner dynamically recalculates timber gross, freight, tax deductions, and grand net payable.

---

### Phase 6: System Verification & End-to-End Regression Testing

- [ ] **Task 6.1: Run Full Test Suite**
  - Command: `npm test`
  - Verify 83+ tests pass with 0 failures.
- [ ] **Task 6.2: TypeScript Typecheck Verification**
  - Command: `npx tsc --noEmit`
  - Verify 0 type errors.
- [ ] **Task 6.3: Production Build Validation**
  - Command: `npm run build`
  - Verify Next.js 15 production build succeeds cleanly.
