# Wood Stock Dashboard & Receiving CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a zero-dependency, modular modern web application for wood stock receiving CRUD and executive dashboard metrics based on factory-standard bilingual Indonesian-Chinese ledgers.

**Architecture:** Pure Vanilla TypeScript/JavaScript (Native ESM, zero build step) following the Strangler Pattern (<250 lines per file). Pure domain calculators handle volume variances and material/freight tax deductions. Persistent state uses LocalStorage with seamless in-memory fallback, seeded with realistic Indonesian timber records.

**Tech Stack:** Node.js v26.8.1 (native ESM & TypeScript execution), Modern HTML5/CSS3 (Design Tokens), Node Native Test Runner (`node:test` + `node:assert/strict`).

**Spec:** [`docs/superpowers/specs/2026-10-14-wood-stock-dashboard-crud-design.md`](file:///Users/mac/Web%20Development/wood-inventory-management/docs/superpowers/specs/2026-10-14-wood-stock-dashboard-crud-design.md)

## Global Constraints
- Node.js runtime: `>=22.0.0` (active version `26.8.1`).
- Execution standard: Native ECMAScript Modules (`"type": "module"` in `package.json`).
- Zero build tools: No Vite, Webpack, or Babel. Direct browser and Node native ESM loading.
- God-file limit: Every individual module MUST remain strictly under 250 lines of code.
- Single Source of Truth (SSOT): All interfaces and types imported exclusively from `src/types/index.ts`.
- Language standard: All source code, interfaces, comments, and commit messages in English. UI field labels are bilingual (Indonesian primary with Chinese subtitles).
- Test execution: Fast native tests (`node --test`) must run in <150 ms with 0 failures before completing any task.

---

### Task 1: Core Domain Entities & SSOT Type Definitions

**Files:**
- Modify: `src/types/index.ts`
- Test: `test/smoke.test.ts`

**Interfaces:**
- Produces: `WoodReceivingRecord`, `DashboardMetrics`, `RecordFilterCriteria`

- [ ] **Step 1: Write the failing type assertion smoke test**

Append to `test/smoke.test.ts`:
```typescript
import type { WoodReceivingRecord, DashboardMetrics } from '../src/types/index.ts';

test('SSOT Type Definitions exist and export correctly', () => {
  const dummy: Partial<WoodReceivingRecord> = {
    id: 'test-1',
    receiptDate: '2026-10-14',
    woodSpecies: 'Teak / Jati',
    tallyVolumeM3: 15.5,
  };
  assert.strictEqual(dummy.id, 'test-1');
});
```

- [ ] **Step 2: Run smoke test to verify failure**

Run: `node --test test/smoke.test.ts`  
Expected: FAIL or Type compilation error (`Module '../src/types/index.ts' has no exported member 'WoodReceivingRecord'`).

- [ ] **Step 3: Define `WoodReceivingRecord` and `DashboardMetrics` in `src/types/index.ts`**

Add the following interfaces to `src/types/index.ts`:
```typescript
/**
 * Operational Work Item: Timber Inbound Delivery and Gate Tally Record.
 * Directly maps to bilingual factory receiving ledgers.
 */
export interface WoodReceivingRecord {
  id: string;

  // Delivery & Legal Document Identifiers
  receiptDate: string;           // Penerimaan / 到货日期 (YYYY-MM-DD)
  docDate?: string;              // Dokumen Tanggal / 发货时间
  truckPlateNumber: string;      // No. Pol / 车牌号
  forestryDocNumber: string;     // SKSHHK / DKP / SLK (Official Forestry Permit)
  receiptNumber: string;         // Nomor Kwitansi / 订货单号
  contractNumber: string;        // No Kontrak / 合同编号
  supplierName: string;          // Nama Pemilik Hasil Hutan / 供应商

  // Wood Specifications & Yard Location
  woodSpecies: string;           // Jenis Kayu / 树种 (e.g. Teak, Merbau, Mahoni, Sengon)
  woodLengthM: number;           // Panjang Kayu (in meters)
  kavlingNumber: string;         // Nomer Kav / 进厂批号 (Yard Lot / Stack ID)
  storageYard: string;           // TPK / 木堆场地

  // Quantities & Measurements (Delivered vs Tally)
  deliveredPieces: number;       // Jumlah Batang / 送货根数
  deliveredVolumeM3: number;     // Volume Delivery / 送货立方 (m³)
  tallyPieces: number;           // Batang Tally / 检尺根数
  tallyVolumeM3: number;         // Volume Tally / 检尺立方 (m³)

  // Financials — Timber Material (Pembayaran Kayu)
  timberPricePerM3: number;      // Harga / m³
  timberGrossTotal: number;      // Total Harga = tallyVolumeM3 * timberPricePerM3
  timberPphRate: number;         // PPh rate % (e.g. 0.5% or 1.5%)
  timberPphAmount: number;       // PPh Tax Amount
  timberNetPayable: number;      // Net Timber = timberGrossTotal - timberPphAmount

  // Financials — Freight / Logistics (Pembayaran Ongkos Kirim)
  freightRatePerM3: number;      // Ongkir / m³
  freightGrossTotal: number;     // Total Ongkir = tallyVolumeM3 * freightRatePerM3
  freightPphAmount: number;      // PPh Tax Ongkir (PPh 23)
  freightNetPayable: number;     // Net Ongkir = freightGrossTotal - freightPphAmount

  // Broker & Overall Summary
  brokerFee: number;             // Broker fee
  grandNetPayable: number;       // timberNetPayable + freightNetPayable + brokerFee

  createdAt: string;
  updatedAt: string;
}

/**
 * Filter & Search Criteria for Wood Receiving Records
 */
export interface RecordFilterCriteria {
  searchQuery?: string;
  species?: string;
  kavling?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Executive Dashboard Aggregate Metrics
 */
export interface DashboardMetrics {
  totalDeliveredVolumeM3: number;
  totalTallyVolumeM3: number;
  volumeDiscrepancyM3: number;
  totalDeliveredPieces: number;
  totalTallyPieces: number;
  pieceDiscrepancy: number;
  totalNetTimberPayable: number;
  totalNetFreightPayable: number;
  totalGrandExpenditure: number;
  totalRecordsCount: number;
  activeKavlingCount: number;
  speciesVolumeBreakdown: Record<string, number>;
}
```

- [ ] **Step 4: Run smoke test to verify it passes**

Run: `node --test test/smoke.test.ts`  
Expected: PASS (0 failures).

- [ ] **Step 5: Commit changes**

```bash
git add src/types/index.ts test/smoke.test.ts
git commit -m "feat(types): define WoodReceivingRecord and DashboardMetrics SSOT interfaces"
```

---

### Task 2: Pure Domain Calculations & Dashboard Aggregation

**Files:**
- Create: `src/utils/timber-calc.ts`
- Create: `test/timber-calc.test.ts`

**Interfaces:**
- Consumes: `WoodReceivingRecord`, `DashboardMetrics` from `src/types/index.ts`
- Produces:
  - `calculateTimberPayment(volumeM3, pricePerM3, pphRatePercent)`
  - `calculateFreightPayment(volumeM3, freightRatePerM3, pphAmount)`
  - `computeRecordCalculations(input)`
  - `aggregateDashboardMetrics(records)`

- [ ] **Step 1: Write failing unit test in `test/timber-calc.test.ts`**

Create `test/timber-calc.test.ts`:
```typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTimberPayment,
  calculateFreightPayment,
  computeRecordCalculations,
  aggregateDashboardMetrics,
} from '../src/utils/timber-calc.ts';
import type { WoodReceivingRecord } from '../src/types/index.ts';

test('Timber Calculations & Aggregation Test Suite', async (t) => {
  await t.test('calculateTimberPayment computes gross, tax, and net accurately', () => {
    // 10 m³ @ Rp 3,000,000/m³ = Rp 30,000,000 gross. 1.5% PPh = Rp 450,000. Net = Rp 29,550,000
    const res = calculateTimberPayment(10, 3000000, 1.5);
    assert.strictEqual(res.gross, 30000000);
    assert.strictEqual(res.pphAmount, 450000);
    assert.strictEqual(res.netPayable, 29550000);
  });

  await t.test('calculateFreightPayment computes gross and net accurately', () => {
    // 10 m³ @ Rp 250,000/m³ = Rp 2,500,000 gross. PPh = Rp 50,000. Net = Rp 2,450,000
    const res = calculateFreightPayment(10, 250000, 50000);
    assert.strictEqual(res.gross, 2500000);
    assert.strictEqual(res.pphAmount, 50000);
    assert.strictEqual(res.netPayable, 2450000);
  });

  await t.test('computeRecordCalculations auto-completes computed fields from raw inputs', () => {
    const raw = {
      tallyVolumeM3: 12.5,
      deliveredVolumeM3: 12.0,
      tallyPieces: 100,
      deliveredPieces: 98,
      timberPricePerM3: 2000000,
      timberPphRate: 0.5,
      freightRatePerM3: 200000,
      freightPphAmount: 25000,
      brokerFee: 500000,
    };
    const computed = computeRecordCalculations(raw);
    assert.strictEqual(computed.volumeDiscrepancyM3, 0.5);
    assert.strictEqual(computed.pieceDiscrepancy, 2);
    assert.strictEqual(computed.timberGrossTotal, 25000000);
    assert.strictEqual(computed.timberPphAmount, 125000);
    assert.strictEqual(computed.timberNetPayable, 24875000);
    assert.strictEqual(computed.freightGrossTotal, 2500000);
    assert.strictEqual(computed.freightNetPayable, 2475000);
    assert.strictEqual(computed.grandNetPayable, 24875000 + 2475000 + 500000);
  });

  await t.test('aggregateDashboardMetrics computes correct totals across records', () => {
    const records: WoodReceivingRecord[] = [
      {
        id: '1',
        receiptDate: '2026-10-14',
        truckPlateNumber: 'B 1234 CD',
        forestryDocNumber: 'SK-01',
        receiptNumber: 'KW-01',
        contractNumber: 'CT-01',
        supplierName: 'PT Rimba',
        woodSpecies: 'Teak / Jati',
        woodLengthM: 4.0,
        kavlingNumber: 'KAV-A1',
        storageYard: 'TPK-1',
        deliveredPieces: 50,
        deliveredVolumeM3: 5.0,
        tallyPieces: 50,
        tallyVolumeM3: 5.0,
        timberPricePerM3: 1000000,
        timberGrossTotal: 5000000,
        timberPphRate: 0,
        timberPphAmount: 0,
        timberNetPayable: 5000000,
        freightRatePerM3: 100000,
        freightGrossTotal: 500000,
        freightPphAmount: 0,
        freightNetPayable: 500000,
        brokerFee: 100000,
        grandNetPayable: 5600000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const metrics = aggregateDashboardMetrics(records);
    assert.strictEqual(metrics.totalTallyVolumeM3, 5.0);
    assert.strictEqual(metrics.totalTallyPieces, 50);
    assert.strictEqual(metrics.totalGrandExpenditure, 5600000);
    assert.strictEqual(metrics.activeKavlingCount, 1);
    assert.strictEqual(metrics.speciesVolumeBreakdown['Teak / Jati'], 5.0);
  });

  await t.test('calculations throw RangeError on negative numerical inputs', () => {
    assert.throws(() => calculateTimberPayment(-5, 1000, 0), { name: 'RangeError' });
    assert.throws(() => calculateFreightPayment(5, -100, 0), { name: 'RangeError' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/timber-calc.test.ts`  
Expected: FAIL (Cannot find module `../src/utils/timber-calc.ts`).

- [ ] **Step 3: Implement `src/utils/timber-calc.ts` (<150 LOC)**

Create `src/utils/timber-calc.ts`:
```typescript
import type { WoodReceivingRecord, DashboardMetrics } from '../types/index.ts';

export function calculateTimberPayment(
  volumeM3: number,
  pricePerM3: number,
  pphRatePercent = 0
): { gross: number; pphAmount: number; netPayable: number } {
  if (volumeM3 < 0 || pricePerM3 < 0 || pphRatePercent < 0) {
    throw new RangeError('Values must be non-negative');
  }
  const gross = Number((volumeM3 * pricePerM3).toFixed(2));
  const pphAmount = Number((gross * (pphRatePercent / 100)).toFixed(2));
  const netPayable = Number((gross - pphAmount).toFixed(2));
  return { gross, pphAmount, netPayable };
}

export function calculateFreightPayment(
  volumeM3: number,
  freightRatePerM3: number,
  pphAmount = 0
): { gross: number; pphAmount: number; netPayable: number } {
  if (volumeM3 < 0 || freightRatePerM3 < 0 || pphAmount < 0) {
    throw new RangeError('Values must be non-negative');
  }
  const gross = Number((volumeM3 * freightRatePerM3).toFixed(2));
  const netPayable = Number((gross - pphAmount).toFixed(2));
  return { gross, pphAmount, netPayable };
}

export function computeRecordCalculations(input: {
  tallyVolumeM3: number;
  deliveredVolumeM3: number;
  tallyPieces: number;
  deliveredPieces: number;
  timberPricePerM3: number;
  timberPphRate?: number;
  freightRatePerM3: number;
  freightPphAmount?: number;
  brokerFee?: number;
}) {
  const timber = calculateTimberPayment(
    input.tallyVolumeM3,
    input.timberPricePerM3,
    input.timberPphRate ?? 0
  );

  const freight = calculateFreightPayment(
    input.tallyVolumeM3,
    input.freightRatePerM3,
    input.freightPphAmount ?? 0
  );

  const broker = input.brokerFee ?? 0;
  if (broker < 0) throw new RangeError('Broker fee must be non-negative');

  const grandNetPayable = Number((timber.netPayable + freight.netPayable + broker).toFixed(2));
  const volumeDiscrepancyM3 = Number((input.tallyVolumeM3 - input.deliveredVolumeM3).toFixed(4));
  const pieceDiscrepancy = input.tallyPieces - input.deliveredPieces;

  return {
    volumeDiscrepancyM3,
    pieceDiscrepancy,
    timberGrossTotal: timber.gross,
    timberPphAmount: timber.pphAmount,
    timberNetPayable: timber.netPayable,
    freightGrossTotal: freight.gross,
    freightNetPayable: freight.netPayable,
    grandNetPayable,
  };
}

export function aggregateDashboardMetrics(records: WoodReceivingRecord[]): DashboardMetrics {
  let totalDeliveredVolumeM3 = 0;
  let totalTallyVolumeM3 = 0;
  let totalDeliveredPieces = 0;
  let totalTallyPieces = 0;
  let totalNetTimberPayable = 0;
  let totalNetFreightPayable = 0;
  let totalGrandExpenditure = 0;

  const kavlingSet = new Set<string>();
  const speciesVolumeBreakdown: Record<string, number> = {};

  for (const r of records) {
    totalDeliveredVolumeM3 += r.deliveredVolumeM3;
    totalTallyVolumeM3 += r.tallyVolumeM3;
    totalDeliveredPieces += r.deliveredPieces;
    totalTallyPieces += r.tallyPieces;
    totalNetTimberPayable += r.timberNetPayable;
    totalNetFreightPayable += r.freightNetPayable;
    totalGrandExpenditure += r.grandNetPayable;

    if (r.kavlingNumber) kavlingSet.add(r.kavlingNumber.trim());

    const species = r.woodSpecies ? r.woodSpecies.trim() : 'Unknown';
    speciesVolumeBreakdown[species] = Number(
      ((speciesVolumeBreakdown[species] ?? 0) + r.tallyVolumeM3).toFixed(4)
    );
  }

  return {
    totalDeliveredVolumeM3: Number(totalDeliveredVolumeM3.toFixed(4)),
    totalTallyVolumeM3: Number(totalTallyVolumeM3.toFixed(4)),
    volumeDiscrepancyM3: Number((totalTallyVolumeM3 - totalDeliveredVolumeM3).toFixed(4)),
    totalDeliveredPieces,
    totalTallyPieces,
    pieceDiscrepancy: totalTallyPieces - totalDeliveredPieces,
    totalNetTimberPayable: Number(totalNetTimberPayable.toFixed(2)),
    totalNetFreightPayable: Number(totalNetFreightPayable.toFixed(2)),
    totalGrandExpenditure: Number(totalGrandExpenditure.toFixed(2)),
    totalRecordsCount: records.length,
    activeKavlingCount: kavlingSet.size,
    speciesVolumeBreakdown,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/timber-calc.test.ts`  
Expected: PASS (0 failures, execution time <50ms).

- [ ] **Step 5: Commit changes**

```bash
git add src/utils/timber-calc.ts test/timber-calc.test.ts
git commit -m "feat(calc): implement timber payment, freight, and dashboard metrics calculations"
```

---

### Task 3: Realistic Seed Data & Persistent Record Repository

**Files:**
- Create: `src/persistence/seed-data.ts`
- Create: `src/persistence/record-repository.ts`
- Create: `test/storage-crud.test.ts`

**Interfaces:**
- Consumes: `WoodReceivingRecord`, `RecordFilterCriteria` from `src/types/index.ts`, `StorageAdapter` from `src/persistence/storage.ts`
- Produces: `WoodRecordRepository` (`getAll`, `getFiltered`, `getById`, `save`, `delete`, `resetToSeed`)

- [ ] **Step 1: Write failing unit test in `test/storage-crud.test.ts`**

Create `test/storage-crud.test.ts`:
```typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorageAdapter } from '../src/persistence/storage.ts';
import { WoodRecordRepository } from '../src/persistence/record-repository.ts';
import { SEED_WOOD_RECORDS } from '../src/persistence/seed-data.ts';

test('WoodRecordRepository CRUD & Filtering Suite', async (t) => {
  const storage = new MemoryStorageAdapter();
  const repo = new WoodRecordRepository(storage);

  await t.test('initializes with seed data when empty', async () => {
    const records = await repo.getAll();
    assert.ok(records.length >= 4, 'Should contain seed records');
    assert.strictEqual(records[0].woodSpecies, SEED_WOOD_RECORDS[0].woodSpecies);
  });

  await t.test('filters records by species and query', async () => {
    const teakOnly = await repo.getFiltered({ species: 'Teak / Jati (柚木)' });
    assert.ok(teakOnly.length > 0);
    assert.ok(teakOnly.every((r) => r.woodSpecies.includes('Teak')));

    const querySearch = await repo.getFiltered({ searchQuery: 'SKSHHK-2026-001' });
    assert.strictEqual(querySearch.length, 1);
  });

  await t.test('saves a new record and updates existing', async () => {
    const newRecord = { ...SEED_WOOD_RECORDS[0], id: 'custom-rec-99', receiptNumber: 'KW-NEW-99' };
    await repo.save(newRecord);

    const retrieved = await repo.getById('custom-rec-99');
    assert.ok(retrieved !== null);
    assert.strictEqual(retrieved?.receiptNumber, 'KW-NEW-99');

    // Update
    newRecord.supplierName = 'Updated Supplier';
    await repo.save(newRecord);
    const updated = await repo.getById('custom-rec-99');
    assert.strictEqual(updated?.supplierName, 'Updated Supplier');
  });

  await t.test('deletes record successfully', async () => {
    await repo.delete('custom-rec-99');
    const retrieved = await repo.getById('custom-rec-99');
    assert.strictEqual(retrieved, null);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `node --test test/storage-crud.test.ts`  
Expected: FAIL (Cannot find module `../src/persistence/seed-data.ts`).

- [ ] **Step 3: Create `src/persistence/seed-data.ts` (<100 LOC)**

Create `src/persistence/seed-data.ts`:
```typescript
import type { WoodReceivingRecord } from '../types/index.ts';

export const SEED_WOOD_RECORDS: WoodReceivingRecord[] = [
  {
    id: 'rec-2026-10-01',
    receiptDate: '2026-10-01',
    docDate: '2026-09-29',
    truckPlateNumber: 'B 9283 TDA',
    forestryDocNumber: 'SKSHHK-2026-001',
    receiptNumber: 'KW-2026-101',
    contractNumber: 'CTR-JATI-01',
    supplierName: 'PT Wana Lestari Abadi',
    woodSpecies: 'Teak / Jati (柚木)',
    woodLengthM: 4.2,
    kavlingNumber: 'KAV-01',
    storageYard: 'TPK-Timur',
    deliveredPieces: 85,
    deliveredVolumeM3: 14.5,
    tallyPieces: 85,
    tallyVolumeM3: 14.65,
    timberPricePerM3: 4200000,
    timberGrossTotal: 61530000,
    timberPphRate: 0.5,
    timberPphAmount: 307650,
    timberNetPayable: 61222350,
    freightRatePerM3: 250000,
    freightGrossTotal: 3662500,
    freightPphAmount: 73250,
    freightNetPayable: 3589250,
    brokerFee: 500000,
    grandNetPayable: 65311600,
    createdAt: '2026-10-01T08:30:00.000Z',
    updatedAt: '2026-10-01T08:30:00.000Z',
  },
  {
    id: 'rec-2026-10-02',
    receiptDate: '2026-10-03',
    docDate: '2026-10-01',
    truckPlateNumber: 'L 8172 UX',
    forestryDocNumber: 'SKSHHK-2026-002',
    receiptNumber: 'KW-2026-102',
    contractNumber: 'CTR-MRB-04',
    supplierName: 'CV Papua Rimba Sejahtera',
    woodSpecies: 'Merbau (菠萝格)',
    woodLengthM: 5.0,
    kavlingNumber: 'KAV-02',
    storageYard: 'TPK-Utara',
    deliveredPieces: 60,
    deliveredVolumeM3: 18.2,
    tallyPieces: 58,
    tallyVolumeM3: 17.85,
    timberPricePerM3: 5500000,
    timberGrossTotal: 98175000,
    timberPphRate: 0.5,
    timberPphAmount: 490875,
    timberNetPayable: 97684125,
    freightRatePerM3: 320000,
    freightGrossTotal: 5712000,
    freightPphAmount: 114240,
    freightNetPayable: 5597760,
    brokerFee: 750000,
    grandNetPayable: 104031885,
    createdAt: '2026-10-03T10:15:00.000Z',
    updatedAt: '2026-10-03T10:15:00.000Z',
  },
  {
    id: 'rec-2026-10-03',
    receiptDate: '2026-10-05',
    docDate: '2026-10-04',
    truckPlateNumber: 'AD 1459 CF',
    forestryDocNumber: 'DKP-SLK-8821',
    receiptNumber: 'KW-2026-103',
    contractNumber: 'CTR-MHN-02',
    supplierName: 'PT Kayu Makmur Nusantara',
    woodSpecies: 'Mahoni (桃花心木)',
    woodLengthM: 3.5,
    kavlingNumber: 'KAV-03',
    storageYard: 'TPK-Barat',
    deliveredPieces: 110,
    deliveredVolumeM3: 12.8,
    tallyPieces: 110,
    tallyVolumeM3: 12.8,
    timberPricePerM3: 2800000,
    timberGrossTotal: 35840000,
    timberPphRate: 0.5,
    timberPphAmount: 179200,
    timberNetPayable: 35660800,
    freightRatePerM3: 180000,
    freightGrossTotal: 2304000,
    freightPphAmount: 46080,
    freightNetPayable: 2257920,
    brokerFee: 300000,
    grandNetPayable: 38218720,
    createdAt: '2026-10-05T13:40:00.000Z',
    updatedAt: '2026-10-05T13:40:00.000Z',
  },
  {
    id: 'rec-2026-10-04',
    receiptDate: '2026-10-08',
    docDate: '2026-10-07',
    truckPlateNumber: 'K 9102 HC',
    forestryDocNumber: 'DKP-SLK-9011',
    receiptNumber: 'KW-2026-104',
    contractNumber: 'CTR-SGN-09',
    supplierName: 'Koperasi Hutan Lestari',
    woodSpecies: 'Sengon / Albasia (南洋楹)',
    woodLengthM: 2.6,
    kavlingNumber: 'KAV-04',
    storageYard: 'TPK-Selatan',
    deliveredPieces: 150,
    deliveredVolumeM3: 9.6,
    tallyPieces: 152,
    tallyVolumeM3: 9.8,
    timberPricePerM3: 1350000,
    timberGrossTotal: 13230000,
    timberPphRate: 0.5,
    timberPphAmount: 66150,
    timberNetPayable: 13163850,
    freightRatePerM3: 120000,
    freightGrossTotal: 1176000,
    freightPphAmount: 23520,
    freightNetPayable: 1152480,
    brokerFee: 200000,
    grandNetPayable: 14516330,
    createdAt: '2026-10-08T09:00:00.000Z',
    updatedAt: '2026-10-08T09:00:00.000Z',
  },
];
```

- [ ] **Step 4: Create `src/persistence/record-repository.ts` (<150 LOC)**

Create `src/persistence/record-repository.ts`:
```typescript
import type { WoodReceivingRecord, RecordFilterCriteria } from '../types/index.ts';
import type { StorageAdapter } from './storage.ts';
import { SEED_WOOD_RECORDS } from './seed-data.ts';

const STORAGE_KEY = 'wood_receiving_records_v1';

export class WoodRecordRepository {
  constructor(private storage: StorageAdapter) {}

  async getAll(): Promise<WoodReceivingRecord[]> {
    let records = await this.storage.getItem<WoodReceivingRecord[]>(STORAGE_KEY);
    if (!records || !Array.isArray(records) || records.length === 0) {
      records = [...SEED_WOOD_RECORDS];
      await this.storage.setItem(STORAGE_KEY, records);
    }
    return records;
  }

  async getFiltered(criteria: RecordFilterCriteria): Promise<WoodReceivingRecord[]> {
    const records = await this.getAll();
    return records.filter((r) => {
      if (criteria.species && r.woodSpecies !== criteria.species) {
        return false;
      }
      if (criteria.kavling && r.kavlingNumber !== criteria.kavling) {
        return false;
      }
      if (criteria.startDate && r.receiptDate < criteria.startDate) {
        return false;
      }
      if (criteria.endDate && r.receiptDate > criteria.endDate) {
        return false;
      }
      if (criteria.searchQuery) {
        const query = criteria.searchQuery.trim().toLowerCase();
        const haystack = [
          r.truckPlateNumber,
          r.forestryDocNumber,
          r.receiptNumber,
          r.contractNumber,
          r.supplierName,
          r.woodSpecies,
          r.kavlingNumber,
          r.storageYard,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }

  async getById(id: string): Promise<WoodReceivingRecord | null> {
    const records = await this.getAll();
    return records.find((r) => r.id === id) ?? null;
  }

  async save(record: WoodReceivingRecord): Promise<void> {
    const records = await this.getAll();
    const index = records.findIndex((r) => r.id === record.id);
    if (index >= 0) {
      records[index] = { ...record, updatedAt: new Date().toISOString() };
    } else {
      records.unshift({
        ...record,
        createdAt: record.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    await this.storage.setItem(STORAGE_KEY, records);
  }

  async delete(id: string): Promise<void> {
    const records = await this.getAll();
    const filtered = records.filter((r) => r.id !== id);
    await this.storage.setItem(STORAGE_KEY, filtered);
  }

  async resetToSeed(): Promise<WoodReceivingRecord[]> {
    const fresh = JSON.parse(JSON.stringify(SEED_WOOD_RECORDS)) as WoodReceivingRecord[];
    await this.storage.setItem(STORAGE_KEY, fresh);
    return fresh;
  }
}
```

- [ ] **Step 5: Run tests to verify all pass**

Run: `node --test test/storage-crud.test.ts`  
Expected: PASS (0 failures).

- [ ] **Step 6: Commit changes**

```bash
git add src/persistence/seed-data.ts src/persistence/record-repository.ts test/storage-crud.test.ts
git commit -m "feat(persistence): implement WoodRecordRepository with seed data and filtering"
```

---

### Task 4: UI Styling Design Tokens & HTML App Shell

**Files:**
- Create: `src/styles/theme.css`
- Create: `public/index.html`

**Interfaces:**
- Produces: Semantic layout mounting targets (`#kpi-section`, `#toolbar-section`, `#table-section`, `#modal-container`)

- [ ] **Step 1: Write semantic styling in `src/styles/theme.css` (<240 LOC)**

Create `src/styles/theme.css` using modern CSS custom properties:
```css
:root {
  --wood-bg: #f8fafc;
  --wood-card: #ffffff;
  --wood-border: #e2e8f0;
  --wood-text-main: #0f172a;
  --wood-text-muted: #64748b;
  --wood-primary: #b45309; /* Warm Amber Wood */
  --wood-primary-hover: #92400e;
  --wood-accent: #0284c7;
  --wood-success-bg: #dcfce7;
  --wood-success-text: #166534;
  --wood-danger-bg: #fee2e2;
  --wood-danger-text: #991b1b;
  --radius-sm: 6px;
  --radius-md: 10px;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--font-sans);
  background-color: var(--wood-bg);
  color: var(--wood-text-main);
  line-height: 1.5;
  padding: 1.5rem;
}

.app-container { max-width: 1440px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem; }
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid var(--wood-border);
  padding-bottom: 1rem;
}
.header-titles h1 { font-size: 1.5rem; font-weight: 700; color: var(--wood-text-main); }
.header-titles p { font-size: 0.875rem; color: var(--wood-text-muted); }

/* KPI Section */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}
.kpi-card {
  background: var(--wood-card);
  border: 1px solid var(--wood-border);
  border-radius: var(--radius-md);
  padding: 1.25rem;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.kpi-title { font-size: 0.8125rem; color: var(--wood-text-muted); font-weight: 600; text-transform: uppercase; }
.kpi-value { font-size: 1.75rem; font-weight: 700; color: var(--wood-primary); }
.kpi-subtext { font-size: 0.75rem; color: var(--wood-text-muted); display: flex; align-items: center; gap: 0.5rem; }

/* Species Distribution Bar */
.species-chart-card {
  background: var(--wood-card);
  border: 1px solid var(--wood-border);
  border-radius: var(--radius-md);
  padding: 1rem 1.25rem;
  box-shadow: var(--shadow-sm);
}
.species-bar-container { display: flex; height: 16px; border-radius: 9999px; overflow: hidden; margin: 0.5rem 0; background: #e2e8f0; }
.species-legend { display: flex; flex-wrap: wrap; gap: 1rem; font-size: 0.75rem; color: var(--wood-text-muted); }
.legend-item { display: flex; align-items: center; gap: 0.35rem; }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; }

/* Toolbar */
.toolbar-card {
  background: var(--wood-card);
  border: 1px solid var(--wood-border);
  border-radius: var(--radius-md);
  padding: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: space-between;
  align-items: center;
}
.filter-group { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
.input-control, .select-control {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--wood-border);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  background: white;
  color: var(--wood-text-main);
}
.btn {
  padding: 0.5rem 1rem;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: background 0.15s ease;
}
.btn-primary { background: var(--wood-primary); color: white; }
.btn-primary:hover { background: var(--wood-primary-hover); }
.btn-secondary { background: #f1f5f9; color: var(--wood-text-main); border: 1px solid var(--wood-border); }
.btn-secondary:hover { background: #e2e8f0; }
.btn-danger { background: var(--wood-danger-bg); color: var(--wood-danger-text); }

/* Table */
.table-wrapper {
  background: var(--wood-card);
  border: 1px solid var(--wood-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  overflow-x: auto;
}
.data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.8125rem; }
.data-table th, .data-table td { padding: 0.75rem 0.85rem; border-bottom: 1px solid var(--wood-border); white-space: nowrap; }
.data-table th { background: #f8fafc; font-weight: 600; color: #475569; position: sticky; top: 0; }
.data-table tr:hover { background: #f1f5f9; }
.col-header-subtitle { display: block; font-size: 0.7rem; color: #94a3b8; font-weight: 400; }

.badge { display: inline-flex; align-items: center; padding: 0.15rem 0.5rem; border-radius: 9999px; font-weight: 600; font-size: 0.7rem; }
.badge-match { background: var(--wood-success-bg); color: var(--wood-success-text); }
.badge-alert { background: var(--wood-danger-bg); color: var(--wood-danger-text); }

/* Modal */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
  padding: 1rem;
}
.modal-dialog {
  background: white; border-radius: var(--radius-md); max-width: 900px; width: 100%;
  max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-md); padding: 1.5rem;
}
.form-fieldset { border: 1px solid var(--wood-border); border-radius: var(--radius-sm); padding: 1rem; margin-bottom: 1rem; }
.form-legend { font-size: 0.8125rem; font-weight: 700; color: var(--wood-primary); padding: 0 0.5rem; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; }
.form-group { display: flex; flex-direction: column; gap: 0.25rem; }
.form-label { font-size: 0.75rem; font-weight: 600; color: var(--wood-text-main); }
.form-label span { font-weight: 400; color: var(--wood-text-muted); }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem; }
```

- [ ] **Step 2: Create `public/index.html` (<80 LOC)**

Create `public/index.html`:
```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Penerimaan Kayu & Stok Gudang | Timber Stock Management</title>
  <link rel="stylesheet" href="../src/styles/theme.css" />
</head>
<body>
  <div class="app-container">
    <header class="header-bar">
      <div class="header-titles">
        <h1>Penerimaan Kayu & Manajemen Stok (木材入库与库存管理)</h1>
        <p>Bilingual Timber Inbound Inspection, Tally Reconciliation & Material Ledger</p>
      </div>
      <div>
        <button id="btn-new-entry" class="btn btn-primary">+ Input Penerimaan (新增入库)</button>
      </div>
    </header>

    <!-- Top KPI Executive Dashboard Cards -->
    <section id="kpi-section"></section>

    <!-- Species Volume Distribution Bar -->
    <section id="species-chart-section"></section>

    <!-- Filter & Action Toolbar -->
    <section id="toolbar-section"></section>

    <!-- Bilingual Data Table -->
    <section id="table-section"></section>
  </div>

  <!-- Accessible Modal Container -->
  <div id="modal-container"></div>

  <!-- Application Bootstrap -->
  <script type="module" src="../src/app.ts"></script>
</body>
</html>
```

- [ ] **Step 3: Commit changes**

```bash
git add src/styles/theme.css public/index.html
git commit -m "feat(ui): add theme design tokens and HTML application shell"
```

---

### Task 5: Executive KPI Dashboard & Species Bar Component

**Files:**
- Create: `src/components/kpi-dashboard.ts`

**Interfaces:**
- Consumes: `DashboardMetrics` from `src/types/index.ts`
- Produces: `renderKpiDashboard(container, metrics)`, `renderSpeciesBar(container, breakdown, totalVolume)`

- [ ] **Step 1: Implement `src/components/kpi-dashboard.ts` (<160 LOC)**

Create `src/components/kpi-dashboard.ts`:
```typescript
import type { DashboardMetrics } from '../types/index.ts';

const PALETTE = ['#b45309', '#0284c7', '#10b981', '#6366f1', '#ec4899', '#f59e0b'];

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function renderKpiDashboard(container: HTMLElement, metrics: DashboardMetrics): void {
  const discrepancyBadge = metrics.volumeDiscrepancyM3 >= 0
    ? `<span class="badge badge-match">+${metrics.volumeDiscrepancyM3.toFixed(2)} m³ (Surplus/Match)</span>`
    : `<span class="badge badge-alert">${metrics.volumeDiscrepancyM3.toFixed(2)} m³ (Shortage)</span>`;

  container.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-title">Total Volume Tally (检尺立方)</span>
        <span class="kpi-value">${metrics.totalTallyVolumeM3.toFixed(2)} <span style="font-size:1rem;font-weight:400;">m³</span></span>
        <div class="kpi-subtext">
          <span>Delivery: ${metrics.totalDeliveredVolumeM3.toFixed(2)} m³</span>
          ${discrepancyBadge}
        </div>
      </div>

      <div class="kpi-card">
        <span class="kpi-title">Total Batang Tally (检尺根数)</span>
        <span class="kpi-value">${metrics.totalTallyPieces.toLocaleString('id-ID')} <span style="font-size:1rem;font-weight:400;">Btg</span></span>
        <div class="kpi-subtext">
          <span>Delivered: ${metrics.totalDeliveredPieces.toLocaleString('id-ID')} Btg</span>
          <span>(Selisih: ${metrics.pieceDiscrepancy >= 0 ? '+' : ''}${metrics.pieceDiscrepancy})</span>
        </div>
      </div>

      <div class="kpi-card">
        <span class="kpi-title">Total Pengeluaran (总应付金额)</span>
        <span class="kpi-value" style="font-size: 1.4rem;">${formatRupiah(metrics.totalGrandExpenditure)}</span>
        <div class="kpi-subtext">
          <span>Kayu: ${formatRupiah(metrics.totalNetTimberPayable)}</span>
          <span>Ongkir: ${formatRupiah(metrics.totalNetFreightPayable)}</span>
        </div>
      </div>

      <div class="kpi-card">
        <span class="kpi-title">Kavling & Total Batch (批号统计)</span>
        <span class="kpi-value">${metrics.activeKavlingCount} <span style="font-size:1rem;font-weight:400;">Kavling Aktif</span></span>
        <div class="kpi-subtext">
          <span>${metrics.totalRecordsCount} Pengiriman Tercatat</span>
        </div>
      </div>
    </div>
  `;
}

export function renderSpeciesBar(
  container: HTMLElement,
  breakdown: Record<string, number>,
  totalVolume: number
): void {
  const entries = Object.entries(breakdown).filter(([_, vol]) => vol > 0);
  if (entries.length === 0 || totalVolume <= 0) {
    container.innerHTML = '';
    return;
  }

  const segments = entries.map(([species, vol], index) => {
    const pct = ((vol / totalVolume) * 100).toFixed(1);
    const color = PALETTE[index % PALETTE.length];
    return `<div style="width: ${pct}%; background-color: ${color};" title="${species}: ${vol.toFixed(2)} m³ (${pct}%)"></div>`;
  }).join('');

  const legends = entries.map(([species, vol], index) => {
    const pct = ((vol / totalVolume) * 100).toFixed(1);
    const color = PALETTE[index % PALETTE.length];
    return `
      <div class="legend-item">
        <div class="legend-dot" style="background-color: ${color};"></div>
        <span><strong>${species}</strong>: ${vol.toFixed(2)} m³ (${pct}%)</span>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="species-chart-card">
      <div style="font-size: 0.8125rem; font-weight: 600; color: var(--wood-text-muted);">
        DISTRIBUSI SPESIES KAYU (树种立方占比分布)
      </div>
      <div class="species-bar-container">${segments}</div>
      <div class="species-legend">${legends}</div>
    </div>
  `;
}
```

- [ ] **Step 2: Commit changes**

```bash
git add src/components/kpi-dashboard.ts
git commit -m "feat(ui): add executive KPI and species distribution bar component"
```

---

### Task 6: Bilingual CRUD Table & Filter Toolbar Component

**Files:**
- Create: `src/components/record-table.ts`

**Interfaces:**
- Consumes: `WoodReceivingRecord` from `src/types/index.ts`
- Produces: `renderRecordTable(container, records, onEdit, onDelete)`, `renderToolbar(container, speciesList, onFilterChange, onResetDemo, onExportCsv)`

- [ ] **Step 1: Implement `src/components/record-table.ts` (<220 LOC)**

Create `src/components/record-table.ts`:
```typescript
import type { WoodReceivingRecord, RecordFilterCriteria } from '../types/index.ts';

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function renderToolbar(
  container: HTMLElement,
  speciesList: string[],
  onFilterChange: (filters: RecordFilterCriteria) => void,
  onResetDemo: () => void,
  onExportCsv: () => void
): void {
  const speciesOptions = speciesList
    .map((s) => `<option value="${s}">${s}</option>`)
    .join('');

  container.innerHTML = `
    <div class="toolbar-card">
      <div class="filter-group">
        <input id="filter-search" class="input-control" type="text" placeholder="Cari Plat / Dok / Supplier / Kav..." style="min-width: 240px;" />
        <select id="filter-species" class="select-control">
          <option value="">Semua Spesies (所有材种)</option>
          ${speciesOptions}
        </select>
        <button id="btn-export-csv" class="btn btn-secondary">📥 Export CSV</button>
      </div>
      <div class="filter-group">
        <button id="btn-reset-demo" class="btn btn-secondary" title="Muat ulang data demo">🔄 Reset Demo</button>
      </div>
    </div>
  `;

  const searchInput = container.querySelector('#filter-search') as HTMLInputElement;
  const speciesSelect = container.querySelector('#filter-species') as HTMLSelectElement;

  const trigger = () => {
    onFilterChange({
      searchQuery: searchInput.value,
      species: speciesSelect.value || undefined,
    });
  };

  searchInput.addEventListener('input', trigger);
  speciesSelect.addEventListener('change', trigger);
  container.querySelector('#btn-reset-demo')?.addEventListener('click', onResetDemo);
  container.querySelector('#btn-export-csv')?.addEventListener('click', onExportCsv);
}

export function renderRecordTable(
  container: HTMLElement,
  records: WoodReceivingRecord[],
  onEdit: (record: WoodReceivingRecord) => void,
  onDelete: (id: string) => void
): void {
  if (records.length === 0) {
    container.innerHTML = `
      <div class="table-wrapper" style="padding: 2.5rem; text-align: center; color: var(--wood-text-muted);">
        <p>Tidak ada data penerimaan yang cocok dengan filter pencarian.</p>
      </div>
    `;
    return;
  }

  const rows = records.map((r) => {
    const volDiff = Number((r.tallyVolumeM3 - r.deliveredVolumeM3).toFixed(2));
    const volBadge = volDiff >= 0
      ? `<span class="badge badge-match">+${volDiff}</span>`
      : `<span class="badge badge-alert">${volDiff}</span>`;

    return `
      <tr>
        <td><strong>${r.receiptDate}</strong></td>
        <td>${r.truckPlateNumber}</td>
        <td><code>${r.forestryDocNumber}</code></td>
        <td>${r.contractNumber}</td>
        <td>${r.supplierName}</td>
        <td><strong>${r.woodSpecies}</strong></td>
        <td><span style="font-weight:600; color:var(--wood-primary);">${r.kavlingNumber}</span></td>
        <td>${r.deliveredPieces} / <strong>${r.tallyPieces}</strong></td>
        <td>${r.deliveredVolumeM3.toFixed(2)} / <strong>${r.tallyVolumeM3.toFixed(2)}</strong></td>
        <td>${volBadge}</td>
        <td>${formatRupiah(r.timberNetPayable)}</td>
        <td>${formatRupiah(r.freightNetPayable)}</td>
        <td style="font-weight:700; color:var(--wood-primary);">${formatRupiah(r.grandNetPayable)}</td>
        <td>
          <button class="btn btn-secondary btn-edit" data-id="${r.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Edit</button>
          <button class="btn btn-danger btn-delete" data-id="${r.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Hapus</button>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Penerimaan<span class="col-header-subtitle">到货日期</span></th>
            <th>No. Polisi<span class="col-header-subtitle">车牌号</span></th>
            <th>SKSHHK / DKP<span class="col-header-subtitle">送货单号</span></th>
            <th>No. Kontrak<span class="col-header-subtitle">合同编号</span></th>
            <th>Supplier<span class="col-header-subtitle">供应商</span></th>
            <th>Jenis Kayu<span class="col-header-subtitle">树种</span></th>
            <th>No. Kav<span class="col-header-subtitle">进厂批号</span></th>
            <th>Batang (Del/Tally)<span class="col-header-subtitle">送货/检尺根数</span></th>
            <th>Vol m³ (Del/Tally)<span class="col-header-subtitle">送货/检尺立方</span></th>
            <th>Selisih Vol<span class="col-header-subtitle">误差立方</span></th>
            <th>Net Kayu<span class="col-header-subtitle">木材应付</span></th>
            <th>Net Ongkir<span class="col-header-subtitle">运费应付</span></th>
            <th>Total Bayar<span class="col-header-subtitle">应付金额</span></th>
            <th>Aksi<span class="col-header-subtitle">操作</span></th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;

  container.querySelectorAll('.btn-edit').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const rec = records.find((r) => r.id === id);
      if (rec) onEdit(rec);
    });
  });

  container.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (id && confirm('Apakah Anda yakin ingin menghapus data penerimaan ini?')) {
        onDelete(id);
      }
    });
  });
}
```

- [ ] **Step 2: Commit changes**

```bash
git add src/components/record-table.ts
git commit -m "feat(ui): implement bilingual CRUD table and filter toolbar component"
```

---

### Task 7: Interactive Add/Edit Modal with Live Math Calculation

**Files:**
- Create: `src/components/record-modal.ts`

**Interfaces:**
- Consumes: `WoodReceivingRecord` from `src/types/index.ts`, `computeRecordCalculations` from `src/utils/timber-calc.ts`
- Produces: `openRecordModal(container, initialRecord, onSave)`

- [ ] **Step 1: Implement `src/components/record-modal.ts` (<245 LOC)**

Create `src/components/record-modal.ts`:
```typescript
import type { WoodReceivingRecord } from '../types/index.ts';
import { computeRecordCalculations } from '../utils/timber-calc.ts';

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function openRecordModal(
  container: HTMLElement,
  initialRecord: WoodReceivingRecord | null,
  onSave: (record: WoodReceivingRecord) => void
): void {
  const isEdit = initialRecord !== null;
  const recordId = initialRecord?.id || `rec-${Date.now()}`;

  container.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-dialog">
        <h2 style="margin-bottom: 1rem; color: var(--wood-text-main);">
          ${isEdit ? 'Edit Penerimaan Kayu (编辑入库)' : 'Input Penerimaan Kayu Baru (新增木材入库)'}
        </h2>
        <form id="record-form">
          <!-- Dokumen & Pengiriman -->
          <fieldset class="form-fieldset">
            <legend class="form-legend">1. Dokumen & Pengiriman (发货单据与物流)</legend>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Tanggal Penerimaan <span>(到货日期) *</span></label>
                <input class="input-control" type="date" name="receiptDate" value="${initialRecord?.receiptDate || new Date().toISOString().slice(0, 10)}" required />
              </div>
              <div class="form-group">
                <label class="form-label">No. Polisi Truk <span>(车牌号) *</span></label>
                <input class="input-control" type="text" name="truckPlateNumber" value="${initialRecord?.truckPlateNumber || ''}" placeholder="e.g. B 1234 CD" required />
              </div>
              <div class="form-group">
                <label class="form-label">SKSHHK / DKP <span>(送货单号) *</span></label>
                <input class="input-control" type="text" name="forestryDocNumber" value="${initialRecord?.forestryDocNumber || ''}" placeholder="e.g. SKSHHK-2026-..." required />
              </div>
              <div class="form-group">
                <label class="form-label">No. Kontrak <span>(合同编号)</span></label>
                <input class="input-control" type="text" name="contractNumber" value="${initialRecord?.contractNumber || ''}" placeholder="e.g. CTR-01" />
              </div>
              <div class="form-group">
                <label class="form-label">Supplier / Pemilik <span>(供应商) *</span></label>
                <input class="input-control" type="text" name="supplierName" value="${initialRecord?.supplierName || ''}" placeholder="Nama PT / Koperasi" required />
              </div>
            </div>
          </fieldset>

          <!-- Spesifikasi Kayu & Lokasi -->
          <fieldset class="form-fieldset">
            <legend class="form-legend">2. Spesifikasi Kayu & Lokasi Gudang (材种与批号)</legend>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Jenis Kayu <span>(树种) *</span></label>
                <input class="input-control" type="text" name="woodSpecies" value="${initialRecord?.woodSpecies || ''}" placeholder="Teak / Merbau / Sengon" required />
              </div>
              <div class="form-group">
                <label class="form-label">Panjang Kayu (m) <span>(长度)</span></label>
                <input class="input-control" type="number" step="0.1" name="woodLengthM" value="${initialRecord?.woodLengthM ?? 4.0}" />
              </div>
              <div class="form-group">
                <label class="form-label">Nomer Kavling <span>(进厂批号) *</span></label>
                <input class="input-control" type="text" name="kavlingNumber" value="${initialRecord?.kavlingNumber || 'KAV-01'}" required />
              </div>
              <div class="form-group">
                <label class="form-label">TPK / Lokasi Lapangan <span>(场地)</span></label>
                <input class="input-control" type="text" name="storageYard" value="${initialRecord?.storageYard || 'TPK-1'}" />
              </div>
            </div>
          </fieldset>

          <!-- Pengukuran Fisik / Tally -->
          <fieldset class="form-fieldset">
            <legend class="form-legend">3. Pengukuran Batang & Volume (送货 vs 检尺)</legend>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Batang Surat Jalan <span>(送货根数)</span></label>
                <input class="input-control" type="number" name="deliveredPieces" value="${initialRecord?.deliveredPieces ?? 0}" />
              </div>
              <div class="form-group">
                <label class="form-label">Volume Surat Jalan m³ <span>(送货立方)</span></label>
                <input class="input-control" type="number" step="0.01" name="deliveredVolumeM3" value="${initialRecord?.deliveredVolumeM3 ?? 0}" />
              </div>
              <div class="form-group">
                <label class="form-label">Batang Tally <span>(检尺根数) *</span></label>
                <input class="input-control" type="number" name="tallyPieces" value="${initialRecord?.tallyPieces ?? 0}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Volume Tally m³ <span>(检尺立方) *</span></label>
                <input class="input-control" type="number" step="0.01" name="tallyVolumeM3" value="${initialRecord?.tallyVolumeM3 ?? 0}" required />
              </div>
            </div>
          </fieldset>

          <!-- Keuangan & Pajak -->
          <fieldset class="form-fieldset">
            <legend class="form-legend">4. Harga Kayu, Ongkir & Pajak (货款、运费与税金)</legend>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Harga Kayu / m³ <span>(均价)</span></label>
                <input class="input-control" type="number" name="timberPricePerM3" value="${initialRecord?.timberPricePerM3 ?? 0}" />
              </div>
              <div class="form-group">
                <label class="form-label">PPh Kayu (%) <span>(税率 0.5% / 1.5%)</span></label>
                <input class="input-control" type="number" step="0.1" name="timberPphRate" value="${initialRecord?.timberPphRate ?? 0.5}" />
              </div>
              <div class="form-group">
                <label class="form-label">Ongkos Kirim / m³ <span>(运费单价)</span></label>
                <input class="input-control" type="number" name="freightRatePerM3" value="${initialRecord?.freightRatePerM3 ?? 0}" />
              </div>
              <div class="form-group">
                <label class="form-label">Potongan PPh Ongkir (Rp) <span>(运费税)</span></label>
                <input class="input-control" type="number" name="freightPphAmount" value="${initialRecord?.freightPphAmount ?? 0}" />
              </div>
              <div class="form-group">
                <label class="form-label">Broker / Komisi (Rp) <span>(中介费)</span></label>
                <input class="input-control" type="number" name="brokerFee" value="${initialRecord?.brokerFee ?? 0}" />
              </div>
            </div>

            <!-- Dynamic Live Calculation Preview -->
            <div id="live-calculation-summary" style="margin-top: 1rem; padding: 0.75rem; background: #f8fafc; border-radius: var(--radius-sm); font-size: 0.8125rem;">
            </div>
          </fieldset>

          <div class="modal-actions">
            <button type="button" id="btn-modal-cancel" class="btn btn-secondary">Batal (取消)</button>
            <button type="submit" class="btn btn-primary">Simpan Data (保存入库)</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const form = container.querySelector('#record-form') as HTMLFormElement;
  const summaryBox = container.querySelector('#live-calculation-summary') as HTMLElement;

  const updateLivePreview = () => {
    const data = new FormData(form);
    const tallyVol = parseFloat(data.get('tallyVolumeM3') as string) || 0;
    const delVol = parseFloat(data.get('deliveredVolumeM3') as string) || 0;
    const tallyPcs = parseInt(data.get('tallyPieces') as string, 10) || 0;
    const delPcs = parseInt(data.get('deliveredPieces') as string, 10) || 0;
    const timberPrice = parseFloat(data.get('timberPricePerM3') as string) || 0;
    const timberPph = parseFloat(data.get('timberPphRate') as string) || 0;
    const freightRate = parseFloat(data.get('freightRatePerM3') as string) || 0;
    const freightPph = parseFloat(data.get('freightPphAmount') as string) || 0;
    const broker = parseFloat(data.get('brokerFee') as string) || 0;

    const calc = computeRecordCalculations({
      tallyVolumeM3: tallyVol,
      deliveredVolumeM3: delVol,
      tallyPieces: tallyPcs,
      deliveredPieces: delPcs,
      timberPricePerM3: timberPrice,
      timberPphRate: timberPph,
      freightRatePerM3: freightRate,
      freightPphAmount: freightPph,
      brokerFee: broker,
    });

    summaryBox.innerHTML = `
      <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:0.5rem;">
        <div>Selisih Vol: <strong>${calc.volumeDiscrepancyM3 >= 0 ? '+' : ''}${calc.volumeDiscrepancyM3.toFixed(2)} m³</strong></div>
        <div>Net Kayu: <strong>${formatRupiah(calc.timberNetPayable)}</strong></div>
        <div>Net Ongkir: <strong>${formatRupiah(calc.freightNetPayable)}</strong></div>
        <div>Total Yang Harus Dibayar: <strong style="color:var(--wood-primary); font-size:1rem;">${formatRupiah(calc.grandNetPayable)}</strong></div>
      </div>
    `;
  };

  form.addEventListener('input', updateLivePreview);
  updateLivePreview();

  container.querySelector('#btn-modal-cancel')?.addEventListener('click', () => {
    container.innerHTML = '';
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const tallyVol = parseFloat(data.get('tallyVolumeM3') as string) || 0;
    const delVol = parseFloat(data.get('deliveredVolumeM3') as string) || 0;
    const tallyPcs = parseInt(data.get('tallyPieces') as string, 10) || 0;
    const delPcs = parseInt(data.get('deliveredPieces') as string, 10) || 0;
    const timberPrice = parseFloat(data.get('timberPricePerM3') as string) || 0;
    const timberPph = parseFloat(data.get('timberPphRate') as string) || 0;
    const freightRate = parseFloat(data.get('freightRatePerM3') as string) || 0;
    const freightPph = parseFloat(data.get('freightPphAmount') as string) || 0;
    const broker = parseFloat(data.get('brokerFee') as string) || 0;

    const calc = computeRecordCalculations({
      tallyVolumeM3: tallyVol,
      deliveredVolumeM3: delVol,
      tallyPieces: tallyPcs,
      deliveredPieces: delPcs,
      timberPricePerM3: timberPrice,
      timberPphRate: timberPph,
      freightRatePerM3: freightRate,
      freightPphAmount: freightPph,
      brokerFee: broker,
    });

    const fullRecord: WoodReceivingRecord = {
      id: recordId,
      receiptDate: (data.get('receiptDate') as string) || new Date().toISOString().slice(0, 10),
      docDate: (data.get('docDate') as string) || undefined,
      truckPlateNumber: (data.get('truckPlateNumber') as string) || '',
      forestryDocNumber: (data.get('forestryDocNumber') as string) || '',
      receiptNumber: (data.get('receiptNumber') as string) || `KW-${Date.now().toString().slice(-4)}`,
      contractNumber: (data.get('contractNumber') as string) || '',
      supplierName: (data.get('supplierName') as string) || '',
      woodSpecies: (data.get('woodSpecies') as string) || '',
      woodLengthM: parseFloat(data.get('woodLengthM') as string) || 0,
      kavlingNumber: (data.get('kavlingNumber') as string) || 'KAV-01',
      storageYard: (data.get('storageYard') as string) || 'TPK-1',
      deliveredPieces: delPcs,
      deliveredVolumeM3: delVol,
      tallyPieces: tallyPcs,
      tallyVolumeM3: tallyVol,
      timberPricePerM3: timberPrice,
      timberGrossTotal: calc.timberGrossTotal,
      timberPphRate: timberPph,
      timberPphAmount: calc.timberPphAmount,
      timberNetPayable: calc.timberNetPayable,
      freightRatePerM3: freightRate,
      freightGrossTotal: calc.freightGrossTotal,
      freightPphAmount: freightPph,
      freightNetPayable: calc.freightNetPayable,
      brokerFee: broker,
      grandNetPayable: calc.grandNetPayable,
      createdAt: initialRecord?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(fullRecord);
    container.innerHTML = '';
  });
}
```

- [ ] **Step 2: Commit changes**

```bash
git add src/components/record-modal.ts
git commit -m "feat(ui): implement interactive Add/Edit modal dialog with live calculation"
```

---

### Task 8: Application Coordinator & End-to-End Verification

**Files:**
- Create: `src/app.ts`
- Modify: `package.json` (add `"serve": "node --serve public"`)
- Test: `test/timber-calc.test.ts`, `test/storage-crud.test.ts`

**Interfaces:**
- Consumes: All UI components, `WoodRecordRepository`, `aggregateDashboardMetrics`
- Produces: App bootstrap and event wiring coordinator (<150 LOC)

- [ ] **Step 1: Implement `src/app.ts` (<150 LOC)**

Create `src/app.ts`:
```typescript
import { defaultStorage } from './persistence/storage.ts';
import { WoodRecordRepository } from './persistence/record-repository.ts';
import { aggregateDashboardMetrics } from './utils/timber-calc.ts';
import { renderKpiDashboard, renderSpeciesBar } from './components/kpi-dashboard.ts';
import { renderToolbar, renderRecordTable } from './components/record-table.ts';
import { openRecordModal } from './components/record-modal.ts';
import type { RecordFilterCriteria, WoodReceivingRecord } from './types/index.ts';

class AppCoordinator {
  private repo = new WoodRecordRepository(defaultStorage);
  private currentFilters: RecordFilterCriteria = {};

  private kpiSection = document.getElementById('kpi-section') as HTMLElement;
  private speciesSection = document.getElementById('species-chart-section') as HTMLElement;
  private toolbarSection = document.getElementById('toolbar-section') as HTMLElement;
  private tableSection = document.getElementById('table-section') as HTMLElement;
  private modalContainer = document.getElementById('modal-container') as HTMLElement;
  private btnNewEntry = document.getElementById('btn-new-entry') as HTMLButtonElement;

  async init(): Promise<void> {
    this.btnNewEntry.addEventListener('click', () => {
      openRecordModal(this.modalContainer, null, async (newRec) => {
        await this.repo.save(newRec);
        await this.refresh();
      });
    });

    await this.refresh();
  }

  async refresh(): Promise<void> {
    const allRecords = await this.repo.getAll();
    const filteredRecords = await this.repo.getFiltered(this.currentFilters);
    const metrics = aggregateDashboardMetrics(filteredRecords);

    renderKpiDashboard(this.kpiSection, metrics);
    renderSpeciesBar(this.speciesSection, metrics.speciesVolumeBreakdown, metrics.totalTallyVolumeM3);

    const speciesList = Array.from(new Set(allRecords.map((r) => r.woodSpecies))).filter(Boolean);

    renderToolbar(
      this.toolbarSection,
      speciesList,
      (filters) => {
        this.currentFilters = filters;
        this.refresh();
      },
      async () => {
        if (confirm('Reset semua data kembali ke contoh awal demo?')) {
          await this.repo.resetToSeed();
          this.currentFilters = {};
          await this.refresh();
        }
      },
      () => this.exportCsv(filteredRecords)
    );

    renderRecordTable(
      this.tableSection,
      filteredRecords,
      (rec) => {
        openRecordModal(this.modalContainer, rec, async (updatedRec) => {
          await this.repo.save(updatedRec);
          await this.refresh();
        });
      },
      async (id) => {
        await this.repo.delete(id);
        await this.refresh();
      }
    );
  }

  private exportCsv(records: WoodReceivingRecord[]): void {
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

    const rows = records.map((r) => [
      r.receiptDate,
      `"${r.truckPlateNumber}"`,
      `"${r.forestryDocNumber}"`,
      `"${r.contractNumber}"`,
      `"${r.supplierName}"`,
      `"${r.woodSpecies}"`,
      `"${r.kavlingNumber}"`,
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
    link.setAttribute('href', url);
    link.setAttribute('download', `penerimaan_kayu_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new AppCoordinator();
  app.init();
});
```

- [ ] **Step 2: Add static server script to `package.json`**

Update `package.json` scripts:
```json
"scripts": {
  "test": "node --test",
  "test:smoke": "node --test test/smoke.test.ts",
  "start": "npx -y serve public"
}
```

- [ ] **Step 3: Run complete test suite**

Run: `node --test`  
Expected: PASS across all test suites (`test/smoke.test.ts`, `test/timber-calc.test.ts`, `test/storage-crud.test.ts`) with 0 failures in under 150ms.

- [ ] **Step 4: Commit all changes**

```bash
git add src/app.ts package.json
git commit -m "feat: wire application coordinator and add preview script"
```
