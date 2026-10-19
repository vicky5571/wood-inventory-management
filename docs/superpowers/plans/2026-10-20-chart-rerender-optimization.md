# Chart Lifecycle & In-Place Rendering Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate canvas flickers, blank hydration flashes, and repeated chart animation resets when navigating to the Ringkasan (`/`) dashboard by implementing in-place Chart.js updates (`chart.update('none')`), fixing unmemoized dependency bugs in `SpeciesDonutChart`, and caching datasets across route transitions.

**Architecture:** 
1. Maintain an in-memory module-level cache in `useWoodRecords` and `useWoodSalesRecords` so route transitions immediately mount with active data (0ms delay, bypassing the `[]` initial state flash).
2. Add shallow/timestamp payload equality checks in `syncWithServer` to prevent redundant re-renders when server data is unchanged.
3. Transform all 5 analytical chart components (`VolumeTrendChart`, `SpeciesDonutChart`, `SupplierBarChart`, `InventoryFlowChart`, `CustomerSalesBarChart`) from destructive canvas teardown (`destroy()` + `new Chart()`) to non-destructive in-place data mutations (`chart.update('none')`), destroying only on unmount.
4. Memoize all chart data preparation routines (`prepareSpeciesDonutData`, etc.) to guarantee referential stability.

**Tech Stack:** Next.js 15 App Router, React 19, Chart.js 4, TypeScript, Node.js Native Test Runner (`node:test` + `node:assert/strict`).

**Spec:** `docs/superpowers/specs/2026-10-20-chart-rerender-optimization-design.md`

## Global Constraints
- All coordinator and component files must remain strictly under the 250 LOC ceiling.
- Zero new npm dependencies; standard library and native Chart.js APIs only.
- Single Source of Truth (SSOT): All domain interfaces imported from `src/types/index.ts`.
- All tests must run using Node.js native test runner (`node --test <path>`).
- All code, comments, plans, and commit messages must be strictly in English.

---

### Task 1: Module-Level Memory Cache & Sync Equality Guards (`useWoodRecords.ts` & `useWoodSalesRecords.ts`)

**Files:**
- Modify: `src/hooks/useWoodRecords.ts:1-95`
- Modify: `src/hooks/useWoodSalesRecords.ts:1-80`
- Test: `test/analytics-rerender-optimization.test.ts`

**Interfaces:**
- Consumes: `WoodReceivingRecord`, `WoodSalesRecord` from `src/types/index.ts`
- Produces: Seamless instantaneous hook mounting with non-empty initial state when warm cache exists; skips `setState` when server sync returns identical data.

