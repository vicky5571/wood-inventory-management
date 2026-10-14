# Next.js + Tailwind CSS Wood Stock Management Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the timber receiving CRUD ledger and executive KPI dashboard to Next.js 15 (App Router), React 19/18, TypeScript, and Tailwind CSS with Lucide icons, while preserving pure domain calculations and SSOT contracts.

**Architecture:** Next.js App Router with atomic, decoupled React components (<200 LOC per file) styled via Tailwind CSS design tokens. Pure domain math (`src/utils/timber-calc.ts`) and SSOT types (`src/types/index.ts`) remain 100% decoupled from React and verified with native unit tests. Storage uses a hybrid offline-first client hook with LocalStorage and optional API route backup.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS, Lucide React, TypeScript, Node.js Native Test Runner (`node:test`).

**Spec:** [`docs/superpowers/specs/2026-10-14-wood-stock-dashboard-crud-design.md`](file:///Users/mac/Web%20Development/wood-inventory-management/docs/superpowers/specs/2026-10-14-wood-stock-dashboard-crud-design.md)

## Global Constraints
- Node.js runtime: `>=22.0.0` (active version `26.8.1`).
- Framework: Next.js App Router (`app/`).
- Styling: Tailwind CSS with custom warm timber color palette tokens.
- God-file limit: Every individual component or module MUST remain strictly under 200 lines of code.
- Single Source of Truth (SSOT): All interfaces imported exclusively from `src/types/index.ts`.
- Pure business logic: Calculations in `src/utils/timber-calc.ts` must have zero React or DOM dependencies.
- Language standard: Source code, comments, commit messages in English. UI field labels are bilingual (Indonesian primary with Chinese subtitles).
- Verification: Both `npm test` (`node:test`) and `npm run build` must pass with 0 errors.

---

### Task 1: Package Dependencies & Next.js + Tailwind Scaffolding

**Files:**
- Modify: `package.json`
- Create: `next.config.mjs`
- Create: `postcss.config.mjs`
- Create: `tailwind.config.ts`
- Create: `app/globals.css`
- Create: `app/layout.tsx`

**Interfaces:**
- Produces: Base Next.js configuration, Tailwind design tokens, and root HTML layout shell.

- [ ] **Step 1: Update `package.json` with Next.js, React, Tailwind, and Lucide dependencies**

Update `package.json`:
```json
{
  "name": "wood-inventory-management",
  "version": "1.0.0",
  "type": "module",
  "description": "Production-grade timber and lumber inventory management system",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "node --test",
    "test:smoke": "node --test test/smoke.test.ts"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.468.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.7.0",
    "tailwindcss": "^3.4.16",
    "postcss": "^8.4.49",
    "autoprefixer": "^10.4.20"
  },
  "engines": {
    "node": ">=22.0.0"
  },
  "license": "MIT"
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`  
Expected: Dependencies installed successfully with 0 fatal errors.

- [ ] **Step 3: Create Next.js and Tailwind configuration files**

Create `next.config.mjs`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
```

Create `postcss.config.mjs`:
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

Create `tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        wood: {
          50: '#fdf8f6',
          100: '#f2e8e5',
          200: '#eaddd7',
          300: '#e0cec7',
          400: '#d2bab0',
          500: '#b45309', // Warm Amber
          600: '#92400e',
          700: '#78350f',
          800: '#451a03',
          900: '#291002',
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 4: Create `app/globals.css` and `app/layout.tsx`**

Create `app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-slate-50 text-slate-900 antialiased;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
}
```

Create `app/layout.tsx`:
```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Penerimaan Kayu & Stok Gudang | Timber Inventory',
  description: 'Factory-standard timber receiving, physical tally inspection, and material ledger.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <main className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6">
          {children}
        </main>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Verify build setup & commit**

Run: `node --test`  
Expected: Unit tests still pass.  
Commit:
```bash
git add package.json package-lock.json next.config.mjs postcss.config.mjs tailwind.config.ts app/globals.css app/layout.tsx
git commit -m "chore(next): scaffold Next.js 15, Tailwind CSS, and Lucide configuration"
```

---

### Task 2: Domain Logic & SSOT Adaptation

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/utils/timber-calc.ts`
- Test: `test/timber-calc.test.ts`

**Interfaces:**
- Produces: Pure domain functions and TypeScript types seamlessly consumable by both Node test runner and Next.js React components.

- [ ] **Step 1: Verify TypeScript exports in `src/types/index.ts`**

Ensure `WoodReceivingRecord`, `DashboardMetrics`, and `RecordFilterCriteria` are exported with clean type annotations.

- [ ] **Step 2: Ensure `src/utils/timber-calc.ts` is pure and exported**

Verify pure calculation functions:
- `calculateTimberPayment(volumeM3, pricePerM3, pphRatePercent)`
- `calculateFreightPayment(volumeM3, freightRatePerM3, pphAmount)`
- `computeRecordCalculations(input)`
- `aggregateDashboardMetrics(records)`

- [ ] **Step 3: Run domain tests**

Run: `node --test test/timber-calc.test.ts`  
Expected: PASS (8/8 tests pass with 0 failures).

- [ ] **Step 4: Commit changes**

```bash
git add src/types/index.ts src/utils/timber-calc.ts test/timber-calc.test.ts
git commit -m "refactor(calc): ensure pure domain calculation modules are ready for Next.js imports"
```

---

### Task 3: Local & Hybrid Storage Client Hook

**Files:**
- Create: `src/hooks/useWoodRecords.ts`
- Modify: `src/persistence/storage.ts`

**Interfaces:**
- Consumes: `WoodReceivingRecord`, `RecordFilterCriteria`, `DashboardMetrics` from `src/types/index.ts`, `aggregateDashboardMetrics` from `src/utils/timber-calc.ts`, `SEED_WOOD_RECORDS` from `src/persistence/seed-data.ts`.
- Produces: `useWoodRecords()` hook returning:
  - `records`: active filtered records
  - `allRecords`: complete unfiltered records
  - `metrics`: aggregated dashboard KPI metrics
  - `filters`: current filter state
  - `setFilters`: filter updater
  - `saveRecord(record)`: add or update record
  - `deleteRecord(id)`: delete record
  - `resetDemo()`: restore initial realistic seed data
  - `exportCsv()`: download RFC 4180-compliant CSV

- [ ] **Step 1: Implement `src/hooks/useWoodRecords.ts` (<180 LOC)**

Create `src/hooks/useWoodRecords.ts`:
```typescript
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { WoodReceivingRecord, RecordFilterCriteria, DashboardMetrics } from '../types/index.ts';
import { aggregateDashboardMetrics } from '../utils/timber-calc.ts';
import { SEED_WOOD_RECORDS } from '../persistence/seed-data.ts';

const STORAGE_KEY = 'wood_receiving_records_next_v1';

export function useWoodRecords() {
  const [allRecords, setAllRecords] = useState<WoodReceivingRecord[]>([]);
  const [filters, setFilters] = useState<RecordFilterCriteria>({});
  const [isHydrated, setIsHydrated] = useState(false);

  // Initialize from LocalStorage or Seed Data
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setAllRecords(parsed);
          setIsHydrated(true);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to parse localStorage records:', e);
    }
    // Fallback to fresh seed data
    const seed = JSON.parse(JSON.stringify(SEED_WOOD_RECORDS));
    setAllRecords(seed);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    } catch {}
    setIsHydrated(true);
  }, []);

  // Save to LocalStorage on mutations
  const persist = useCallback((updated: WoodReceivingRecord[]) => {
    setAllRecords(updated);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to persist to localStorage:', e);
    }
  }, []);

  const saveRecord = useCallback((record: WoodReceivingRecord) => {
    setAllRecords((prev) => {
      const index = prev.findIndex((r) => r.id === record.id);
      let next: WoodReceivingRecord[];
      if (index >= 0) {
        next = [...prev];
        next[index] = { ...record, updatedAt: new Date().toISOString() };
      } else {
        next = [{
          ...record,
          createdAt: record.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, ...prev];
      }
      persist(next);
      return next;
    });
  }, [persist]);

  const deleteRecord = useCallback((id: string) => {
    setAllRecords((prev) => {
      const next = prev.filter((r) => r.id !== id);
      persist(next);
      return next;
    });
  }, [persist]);

  const resetDemo = useCallback(() => {
    const seed = JSON.parse(JSON.stringify(SEED_WOOD_RECORDS));
    persist(seed);
    setFilters({});
  }, [persist]);

  // Filtered Records
  const records = useMemo(() => {
    return allRecords.filter((r) => {
      if (filters.species && r.woodSpecies !== filters.species) return false;
      if (filters.kavling && r.kavlingNumber !== filters.kavling) return false;
      if (filters.startDate && r.receiptDate < filters.startDate) return false;
      if (filters.endDate && r.receiptDate > filters.endDate) return false;
      if (filters.searchQuery) {
        const q = filters.searchQuery.trim().toLowerCase();
        const hay = [
          r.truckPlateNumber,
          r.forestryDocNumber,
          r.receiptNumber,
          r.contractNumber,
          r.supplierName,
          r.woodSpecies,
          r.kavlingNumber,
          r.storageYard,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allRecords, filters]);

  // Aggregated Metrics
  const metrics: DashboardMetrics = useMemo(() => {
    return aggregateDashboardMetrics(records);
  }, [records]);

  // Species list for dropdowns
  const speciesList = useMemo(() => {
    return Array.from(new Set(allRecords.map((r) => r.woodSpecies))).filter(Boolean);
  }, [allRecords]);

  // CSV Export
  const exportCsv = useCallback(() => {
    const headers = [
      'Penerimaan (到货日期)',
      'No. Polisi (车牌号)',
      'SKSHHK / DKP (送货单号)',
      'No. Kontrak (合同编号)',
      'Supplier (供应商)',
      'Jenis Kayu (树种)',
      'No. Kav (进厂批号)',
      'Batang Del (送货根数)',
      'Vol Del m³ (送货立方)',
      'Batang Tally (检尺根数)',
      'Vol Tally m³ (检尺立方)',
      'Net Kayu (木材应付)',
      'Net Ongkir (运费应付)',
      'Total Bayar (应付金额)',
    ];

    const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;

    const rows = records.map((r) => [
      r.receiptDate,
      escapeCsv(r.truckPlateNumber),
      escapeCsv(r.forestryDocNumber),
      escapeCsv(r.contractNumber),
      escapeCsv(r.supplierName),
      escapeCsv(r.woodSpecies),
      escapeCsv(r.kavlingNumber),
      r.deliveredPieces,
      r.deliveredVolumeM3,
      r.tallyPieces,
      r.tallyVolumeM3,
      r.timberNetPayable,
      r.freightNetPayable,
      r.grandNetPayable,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `penerimaan_kayu_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }, [records]);

  return {
    records,
    allRecords,
    metrics,
    filters,
    speciesList,
    isHydrated,
    setFilters,
    saveRecord,
    deleteRecord,
    resetDemo,
    exportCsv,
  };
}
```

- [ ] **Step 2: Commit changes**

```bash
git add src/hooks/useWoodRecords.ts
git commit -m "feat(hook): implement useWoodRecords reactive client persistence hook"
```

---

### Task 4: Executive Dashboard Components

**Files:**
- Create: `src/components/dashboard/KpiCards.tsx`
- Create: `src/components/dashboard/SpeciesBar.tsx`

**Interfaces:**
- Consumes: `DashboardMetrics` from `src/types/index.ts`
- Produces:
  - `<KpiCards metrics={metrics} />`
  - `<SpeciesBar breakdown={metrics.speciesVolumeBreakdown} totalVolume={metrics.totalTallyVolumeM3} />`

- [ ] **Step 1: Implement `src/components/dashboard/KpiCards.tsx` (<120 LOC)**

Create `src/components/dashboard/KpiCards.tsx`:
```tsx
import React from 'react';
import type { DashboardMetrics } from '../../types/index.ts';
import { Layers, Box, Wallet, Building2, TrendingUp, TrendingDown } from 'lucide-react';

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function KpiCards({ metrics }: { metrics: DashboardMetrics }) {
  const isMatchOrSurplus = metrics.volumeDiscrepancyM3 >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Volume */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
          <span>Total Volume Tally (检尺立方)</span>
          <Box className="w-4 h-4 text-amber-600" />
        </div>
        <div className="my-2">
          <span className="text-3xl font-bold text-amber-700">{metrics.totalTallyVolumeM3.toFixed(2)}</span>
          <span className="text-sm font-medium text-slate-500 ml-1">m³</span>
        </div>
        <div className="text-xs text-slate-500 flex items-center justify-between">
          <span>Surat Jalan: {metrics.totalDeliveredVolumeM3.toFixed(2)} m³</span>
          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-semibold ${isMatchOrSurplus ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
            {isMatchOrSurplus ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isMatchOrSurplus && '+'}{metrics.volumeDiscrepancyM3.toFixed(2)} m³
          </span>
        </div>
      </div>

      {/* Total Stems */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
          <span>Total Batang Tally (检尺根数)</span>
          <Layers className="w-4 h-4 text-blue-600" />
        </div>
        <div className="my-2">
          <span className="text-3xl font-bold text-slate-900">{metrics.totalTallyPieces.toLocaleString('id-ID')}</span>
          <span className="text-sm font-medium text-slate-500 ml-1">Btg</span>
        </div>
        <div className="text-xs text-slate-500 flex justify-between">
          <span>Surat Jalan: {metrics.totalDeliveredPieces.toLocaleString('id-ID')} Btg</span>
          <span>Selisih: {metrics.pieceDiscrepancy >= 0 ? `+${metrics.pieceDiscrepancy}` : metrics.pieceDiscrepancy}</span>
        </div>
      </div>

      {/* Total Outlay */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
          <span>Total Pengeluaran (总应付金额)</span>
          <Wallet className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="my-2">
          <span className="text-2xl font-bold text-slate-900">{formatRupiah(metrics.totalGrandExpenditure)}</span>
        </div>
        <div className="text-xs text-slate-500 flex justify-between">
          <span>Kayu: {formatRupiah(metrics.totalNetTimberPayable)}</span>
          <span>Ongkir: {formatRupiah(metrics.totalNetFreightPayable)}</span>
        </div>
      </div>

      {/* Active Lots */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
          <span>Kavling & Total Batch (批号统计)</span>
          <Building2 className="w-4 h-4 text-purple-600" />
        </div>
        <div className="my-2">
          <span className="text-3xl font-bold text-slate-900">{metrics.activeKavlingCount}</span>
          <span className="text-sm font-medium text-slate-500 ml-1">Kavling Aktif</span>
        </div>
        <div className="text-xs text-slate-500">
          <span>{metrics.totalRecordsCount} Pengiriman Tercatat</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement `src/components/dashboard/SpeciesBar.tsx` (<80 LOC)**

Create `src/components/dashboard/SpeciesBar.tsx`:
```tsx
import React from 'react';

const PALETTE = ['#b45309', '#0284c7', '#10b981', '#6366f1', '#ec4899', '#f59e0b'];

export function SpeciesBar({
  breakdown,
  totalVolume,
}: {
  breakdown: Record<string, number>;
  totalVolume: number;
}) {
  const entries = Object.entries(breakdown).filter(([_, vol]) => vol > 0);
  if (entries.length === 0 || totalVolume <= 0) return null;

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        Distribusi Spesies Kayu (树种立方占比分布)
      </div>
      <div className="flex h-4 w-full rounded-full overflow-hidden bg-slate-100">
        {entries.map(([species, vol], index) => {
          const pct = ((vol / totalVolume) * 100).toFixed(1);
          const color = PALETTE[index % PALETTE.length];
          return (
            <div
              key={species}
              style={{ width: `${pct}%`, backgroundColor: color }}
              title={`${species}: ${vol.toFixed(2)} m³ (${pct}%)`}
              className="transition-all hover:opacity-90"
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-slate-600">
        {entries.map(([species, vol], index) => {
          const pct = ((vol / totalVolume) * 100).toFixed(1);
          const color = PALETTE[index % PALETTE.length];
          return (
            <div key={species} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span><strong>{species}</strong>: {vol.toFixed(2)} m³ ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit changes**

```bash
git add src/components/dashboard/KpiCards.tsx src/components/dashboard/SpeciesBar.tsx
git commit -m "feat(ui): implement KpiCards and SpeciesBar components with Tailwind and Lucide"
```

---

### Task 5: Bilingual CRUD Table & Search/Filter Toolbar

**Files:**
- Create: `src/components/ledger/Toolbar.tsx`
- Create: `src/components/ledger/RecordTable.tsx`

**Interfaces:**
- Consumes: `WoodReceivingRecord`, `RecordFilterCriteria` from `src/types/index.ts`
- Produces:
  - `<Toolbar filters={filters} onFilterChange={setFilters} speciesList={speciesList} onResetDemo={resetDemo} onExportCsv={exportCsv} onNewEntry={openModal} />`
  - `<RecordTable records={records} onEdit={handleEdit} onDelete={handleDelete} />`

- [ ] **Step 1: Implement `src/components/ledger/Toolbar.tsx` (<120 LOC)**

Create `src/components/ledger/Toolbar.tsx`:
```tsx
import React from 'react';
import type { RecordFilterCriteria } from '../../types/index.ts';
import { Search, Download, RotateCcw, Plus } from 'lucide-react';

export function Toolbar({
  filters,
  speciesList,
  onFilterChange,
  onResetDemo,
  onExportCsv,
  onNewEntry,
}: {
  filters: RecordFilterCriteria;
  speciesList: string[];
  onFilterChange: (filters: RecordFilterCriteria) => void;
  onResetDemo: () => void;
  onExportCsv: () => void;
  onNewEntry: () => void;
}) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center justify-between">
      <div className="flex flex-wrap gap-3 items-center flex-1 min-w-[280px]">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari Plat / Dok / Supplier / Kav..."
            value={filters.searchQuery || ''}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <select
          value={filters.species || ''}
          onChange={(e) => onFilterChange({ ...filters, species: e.target.value || undefined })}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
        >
          <option value="">Semua Spesies (所有材种)</option>
          {speciesList.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <button
          onClick={onExportCsv}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onResetDemo}
          title="Muat ulang data demo awal"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset Demo</span>
        </button>

        <button
          onClick={onNewEntry}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Input Penerimaan (新增入库)</span>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement `src/components/ledger/RecordTable.tsx` (<150 LOC)**

Create `src/components/ledger/RecordTable.tsx`:
```tsx
import React from 'react';
import type { WoodReceivingRecord } from '../../types/index.ts';
import { Pencil, Trash2 } from 'lucide-react';

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function RecordTable({
  records,
  onEdit,
  onDelete,
}: {
  records: WoodReceivingRecord[];
  onEdit: (record: WoodReceivingRecord) => void;
  onDelete: (id: string) => void;
}) {
  if (records.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
        <p className="text-sm">Tidak ada data penerimaan kayu yang cocok dengan kriteria pencarian.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <th className="p-3 whitespace-nowrap">Penerimaan<span className="block text-[10px] text-slate-400 font-normal">到货日期</span></th>
              <th className="p-3 whitespace-nowrap">No. Polisi<span className="block text-[10px] text-slate-400 font-normal">车牌号</span></th>
              <th className="p-3 whitespace-nowrap">SKSHHK / DKP<span className="block text-[10px] text-slate-400 font-normal">送货单号</span></th>
              <th className="p-3 whitespace-nowrap">No. Kontrak<span className="block text-[10px] text-slate-400 font-normal">合同编号</span></th>
              <th className="p-3 whitespace-nowrap">Supplier<span className="block text-[10px] text-slate-400 font-normal">供应商</span></th>
              <th className="p-3 whitespace-nowrap">Jenis Kayu<span className="block text-[10px] text-slate-400 font-normal">材种</span></th>
              <th className="p-3 whitespace-nowrap">No. Kav<span className="block text-[10px] text-slate-400 font-normal">进厂批号</span></th>
              <th className="p-3 whitespace-nowrap">Batang (Del / Tally)<span className="block text-[10px] text-slate-400 font-normal">送货/检尺根数</span></th>
              <th className="p-3 whitespace-nowrap">Vol m³ (Del / Tally)<span className="block text-[10px] text-slate-400 font-normal">送货/检尺立方</span></th>
              <th className="p-3 whitespace-nowrap">Selisih Vol<span className="block text-[10px] text-slate-400 font-normal">误差立方</span></th>
              <th className="p-3 whitespace-nowrap">Net Kayu<span className="block text-[10px] text-slate-400 font-normal">木材应付</span></th>
              <th className="p-3 whitespace-nowrap">Net Ongkir<span className="block text-[10px] text-slate-400 font-normal">运费应付</span></th>
              <th className="p-3 whitespace-nowrap">Total Bayar<span className="block text-[10px] text-slate-400 font-normal">应付金额</span></th>
              <th className="p-3 whitespace-nowrap text-center">Aksi<span className="block text-[10px] text-slate-400 font-normal">操作</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((r) => {
              const volDiff = Number((r.tallyVolumeM3 - r.deliveredVolumeM3).toFixed(2));
              const isMatch = Math.abs(volDiff) < 0.001;
              const isSurplus = volDiff > 0;

              return (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-medium whitespace-nowrap">{r.receiptDate}</td>
                  <td className="p-3 whitespace-nowrap">{r.truckPlateNumber}</td>
                  <td className="p-3 font-mono text-slate-700 whitespace-nowrap">{r.forestryDocNumber}</td>
                  <td className="p-3 whitespace-nowrap">{r.contractNumber}</td>
                  <td className="p-3 whitespace-nowrap">{r.supplierName}</td>
                  <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">{r.woodSpecies}</td>
                  <td className="p-3 font-semibold text-amber-700 whitespace-nowrap">{r.kavlingNumber}</td>
                  <td className="p-3 whitespace-nowrap">{r.deliveredPieces} / <strong>{r.tallyPieces}</strong></td>
                  <td className="p-3 whitespace-nowrap">{r.deliveredVolumeM3.toFixed(2)} / <strong>{r.tallyVolumeM3.toFixed(2)}</strong></td>
                  <td className="p-3 whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${isMatch ? 'bg-slate-100 text-slate-700' : isSurplus ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {isMatch ? '0.00' : isSurplus ? `+${volDiff.toFixed(2)}` : volDiff.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">{formatRupiah(r.timberNetPayable)}</td>
                  <td className="p-3 whitespace-nowrap">{formatRupiah(r.freightNetPayable)}</td>
                  <td className="p-3 font-bold text-amber-800 whitespace-nowrap">{formatRupiah(r.grandNetPayable)}</td>
                  <td className="p-3 whitespace-nowrap text-center">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => onEdit(r)}
                        className="p-1 text-slate-500 hover:text-amber-700 hover:bg-slate-100 rounded transition"
                        title="Edit data"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Apakah Anda yakin ingin menghapus data penerimaan ini?')) {
                            onDelete(r.id);
                          }
                        }}
                        className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                        title="Hapus data"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit changes**

```bash
git add src/components/ledger/Toolbar.tsx src/components/ledger/RecordTable.tsx
git commit -m "feat(ui): implement bilingual RecordTable and search Toolbar components"
```

---

### Task 6: Interactive Add/Edit Modal Dialog with Live Preview Math

**Files:**
- Create: `src/components/ledger/RecordModal.tsx`

**Interfaces:**
- Consumes: `WoodReceivingRecord` from `src/types/index.ts`, `computeRecordCalculations` from `src/utils/timber-calc.ts`
- Produces: `<RecordModal isOpen={isOpen} initialRecord={record} onClose={closeModal} onSave={handleSave} />`

- [ ] **Step 1: Implement `src/components/ledger/RecordModal.tsx` (<195 LOC)**

Create `src/components/ledger/RecordModal.tsx`:
```tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { WoodReceivingRecord } from '../../types/index.ts';
import { computeRecordCalculations } from '../../utils/timber-calc.ts';
import { X, Calculator } from 'lucide-react';

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function RecordModal({
  isOpen,
  initialRecord,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  initialRecord: WoodReceivingRecord | null;
  onClose: () => void;
  onSave: (record: WoodReceivingRecord) => void;
}) {
  const [form, setForm] = useState<Partial<WoodReceivingRecord>>({});

  useEffect(() => {
    if (initialRecord) {
      setForm(initialRecord);
    } else {
      setForm({
        id: `rec-${Date.now()}`,
        receiptDate: new Date().toISOString().slice(0, 10),
        truckPlateNumber: '',
        forestryDocNumber: '',
        receiptNumber: `KW-${Date.now().toString().slice(-4)}`,
        contractNumber: '',
        supplierName: '',
        woodSpecies: '',
        woodLengthM: 4.0,
        kavlingNumber: 'KAV-01',
        storageYard: 'TPK-1',
        deliveredPieces: 0,
        deliveredVolumeM3: 0,
        tallyPieces: 0,
        tallyVolumeM3: 0,
        timberPricePerM3: 0,
        timberPphRate: 0.5,
        freightRatePerM3: 0,
        freightPphAmount: 0,
        brokerFee: 0,
      });
    }
  }, [initialRecord, isOpen]);

  // Live Math Preview
  const preview = useMemo(() => {
    return computeRecordCalculations({
      tallyVolumeM3: Math.max(0, Number(form.tallyVolumeM3) || 0),
      deliveredVolumeM3: Math.max(0, Number(form.deliveredVolumeM3) || 0),
      tallyPieces: Math.max(0, Number(form.tallyPieces) || 0),
      deliveredPieces: Math.max(0, Number(form.deliveredPieces) || 0),
      timberPricePerM3: Math.max(0, Number(form.timberPricePerM3) || 0),
      timberPphRate: Math.max(0, Number(form.timberPphRate) || 0),
      freightRatePerM3: Math.max(0, Number(form.freightRatePerM3) || 0),
      freightPphAmount: Math.max(0, Number(form.freightPphAmount) || 0),
      brokerFee: Math.max(0, Number(form.brokerFee) || 0),
    });
  }, [form]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalRecord: WoodReceivingRecord = {
      ...(form as WoodReceivingRecord),
      timberGrossTotal: preview.timberGrossTotal,
      timberPphAmount: preview.timberPphAmount,
      timberNetPayable: preview.timberNetPayable,
      freightGrossTotal: preview.freightGrossTotal,
      freightNetPayable: preview.freightNetPayable,
      grandNetPayable: preview.grandNetPayable,
      createdAt: form.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave(finalRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">
            {initialRecord ? 'Edit Penerimaan Kayu (编辑入库)' : 'Input Penerimaan Kayu Baru (新增木材入库)'}
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-5">
          {/* 1. Dokumen & Pengiriman */}
          <fieldset className="border border-slate-200 rounded-xl p-4">
            <legend className="text-xs font-bold text-amber-800 px-2 uppercase tracking-wide">1. Dokumen & Pengiriman (发货单据与物流)</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal Penerimaan (到货日期) *</label>
                <input type="date" required value={form.receiptDate || ''} onChange={(e) => setForm({ ...form, receiptDate: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">No. Polisi Truk (车牌号) *</label>
                <input type="text" required placeholder="B 1234 CD" value={form.truckPlateNumber || ''} onChange={(e) => setForm({ ...form, truckPlateNumber: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">SKSHHK / DKP (送货单号) *</label>
                <input type="text" required placeholder="SKSHHK-2026-..." value={form.forestryDocNumber || ''} onChange={(e) => setForm({ ...form, forestryDocNumber: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">No. Kontrak (合同编号)</label>
                <input type="text" placeholder="CTR-01" value={form.contractNumber || ''} onChange={(e) => setForm({ ...form, contractNumber: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Supplier / Pemilik (供应商) *</label>
                <input type="text" required placeholder="Nama PT / Koperasi" value={form.supplierName || ''} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
            </div>
          </fieldset>

          {/* 2. Spesifikasi Kayu */}
          <fieldset className="border border-slate-200 rounded-xl p-4">
            <legend className="text-xs font-bold text-amber-800 px-2 uppercase tracking-wide">2. Spesifikasi Kayu & Lokasi (材种与批号)</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Jenis Kayu (树种) *</label>
                <input type="text" required placeholder="Teak / Merbau" value={form.woodSpecies || ''} onChange={(e) => setForm({ ...form, woodSpecies: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Panjang Kayu m (长度)</label>
                <input type="number" step="0.1" min="0" value={form.woodLengthM ?? 4.0} onChange={(e) => setForm({ ...form, woodLengthM: parseFloat(e.target.value) || 0 })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nomer Kavling (进厂批号) *</label>
                <input type="text" required placeholder="KAV-01" value={form.kavlingNumber || ''} onChange={(e) => setForm({ ...form, kavlingNumber: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">TPK / Lapangan (场地)</label>
                <input type="text" placeholder="TPK-1" value={form.storageYard || ''} onChange={(e) => setForm({ ...form, storageYard: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
            </div>
          </fieldset>

          {/* 3. Fisik / Tally */}
          <fieldset className="border border-slate-200 rounded-xl p-4">
            <legend className="text-xs font-bold text-amber-800 px-2 uppercase tracking-wide">3. Pengukuran Batang & Volume (送货 vs 检尺)</legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Batang Surat Jalan (送货根数)</label>
                <input type="number" min="0" value={form.deliveredPieces ?? 0} onChange={(e) => setForm({ ...form, deliveredPieces: parseInt(e.target.value, 10) || 0 })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Vol Surat Jalan m³ (送货立方)</label>
                <input type="number" step="0.01" min="0" value={form.deliveredVolumeM3 ?? 0} onChange={(e) => setForm({ ...form, deliveredVolumeM3: parseFloat(e.target.value) || 0 })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Batang Tally (检尺根数) *</label>
                <input type="number" required min="0" value={form.tallyPieces ?? 0} onChange={(e) => setForm({ ...form, tallyPieces: parseInt(e.target.value, 10) || 0 })} className="w-full text-xs p-2 border border-slate-300 rounded-lg font-bold" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Volume Tally m³ (检尺立方) *</label>
                <input type="number" step="0.01" required min="0" value={form.tallyVolumeM3 ?? 0} onChange={(e) => setForm({ ...form, tallyVolumeM3: parseFloat(e.target.value) || 0 })} className="w-full text-xs p-2 border border-slate-300 rounded-lg font-bold" />
              </div>
            </div>
          </fieldset>

          {/* 4. Keuangan & Pajak */}
          <fieldset className="border border-slate-200 rounded-xl p-4">
            <legend className="text-xs font-bold text-amber-800 px-2 uppercase tracking-wide">4. Harga Kayu, Ongkir & Pajak (货款、运费与税金)</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Harga Kayu / m³ (均价)</label>
                <input type="number" min="0" value={form.timberPricePerM3 ?? 0} onChange={(e) => setForm({ ...form, timberPricePerM3: parseFloat(e.target.value) || 0 })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">PPh Kayu % (税率 0.5% / 1.5%)</label>
                <input type="number" step="0.1" min="0" value={form.timberPphRate ?? 0.5} onChange={(e) => setForm({ ...form, timberPphRate: parseFloat(e.target.value) || 0 })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Ongkir / m³ (运费单价)</label>
                <input type="number" min="0" value={form.freightRatePerM3 ?? 0} onChange={(e) => setForm({ ...form, freightRatePerM3: parseFloat(e.target.value) || 0 })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Potongan PPh Ongkir (运费税)</label>
                <input type="number" min="0" value={form.freightPphAmount ?? 0} onChange={(e) => setForm({ ...form, freightPphAmount: parseFloat(e.target.value) || 0 })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Broker / Komisi (中介费)</label>
                <input type="number" min="0" value={form.brokerFee ?? 0} onChange={(e) => setForm({ ...form, brokerFee: parseFloat(e.target.value) || 0 })} className="w-full text-xs p-2 border border-slate-300 rounded-lg" />
              </div>
            </div>

            {/* Dynamic Live Calculation Card */}
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between text-xs gap-3">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Calculator className="w-4 h-4 text-amber-700" />
                <span>Kalkulasi Otomatis:</span>
              </div>
              <div>Selisih: <strong>{preview.volumeDiscrepancyM3 >= 0 ? `+${preview.volumeDiscrepancyM3.toFixed(2)}` : preview.volumeDiscrepancyM3.toFixed(2)} m³</strong></div>
              <div>Net Kayu: <strong>{formatRupiah(preview.timberNetPayable)}</strong></div>
              <div>Net Ongkir: <strong>{formatRupiah(preview.freightNetPayable)}</strong></div>
              <div className="text-sm font-bold text-amber-800">Total: {formatRupiah(preview.grandNetPayable)}</div>
            </div>
          </fieldset>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition">Batal (取消)</button>
            <button type="submit" className="px-5 py-2 text-sm font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-sm transition">Simpan Data (保存入库)</button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit changes**

```bash
git add src/components/ledger/RecordModal.tsx
git commit -m "feat(ui): implement RecordModal component with live preview calculation"
```

---

### Task 7: Main Dashboard Page Coordinator & API Route

**Files:**
- Create: `app/page.tsx`
- Create: `app/api/records/route.ts`

**Interfaces:**
- Consumes: All UI components (`KpiCards`, `SpeciesBar`, `Toolbar`, `RecordTable`, `RecordModal`), `useWoodRecords` hook.
- Produces: Complete Next.js dashboard view (<150 LOC) and REST endpoint.

- [ ] **Step 1: Implement `app/page.tsx` (<150 LOC)**

Create `app/page.tsx`:
```tsx
'use client';

import React, { useState } from 'react';
import { useWoodRecords } from '../src/hooks/useWoodRecords.ts';
import { KpiCards } from '../src/components/dashboard/KpiCards';
import { SpeciesBar } from '../src/components/dashboard/SpeciesBar';
import { Toolbar } from '../src/components/ledger/Toolbar';
import { RecordTable } from '../src/components/ledger/RecordTable';
import { RecordModal } from '../src/components/ledger/RecordModal';
import type { WoodReceivingRecord } from '../src/types/index.ts';

export default function DashboardPage() {
  const {
    records,
    metrics,
    filters,
    speciesList,
    setFilters,
    saveRecord,
    deleteRecord,
    resetDemo,
    exportCsv,
  } = useWoodRecords();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<WoodReceivingRecord | null>(null);

  const handleNewEntry = () => {
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const handleEdit = (record: WoodReceivingRecord) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Penerimaan Kayu & Manajemen Stok (木材入库与库存管理)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Bilingual Timber Gate Receiving, Tally Discrepancy & Material Ledger
          </p>
        </div>
      </header>

      {/* KPI Cards */}
      <KpiCards metrics={metrics} />

      {/* Species Distribution Chart */}
      <SpeciesBar
        breakdown={metrics.speciesVolumeBreakdown}
        totalVolume={metrics.totalTallyVolumeM3}
      />

      {/* Toolbar */}
      <Toolbar
        filters={filters}
        speciesList={speciesList}
        onFilterChange={setFilters}
        onResetDemo={resetDemo}
        onExportCsv={exportCsv}
        onNewEntry={handleNewEntry}
      />

      {/* Data Table */}
      <RecordTable
        records={records}
        onEdit={handleEdit}
        onDelete={deleteRecord}
      />

      {/* Add / Edit Modal */}
      <RecordModal
        isOpen={isModalOpen}
        initialRecord={editingRecord}
        onClose={() => setIsModalOpen(false)}
        onSave={saveRecord}
      />
    </div>
  );
}
```

- [ ] **Step 2: Implement `app/api/records/route.ts` (<60 LOC)**

Create `app/api/records/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { SEED_WOOD_RECORDS } from '../../../src/persistence/seed-data.ts';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: SEED_WOOD_RECORDS,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({
      success: true,
      message: 'Record received',
      data: body,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid payload' },
      { status: 400 }
    );
  }
}
```

- [ ] **Step 3: Commit changes**

```bash
git add app/page.tsx app/api/records/route.ts
git commit -m "feat(app): implement main Dashboard page coordinator and records API route"
```

---

### Task 8: Verification, Test Suite & End-to-End Build

**Files:**
- Test: `test/` suites
- Verification: `npm run build`

- [ ] **Step 1: Run complete test suite**

Run: `npm test`  
Expected: PASS across all test suites with 0 failures.

- [ ] **Step 2: Run Next.js production build**

Run: `npm run build`  
Expected: Next.js build succeeds with 0 TypeScript and lint errors.

- [ ] **Step 3: Commit final integration**

```bash
git add .
git commit -m "chore(release): complete Next.js 15 and Tailwind CSS migration"
```
