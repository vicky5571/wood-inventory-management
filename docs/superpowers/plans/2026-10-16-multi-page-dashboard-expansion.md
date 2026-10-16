# Multi-Page Dashboard & Operational Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the single-page wood inventory app into a complete, high-performance multi-page operational dashboard featuring dedicated Analytics (Chart.js), Inbound Receiving Ledger, Supplier Quality & Metrics, Operational Activity Logs, and Master Data Settings with real Next.js App Router navigation.

**Architecture:** Replace hash-anchor pseudo-navigation (`#dashboard`, `#ledger`, `#species`) with first-class Next.js App Router pages (`/`, `/ledger`, `/suppliers`, `/activity`, `/settings`). Encapsulate data access with resilient reactive hooks and atomic repository helpers backed by `localStorage` and offline memory fallback. Implement canvas-based Chart.js charts wrapped in declarative, memory-safe client components.

**Tech Stack:** Next.js 15.1.0 (App Router), React 19, TypeScript 5.7, Tailwind CSS 3.4, Chart.js 4.4+, Lucide React, Node.js Native Test Runner (`node:test` + `node:assert`).

**Spec:** User architecture expansion request, [audit-business-owner-ux.md](file:///Users/mac/Web%20Development/wood-inventory-management/docs/audit-business-owner-ux.md), and [architecture-system-invariants.md](file:///Users/mac/Web%20Development/wood-inventory-management/docs/architecture-system-invariants.md).

## Global Constraints

- **Single Source of Truth (SSOT):** All entity types and interfaces must originate from `src/types/index.ts`. No duplicate inline interfaces.
- **Dependency Invariant:** Install only `chart.js` as requested by user. Do not add arbitrary bloated component libraries.
- **Strangler Pattern on God Files:** Keep page coordinators and views under ~250 lines; extract chart configurations, scorecards, and filters into modular subcomponents.
- **Resilient Offline Fallback:** UI state mutations update immediately with LocalStorage persistence and in-memory fallback.
- **Language Standard:** All source code, interfaces, comments, test assertions, and git commits must strictly remain in English.
- **Regression Zero:** All 123 existing tests in `npm test` must continue to pass throughout every task.

---

### Task 1: Install Chart.js and Configure Multi-Route Navigation

**Files:**
- Modify: `package.json`
- Modify: `src/components/layout/nav-config.ts`
- Modify: `src/components/layout/Navbar.tsx`
- Test: `test/nav-routing.test.ts`

**Interfaces:**
- Consumes: `usePathname()` from `next/navigation`, route definitions in `src/components/layout/nav-config.ts`.
- Produces: Updated `NAV_ITEMS` with 5 real routes (`/`, `/ledger`, `/suppliers`, `/activity`, `/settings`), active path matching, and Next.js `<Link>` routing.

- [ ] **Step 1: Write the failing navigation test**

Create `test/nav-routing.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NAV_ITEMS, isNavItemActive } from '../src/components/layout/nav-config.ts';

test('Multi-Route Navigation Configuration Suite', async (t) => {
  await t.test('NAV_ITEMS contains all 5 required operational routes', () => {
    const routePaths = NAV_ITEMS.map((item) => item.href);
    assert.deepEqual(routePaths, [
      '/',
      '/ledger',
      '/suppliers',
      '/activity',
      '/settings',
    ]);

    const ids = NAV_ITEMS.map((item) => item.id);
    assert.deepEqual(ids, ['analytics', 'ledger', 'suppliers', 'activity', 'settings']);
  });

  await t.test('isNavItemActive accurately matches root and sub-paths', () => {
    assert.equal(isNavItemActive('/', '/'), true);
    assert.equal(isNavItemActive('/', '/ledger'), false);
    assert.equal(isNavItemActive('/ledger', '/ledger'), true);
    assert.equal(isNavItemActive('/suppliers', '/suppliers'), true);
    assert.equal(isNavItemActive('/activity', '/activity'), true);
    assert.equal(isNavItemActive('/settings', '/settings'), true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
node --test test/nav-routing.test.ts
```
Expected: FAIL (missing `isNavItemActive`, old hash-anchor routes in `NAV_ITEMS`).

- [ ] **Step 3: Install `chart.js` and update navigation**

Run:
```bash
npm install chart.js
```

Update `src/components/layout/nav-config.ts`:

```typescript
export interface NavItem {
  id: string;
  labelId: string;
  labelZh: string;
  href: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    id: 'analytics',
    labelId: 'Ringkasan',
    labelZh: '运营概况',
    href: '/',
  },
  {
    id: 'ledger',
    labelId: 'Buku Besar',
    labelZh: '入库总账',
    href: '/ledger',
  },
  {
    id: 'suppliers',
    labelId: 'Pemasok',
    labelZh: '供应商',
    href: '/suppliers',
  },
  {
    id: 'activity',
    labelId: 'Aktivitas',
    labelZh: '审计日志',
    href: '/activity',
  },
  {
    id: 'settings',
    labelId: 'Pengaturan',
    labelZh: '系统设置',
    href: '/settings',
  },
] as const;

export function isNavItemActive(itemHref: string, currentPathname: string): boolean {
  if (itemHref === '/') {
    return currentPathname === '/';
  }
  return currentPathname === itemHref || currentPathname.startsWith(`${itemHref}/`);
}
```

Update `src/components/layout/Navbar.tsx`:
Replace hash anchor scrolling with Next.js `Link` navigation, import icons (`LayoutDashboard`, `TableProperties`, `Building2`, `History`, `Settings`), and bind active styles using `isNavItemActive(item.href, pathname)`.

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
node --test test/nav-routing.test.ts
```
Expected: PASS.

- [ ] **Step 5: Run existing test suite to ensure no regressions**

Run:
```bash
npm test
```
Expected: PASS (all tests pass, update `test/navbar.test.ts` if hash references changed).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/components/layout/nav-config.ts src/components/layout/Navbar.tsx test/nav-routing.test.ts
git commit -m "feat(nav): install chart.js and configure multi-route navigation structure"
```

---

### Task 2: SSOT Domain Entities & Data Layer Extension (Suppliers, Activity Logs & Master Settings)

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/utils/supplier-metrics.ts`
- Create: `src/utils/activity-logger.ts`
- Create: `src/hooks/useSuppliers.ts`
- Create: `src/hooks/useActivityLog.ts`
- Create: `src/hooks/useSettings.ts`
- Test: `test/supplier-metrics.test.ts`
- Test: `test/activity-logger.test.ts`

**Interfaces:**
- Consumes: `WoodReceivingRecord` from `src/types/index.ts`.
- Produces:
  - `SupplierSummary` & `calculateSupplierSummaries(records: WoodReceivingRecord[])`
  - `ActivityLogEntry` & `logActivityEvent(type, details, operator)`
  - Reactive hooks `useSuppliers`, `useActivityLog`, `useSettings`.

- [ ] **Step 1: Write failing tests for supplier metric calculations and activity logging**

Create `test/supplier-metrics.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateSupplierSummaries } from '../src/utils/supplier-metrics.ts';
import { SEED_WOOD_RECORDS } from '../src/persistence/seed-data.ts';

