# Chart Lifecycle & In-Place Rendering Optimization Design Spec

## 1. Problem Statement & Root Cause Analysis

When users navigate to the **Ringkasan** (`/`) dashboard from another route (such as `/ledger` or `/sales`), all five analytical charts (`VolumeTrendChart`, `SpeciesDonutChart`, `SupplierBarChart`, `InventoryFlowChart`, `CustomerSalesBarChart`) visually flicker, wipe their canvas, and replay their 1000ms entrance animations multiple times in rapid succession.

Diagnostic profiling isolates this undesirable behavior to four intertwined architectural causes:

### 1.1 Destructive Canvas Teardown on Every Data Reference Change
All five analytical chart components in `src/components/analytics/` implement a destructive re-instantiation pattern in their `useEffect`:
```tsx
if (chartInstanceRef.current) {
  chartInstanceRef.current.destroy();
  chartInstanceRef.current = null;
}
chartInstanceRef.current = new Chart(ctx, { ... });
```
In Chart.js, `chart.destroy()` erases the canvas and unbinds all events. Subsequent instantiation of `new Chart()` triggers the default 1000ms easing entrance animation starting from 0. Instead of reusing the canvas and applying in-place data mutations via `chart.update()`, the entire chart is destroyed and re-initialized whenever the data reference changes.

### 1.2 Unmemoized Reference Allocations in `SpeciesDonutChart.tsx`
In `src/components/analytics/SpeciesDonutChart.tsx:13-100`:
```tsx
export function SpeciesDonutChart({ records }: { records: WoodReceivingRecord[] }) {
  const { labels, values, colors } = prepareSpeciesDonutData(records);
  const totalVolume = values.reduce((a, b) => a + b, 0);

  useEffect(() => {
    // Teardown and instantiate new Chart
  }, [labels, values, colors, totalVolume]);
```
`prepareSpeciesDonutData` is invoked directly within the component render function without `useMemo`. It returns newly allocated arrays (`labels`, `values`, `colors`) on **every single render pass**. Because these fresh array references are placed in the `useEffect` dependency array, the effect runs on **every render** of `SpeciesDonutChart`—even if `records` did not change at all.

### 1.3 Cascading Multi-Phase Hydration Cascade
Because client state is contained in route-local hooks (`useWoodRecords` and `useWoodSalesRecords`) without an active module-level in-memory cache:
1. **Pass 1 (Initial Mount):** `records = []`, `sales = []`. Charts receive empty arrays and render nothing or fallback text.
2. **Pass 2 (LocalStorage Inbound Load):** `useWoodRecords` loads cached records synchronously in `useEffect`, firing `setAllRecords(parsed)`. Inbound charts mount and begin playing their entrance animation.
3. **Pass 3 (Async Storage Sales Load):** `useWoodSalesRecords` awaits `defaultStorage.getItem()`, firing `setSales(stored)` in a subsequent tick. This re-renders `AnalyticsDashboardPage`, triggering the `SpeciesDonutChart` bug (1.2) to destroy and re-animate.
4. **Pass 4 (Server Inbound Sync):** `fetch('/api/records')` completes. Even if the data matches LocalStorage exactly, `json.data` is a new array reference. `setAllRecords(json.data)` triggers another render pass, causing all inbound charts to destroy and re-animate.
5. **Pass 5 (Server Sales Sync):** `fetch('/api/sales')` completes with a new array reference, triggering sales charts and `SpeciesDonutChart` to destroy and re-animate.
6. **Pass 6 (Auth Session):** `fetch('/api/auth/me')` resolves, updating user permissions and causing another top-level page render.

### 1.4 Route Remounting in Next.js App Router
When navigating between routes (`/ledger` $\to$ `/`), Next.js unmounts `app/page.tsx` and remounts it anew. Without an in-memory cache, the hooks reset to `[]` and replay the full hydration cascade from scratch.

---

## 2. Architecture & Design Principles

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Router as Next.js Navigation
    participant Page as Ringkasan (app/page.tsx)
    participant Hook as useWoodRecords / useWoodSalesRecords
    participant ChartComp as VolumeTrendChart / Donut / Flow
    participant ChartJS as Chart.js Instance

    User->>Router: Switch to "Ringkasan" (/)
    Router->>Page: Mount page
    Page->>Hook: Initialize hooks
    Note over Hook: Instantly return module-level in-memory cache (0ms lag, non-empty)
    Hook-->>Page: records = cachedRecords, sales = cachedSales
    Page->>ChartComp: Render with cached data
    ChartComp->>ChartJS: new Chart(ctx, config) [Single Initial Mount Animation]

    par Background Server Sync
        Hook->>Hook: fetch('/api/records') & fetch('/api/sales')
        Hook->>Hook: Compare payload with active state (shallow/timestamp check)
        alt Data Unchanged
            Note over Hook: Skip setState (Zero redundant re-renders!)
        else Data Has Changes
            Hook-->>Page: setState(freshData)
            Page->>ChartComp: Re-render with freshData
            ChartComp->>ChartJS: chart.data = freshData; chart.update('none')
            Note over ChartJS: Canvas preserved! In-place data update with 0ms flicker!
        end
    end
