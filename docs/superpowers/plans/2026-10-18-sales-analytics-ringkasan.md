# Implementation Plan: Sales & Inventory Flow Analytics on Ringkasan (Options A & B)

This implementation plan outlines the engineering steps to add executive sales insights and timber inventory flow analysis to the **Ringkasan (运营概况)** dashboard (`app/page.tsx`).

---

### User Intent & Architectural Scope
- **Option A (Inflow vs Outflow)**: Comparative visualization of timber volume received into log yards vs timber volume sold/dispatched outbound ($m^3$) over time.
- **Option B (Sales Revenue & Top Customers)**: Detailed commercial performance tracking showing sales revenue trend, top purchasing customers, and outstanding receivables.
- **Invariants**:
  - Keep coordinator `app/page.tsx` strictly `< 250 LOC` (Strangler pattern on God files).
  - Extract pure data transformation helpers into `src/components/analytics/sales-chart-helpers.ts` (< 150 LOC).
  - Zero external npm dependencies beyond existing `chart.js` and `lucide-react`.
  - 100% automated test coverage in `test/sales-analytics.test.ts`.

---

### Proposed Architecture & Directory Layout

```
src/
├── types/
│   └── index.ts                               # Central domain types (SSOT)
└── components/
    └── analytics/
        ├── sales-chart-helpers.ts             # (< 150 LOC) Pure data aggregation for Chart.js
        ├── InventoryFlowChart.tsx             # (< 180 LOC) Inbound vs Outbound volume comparison chart
        └── CustomerSalesBarChart.tsx          # (< 180 LOC) Top customer volume & revenue bar chart
app/
└── page.tsx                                   # (< 220 LOC) Executive dashboard coordinator
test/
└── sales-analytics.test.ts                    # Unit & contract tests for sales analytics
```

---

### Task 1: Pure Sales Chart Data Aggregation Engine (`sales-chart-helpers.ts`)

**Files:**
- Create: `src/components/analytics/sales-chart-helpers.ts`
- Test: `test/sales-analytics.test.ts`

**Interfaces:**
```ts
export interface InventoryFlowData {
  labels: string[];
  inboundVolumes: number[];
  outboundVolumes: number[];
  netVolumes: number[];
}

export interface CustomerSalesData {
  labels: string[];
  volumes: number[];
  revenues: number[];
}
```

- [x] **Step 1: Write failing data helper tests in `test/sales-analytics.test.ts`**
  Asserts that:
  - `prepareInventoryFlowData` merges unique dates chronologically and aggregates inbounds vs outbounds.
  - Correctly calculates `netVolumes = inbound - outbound`.
  - `prepareCustomerSalesData` groups sales by customer, sorts descending by volume, and limits to top N.
  - Handles empty inputs gracefully without throwing.
- [x] **Step 2: Run test to verify it fails**
  `node --test test/sales-analytics.test.ts`
- [x] **Step 3: Implement `src/components/analytics/sales-chart-helpers.ts`**
  Pure functions with zero side effects.
- [x] **Step 4: Run test to verify it passes**
  `node --test test/sales-analytics.test.ts`
- [x] **Step 5: Verify LOC limits and TypeScript compile**
  `wc -l src/components/analytics/sales-chart-helpers.ts` (< 150 LOC) && `npx tsc --noEmit`
- [x] **Step 6: Commit**
  `git add src/components/analytics/sales-chart-helpers.ts test/sales-analytics.test.ts && git commit -m "feat(analytics): add data aggregation helpers for inventory flow and customer sales"`

---

### Task 2: Inventory Inflow vs. Outflow Comparison Chart (`InventoryFlowChart.tsx`)

**Files:**
- Create: `src/components/analytics/InventoryFlowChart.tsx`
- Test: `test/sales-analytics.test.ts`

**Interfaces:**
```ts
export interface InventoryFlowChartProps {
  inboundRecords: WoodReceivingRecord[];
  salesRecords: WoodSalesRecord[];
}
```

- [x] **Step 1: Write component contract tests in `test/sales-analytics.test.ts`**
  Asserts that:
  - `InventoryFlowChart.tsx` exists and obeys `< 180 LOC` ceiling.
  - Imports and uses `prepareInventoryFlowData`.
  - Implements canvas ref lifecycle with proper Chart.js instance destruction on re-render.
  - Renders bilingual header `Arus Inventaris: Masuk vs. Keluar (库存进出流水)`.
  - Handles empty dataset with fallback message.
