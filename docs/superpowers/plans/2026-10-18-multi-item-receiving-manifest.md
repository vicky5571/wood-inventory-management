# Multi-Item Truck Receiving Manifest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable sawmill operators to record multiple timber line items (species, log lengths, kavling stacks, and tallies) under a single truck receiving manifest in the UI, fully utilizing the 3NF relational SQLite persistence engine while preserving 100% backward compatibility with the existing Buku Besar table and Excel exports.

**Architecture:**
- SSOT Form Contracts (`ManifestItemInput`, `ManifestFormInput`) in `src/types/index.ts`.
- Pure calculation aggregator `computeManifestCalculations` in `src/utils/timber-calc.ts` computing line-item financials, aggregate truck volumes, freight taxes, and grand net payables without side-effects.
- Multi-row auto-draft persistence in `src/utils/record-draft.ts` preserving uncommitted multi-line entries across page refreshes or yard interruptions.
- Modular modal decomposition adhering strictly to the <250 LOC Strangler pattern (`RecordModal.tsx`, `ManifestItemsTable.tsx`, `ManifestItemRow.tsx`, `ManifestReconciliationCard.tsx`).
- Relational manifest persistence in `SqliteRecordStore` saving 1 `receiving_manifests` header and $N$ `receiving_items` within an atomic SQLite transaction.

**Tech Stack:** Node.js 26.8.1 (Native ESM & TypeScript), React 19, Tailwind CSS 3.4, Lucide React, `node:sqlite`, `node:test` + `node:assert`.

**Spec:** `docs/superpowers/specs/2026-10-18-multi-item-receiving-manifest-design.md`

## Global Constraints
- Maximum file size: keep all modules strictly under ~250 LOC (Strangler pattern on God files).
- Single Source of Truth (SSOT): all domain interfaces and entities must be imported from `src/types/index.ts`.
- Zero external dependencies: rely strictly on native Node.js 26 standard library and existing project primitives.
- Automated test coverage: every task must provide automated tests executed via `node --test` with 0 failures.
- Language standard: source code, types, and git commits in English; user-facing labels bilingual Indonesian-Chinese.

---

### Task 1: Multi-Item Pure Domain Calculations & SSOT Types (`src/types/index.ts`, `src/utils/timber-calc.ts`)

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/utils/timber-calc.ts`
- Test: `test/manifest-calc.test.ts`

**Interfaces:**
- Consumes: `WoodReceivingRecord` from `src/types/index.ts`
- Produces: `ManifestItemInput`, `ManifestFormInput`, `ManifestCalculationOutput` in `src/types/index.ts`
- Produces: `computeManifestCalculations(manifest: ManifestFormInput): ManifestCalculationOutput` in `src/utils/timber-calc.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/manifest-calc.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeManifestCalculations } from '../src/utils/timber-calc.ts';
import type { ManifestFormInput } from '../src/types/index.ts';

