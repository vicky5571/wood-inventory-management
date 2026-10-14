# Frontend Architecture & Design System Specification

**Project:** Wood & Timber Inventory Management System (`wood-inventory-management`)  
**Reference Model:** Indosat Ooredoo Hutchison LMS (`/Users/mac/Web Development/indosat/lms-isat` & `https://lmsioh.com/`)  
**Author:** Senior Software Engineer & System Architect  
**Status:** Approved & Implemented  
**Date:** 2026-10-15  

---

## 1. Executive Summary & Objective

This specification establishes the official frontend architecture, visual design language, and component engineering standards for the **Wood & Timber Inventory Management** platform. 

The design system is benchmarked directly against the enterprise architecture of **Indosat Ooredoo Hutchison (IOH) LMS** (`/Users/mac/Web Development/indosat/lms-isat`), harmonizing **high-density industrial logistics telemetry** with **clean corporate SaaS ergonomics**.

### Core Tenets
1. **Zero Guesswork / Strict SSOT:** All domain schemas and interfaces originate exclusively from `src/types/index.ts`.
2. **Tabular Data Precision:** All numerical measures (dimensions, piece counts, volume $m^3$, and IDR currency) must use `font-mono tabular-nums` to guarantee zero layout shifts during live data synchronization.
3. **Non-Destructive Ergonomics:** Form inputs, modals, and tables must provide instant feedback, auto-calculations, and visual reconciliation banners before state mutations occur.
4. **Accessible Role-Gated Workflows:** Strict hierarchy between **Level 1 (Manager - Full CRUD)**, **Level 2 (Admin - Read/Verify)**, and **Level 3 (Monitor - View-Only)**.

---

## 2. Design Tokens & Theme Foundation

The design token system is derived directly from `lms-isat/resources/css/app.css` and enhanced for timber logistics.

### 2.1 Color Palette & Variables

| Token Role | Value (Hex / OKLCH) | Semantic Purpose |
| :--- | :--- | :--- |
| **Canvas Background** | `#F9FAFB` / `oklch(0.985 0 0)` | Overall application background, low-glare surface |
| **Card Surface** | `#FFFFFF` / `oklch(1 0 0)` | Card containers, modals, table bodies |
| **Card Sub-surface** | `#F3F4F6` / `oklch(0.97 0 0)` | Sub-metric mini boxes, input backgrounds |
| **Primary Text (Charcoal)**| `#101828` / `oklch(0.145 0 0)`| Headings, hero numbers, prominent badges |
| **Muted Text** | `#6B7280` / `oklch(0.556 0 0)`| Secondary labels, subtitles, table meta |
| **Brand Primary (IOH Gold)**| `#FFC908` / `oklch(0.828 0.189 84.4)` | Primary CTA buttons, active highlights, input focus ring |
| **Brand Secondary (IOH Red)**| `#ED1C24` / `oklch(0.505 0.245 27.3)` | Critical deficits, delete triggers, alert indicators |
| **Operational Surplus (Emerald)**| `#00BB7F` / `oklch(0.696 0.17 162.5)` | Tally surplus pills, active realtime sync pulse |
| **Border Hairline** | `#E5E7EB` / `oklch(0.922 0 0)`| Clean separation lines without visual clutter |

### 2.2 Typography Stack

- **Primary Font Family:** `'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
  - Loaded via `https://fonts.bunny.net/css?family=instrument-sans:400,500,600,700`