- [x] **Step 2: Run test to verify it fails**
  `node --test test/sales-analytics.test.ts`
- [x] **Step 3: Implement `src/components/analytics/InventoryFlowChart.tsx`**
  Build Chart.js dual-dataset chart with green (Masuk) and amber (Keluar).
- [x] **Step 4: Run test to verify it passes**
  `node --test test/sales-analytics.test.ts`
- [x] **Step 5: Verify LOC limits and TypeScript compile**
  `wc -l src/components/analytics/InventoryFlowChart.tsx` (< 180 LOC) && `npx tsc --noEmit`
- [x] **Step 6: Commit**
  `git add src/components/analytics/InventoryFlowChart.tsx test/sales-analytics.test.ts && git commit -m "feat(analytics): create InventoryFlowChart component"`

---

### Task 3: Top Customer Sales Performance Chart (`CustomerSalesBarChart.tsx`)

**Files:**
- Create: `src/components/analytics/CustomerSalesBarChart.tsx`
- Test: `test/sales-analytics.test.ts`

**Interfaces:**
```ts
export interface CustomerSalesBarChartProps {
  salesRecords: WoodSalesRecord[];
}
```

- [x] **Step 1: Write component contract tests in `test/sales-analytics.test.ts`**
  Asserts that:
  - `CustomerSalesBarChart.tsx` exists and obeys `< 180 LOC` ceiling.
  - Imports and uses `prepareCustomerSalesData`.
  - Implements horizontal or grouped bar chart displaying volume and revenue.
  - Renders bilingual header `Peringkat Pembeli Utama (大客户销售榜)`.
- [x] **Step 2: Run test to verify it fails**
  `node --test test/sales-analytics.test.ts`
- [x] **Step 3: Implement `src/components/analytics/CustomerSalesBarChart.tsx`**
  Build responsive Chart.js customer ranking chart with formatted tooltips.
- [x] **Step 4: Run test to verify it passes**
  `node --test test/sales-analytics.test.ts`
- [x] **Step 5: Verify LOC limits and TypeScript compile**
  `wc -l src/components/analytics/CustomerSalesBarChart.tsx` (< 180 LOC) && `npx tsc --noEmit`
- [x] **Step 6: Commit**
  `git add src/components/analytics/CustomerSalesBarChart.tsx test/sales-analytics.test.ts && git commit -m "feat(analytics): create CustomerSalesBarChart component"`

---

### Task 4: Mount Sales Analytics on Ringkasan Page (`app/page.tsx`)

**Files:**
- Modify: `app/page.tsx`
- Test: `test/sales-analytics.test.ts`

- [x] **Step 1: Write dashboard integration tests in `test/sales-analytics.test.ts`**
  Asserts that:
  - `app/page.tsx` integrates `useWoodSalesRecords`.
  - Mounts `InventoryFlowChart` and `CustomerSalesBarChart`.
  - Maintains coordinator size strictly `< 220 LOC`.
  - Includes jump card to `/sales` in the navigation section.
- [x] **Step 2: Run test to verify it fails**
  `node --test test/sales-analytics.test.ts`
- [x] **Step 3: Update `app/page.tsx`**
  Mount charts cleanly in a new section `Analitik Penjualan & Arus Stok (销售与库存动态)`.
- [x] **Step 4: Run test to verify it passes**
  `node --test test/sales-analytics.test.ts`
- [x] **Step 5: Verify LOC limits and TypeScript compile**
  `wc -l app/page.tsx` (< 220 LOC) && `npx tsc --noEmit`
- [x] **Step 6: Commit**
  `git add app/page.tsx test/sales-analytics.test.ts && git commit -m "feat(dashboard): integrate sales insights and inventory flow charts into Ringkasan"`

---

### Task 5: End-to-End Verification & Full Regression

- [x] **Step 1: Run complete test suite**
  `npm test` (verify 455+ passing tests with 0 failures)
- [x] **Step 2: Run Next.js production build**
  `npm run build:check` (verify 0 TypeScript, lint, or static generation errors across all 15 routes)
- [x] **Step 3: Final release commit**
  `git commit --allow-empty -m "chore(release): complete sales insights and inventory flow charts on Ringkasan"`