```

### 2.1 In-Place Canvas Updates (`chart.update('none')`)
Instead of destroying and reconstructing Chart.js instances:
1. Maintain the chart instance in `chartInstanceRef`.
2. On subsequent effect runs, if `chartInstanceRef.current` exists:
   - Mutate `chartInstanceRef.current.data.labels = nextLabels`.
   - Mutate each dataset's `.data = nextData`.
   - Invoke `chartInstanceRef.current.update('none')` to perform an immediate, flicker-free data refresh without restarting the entrance animation.
3. Call `chartInstanceRef.current.destroy()` **only** inside the effect's unmount cleanup callback.

### 2.2 Strict Reference Stability (`useMemo`)
In all chart components:
- Pure data transformations (`prepareVolumeTrendData`, `prepareSpeciesDonutData`, `prepareSupplierBarData`, `prepareInventoryFlowData`, `prepareCustomerSalesData`) must be wrapped in `useMemo` anchored to the input record arrays.
- Effects must depend strictly on the memoized chart data structures or primitive metrics.

### 2.3 Module-Level In-Memory Cache in Client Hooks
In `src/hooks/useWoodRecords.ts` and `src/hooks/useWoodSalesRecords.ts`:
- Maintain module-scoped cache variables (`memoryRecordsCache` and `memorySalesCache`).
- Initialize `useState` lazily or immediately from `memoryRecordsCache` if available in the current browser session.
- When switching between `/ledger`, `/sales`, and `/`, the initial render immediately accesses the warm dataset, completely bypassing the `[]` $\to$ cached hydration flash.

### 2.4 Payload Equality Checks Before Server Sync `setState`
In `syncWithServer`:
- Compare incoming server data against active records (checking length, first/last item ID, and latest `updatedAt` timestamp).
- If identical, discard the payload without calling `setAllRecords` or `setSales`, preventing redundant re-renders when data has not changed on the server.

---

## 3. Component Contracts & Implementation Details

### 3.1 `VolumeTrendChart.tsx`
- **Memoization**:
  ```ts
  const trendData = useMemo(() => prepareVolumeTrendData(records), [records]);
  ```
- **Update Logic**:
  If `chartInstanceRef.current` exists, update `labels`, `datasets[0].data`, `datasets[1].data`, and call `update('none')`.
- **Cleanup**: Destroy only on unmount.

### 3.2 `SpeciesDonutChart.tsx`
- **Memoization**:
  ```ts
  const donutData = useMemo(() => prepareSpeciesDonutData(records), [records]);
  const totalVolume = useMemo(() => donutData.values.reduce((a, b) => a + b, 0), [donutData]);
  ```
- **Update Logic**:
  If `chartInstanceRef.current` exists, update `labels`, `datasets[0].data`, `datasets[0].backgroundColor`, and call `update('none')`.
- **Cleanup**: Destroy only on unmount.

### 3.3 `SupplierBarChart.tsx`
- **Memoization**:
  ```ts
  const supplierData = useMemo(() => prepareSupplierBarData(records), [records]);
  ```
- **Update Logic**:
  If `chartInstanceRef.current` exists, update `labels`, `datasets[0].data`, `datasets[1].data`, and call `update('none')`.
- **Cleanup**: Destroy only on unmount.

### 3.4 `InventoryFlowChart.tsx`
- **Memoization**:
  ```ts
  const flowData = useMemo(() => prepareInventoryFlowData(inboundRecords, salesRecords), [inboundRecords, salesRecords]);
  ```
- **Update Logic**:
  If `chartInstanceRef.current` exists, update `labels`, `datasets[0].data` (inbound), `datasets[1].data` (outbound), `datasets[2].data` (net), and call `update('none')`.
- **Cleanup**: Destroy only on unmount.

### 3.5 `CustomerSalesBarChart.tsx`
- **Memoization**:
  ```ts
  const customerData = useMemo(() => prepareCustomerSalesData(salesRecords, 5), [salesRecords]);
  ```
- **Update Logic**:
  If `chartInstanceRef.current` exists, update `labels`, `datasets[0].data`, and call `update('none')`.
- **Cleanup**: Destroy only on unmount.

### 3.6 `useWoodRecords.ts` & `useWoodSalesRecords.ts`
- **In-Memory Cache**:
  ```ts
  let memoryRecordsCache: WoodReceivingRecord[] | null = null;
  ```
- **Sync Guard**:
  ```ts
  function areRecordsEqual(prev: WoodReceivingRecord[], next: WoodReceivingRecord[]): boolean {
    if (prev.length !== next.length) return false;
    if (prev.length === 0) return true;
    return prev[0]?.id === next[0]?.id && prev[0]?.updatedAt === next[0]?.updatedAt && prev[prev.length - 1]?.id === next[next.length - 1]?.id;
  }
  ```

---

## 4. Verification & Testing Strategy

1. **Automated Unit & Invariant Tests (`test/analytics-rerender-optimization.test.ts`)**:
   - Verify all chart components reuse existing Chart.js instances (`chart.update` called instead of `destroy()` when new records are provided).
   - Verify `SpeciesDonutChart` does not destroy on re-render with identical records.
   - Verify `useWoodRecords` and `useWoodSalesRecords` preserve in-memory cache across hook instances without resetting to empty array.
   - Verify `areRecordsEqual` correctly identifies identical server payloads and suppresses duplicate state updates.
2. **Codebase Boundary & LOC Checks**:
   - Ensure all modified files respect the `< 250 LOC` ceiling.
   - Run `npx tsc --noEmit` with zero errors.
3. **Full Regression Suite**:
   - Execute `npm test` across all 86 test suites.
   - Verify Next.js production build (`npm run build:check`).