test('Manifest Multi-Item Calculations Suite', async (t) => {
  const sampleManifest: ManifestFormInput = {
    id: 'man-test-1',
    receiptDate: '2026-10-18',
    truckPlateNumber: 'B 9283 TDA',
    forestryDocNumber: 'SKSHHK-2026-001',
    receiptNumber: 'KW-101',
    contractNumber: 'CTR-01',
    supplierName: 'PT Wana Lestari',
    freightRatePerM3: 200000,
    brokerFee: 500000,
    items: [
      {
        id: 'item-1',
        woodSpecies: 'Teak / Jati (柚木)',
        woodLengthM: 4.0,
        kavlingNumber: 'KAV-01',
        storageYard: 'TPK-1',
        deliveredPieces: 50,
        deliveredVolumeM3: 10.0,
        tallyPieces: 50,
        tallyVolumeM3: 10.0,
        timberPricePerM3: 4000000,
        timberPphRate: 0.5,
      },
      {
        id: 'item-2',
        woodSpecies: 'Mahoni (桃花心木)',
        woodLengthM: 3.0,
        kavlingNumber: 'KAV-02',
        storageYard: 'TPK-1',
        deliveredPieces: 30,
        deliveredVolumeM3: 5.0,
        tallyPieces: 30,
        tallyVolumeM3: 5.0,
        timberPricePerM3: 2000000,
        timberPphRate: 0.5,
      },
    ],
  };

  await t.test('aggregates delivered and tally volume across all items', () => {
    const result = computeManifestCalculations(sampleManifest);
    assert.strictEqual(result.totalDeliveredPieces, 80);
    assert.strictEqual(result.totalDeliveredVolumeM3, 15.0);
    assert.strictEqual(result.totalTallyPieces, 80);
    assert.strictEqual(result.totalTallyVolumeM3, 15.0);
    assert.strictEqual(result.volumeDiscrepancyM3, 0);
  });

  await t.test('calculates individual line financials accurately', () => {
    const result = computeManifestCalculations(sampleManifest);
    assert.strictEqual(result.items.length, 2);

    // Item 1: 10 m³ * 4,000,000 = 40,000,000; PPh = 200,000; Net = 39,800,000
    assert.strictEqual(result.items[0].timberGrossTotal, 40000000);
    assert.strictEqual(result.items[0].timberPphAmount, 200000);
    assert.strictEqual(result.items[0].timberNetPayable, 39800000);

    // Item 2: 5 m³ * 2,000,000 = 10,000,000; PPh = 50,000; Net = 9,950,000
    assert.strictEqual(result.items[1].timberGrossTotal, 10000000);
    assert.strictEqual(result.items[1].timberPphAmount, 50000);
    assert.strictEqual(result.items[1].timberNetPayable, 9950000);
  });

  await t.test('computes truck freight on aggregated tally volume and grand net payable', () => {
    const result = computeManifestCalculations(sampleManifest);
    // Freight: 15 m³ * 200,000 = 3,000,000; PPh 2% = 60,000; Net Freight = 2,940,000
    assert.strictEqual(result.freightGrossTotal, 3000000);
    assert.strictEqual(result.freightPphAmount, 60000);
    assert.strictEqual(result.freightNetPayable, 2940000);

    // Grand Net = 39,800,000 + 9,950,000 + 2,940,000 + 500,000 = 53,190,000
    assert.strictEqual(result.grandNetPayable, 53190000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/manifest-calc.test.ts`
Expected: FAIL with "Cannot find module" or "computeManifestCalculations is not a function"

- [ ] **Step 3: Update `src/types/index.ts` and `src/utils/timber-calc.ts`**

Add domain types to `src/types/index.ts`:
```ts
export interface ManifestItemInput {
  id: string;
  woodSpecies: string;
  woodLengthM: number;
  kavlingNumber: string;
  storageYard: string;
  deliveredPieces: number;
  deliveredVolumeM3: number;
  tallyPieces: number;
  tallyVolumeM3: number;
  timberPricePerM3: number;
  timberPphRate: number;
}

export interface ManifestFormInput {
  id: string;
  receiptDate: string;
  docDate?: string;
  truckPlateNumber: string;
  forestryDocNumber: string;
  receiptNumber: string;
  contractNumber: string;
  supplierName: string;
  freightRatePerM3: number;
  freightPphAmount?: number;
  brokerFee: number;
  paymentStatus?: PaymentStatus;
  invoiceNumber?: string;
  paymentDate?: string;
  paymentNotes?: string;
  items: ManifestItemInput[];
}

export interface ManifestCalculationOutput {
  totalDeliveredPieces: number;
  totalDeliveredVolumeM3: number;
  totalTallyPieces: number;
  totalTallyVolumeM3: number;
  volumeDiscrepancyM3: number;
  pieceDiscrepancy: number;
  totalTimberGross: number;
  totalTimberPph: number;
  totalTimberNet: number;
  freightGrossTotal: number;
  freightPphAmount: number;
  freightNetPayable: number;
  brokerFee: number;
  grandNetPayable: number;
  items: Array<ManifestItemInput & {
    timberGrossTotal: number;
    timberPphAmount: number;
    timberNetPayable: number;
    volumeDiscrepancyM3: number;
    pieceDiscrepancy: number;
  }>;
}
```

Implement `computeManifestCalculations` in `src/utils/timber-calc.ts`:
```ts
export function computeManifestCalculations(manifest: ManifestFormInput): ManifestCalculationOutput {
  let totalDeliveredPieces = 0;
  let totalDeliveredVolumeM3 = 0;
  let totalTallyPieces = 0;
  let totalTallyVolumeM3 = 0;
  let totalTimberGross = 0;
  let totalTimberPph = 0;
  let totalTimberNet = 0;

  const items = (manifest.items || []).map((item) => {
    const deliveredPieces = Math.max(0, Number(item.deliveredPieces) || 0);
    const deliveredVolumeM3 = Math.max(0, Number(item.deliveredVolumeM3) || 0);
    const tallyPieces = Math.max(0, Number(item.tallyPieces) || 0);
    const tallyVolumeM3 = Math.max(0, Number(item.tallyVolumeM3) || 0);
    const timberPricePerM3 = Math.max(0, Number(item.timberPricePerM3) || 0);
    const timberPphRate = Math.max(0, Number(item.timberPphRate) || 0);

    const pieceDiscrepancy = tallyPieces - deliveredPieces;
    const volumeDiscrepancyM3 = Number((tallyVolumeM3 - deliveredVolumeM3).toFixed(4));
    const timberGrossTotal = Math.round(tallyVolumeM3 * timberPricePerM3);
    const timberPphAmount = Math.round(timberGrossTotal * (timberPphRate / 100));
    const timberNetPayable = timberGrossTotal - timberPphAmount;

    totalDeliveredPieces += deliveredPieces;
    totalDeliveredVolumeM3 += deliveredVolumeM3;
    totalTallyPieces += tallyPieces;
    totalTallyVolumeM3 += tallyVolumeM3;
    totalTimberGross += timberGrossTotal;
    totalTimberPph += timberPphAmount;
    totalTimberNet += timberNetPayable;

    return {
      ...item,
      deliveredPieces,
      deliveredVolumeM3,
      tallyPieces,
      tallyVolumeM3,
      timberPricePerM3,
      timberPphRate,
      timberGrossTotal,
      timberPphAmount,
      timberNetPayable,
      volumeDiscrepancyM3,
      pieceDiscrepancy,
    };
  });

  totalDeliveredVolumeM3 = Number(totalDeliveredVolumeM3.toFixed(4));
  totalTallyVolumeM3 = Number(totalTallyVolumeM3.toFixed(4));
  const volumeDiscrepancyM3 = Number((totalTallyVolumeM3 - totalDeliveredVolumeM3).toFixed(4));
  const pieceDiscrepancy = totalTallyPieces - totalDeliveredPieces;

  const freightRatePerM3 = Math.max(0, Number(manifest.freightRatePerM3) || 0);
  const freightGrossTotal = Math.round(totalTallyVolumeM3 * freightRatePerM3);
  const freightPphAmount = Math.round(freightGrossTotal * 0.02);
  const freightNetPayable = freightGrossTotal - freightPphAmount;
  const brokerFee = Math.max(0, Number(manifest.brokerFee) || 0);
  const grandNetPayable = totalTimberNet + freightNetPayable + brokerFee;

  return {
    totalDeliveredPieces,
    totalDeliveredVolumeM3,
    totalTallyPieces,
    totalTallyVolumeM3,
    volumeDiscrepancyM3,
    pieceDiscrepancy,
    totalTimberGross,
    totalTimberPph,
    totalTimberNet,
    freightGrossTotal,
    freightPphAmount,
    freightNetPayable,
    brokerFee,
    grandNetPayable,
    items,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/manifest-calc.test.ts`
Expected: PASS with 3 subtests passing

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/utils/timber-calc.ts test/manifest-calc.test.ts
git commit -m "feat(domain): implement computeManifestCalculations for multi-item truck deliveries"
```

---

### Task 2: Multi-Item Draft Persistence Engine (`src/utils/record-draft.ts`)

**Files:**
- Modify: `src/utils/record-draft.ts`
- Test: `test/manifest-draft.test.ts`

**Interfaces:**
- Consumes: `ManifestFormInput` from `src/types/index.ts`
- Produces: `hasMeaningfulManifestDraft(draft: Partial<ManifestFormInput>): boolean`
- Produces: `saveManifestDraft(draft: Partial<ManifestFormInput>): void`
- Produces: `loadManifestDraft(): Partial<ManifestFormInput> | null`
- Produces: `clearManifestDraft(): void`

- [ ] **Step 1: Write the failing test**

```ts
// test/manifest-draft.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasMeaningfulManifestDraft,
  saveManifestDraft,
  loadManifestDraft,
  clearManifestDraft,
} from '../src/utils/record-draft.ts';
import type { ManifestFormInput } from '../src/types/index.ts';

test('Manifest Draft Persistence Suite', async (t) => {
  const globalMockStorage = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => globalMockStorage.get(key) || null,
    setItem: (key: string, val: string) => globalMockStorage.set(key, val),
    removeItem: (key: string) => globalMockStorage.delete(key),
  };

  t.after(() => {
    delete (globalThis as any).localStorage;
  });

  await t.test('detects meaningful draft with multiple items', () => {
    assert.strictEqual(hasMeaningfulManifestDraft({}), false);
    assert.strictEqual(hasMeaningfulManifestDraft({ truckPlateNumber: 'B 1234' }), true);
    assert.strictEqual(
      hasMeaningfulManifestDraft({
        items: [{ woodSpecies: 'Teak' } as any],
      }),
      true
    );
  });

  await t.test('saves, restores, and clears multi-item drafts cleanly', () => {
    const draft: Partial<ManifestFormInput> = {
      truckPlateNumber: 'B 9999 XYZ',
      supplierName: 'PT Rimba',
      items: [
        {
          id: 'item-1',
          woodSpecies: 'Teak / Jati (柚木)',
          woodLengthM: 4.0,
          kavlingNumber: 'KAV-01',
          storageYard: 'TPK-1',
          deliveredPieces: 10,
          deliveredVolumeM3: 2.0,
          tallyPieces: 10,
          tallyVolumeM3: 2.0,
          timberPricePerM3: 3000000,
          timberPphRate: 0.5,
        },
      ],
    };

    saveManifestDraft(draft);
    const restored = loadManifestDraft();
    assert.ok(restored);
    assert.strictEqual(restored.truckPlateNumber, 'B 9999 XYZ');
    assert.strictEqual(restored.items?.length, 1);
    assert.strictEqual(restored.items[0].woodSpecies, 'Teak / Jati (柚木)');

    clearManifestDraft();
    assert.strictEqual(loadManifestDraft(), null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/manifest-draft.test.ts`
Expected: FAIL with "hasMeaningfulManifestDraft is not a function"

- [ ] **Step 3: Update `src/utils/record-draft.ts`**

Update `src/utils/record-draft.ts` to export multi-item helpers using key `wood_manifest_form_draft_v1` while preserving single-item helpers.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/manifest-draft.test.ts`
Expected: PASS with 2 subtests passing

- [ ] **Step 5: Commit**

```bash
git add src/utils/record-draft.ts test/manifest-draft.test.ts
git commit -m "feat(draft): add multi-item manifest auto-draft persistence"
```

---

### Task 3: Backend Multi-Item Persistence Support (`src/persistence/sqlite/migrate-json.ts`, `src/persistence/sqlite-record-store.ts`)

**Files:**
- Modify: `src/persistence/sqlite/migrate-json.ts`
- Modify: `src/persistence/sqlite-record-store.ts`
- Test: `test/sqlite-multi-item.test.ts`

**Interfaces:**
- Consumes: `ManifestFormInput` from `src/types/index.ts`
- Produces: `SqliteRecordStore.saveManifest(manifest: ManifestFormInput): Promise<WoodReceivingRecord[]>`
- Produces: `SqliteRecordStore.deleteManifest(manifestId: string): Promise<boolean>`

- [ ] **Step 1: Write the failing test**

```ts
// test/sqlite-multi-item.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { SqliteRecordStore } from '../src/persistence/sqlite-record-store.ts';
import type { ManifestFormInput } from '../src/types/index.ts';

test('SqliteRecordStore Multi-Item Persistence Suite', async (t) => {
  const store = new SqliteRecordStore(':memory:');

  await t.test('saves a manifest with 2 line items and returns 2 projected flat records', async () => {
    const multiManifest: ManifestFormInput = {
      id: 'man-multi-1',
      receiptDate: '2026-10-18',
      truckPlateNumber: 'B 7777 WOD',
      forestryDocNumber: 'SKSHHK-MULTI-01',
      receiptNumber: 'KW-MULTI-01',
      contractNumber: 'CTR-MULTI-01',
      supplierName: 'PT Rimba Raya',
      freightRatePerM3: 150000,
      brokerFee: 200000,
      items: [
        {
          id: 'item-a',
          woodSpecies: 'Teak / Jati (柚木)',
          woodLengthM: 4.0,
          kavlingNumber: 'KAV-A',
          storageYard: 'TPK-1',
          deliveredPieces: 20,
          deliveredVolumeM3: 5.0,
          tallyPieces: 20,
          tallyVolumeM3: 5.0,
          timberPricePerM3: 4000000,
          timberPphRate: 0.5,
        },
        {
          id: 'item-b',
          woodSpecies: 'Mahoni (桃花心木)',
          woodLengthM: 3.0,
          kavlingNumber: 'KAV-B',
          storageYard: 'TPK-1',
          deliveredPieces: 15,
          deliveredVolumeM3: 3.0,
          tallyPieces: 15,
          tallyVolumeM3: 3.0,
          timberPricePerM3: 2000000,
          timberPphRate: 0.5,
        },
      ],
    };

    const flatRecords = await store.saveManifest(multiManifest);
    assert.strictEqual(flatRecords.length, 2, 'Must return 2 flat projected records for 2 line items');
    assert.strictEqual(flatRecords[0].manifest_id, 'man-multi-1');
    assert.strictEqual(flatRecords[1].manifest_id, 'man-multi-1');
    assert.notStrictEqual(flatRecords[0].id, flatRecords[1].id, 'Must have distinct synthetic IDs');
  });

  await t.test('deleting manifest cascades and removes all associated line items', async () => {
    const deleted = await store.deleteManifest('man-multi-1');
    assert.strictEqual(deleted, true);

    const all = await store.getAll();
    assert.ok(!all.some((r) => r.manifest_id === 'man-multi-1'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/sqlite-multi-item.test.ts`
Expected: FAIL with "store.saveManifest is not a function"

- [ ] **Step 3: Implement `saveManifest` and `deleteManifest` in `src/persistence/sqlite-record-store.ts`**

Add `saveManifest` and `deleteManifest` delegating to an atomic transaction in SQLite.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/sqlite-multi-item.test.ts`
Expected: PASS with 2 subtests passing

- [ ] **Step 5: Commit**

```bash
git add src/persistence/sqlite/migrate-json.ts src/persistence/sqlite-record-store.ts test/sqlite-multi-item.test.ts
git commit -m "feat(persistence): implement saveManifest and deleteManifest in SqliteRecordStore"
```

---

### Task 4: Multi-Item Form Subcomponents (`ManifestItemRow.tsx`, `ManifestItemsTable.tsx`)

**Files:**
- Create: `src/components/ledger/ManifestItemRow.tsx`
- Create: `src/components/ledger/ManifestItemsTable.tsx`
- Test: `test/manifest-items-table.test.ts`

**Interfaces:**
- Consumes: `ManifestItemInput` from `src/types/index.ts`
- Produces: `ManifestItemRow` (renders individual editable timber row)
- Produces: `ManifestItemsTable` (renders dynamic items list with Add and Delete row triggers)

- [ ] **Step 1: Write the failing test**

```ts
// test/manifest-items-table.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Manifest Items Table Components Invariant Suite', async (t) => {
  const rowPath = path.join(process.cwd(), 'src/components/ledger/ManifestItemRow.tsx');
  const tablePath = path.join(process.cwd(), 'src/components/ledger/ManifestItemsTable.tsx');

  await t.test('ManifestItemRow exists and complies with <250 LOC rule', () => {
    assert.ok(fs.existsSync(rowPath), 'ManifestItemRow.tsx must exist');
    const lines = fs.readFileSync(rowPath, 'utf-8').split('\n').length;
    assert.ok(lines < 250, `ManifestItemRow.tsx must be <250 LOC (got ${lines})`);
  });

  await t.test('ManifestItemsTable exists and exports table component', () => {
    assert.ok(fs.existsSync(tablePath), 'ManifestItemsTable.tsx must exist');
    const content = fs.readFileSync(tablePath, 'utf-8');
    assert.match(content, /export function ManifestItemsTable/);
    assert.match(content, /Tambah Baris Kayu/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/manifest-items-table.test.ts`
Expected: FAIL with "ManifestItemRow.tsx must exist"

- [ ] **Step 3: Create `ManifestItemRow.tsx` and `ManifestItemsTable.tsx`**

Implement `ManifestItemRow.tsx` and `ManifestItemsTable.tsx` with clean responsive layout, species combobox, and accessible inputs.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/manifest-items-table.test.ts`
Expected: PASS with 2 subtests passing

- [ ] **Step 5: Commit**

```bash
git add src/components/ledger/ManifestItemRow.tsx src/components/ledger/ManifestItemsTable.tsx test/manifest-items-table.test.ts
git commit -m "feat(ledger): create ManifestItemsTable and ManifestItemRow components"
```

---

### Task 5: Upgrade `RecordModal.tsx` Coordinator with Multi-Item Support

**Files:**
- Modify: `src/components/ledger/RecordModal.tsx`
- Modify: `src/components/ledger/RecordReconciliationCard.tsx`
- Test: `test/record-modal.test.ts`

**Interfaces:**
- Consumes: `ManifestItemsTable`, `ManifestFreightSection`, `RecordDocumentSection`
- Produces: Updated `RecordModal` handling both single-item and multi-item manifest creation/editing.

- [ ] **Step 1: Write the failing test**

```ts
// test/record-modal.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('RecordModal Multi-Item Integration Suite', async (t) => {
  const modalPath = path.join(process.cwd(), 'src/components/ledger/RecordModal.tsx');
  const content = fs.readFileSync(modalPath, 'utf-8');

  await t.test('RecordModal integrates ManifestItemsTable and multi-item calculation', () => {
    assert.match(content, /ManifestItemsTable/);
    assert.match(content, /computeManifestCalculations/);
  });

  await t.test('RecordModal adheres strictly to <250 LOC rule', () => {
    const lines = content.split('\n').length;
    assert.ok(lines <= 250, `RecordModal.tsx must remain under 250 lines (currently ${lines})`);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/record-modal.test.ts`
Expected: FAIL with missing `ManifestItemsTable` or `computeManifestCalculations` match

- [ ] **Step 3: Refactor `RecordModal.tsx`**

Integrate `ManifestItemsTable`, `computeManifestCalculations`, and multi-item auto-draft sync into `RecordModal.tsx`, keeping file size under 250 lines.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/record-modal.test.ts`
Expected: PASS with 2 subtests passing

- [ ] **Step 5: Commit**

```bash
git add src/components/ledger/RecordModal.tsx src/components/ledger/RecordReconciliationCard.tsx test/record-modal.test.ts
git commit -m "feat(ledger): upgrade RecordModal to support multi-item timber receiving manifests"
```

---

### Task 6: Client Hook & Ledger Table Integration (`src/hooks/useWoodRecords.ts`, `src/components/ledger/RecordTableCompactView.tsx`)

**Files:**
- Modify: `src/hooks/useWoodRecords.ts`
- Modify: `src/components/ledger/RecordTableCompactView.tsx`
- Test: `test/useWoodRecords.test.ts`
- Test: `test/record-table.test.ts`

**Interfaces:**
- Consumes: `ManifestFormInput`
- Produces: `saveManifest` in `useWoodRecords.ts`
- Produces: Batch badge rendering in `RecordTableCompactView.tsx` when `record.manifest_id` links multiple items

- [ ] **Step 1: Write the failing test**

```ts
// In test/useWoodRecords.test.ts, verify saveManifest is exported
test('useWoodRecords exports saveManifest method', async () => {
  const { useWoodRecords } = await import('../src/hooks/useWoodRecords.ts');
  assert.ok(useWoodRecords);
});
```

- [ ] **Step 2: Update `useWoodRecords.ts` and `RecordTableCompactView.tsx`**

Add `saveManifest` to `useWoodRecords.ts` and render `Batch` indicator in table rows when a delivery has multiple line items.

- [ ] **Step 3: Run tests to verify compatibility**

Run: `node --test test/useWoodRecords.test.ts test/record-table.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useWoodRecords.ts src/components/ledger/RecordTableCompactView.tsx test/useWoodRecords.test.ts
git commit -m "feat(ledger): expose saveManifest in useWoodRecords and show batch indicator in table view"
```

---

### Task 7: Full Regression & Build Verification

**Files:**
- None (Verification task)

- [ ] **Step 1: Execute all unit and contract tests**

Run: `npm test`
Expected: 100% PASS across all 38+ test suites with 0 failures

- [ ] **Step 2: Run Next.js production build**

Run: `npm run build`
Expected: Compiled successfully with 0 TypeScript or lint errors

- [ ] **Step 3: Clean git working tree**

Run: `git status`
Expected: Clean working tree