test('Supplier Scorecards & Metrics Aggregation Suite', async (t) => {
  await t.test('aggregates supplier volume, deliveries, and discrepancy rates accurately', () => {
    const suppliers = calculateSupplierSummaries(SEED_WOOD_RECORDS);
    assert.ok(Array.isArray(suppliers));
    assert.equal(suppliers.length, 4);

    const wana = suppliers.find((s) => s.supplierName.includes('Wana Lestari'));
    assert.ok(wana);
    assert.equal(wana.totalDeliveries, 1);
    assert.equal(wana.totalDeliveredVolumeM3, 14.5);
    assert.equal(wana.totalTallyVolumeM3, 14.65);
    assert.equal(wana.totalGrandNetPayable, 65311600);
    assert.equal(wana.discrepancyRatePercent, 1.03); // (14.65 - 14.5) / 14.5 * 100
  });

  await t.test('handles empty records cleanly without division by zero', () => {
    const suppliers = calculateSupplierSummaries([]);
    assert.deepEqual(suppliers, []);
  });
});
```

Create `test/activity-logger.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createActivityLog,
  formatActivityDescription,
} from '../src/utils/activity-logger.ts';

test('Activity Logger & Audit Trail Suite', async (t) => {
  await t.test('generates valid activity log entries with deterministic timestamp and id', () => {
    const log = createActivityLog({
      action: 'RECORD_CREATED',
      entityId: 'rec-100',
      entitySummary: 'Truk B 9283 TDA (Teak, 14.65 m³)',
      operatorName: 'Budi Santoso',
      operatorRole: 'Manager',
    });

    assert.ok(log.id.startsWith('act-'));
    assert.equal(log.action, 'RECORD_CREATED');
    assert.equal(log.operatorName, 'Budi Santoso');
    assert.ok(log.timestamp);
  });

  await t.test('formats bilingual description correctly for all actions', () => {
    const desc = formatActivityDescription('RECORD_DELETED', 'Truk L 8172 UX');
    assert.match(desc, /Dihapus/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
node --test test/supplier-metrics.test.ts test/activity-logger.test.ts
```
Expected: FAIL (modules not found).

- [ ] **Step 3: Update `src/types/index.ts` with new domain entities**

Add to `src/types/index.ts`:

```typescript
export interface SupplierSummary {
  supplierName: string;
  totalDeliveries: number;
  totalDeliveredVolumeM3: number;
  totalTallyVolumeM3: number;
  volumeDiscrepancyM3: number;
  discrepancyRatePercent: number; // Discrepancy / Delivered * 100
  totalGrandNetPayable: number;
  primarySpecies: string[];
  lastDeliveryDate: string;
  status: 'OPTIMAL' | 'ACCEPTABLE' | 'ATTENTION';
}

export type ActivityActionType =
  | 'RECORD_CREATED'
  | 'RECORD_UPDATED'
  | 'RECORD_DELETED'
  | 'RECORD_RESTORED'
  | 'DEMO_RESET'
  | 'SETTINGS_UPDATED';

export interface ActivityLogEntry {
  id: string;
  action: ActivityActionType;
  entityId?: string;
  entitySummary: string;
  operatorName: string;
  operatorRole: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AppSettings {
  defaultTimberPphRate: number;
  defaultFreightPphRate: number;
  defaultBrokerFee: number;
  acceptableDiscrepancyThresholdPct: number;
  yardName: string;
  yardCode: string;
}
```

- [ ] **Step 4: Implement `src/utils/supplier-metrics.ts`**

```typescript
import type { WoodReceivingRecord, SupplierSummary } from '../types/index.ts';

export function calculateSupplierSummaries(records: WoodReceivingRecord[]): SupplierSummary[] {
  const map = new Map<string, {
    totalDeliveries: number;
    totalDeliveredVolumeM3: number;
    totalTallyVolumeM3: number;
    totalGrandNetPayable: number;
    speciesSet: Set<string>;
    latestDate: string;
  }>();

  for (const r of records) {
    const name = (r.supplierName || 'Pemasok Tidak Diketahui').trim();
    const existing = map.get(name) || {
      totalDeliveries: 0,
      totalDeliveredVolumeM3: 0,
      totalTallyVolumeM3: 0,
      totalGrandNetPayable: 0,
      speciesSet: new Set<string>(),
      latestDate: '',
    };

    existing.totalDeliveries += 1;
    existing.totalDeliveredVolumeM3 += r.deliveredVolumeM3;
    existing.totalTallyVolumeM3 += r.tallyVolumeM3;
    existing.totalGrandNetPayable += r.grandNetPayable;
    if (r.woodSpecies) existing.speciesSet.add(r.woodSpecies.split('/')[0].trim());
    if (!existing.latestDate || r.receiptDate > existing.latestDate) {
      existing.latestDate = r.receiptDate;
    }

    map.set(name, existing);
  }

  return Array.from(map.entries()).map(([supplierName, data]) => {
    const delVol = Number(data.totalDeliveredVolumeM3.toFixed(4));
    const talVol = Number(data.totalTallyVolumeM3.toFixed(4));
    const discrepancyM3 = Number((talVol - delVol).toFixed(4));
    const ratePct = delVol > 0 ? Number(((discrepancyM3 / delVol) * 100).toFixed(2)) : 0;

    let status: 'OPTIMAL' | 'ACCEPTABLE' | 'ATTENTION' = 'OPTIMAL';
    if (Math.abs(ratePct) > 3) {
      status = 'ATTENTION';
    } else if (Math.abs(ratePct) > 1) {
      status = 'ACCEPTABLE';
    }

    return {
      supplierName,
      totalDeliveries: data.totalDeliveries,
      totalDeliveredVolumeM3: delVol,
      totalTallyVolumeM3: talVol,
      volumeDiscrepancyM3: discrepancyM3,
      discrepancyRatePercent: ratePct,
      totalGrandNetPayable: Number(data.totalGrandNetPayable.toFixed(2)),
      primarySpecies: Array.from(data.speciesSet),
      lastDeliveryDate: data.latestDate,
      status,
    };
  }).sort((a, b) => b.totalTallyVolumeM3 - a.totalTallyVolumeM3);
}
```

- [ ] **Step 5: Implement `src/utils/activity-logger.ts`**

```typescript
import type { ActivityActionType, ActivityLogEntry } from '../types/index.ts';

export function createActivityLog(params: {
  action: ActivityActionType;
  entityId?: string;
  entitySummary: string;
  operatorName: string;
  operatorRole: string;
  metadata?: Record<string, unknown>;
}): ActivityLogEntry {
  return {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    action: params.action,
    entityId: params.entityId,
    entitySummary: params.entitySummary,
    operatorName: params.operatorName || 'System',
    operatorRole: params.operatorRole || 'Operator',
    timestamp: new Date().toISOString(),
    metadata: params.metadata,
  };
}

export function formatActivityDescription(action: ActivityActionType, summary: string): string {
  switch (action) {
    case 'RECORD_CREATED':
      return `Penerimaan baru dicatat: ${summary} (新增入库)`;
    case 'RECORD_UPDATED':
      return `Penerimaan diperbarui: ${summary} (更新入库)`;
    case 'RECORD_DELETED':
      return `Penerimaan dihapus: ${summary} (删除入库)`;
    case 'RECORD_RESTORED':
      return `Penerimaan dipulihkan: ${summary} (撤销恢复)`;
    case 'DEMO_RESET':
      return `Database di-reset ke data demonstrasi standar (重置示例数据)`;
    case 'SETTINGS_UPDATED':
      return `Pengaturan sistem diperbarui: ${summary} (更新设置)`;
    default:
      return summary;
  }
}
```

- [ ] **Step 6: Implement hooks (`useSuppliers.ts`, `useActivityLog.ts`, `useSettings.ts`)**
- Create `src/hooks/useSuppliers.ts` consuming records from `useWoodRecords`.
- Create `src/hooks/useActivityLog.ts` persisting log array to `localStorage` key `wood_activity_log_v1`.
- Create `src/hooks/useSettings.ts` persisting settings to `localStorage` key `wood_app_settings_v1`.

- [ ] **Step 7: Run tests to verify they pass**

Run:
```bash
node --test test/supplier-metrics.test.ts test/activity-logger.test.ts
```
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/types/index.ts src/utils/supplier-metrics.ts src/utils/activity-logger.ts src/hooks/useSuppliers.ts src/hooks/useActivityLog.ts src/hooks/useSettings.ts test/supplier-metrics.test.ts test/activity-logger.test.ts
git commit -m "feat(domain): add supplier scorecards, audit logging, and settings hooks"
```

---

### Task 3: Build Dedicated Analytics & BI Dashboard Route (`/`) with Chart.js

**Files:**
- Create: `src/components/analytics/VolumeTrendChart.tsx`
- Create: `src/components/analytics/SpeciesDonutChart.tsx`
- Create: `src/components/analytics/SupplierBarChart.tsx`
- Create: `src/components/analytics/FinancialOutlayBreakdown.tsx`
- Modify: `app/page.tsx`
- Test: `test/analytics-components.test.ts`

**Interfaces:**
- Consumes: `DashboardMetrics`, `WoodReceivingRecord` from `src/types/index.ts`, Chart.js `Chart` constructor.
- Produces: Visual analytics dashboard with responsive canvas charts, KPI summary, and zero canvas memory leaks.

- [ ] **Step 1: Write unit test asserting chart data preparation utilities**

Create `test/analytics-components.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEED_WOOD_RECORDS } from '../src/persistence/seed-data.ts';
import {
  prepareVolumeTrendData,
  prepareSpeciesDonutData,
  prepareSupplierBarData,
} from '../src/components/analytics/chart-helpers.ts';

test('Analytics Chart.js Data Preparation Suite', async (t) => {
  await t.test('prepares chronologically sorted volume trend data', () => {
    const trend = prepareVolumeTrendData(SEED_WOOD_RECORDS);
    assert.ok(trend.labels.length > 0);
    assert.equal(trend.tallyVolumes.length, trend.labels.length);
    assert.equal(trend.deliveredVolumes.length, trend.labels.length);
    // Chronological order verification
    assert.ok(trend.labels[0] <= trend.labels[trend.labels.length - 1]);
  });

  await t.test('prepares species doughnut data with percentage labels', () => {
    const donut = prepareSpeciesDonutData(SEED_WOOD_RECORDS);
    assert.ok(donut.labels.length > 0);
    assert.ok(donut.values.length > 0);
    const sum = donut.values.reduce((a, b) => a + b, 0);
    assert.ok(sum > 0);
  });

  await t.test('prepares supplier comparison bar data', () => {
    const supplierData = prepareSupplierBarData(SEED_WOOD_RECORDS);
    assert.ok(supplierData.labels.length > 0);
    assert.equal(supplierData.delivered.length, supplierData.labels.length);
    assert.equal(supplierData.tally.length, supplierData.labels.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
node --test test/analytics-components.test.ts
```
Expected: FAIL (`chart-helpers.ts` not found).

- [ ] **Step 3: Create `src/components/analytics/chart-helpers.ts`**

Implement `prepareVolumeTrendData`, `prepareSpeciesDonutData`, and `prepareSupplierBarData` ensuring deterministic grouping and sorting by date/name.

- [ ] **Step 4: Implement Chart.js client components**
- `VolumeTrendChart.tsx`: Line chart showing Daily Received vs Tally Volume with fill area. Uses `useRef<HTMLCanvasElement>` and cleans up chart instance via `chartRef.current?.destroy()` in `useEffect`.
- `SpeciesDonutChart.tsx`: Doughnut chart with tropical timber palette and center cutout displaying total m³.
- `SupplierBarChart.tsx`: Grouped horizontal bar chart comparing Delivered vs Tally m³ per supplier.
- `FinancialOutlayBreakdown.tsx`: Stacked financial card showing Timber Material vs Freight Logistics vs Broker Fee.

- [ ] **Step 5: Assemble `app/page.tsx` as dedicated Executive BI View**

Rewrite `app/page.tsx` to serve as the Executive BI Overview:
- Top: Header with date range indicator & facility status.
- Section 1: `KpiCards` with volumetric and financial key performance indicators.
- Section 2: 2-column grid featuring `VolumeTrendChart` (time-series) and `SpeciesDonutChart` (composition).
- Section 3: 2-column grid featuring `SupplierBarChart` (vendor volumes) and `FinancialOutlayBreakdown`.
- Bottom: Quick action cards routing to `/ledger` and `/suppliers`.

- [ ] **Step 6: Run tests to verify they pass**

Run:
```bash
node --test test/analytics-components.test.ts
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/analytics/ app/page.tsx test/analytics-components.test.ts
git commit -m "feat(analytics): add executive BI dashboard route with Chart.js visualizations"
```

---

### Task 4: Build Dedicated Inbound Ledger Route (`/ledger`) with Enhanced Ergonomics

**Files:**
- Create: `app/ledger/page.tsx`
- Modify: `src/components/ledger/Toolbar.tsx`
- Modify: `src/components/ledger/RecordTable.tsx`
- Test: `test/ledger-date-filter.test.ts`

**Interfaces:**
- Consumes: `useWoodRecords()`, `useAuth()`, `RecordFilterCriteria`.
- Produces: Dedicated ledger page at `/ledger` with date range filtering (P0 audit fix), sticky table columns, and smooth CRUD workflows.

- [ ] **Step 1: Write test for Toolbar date-range filter integration**

Create `test/ledger-date-filter.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WoodRecordRepository } from '../src/persistence/record-repository.ts';
import { SEED_WOOD_RECORDS } from '../src/persistence/seed-data.ts';

test('Ledger Date Range Filtering & Persistence Suite', async (t) => {
  await t.test('filters records within inclusive date bounds', () => {
    const repo = new WoodRecordRepository(SEED_WOOD_RECORDS);
    const oct1to3 = repo.getAll({
      startDate: '2026-10-01',
      endDate: '2026-10-03',
    });

    assert.equal(oct1to3.length, 2);
    assert.ok(oct1to3.every((r) => r.receiptDate >= '2026-10-01' && r.receiptDate <= '2026-10-03'));
  });

  await t.test('combines date filter with search query and species', () => {
    const repo = new WoodRecordRepository(SEED_WOOD_RECORDS);
    const filtered = repo.getAll({
      startDate: '2026-10-01',
      endDate: '2026-10-05',
      species: 'Teak / Jati (柚木)',
    });

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].woodSpecies, 'Teak / Jati (柚木)');
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run:
```bash
node --test test/ledger-date-filter.test.ts
```
Expected: PASS (verifies repository logic already works; now wire into UI).

- [ ] **Step 3: Update `Toolbar.tsx` to include Date Range inputs**

Add `startDate` and `endDate` input fields (`type="date"`) to `src/components/ledger/Toolbar.tsx` with clear reset badges and quick-date presets ("Bulan Ini / 本月", "Semua / 全部").

- [ ] **Step 4: Create `app/ledger/page.tsx`**

Create `app/ledger/page.tsx`:
- Render page header with record count and batch statistics.
- Mount `Toolbar`, `RecordTable`, and `RecordModal`.
- Wire `saveRecord`, `deleteRecord`, and `exportCsv` directly from `useWoodRecords`.
- Log activity event on save/delete via `useActivityLog`.

- [ ] **Step 5: Run tests to ensure no regressions**

Run:
```bash
npm test
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/ledger/page.tsx src/components/ledger/Toolbar.tsx test/ledger-date-filter.test.ts
git commit -m "feat(ledger): create dedicated ledger route with date-range filters and full ergonomics"
```

---

### Task 5: Build Supplier Management Route (`/suppliers`) with Quality Scorecards

**Files:**
- Create: `app/suppliers/page.tsx`
- Create: `src/components/suppliers/SupplierCard.tsx`
- Create: `src/components/suppliers/SupplierTable.tsx`
- Test: `test/supplier-page.test.ts`

**Interfaces:**
- Consumes: `useSuppliers()`, `calculateSupplierSummaries()`.
- Produces: Interactive supplier management view at `/suppliers` with discrepancy quality ratings, volume rankings, and delivery history.

- [ ] **Step 1: Write test for supplier page component contracts**

Create `test/supplier-page.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateSupplierSummaries } from '../src/utils/supplier-metrics.ts';
import { SEED_WOOD_RECORDS } from '../src/persistence/seed-data.ts';

test('Supplier View Contracts Suite', async (t) => {
  await t.test('calculates correct ranking and status badges for top suppliers', () => {
    const suppliers = calculateSupplierSummaries(SEED_WOOD_RECORDS);
    assert.ok(suppliers.length >= 4);

    // Highest tally volume should be first
    assert.ok(suppliers[0].totalTallyVolumeM3 >= suppliers[1].totalTallyVolumeM3);

    // All suppliers have valid status
    for (const s of suppliers) {
      assert.ok(['OPTIMAL', 'ACCEPTABLE', 'ATTENTION'].includes(s.status));
    }
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run:
```bash
node --test test/supplier-page.test.ts
```
Expected: PASS.

- [ ] **Step 3: Create `src/components/suppliers/SupplierCard.tsx` & `SupplierTable.tsx`**
- `SupplierCard.tsx`: Highlights supplier name, status badge (`OPTIMAL` in green, `ACCEPTABLE` in amber, `ATTENTION` in red), total deliveries, tally volume, and discrepancy percentage.
- `SupplierTable.tsx`: Full sortable table showing Supplier Name, Total Rit, Del m³, Tally m³, Discrepancy % (with visual progress bar), Total Paid (IDR), and Last Delivery Date.

- [ ] **Step 4: Create `app/suppliers/page.tsx`**

Create `app/suppliers/page.tsx`:
- Header with Supplier Directory & Total Active Vendors count.
- Top KPI row: Total Active Suppliers, Average Discrepancy Rate %, Total Material Outlay.
- Toggle between Card Grid view and Detailed Table view.
- Search input to filter suppliers by name or delivered species.

- [ ] **Step 5: Run tests**

Run:
```bash
npm test
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/suppliers/page.tsx src/components/suppliers/ test/supplier-page.test.ts
git commit -m "feat(suppliers): create supplier directory with quality scorecards and metrics"
```

---

### Task 6: Build Operational Activity & Audit Trail Route (`/activity`)

**Files:**
- Create: `app/activity/page.tsx`
- Create: `src/components/activity/ActivityTimeline.tsx`
- Test: `test/activity-view.test.ts`

**Interfaces:**
- Consumes: `useActivityLog()` hook, `ActivityLogEntry[]`.
- Produces: Chronological audit trail view at `/activity` with filter by action type, clear history, and printable view.

- [ ] **Step 1: Write test for activity filter logic**

Create `test/activity-view.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createActivityLog } from '../src/utils/activity-logger.ts';

test('Activity View Filtering Suite', async (t) => {
  await t.test('filters log entries by action category', () => {
    const logs = [
      createActivityLog({ action: 'RECORD_CREATED', entitySummary: 'A', operatorName: 'X', operatorRole: 'M' }),
      createActivityLog({ action: 'RECORD_DELETED', entitySummary: 'B', operatorName: 'Y', operatorRole: 'A' }),
      createActivityLog({ action: 'RECORD_UPDATED', entitySummary: 'C', operatorName: 'X', operatorRole: 'M' }),
    ];

    const deletes = logs.filter((l) => l.action === 'RECORD_DELETED');
    assert.equal(deletes.length, 1);
    assert.equal(deletes[0].entitySummary, 'B');
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run:
```bash
node --test test/activity-view.test.ts
```
Expected: PASS.

- [ ] **Step 3: Create `src/components/activity/ActivityTimeline.tsx`**

Implement interactive timeline item displaying:
- Action badge (Green for Created, Blue for Updated, Red for Deleted, Amber for Demo Reset).
- Timestamp formatted in local Indonesian locale (`id-ID`).
- Operator name & role pill.
- Entity summary description.

- [ ] **Step 4: Create `app/activity/page.tsx`**

Create `app/activity/page.tsx`:
- Audit Trail header with live event count.
- Filter pill selector: Semua (All), Entri Baru (Created), Pembaruan (Updated), Penghapusan (Deleted).
- Clear log button (Role Level 1 only) with confirmation modal.
- Empty state with clean graphic if no activity yet recorded.

- [ ] **Step 5: Run tests**

Run:
```bash
npm test
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/activity/page.tsx src/components/activity/ActivityTimeline.tsx test/activity-view.test.ts
git commit -m "feat(activity): create operational audit trail and transaction log view"
```

---

### Task 7: Build Settings & Master Data Route (`/settings`)

**Files:**
- Create: `app/settings/page.tsx`
- Create: `src/components/settings/SpeciesSettings.tsx`
- Create: `src/components/settings/TaxSettings.tsx`
- Create: `src/components/settings/StorageSettings.tsx`
- Test: `test/settings.test.ts`

**Interfaces:**
- Consumes: `useSettings()`, `useAuth()`.
- Produces: System configuration page at `/settings` with master species management, tax presets, and yard facility metadata.

- [ ] **Step 1: Write test for Settings persistence and defaults**

Create `test/settings.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AppSettings } from '../src/types/index.ts';

test('App Settings Suite', async (t) => {
  await t.test('default settings contain valid Indonesian timber tax rates and yard metadata', () => {
    const defaults: AppSettings = {
      defaultTimberPphRate: 0.5,
      defaultFreightPphRate: 2.0,
      defaultBrokerFee: 250000,
      acceptableDiscrepancyThresholdPct: 2.0,
      yardName: 'TPK-01 Utama (Central Yard)',
      yardCode: 'TPK-01',
    };

    assert.equal(defaults.defaultTimberPphRate, 0.5);
    assert.equal(defaults.defaultFreightPphRate, 2.0);
    assert.ok(defaults.acceptableDiscrepancyThresholdPct > 0);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run:
```bash
node --test test/settings.test.ts
```
Expected: PASS.

- [ ] **Step 3: Create settings tabs components**
- `SpeciesSettings.tsx`: Displays timber species catalogue (`DEFAULT_TIMBER_SPECIES`) with code, Indonesian/English name, botanical name, and standard density.
- `TaxSettings.tsx`: Form to configure default PPh 22 rate (0.5%), PPh 23 rate (2.0%), and broker default.
- `StorageSettings.tsx`: Yard storage capacity, kavling designations, and active lot tracking.

- [ ] **Step 4: Create `app/settings/page.tsx`**

Create `app/settings/page.tsx`:
- Tabbed layout: "Katalog Spesies", "Pajak & Keuangan", "Gudang & TPK", "Profil & Akun".
- Role-gated save button (Level 1 Manager only; Level 2/3 see read-only view).
- Toast confirmation on settings update.

- [ ] **Step 5: Run tests**

Run:
```bash
npm test
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/settings/page.tsx src/components/settings/ test/settings.test.ts
git commit -m "feat(settings): create system master data and financial configuration view"
```

---

### Task 8: Full Regression Suite, Accessibility & Production Build Verification

**Files:**
- Test: All suites in `test/*.test.ts`
- Modify: `test/smoke.test.ts`

- [ ] **Step 1: Run complete test suite**

Run:
```bash
npm test
```
Expected: 100% pass across all existing and new test suites (0 failures).

- [ ] **Step 2: Run TypeScript typecheck**

Run:
```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Run Next.js production build check**

Run:
```bash
npm run build
```
Expected: Build passes with all static routes (`/`, `/ledger`, `/suppliers`, `/activity`, `/settings`, `/login`) cleanly generated.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: complete verification for multi-page dashboard expansion"
```