- **Monospace Tabular Font Family:** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`
  - Applied with Tailwind classes: `font-mono tabular-nums`

```css
/* Typography Scale Standards */
--text-2xs: 10px / line-height: 14px (uppercase microcopy, Chinese subtitles)
--text-xs:  12px / line-height: 16px (table data, form labels, secondary badges)
--text-sm:  14px / line-height: 20px (body text, input text, toolbar buttons)
--text-base: 16px / line-height: 24px (card titles, subheaders)
--text-xl:  20px / line-height: 28px (page titles, section headings)
--text-3xl: 30px / line-height: 36px (KPI hero figures)
```

### 2.3 Geometry & Elevation Standards

- **Base Radius:** `var(--radius: 0.625rem)` (`10px`).
- **Container Radius:** `rounded-2xl` (`16px` to `20px`) for cards, modals, and table containers.
- **Interactive Control Radius:** `rounded-xl` (`12px`) for buttons, inputs, and dropdowns.
- **Pill Radius:** `rounded-full` for status chips and counter badges.
- **Shadows:** Soft diffuse shadows (`shadow-2xs`, `shadow-xs`, `shadow-sm`, `shadow-md`).

---

## 3. Component Architecture & Hierarchy

```text
app/layout.tsx (Instrument Sans Font + #F9FAFB Canvas)
 │
 ├── src/components/layout/Navbar.tsx
 │    ├── Brand Logo & Yard Status Badge
 │    ├── Section Navigation Tabs (Bilingual: ID / ZH)
 │    └── src/components/layout/UserNav.tsx (Profile + Role Badge + Logout)
 │
 └── app/page.tsx (Main Dashboard & Ledger View)
      │
      ├── Page Header (Realtime SSE Pulse + Operational Description)
      │
      ├── [Section: #dashboard]
      │    └── src/components/dashboard/KpiCards.tsx
      │         ├── Total Volume Tally Card (IOH Gold Hero Accent + Surplus/Deficit Pill)
      │         ├── Total Pieces Card (Delivered vs Tally Pieces)
      │         ├── Financial Outlay Card (Gross Timber vs Freight Split)
      │         └── Kavling & Batch Status Card
      │
      ├── [Section: #species]
      │    └── src/components/dashboard/SpeciesBar.tsx
      │         ├── Proportional Segmented Track
      │         └── Species Breakdown Legend (Teak, Meranti, Pine, etc.)
      │
      └── [Section: #ledger] (Gated for Level 1 & Level 2)
           ├── src/components/ledger/Toolbar.tsx
           │    ├── Search Input (Plat / Dok / Supplier / Kav)
           │    ├── Species Filter Dropdown
           │    ├── Export CSV Action Button
           │    ├── Reset Demo Data Button
           │    └── New Entry CTA Button (+ Input Kayu Masuk)
           │
           ├── src/components/ledger/RecordTable.tsx
           │    ├── Dense Data Table (13 Columns + Action Column)
           │    ├── Tabular Monospace Values (Batang, Volume m³, IDR)
           │    └── Inline Actions (Edit, Delete Confirmation)
           │
           └── src/components/ledger/RecordModal.tsx (Gated for Level 1)
                ├── Modal Header with IOH Brand Bar
                ├── Step 1: Dokumen & Pengiriman
                ├── Step 2: Spesifikasi Kayu & Lokasi
                ├── Step 3: Pengukuran Batang & Volume
                ├── Step 4: Harga Kayu, Ongkir & Pajak
                ├── Real-time Reconciliation & Math Preview Banner
                └── Action Footer (Batal / Simpan Data)
```

---

## 4. Component Technical Specifications

### 4.1 KPI Cards (`KpiCards.tsx`)
- **Grid Layout:** 4 columns on desktop (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`).
- **Hero Card (Volume):**
  - Top highlight bar: `h-1 bg-[#ffc908]`.
  - Icon container: `w-8 h-8 rounded-xl bg-[#ffc908]/15 text-[#b38600]`.
  - Number format: `metrics.totalTallyVolumeM3.toFixed(2)` with `m³` unit.
  - Variance pill:
    - Surplus ($\ge 0$): `bg-emerald-50 text-[#00bb7f] border-emerald-200/80` with `<TrendingUp />`.
    - Deficit ($< 0$): `bg-rose-50 text-[#ed1c24] border-rose-200/80` with `<TrendingDown />`.

### 4.2 Species Distribution Bar (`SpeciesBar.tsx`)
- **Container:** `bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs`.
- **Palette Scale:** `['#b45309', '#ffc908', '#0284c7', '#00bb7f', '#6366f1', '#ec4899']`.
- **Track Element:** `h-4 rounded-xl overflow-hidden bg-gray-100 p-0.5 gap-0.5`.
- **Interactive Tooltip:** Each slice displays species name, volume $m^3$, and percentage.

### 4.3 Ledger Toolbar (`Toolbar.tsx`)
- **Search Field:** Outlined input with `<Search />` icon at left (`pl-9`), focus ring in `#ffc908`.
- **Filter Select:** Native `<select>` styled with `rounded-xl border-gray-200 text-xs`.
- **Primary Action (New Entry):**
  - Styling: `bg-[#ffc908] hover:bg-[#f0bc00] text-[#101828] font-bold rounded-xl px-4.5 py-2 shadow-xs`.
  - Icon: `<Plus className="w-4 h-4 text-[#101828]" />`.

### 4.4 Ledger Data Table (`RecordTable.tsx`)
- **Header:** Sticky-compatible `bg-gray-50/80` with bilingual headers (e.g. `Penerimaan` / `到货日期`).
- **Row Styling:** Alternating hover highlight (`hover:bg-gray-50/70 transition-colors`).
- **Cell Alignment:**
  - Text: Left-aligned.
  - Quantities & Metrics: `font-mono tabular-nums` for strict digit alignment.
  - Currency: `formatRupiah(num)` in Indonesian locale (`IDR`).

### 4.5 Intake & Inspection Modal (`RecordModal.tsx`)
- **Dialog Shell:** `fixed inset-0 z-50 bg-[#101828]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5`.
- **Content Container:** `bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col`.
- **Live Math Integration:**
  - Pure calculation invoked on every change via `useMemo` calling `computeRecordCalculations(...)`.
  - Prevents NaN or negative inputs via `Math.max(0, Number(val) || 0)`.
- **High-Contrast Reconciliation Card:**
  - Background: `#101828` with `#ffc908` highlights.
  - Displays instant variance between `deliveredVolumeM3` and `tallyVolumeM3`.
  - Displays automated net deductions:
    $$\text{timberNetPayable} = \text{timberGrossTotal} - \text{timberPphAmount}$$
    $$\text{freightNetPayable} = \text{freightGrossTotal} - \text{freightPphAmount}$$
    $$\text{grandNetPayable} = \text{timberNetPayable} + \text{freightNetPayable} + \text{brokerFee}$$

---

## 5. Security & Permission Discipline

| Role Level | Role Title | Read Ledger | Write / Add Entry | Edit Records | Delete Records |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Level 1** | Factory Manager (`manager@pabrik.com`) | Yes | Yes | Yes | Yes |
| **Level 2** | Operations Admin (`admin@pabrik.com`) | Yes | No | No | No |
| **Level 3** | Executive Monitor (`monitor@pabrik.com`) | No (KPI Only)| No | No | No |

- In the UI, write actions are conditional on `canWrite` from `useAuth()`.
- Level 3 users receive the dedicated executive summary banner explaining access restrictions.

---

## 6. Verification & Test Invariants

All frontend changes must maintain 100% compliance with existing test harnesses:
- **Test Runner:** `node --test`
- **Smoke Tests:** `test/smoke.test.ts`
- **Modal Tests:** `test/record-modal.test.ts`
- **Storage CRUD:** `test/storage-crud.test.ts`
- **Type Checking:** `npx tsc --noEmit` must return 0 errors.

---

## 7. Implementation Checklist

- [x] Integrate Instrument Sans font family across root layout and Tailwind CSS config.
- [x] Configure base theme tokens in `globals.css` with IOH canvas `#f9fafb` and text `#101828`.
- [x] Redesign `KpiCards.tsx` with rounded-2xl containers, IOH gold hero card, and tabular numbers.
- [x] Redesign `SpeciesBar.tsx` with proportional volume track and updated palette.
- [x] Redesign `Toolbar.tsx` with IOH gold CTA button, search bar, and clean filter controls.
- [x] Redesign `RecordTable.tsx` with clean rows, tabular figures, and discrepancy status pills.
- [x] Redesign `Navbar.tsx` and `UserNav.tsx` with gold badge accents and smooth active tab indicators.
- [x] Overhaul `RecordModal.tsx` into a 4-step structured form with real-time math reconciliation.
- [x] Fix TypeScript type annotations across test suites.
- [x] Verify all 83 unit and integration tests pass with 0 regressions.