- [x] **Step 1: Write failing tests for hook cache and sync guard in `test/analytics-rerender-optimization.test.ts`**

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('Chart Rerender Optimization & In-Memory Cache Suite', async (t) => {
  await t.test('useWoodRecords maintains in-memory cache and sync equality guard', () => {
    const file = readFileSync(resolve('src/hooks/useWoodRecords.ts'), 'utf-8');
    assert.match(file, /memoryRecordsCache/, 'useWoodRecords must define module-scoped memoryRecordsCache');
    assert.match(file, /areRecordsEqual/, 'useWoodRecords must implement payload equality guard for server sync');
  });

  await t.test('useWoodSalesRecords maintains in-memory cache and sync equality guard', () => {
    const file = readFileSync(resolve('src/hooks/useWoodSalesRecords.ts'), 'utf-8');
    assert.match(file, /memorySalesCache/, 'useWoodSalesRecords must define module-scoped memorySalesCache');
    assert.match(file, /areSalesEqual/, 'useWoodSalesRecords must implement payload equality guard for server sync');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test test/analytics-rerender-optimization.test.ts`
Expected: FAIL with "useWoodRecords must define module-scoped memoryRecordsCache"

- [x] **Step 3: Implement module cache & sync guard in `useWoodRecords.ts` and `useWoodSalesRecords.ts`**

In `src/hooks/useWoodRecords.ts`:
```typescript
let memoryRecordsCache: WoodReceivingRecord[] | null = null;

export function areRecordsEqual(prev: WoodReceivingRecord[], next: WoodReceivingRecord[]): boolean {
  if (prev.length !== next.length) return false;
  if (prev.length === 0) return true;
  return (
    prev[0]?.id === next[0]?.id &&
    prev[0]?.updatedAt === next[0]?.updatedAt &&
    prev[prev.length - 1]?.id === next[next.length - 1]?.id
  );
}

// In useWoodRecords():
const [allRecords, setAllRecords] = useState<WoodReceivingRecord[]>(() => memoryRecordsCache || []);
const [isHydrated, setIsHydrated] = useState(() => memoryRecordsCache !== null);

// In persistRecords / state setters:
memoryRecordsCache = next;

// In syncWithServer:
if (!hasMutatedRef.current && json?.success && Array.isArray(json.data)) {
  if (!areRecordsEqual(recordsRef.current, json.data)) {
    recordsRef.current = json.data;
    memoryRecordsCache = json.data;
    setAllRecords(json.data);
    persistRecords(json.data);
  }
}
```

In `src/hooks/useWoodSalesRecords.ts`:
```typescript
let memorySalesCache: WoodSalesRecord[] | null = null;

export function areSalesEqual(prev: WoodSalesRecord[], next: WoodSalesRecord[]): boolean {
  if (prev.length !== next.length) return false;
  if (prev.length === 0) return true;
  return (
    prev[0]?.id === next[0]?.id &&
    prev[0]?.updatedAt === next[0]?.updatedAt &&
    prev[prev.length - 1]?.id === next[next.length - 1]?.id
  );
}

// In useWoodSalesRecords():
const [sales, setSales] = useState<WoodSalesRecord[]>(() => memorySalesCache || []);
const [isHydrated, setIsHydrated] = useState(() => memorySalesCache !== null);

// In persistSales / state setters:
memorySalesCache = nextSales;

// In syncWithServer:
if (isMounted && !hasMutatedRef.current && json?.success && Array.isArray(json.data)) {
  if (!areSalesEqual(salesRef.current, json.data)) {
    salesRef.current = json.data;
    memorySalesCache = json.data;
    setSales(json.data);
    await persistSales(json.data);
  }
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `node --test test/analytics-rerender-optimization.test.ts`
Expected: PASS

- [x] **Step 5: Verify LOC limits and TypeScript compile**

Run: `wc -l src/hooks/useWoodRecords.ts src/hooks/useWoodSalesRecords.ts` (Both < 250 LOC)
Run: `npx tsc --noEmit`

- [x] **Step 6: Commit**

```bash
git add src/hooks/useWoodRecords.ts src/hooks/useWoodSalesRecords.ts test/analytics-rerender-optimization.test.ts
git commit -m "perf(hooks): add module-level memory cache and sync equality guards to prevent re-render cascades"
```

---

### Task 2: In-Place Chart Updates for VolumeTrendChart & SpeciesDonutChart

**Files:**
- Modify: `src/components/analytics/VolumeTrendChart.tsx`
- Modify: `src/components/analytics/SpeciesDonutChart.tsx`
- Test: `test/analytics-rerender-optimization.test.ts`

**Interfaces:**
- Consumes: `records: WoodReceivingRecord[]`
- Produces: Zero canvas resets on data changes; in-place data refresh via `chart.update('none')`; memoized `donutData` in `SpeciesDonutChart`.

- [x] **Step 1: Write component contract tests in `test/analytics-rerender-optimization.test.ts`**

```typescript
  await t.test('VolumeTrendChart and SpeciesDonutChart use in-place chart.update instead of teardown', () => {
    const volFile = readFileSync(resolve('src/components/analytics/VolumeTrendChart.tsx'), 'utf-8');
    assert.match(volFile, /chartInstanceRef\.current\.update/, 'VolumeTrendChart must call chart.update');
    assert.doesNotMatch(volFile, /if\s*\(chartInstanceRef\.current\)\s*\{\s*chartInstanceRef\.current\.destroy\(\);/m, 'VolumeTrendChart must not destroy chart on every render effect');

    const donutFile = readFileSync(resolve('src/components/analytics/SpeciesDonutChart.tsx'), 'utf-8');
    assert.match(donutFile, /useMemo\(/, 'SpeciesDonutChart must memoize donutData');
    assert.match(donutFile, /chartInstanceRef\.current\.update/, 'SpeciesDonutChart must call chart.update');
    assert.doesNotMatch(donutFile, /if\s*\(chartInstanceRef\.current\)\s*\{\s*chartInstanceRef\.current\.destroy\(\);/m, 'SpeciesDonutChart must not destroy chart on every render effect');
  });
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test test/analytics-rerender-optimization.test.ts`
Expected: FAIL with assertion error

- [x] **Step 3: Update `VolumeTrendChart.tsx` and `SpeciesDonutChart.tsx`**

In `src/components/analytics/VolumeTrendChart.tsx`:
```tsx
export function VolumeTrendChart({ records }: { records: WoodReceivingRecord[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const trendData = useMemo(() => prepareVolumeTrendData(records), [records]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const { labels, deliveredVolumes, tallyVolumes } = trendData;
    if (labels.length === 0) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.data.labels = labels;
      chartInstanceRef.current.data.datasets[0].data = tallyVolumes;
      chartInstanceRef.current.data.datasets[1].data = deliveredVolumes;
      chartInstanceRef.current.update('none');
      return;
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Volume Tally / 检尺立方 (m³)',
            data: tallyVolumes,
            borderColor: '#b45309',
            backgroundColor: 'rgba(180, 83, 9, 0.1)',
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointBackgroundColor: '#b45309',
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            label: 'Surat Jalan / 送货立方 (m³)',
            data: deliveredVolumes,
            borderColor: '#94a3b8',
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            tension: 0.35,
            borderWidth: 2,
            pointBackgroundColor: '#94a3b8',
            pointRadius: 3,
            pointHoverRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 12,
              boxHeight: 12,
              usePointStyle: true,
              pointStyle: 'circle',
              font: { size: 11, family: 'inherit', weight: 500 },
              color: '#475569',
            },
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            padding: 10,
            cornerRadius: 10,
            titleFont: { size: 12, weight: 600 },
            bodyFont: { size: 11 },
            callbacks: {
              label: (context) => ` ${context.dataset.label}: ${(context.parsed.y ?? 0).toFixed(2)} m³`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(241, 245, 249, 0.8)' },
            ticks: { font: { size: 10 }, color: '#64748b' },
          },
          y: {
            grid: { color: 'rgba(241, 245, 249, 0.8)' },
            ticks: {
              font: { size: 10 },
              color: '#64748b',
              callback: (val) => `${val} m³`,
            },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [trendData]);
  // ...
```

In `src/components/analytics/SpeciesDonutChart.tsx`:
```tsx
export function SpeciesDonutChart({ records }: { records: WoodReceivingRecord[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const donutData = useMemo(() => prepareSpeciesDonutData(records), [records]);
  const totalVolume = useMemo(() => donutData.values.reduce((a, b) => a + b, 0), [donutData]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const { labels, values, colors } = donutData;
    if (labels.length === 0) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.data.labels = labels;
      chartInstanceRef.current.data.datasets[0].data = values;
      chartInstanceRef.current.data.datasets[0].backgroundColor = colors;
      chartInstanceRef.current.update('none');
      return;
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartInstanceRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderColor: '#ffffff',
            borderWidth: 2,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              pointStyle: 'circle',
              font: { size: 11, family: 'inherit' },
              color: '#334155',
              padding: 12,
              generateLabels: (chart) => {
                const data = chart.data;
                if (!data.labels?.length || !data.datasets.length) return [];
                const dataset = data.datasets[0];
                return data.labels.map((label, i) => {
                  const val = dataset.data[i] as number;
                  const pct = totalVolume > 0 ? ((val / totalVolume) * 100).toFixed(1) : '0';
                  return {
                    text: `${label} (${pct}%)`,
                    fillStyle: (dataset.backgroundColor as string[])[i],
                    strokeStyle: '#fff',
                    lineWidth: 1,
                    index: i,
                  };
                });
              },
            },
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            padding: 10,
            cornerRadius: 10,
            titleFont: { size: 12, weight: 600 },
            bodyFont: { size: 11 },
            callbacks: {
              label: (context) => {
                const val = context.parsed;
                const pct = totalVolume > 0 ? ((val / totalVolume) * 100).toFixed(1) : '0';
                return ` ${val.toFixed(2)} m³ (${pct}%)`;
              },
            },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [donutData, totalVolume]);
  // ...
```

- [x] **Step 4: Run test to verify it passes**

Run: `node --test test/analytics-rerender-optimization.test.ts`
Expected: PASS

- [x] **Step 5: Verify LOC limits and TypeScript compile**

Run: `wc -l src/components/analytics/VolumeTrendChart.tsx src/components/analytics/SpeciesDonutChart.tsx` (Both < 200 LOC)
Run: `npx tsc --noEmit`

- [x] **Step 6: Commit**

```bash
git add src/components/analytics/VolumeTrendChart.tsx src/components/analytics/SpeciesDonutChart.tsx test/analytics-rerender-optimization.test.ts
git commit -m "fix(analytics): implement in-place chart update and memoization for volume trend and species donut"
```

---

### Task 3: In-Place Chart Updates for SupplierBarChart, InventoryFlowChart & CustomerSalesBarChart

**Files:**
- Modify: `src/components/analytics/SupplierBarChart.tsx`
- Modify: `src/components/analytics/InventoryFlowChart.tsx`
- Modify: `src/components/analytics/CustomerSalesBarChart.tsx`
- Test: `test/analytics-rerender-optimization.test.ts`

**Interfaces:**
- Consumes: `records`, `inboundRecords`, `salesRecords`
- Produces: In-place data updates via `chart.update('none')` across remaining analytics components.

- [x] **Step 1: Write component contract tests in `test/analytics-rerender-optimization.test.ts`**

```typescript
  await t.test('SupplierBarChart, InventoryFlowChart, and CustomerSalesBarChart use in-place chart.update', () => {
    const supFile = readFileSync(resolve('src/components/analytics/SupplierBarChart.tsx'), 'utf-8');
    assert.match(supFile, /chartInstanceRef\.current\.update/, 'SupplierBarChart must call chart.update');

    const flowFile = readFileSync(resolve('src/components/analytics/InventoryFlowChart.tsx'), 'utf-8');
    assert.match(flowFile, /chartInstanceRef\.current\.update/, 'InventoryFlowChart must call chart.update');

    const custFile = readFileSync(resolve('src/components/analytics/CustomerSalesBarChart.tsx'), 'utf-8');
    assert.match(custFile, /chartInstanceRef\.current\.update/, 'CustomerSalesBarChart must call chart.update');
  });
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test test/analytics-rerender-optimization.test.ts`
Expected: FAIL with assertion error

- [x] **Step 3: Update `SupplierBarChart.tsx`, `InventoryFlowChart.tsx`, and `CustomerSalesBarChart.tsx`**

In `src/components/analytics/SupplierBarChart.tsx`:
- Wrap `prepareSupplierBarData(records)` in `useMemo`.
- In `useEffect`: if `chartInstanceRef.current` exists, update `labels`, `datasets[0].data = tally`, `datasets[1].data = delivered`, and call `chart.update('none')`. Destroy only on unmount.

In `src/components/analytics/InventoryFlowChart.tsx`:
- Wrap `prepareInventoryFlowData(inboundRecords, salesRecords)` in `useMemo`.
- In `useEffect`: if `chartInstanceRef.current` exists, update `labels`, `datasets[0].data = inboundVolumes`, `datasets[1].data = outboundVolumes`, `datasets[2].data = netVolumes`, and call `chart.update('none')`. Destroy only on unmount.

In `src/components/analytics/CustomerSalesBarChart.tsx`:
- Wrap `prepareCustomerSalesData(salesRecords, 5)` in `useMemo`.
- In `useEffect`: if `chartInstanceRef.current` exists, update `labels`, `datasets[0].data = volumes`, and call `chart.update('none')`. Destroy only on unmount.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test test/analytics-rerender-optimization.test.ts`
Expected: PASS

- [x] **Step 5: Verify LOC limits and TypeScript compile**

Run: `wc -l src/components/analytics/SupplierBarChart.tsx src/components/analytics/InventoryFlowChart.tsx src/components/analytics/CustomerSalesBarChart.tsx` (All < 200 LOC)
Run: `npx tsc --noEmit`

- [x] **Step 6: Commit**

```bash
git add src/components/analytics/SupplierBarChart.tsx src/components/analytics/InventoryFlowChart.tsx src/components/analytics/CustomerSalesBarChart.tsx test/analytics-rerender-optimization.test.ts
git commit -m "fix(analytics): implement in-place chart updates for supplier ranking, inventory flow, and customer sales"
```

---

### Task 4: End-to-End Verification & Full Regression

**Files:**
- Test: All suites in `test/`
- Build: Next.js production build (`app/`)

- [x] **Step 1: Run complete analytics and routing test suite**

Run: `node --test test/analytics-rerender-optimization.test.ts test/analytics-components.test.ts test/sales-analytics.test.ts test/use-wood-records.test.ts test/use-wood-sales-records.test.ts test/nav-routing.test.ts`
Expected: All tests PASS with 0 errors.

- [x] **Step 2: Run Next.js production build check**

Run: `npm run build:check`
Expected: 0 errors, successful static generation and compilation across all routes.

- [x] **Step 3: Run full automated test suite**

Run: `npm test`
Expected: 530+ tests passing.

- [x] **Step 4: Final commit**

```bash
git commit --allow-empty -m "chore(release): complete chart lifecycle and in-place re-render optimization on Ringkasan"
```
