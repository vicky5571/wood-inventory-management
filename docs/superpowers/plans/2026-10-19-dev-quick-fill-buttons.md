# Development Quick Fill Buttons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create development quick-input (autofill) buttons and realistic Indonesian timber mock data generators for Input Penerimaan (receiving), Catat Penjualan (sales), and Pemasok (supplier) modal forms.

**Architecture:** Implement a zero-dependency atomic utility module `src/utils/dev-quick-fill.ts` that generates fully-formed, valid domain payloads for multi-item receiving manifests, sales orders, and supplier registrations. Wire this utility into the three target modals (`RecordModal.tsx`, `SalesModal.tsx`, and `SupplierModal.tsx`) with a stylized dev button (`⚡ Dev Fill` / `⚡ Isi Cepat (Dev)`) in the modal header that immediately populates local form state and dispatches user-friendly toast confirmations.

**Tech Stack:** Next.js 15.1, React 19, TypeScript 5.7, Tailwind CSS, Lucide React icons (`Zap`), Node.js native test runner (`node:test` + `node:assert`).

**Spec:** In-chat design validated in conversation: Option A (always visible with amber/gold DEV badge).

## Global Constraints

- Zero external dependencies: rely strictly on existing packages (`lucide-react`, standard React hooks).
- Architectural LOC constraint: Keep all touched components strictly under `< 250 LOC` (or maintain/reduce LOC footprint).
- SSOT: Import domain entities (`WoodReceivingRecord`, `ManifestItemInput`, `SalesFormInput`, `Supplier`) strictly from `@/src/types` or `@/src/types/index`.
- Test-Driven Development: Provide failing unit and component invariant tests prior to implementation.
- Zero Regressions: All existing 524 tests must pass alongside new quick-fill tests.

---

### Task 1: Dev Quick Fill Generator Utility & Unit Test Suite

**Files:**
- Create: `src/utils/dev-quick-fill.ts`
- Create: `test/dev-quick-fill.test.ts`

**Interfaces:**
- Produces:
  - `getQuickReceivingDraft(availableSpecies?: string[]): { form: Partial<WoodReceivingRecord>; items: ManifestItemInput[] }`
  - `getQuickSalesDraft(customerHistory?: string[]): SalesFormInput`
  - `getQuickSupplierDraft(): Partial<Supplier> & { name: string }`

- [ ] **Step 1: Write the failing unit tests for `dev-quick-fill`**

Create `test/dev-quick-fill.test.ts`:
```typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getQuickReceivingDraft,
  getQuickSalesDraft,
  getQuickSupplierDraft,
} from '../src/utils/dev-quick-fill.ts';

test('Dev Quick Fill Utilities Suite', async (t) => {
  await t.test('getQuickReceivingDraft generates complete multi-item timber receiving manifest payload', () => {
    const draft = getQuickReceivingDraft(['Meranti', 'Keruing', 'Ulin']);
    assert.ok(draft.form.truckPlateNumber, 'Truck plate number should be populated');
    assert.ok(draft.form.forestryDocNumber, 'SKSHHK document number should be populated');
    assert.ok(draft.form.receiptNumber, 'Receipt number should be populated');
    assert.ok(draft.form.supplierName, 'Supplier name should be populated');
    assert.equal(draft.items.length >= 1, true, 'At least one manifest item must be generated');
    
    const item = draft.items[0];
    assert.ok(item.woodSpecies, 'Wood species must be set');
    assert.ok(item.deliveredPieces > 0, 'Delivered pieces must be positive');
    assert.ok(item.deliveredVolumeM3 > 0, 'Delivered volume must be positive');
    assert.ok(item.tallyPieces > 0, 'Tally pieces must be positive');
    assert.ok(item.tallyVolumeM3 > 0, 'Tally volume must be positive');
    assert.ok(item.timberPricePerM3 > 0, 'Timber price must be positive');
  });

  await t.test('getQuickSalesDraft generates valid timber sales form input', () => {
    const draft = getQuickSalesDraft(['PT Maju Mapan Furniture']);
    assert.ok(draft.saleDate, 'Sale date must be present');
    assert.ok(draft.deliveryOrderNumber, 'Delivery order number must be present');
    assert.ok(draft.truckPlateNumber, 'Truck plate number must be present');
    assert.ok(draft.customerName, 'Customer name must be present');
    assert.ok(draft.storageYard, 'Storage yard must be specified');
    assert.ok(draft.kavlingNumber, 'Kavling number must be specified');
    assert.ok(draft.woodSpecies, 'Wood species must be specified');
    assert.ok(draft.pieces > 0, 'Pieces must be positive');
    assert.ok(draft.volumeM3 > 0, 'Volume must be positive');
    assert.ok(draft.pricePerM3 > 0, 'Price per m3 must be positive');
  });

  await t.test('getQuickSupplierDraft generates valid supplier registration payload', () => {
    const draft = getQuickSupplierDraft();
    assert.ok(draft.name && draft.name.length >= 3, 'Supplier name must be >= 3 characters');
    assert.ok(draft.code, 'Supplier code must be present');
    assert.ok(draft.contactPerson, 'Contact person must be present');
    assert.ok(draft.phone, 'Phone number must be present');
    assert.ok(draft.address, 'Address must be present');
    assert.ok(draft.taxId, 'Tax ID (NPWP) must be present');
    assert.equal(draft.status, 'ACTIVE', 'Default status must be ACTIVE');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/dev-quick-fill.test.ts`  
Expected: FAIL with "Cannot find module '../src/utils/dev-quick-fill.ts'"

- [ ] **Step 3: Implement `src/utils/dev-quick-fill.ts`**

```typescript
import type { WoodReceivingRecord, ManifestItemInput, SalesFormInput, Supplier } from '@/src/types/index';

export function getQuickReceivingDraft(availableSpecies?: string[]): {
  form: Partial<WoodReceivingRecord>;
  items: ManifestItemInput[];
} {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const randCode = Math.floor(1000 + Math.random() * 9000);
  const species1 = availableSpecies?.[0] || 'Meranti';
  const species2 = availableSpecies?.[1] || 'Keruing';

  return {
    form: {
      receiptDate: dateStr,
      docDate: dateStr,
      truckPlateNumber: `KT ${Math.floor(1000 + Math.random() * 9000)} BW`,
      forestryDocNumber: `SKSHHK-${now.getFullYear()}-X${randCode}`,
      receiptNumber: `KW-${randCode}`,
      contractNumber: `KTR-${now.getFullYear()}-${Math.floor(10 + Math.random() * 90)}`,
      supplierName: 'PT Rimba Borneo Mandiri',
      kavlingNumber: 'KAV-01',
      storageYard: 'TPK-Timur',
      freightRatePerM3: 150000,
      freightPphAmount: 37500,
      brokerFee: 50000,
      paymentStatus: 'UNPAID',
      invoiceNumber: `INV-IN-${now.getFullYear()}-${randCode}`,
      paymentNotes: 'Pembayaran termin 14 hari dev test',
    },
    items: [
      {
        id: `item-${Date.now()}-1`,
        woodSpecies: species1,
        woodLengthM: 4.0,
        kavlingNumber: 'KAV-01',
        storageYard: 'TPK-Timur',
        deliveredPieces: 25,
        deliveredVolumeM3: 12.5,
        tallyPieces: 25,
        tallyVolumeM3: 12.5,
        timberPricePerM3: 2200000,
        timberPphRate: 0.5,
      },
      {
        id: `item-${Date.now()}-2`,
        woodSpecies: species2,
        woodLengthM: 4.0,
        kavlingNumber: 'KAV-02',
        storageYard: 'TPK-Timur',
        deliveredPieces: 15,
        deliveredVolumeM3: 7.5,
        tallyPieces: 15,
        tallyVolumeM3: 7.5,
        timberPricePerM3: 2450000,
        timberPphRate: 0.5,
      },
    ],
  };
}

export function getQuickSalesDraft(customerHistory?: string[]): SalesFormInput {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const customer = customerHistory && customerHistory.length > 0
    ? customerHistory[0]
    : 'PT Maju Mapan Furniture';

  return {
    saleDate: dateStr,
    deliveryOrderNumber: `DO/${now.getFullYear()}/${randNum}`,
    truckPlateNumber: `B ${Math.floor(1000 + Math.random() * 9000)} TKL`,
    driverName: 'Bambang Santoso',
    customerName: customer,
    storageYard: 'TPK-Timur',
    kavlingNumber: 'KAV-01',
    woodSpecies: 'Meranti',
    pieces: 10,
    volumeM3: 4.5,
    pricePerM3: 2500000,
    paymentStatus: 'UNPAID',
    invoiceNumber: `INV-SLS-${randNum}`,
    notes: 'Penjualan kayu log untuk industri mebel lokal (dev auto-fill)',
  };
}

export function getQuickSupplierDraft(): Partial<Supplier> & { name: string } {
  const randId = Math.floor(100 + Math.random() * 900);
  return {
    name: `PT Rimba Lestari Mandiri ${randId}`,
    code: `SUP-RLM${randId}`,
    contactPerson: 'Hendra Setiawan',
    phone: '0812-3456-7890',
    address: 'Kawasan Industri HPH Km 15, Samarinda, Kalimantan Timur',
    taxId: '01.234.567.8-901.000',
    notes: 'Pemasok kayu bulat Meranti & Bengkirai legal tersertifikasi SVLK (dev test)',
    status: 'ACTIVE',
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/dev-quick-fill.test.ts`  
Expected: PASS with 3 subtests passing.

- [ ] **Step 5: Commit**

```bash
git add src/utils/dev-quick-fill.ts test/dev-quick-fill.test.ts
git commit -m "feat(dev): add dev quick fill utilities and unit tests"
```

---

### Task 2: Quick Fill Integration in RecordModal (Input Penerimaan)

**Files:**
- Modify: `src/components/ledger/RecordModal.tsx`
- Test: `test/record-modal-draft.test.ts`

**Interfaces:**
- Consumes: `getQuickReceivingDraft` from `src/utils/dev-quick-fill.ts`
- Uses: `Zap` icon from `lucide-react`, `toast` from `src/utils/toast-store.ts`

- [ ] **Step 1: Add component test checking presence and behavior of dev quick fill button in RecordModal**

Add test case in `test/record-modal-draft.test.ts`:
```typescript
test('RecordModal Dev Quick Fill Invariant', () => {
  const recordModalPath = path.resolve(process.cwd(), 'src/components/ledger/RecordModal.tsx');
  const content = fs.readFileSync(recordModalPath, 'utf-8');
  assert.match(content, /getQuickReceivingDraft/, 'RecordModal must import getQuickReceivingDraft');
  assert.match(content, /Isi Cepat|Dev Fill/, 'RecordModal must render Dev Quick Fill button');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/record-modal-draft.test.ts`  
Expected: FAIL matching regex /getQuickReceivingDraft/

- [ ] **Step 3: Update `src/components/ledger/RecordModal.tsx`**

1. Import `Zap` from `lucide-react` and `getQuickReceivingDraft` from `@/src/utils/dev-quick-fill.ts`.
2. Add `handleQuickFill`:
```typescript
const handleQuickFill = useCallback(() => {
  const { form: devForm, items: devItems } = getQuickReceivingDraft(availableSpecies);
  setForm((prev) => ({ ...prev, ...devForm }));
  setItems(devItems);
  toast.info('Form Terisi Otomatis (开发填充)', 'Data sampel penerimaan multi-item telah dimuat.');
}, [availableSpecies]);
```
3. Add quick fill button inside the modal header next to the close button:
```tsx
<div className="flex items-center gap-2">
  <button
    type="button"
    onClick={handleQuickFill}
    className="px-2.5 py-1 text-2xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-lg flex items-center gap-1 transition cursor-pointer"
    title="Isi otomatis formulir penerimaan dengan data sampel dev"
  >
    <Zap className="w-3 h-3 text-amber-600 fill-amber-500" />
    <span>⚡ Isi Cepat (Dev)</span>
  </button>
  <button type="button" onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer" aria-label="Tutup">
    <X className="w-5 h-5" />
  </button>
</div>
```
4. Verify total lines in `RecordModal.tsx` stay `< 240 LOC` (well under the 250 LOC budget).

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/record-modal-draft.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ledger/RecordModal.tsx test/record-modal-draft.test.ts
git commit -m "feat(ledger): add dev quick fill button to RecordModal"
```

---

### Task 3: Quick Fill Integration in SalesModal (Catat Penjualan)

**Files:**
- Modify: `src/components/sales/SalesModal.tsx`
- Test: `test/sales-components.test.ts`

**Interfaces:**
- Consumes: `getQuickSalesDraft` from `src/utils/dev-quick-fill.ts`
- Uses: `Zap` icon from `lucide-react`, `toast` from `src/utils/toast-store.ts`

- [ ] **Step 1: Add test verifying dev quick fill integration in SalesModal**

Add test case in `test/sales-components.test.ts`:
```typescript
test('SalesModal Dev Quick Fill Invariant', () => {
  const modalPath = path.resolve(process.cwd(), 'src/components/sales/SalesModal.tsx');
  const content = fs.readFileSync(modalPath, 'utf-8');
  assert.match(content, /getQuickSalesDraft/, 'SalesModal must import getQuickSalesDraft');
  assert.match(content, /Isi Cepat|Dev Fill/, 'SalesModal must render Dev Quick Fill button');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/sales-components.test.ts`  
Expected: FAIL matching regex /getQuickSalesDraft/

- [ ] **Step 3: Update `src/components/sales/SalesModal.tsx`**

1. Import `Zap` from `lucide-react`, `toast` from `@/src/utils/toast-store`, and `getQuickSalesDraft` from `@/src/utils/dev-quick-fill.ts`.
2. Add `handleQuickFill`:
```typescript
const handleQuickFill = useCallback(() => {
  const devDraft = getQuickSalesDraft(customerHistory);
  setFormData(devDraft);
  toast.info('Form Terisi Otomatis (开发填充)', 'Data sampel penjualan telah dimuat.');
}, [customerHistory]);
```
3. Place button in modal header next to the close button:
```tsx
<div className="flex items-center gap-2">
  <button
    type="button"
    onClick={handleQuickFill}
    className="px-2.5 py-1 text-2xs font-semibold text-amber-300 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/40 rounded-lg flex items-center gap-1 transition cursor-pointer"
    title="Isi otomatis data penjualan untuk pengujian dev"
  >
    <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
    <span>⚡ Isi Cepat (Dev)</span>
  </button>
  <button type="button" onClick={onClose} className="text-gray-400 hover:text-white transition p-1"><X className="w-5 h-5" /></button>
</div>
```
4. Verify file stays strictly `< 225 LOC`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/sales-components.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/sales/SalesModal.tsx test/sales-components.test.ts
git commit -m "feat(sales): add dev quick fill button to SalesModal"
```

---

### Task 4: Quick Fill Integration in SupplierModal (Pemasok)

**Files:**
- Modify: `src/components/suppliers/SupplierModal.tsx`
- Test: `test/supplier-modal.test.ts`

**Interfaces:**
- Consumes: `getQuickSupplierDraft` from `src/utils/dev-quick-fill.ts`
- Uses: `Zap` icon from `lucide-react`, `toast` from `src/utils/toast-store.ts`

- [ ] **Step 1: Add test verifying dev quick fill integration in SupplierModal**

Add test in `test/supplier-modal.test.ts`:
```typescript
await t.test('SupplierModal incorporates dev quick fill button', () => {
  const modalPath = path.resolve(process.cwd(), 'src/components/suppliers/SupplierModal.tsx');
  const content = fs.readFileSync(modalPath, 'utf-8');
  assert.match(content, /getQuickSupplierDraft/, 'SupplierModal must import getQuickSupplierDraft');
  assert.match(content, /Isi Cepat|Dev Fill/, 'SupplierModal must render Dev Quick Fill button');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/supplier-modal.test.ts`  
Expected: FAIL matching regex /getQuickSupplierDraft/

- [ ] **Step 3: Update `src/components/suppliers/SupplierModal.tsx`**

1. Import `Zap` from `lucide-react`, `toast` from `@/src/utils/toast-store`, and `getQuickSupplierDraft` from `@/src/utils/dev-quick-fill.ts`.
2. Add `handleQuickFill`:
```typescript
const handleQuickFill = () => {
  const devSupplier = getQuickSupplierDraft();
  setForm((prev) => ({ ...prev, ...devSupplier }));
  setError(null);
  toast.info('Form Terisi Otomatis (开发填充)', 'Data rekanan pemasok dev telah dimuat.');
};
```
3. Add quick fill button in the header bar next to the close button:
```tsx
<div className="flex items-center gap-2">
  <button
    type="button"
    onClick={handleQuickFill}
    className="px-2.5 py-1 text-2xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-lg flex items-center gap-1 transition cursor-pointer"
    title="Isi otomatis data pemasok untuk pengujian dev"
  >
    <Zap className="w-3 h-3 text-amber-600 fill-amber-500" />
    <span>⚡ Isi Cepat (Dev)</span>
  </button>
  <button
    type="button"
    onClick={onClose}
    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition cursor-pointer"
    aria-label="Tutup Modal"
  >
    <X className="w-4 h-4" />
  </button>
</div>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/supplier-modal.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/suppliers/SupplierModal.tsx test/supplier-modal.test.ts
git commit -m "feat(suppliers): add dev quick fill button to SupplierModal"
```

---

### Task 5: End-to-End Verification, TypeScript & Full Test Suite Execution

**Files:**
- Test: all test files via `npm test`
- Build: Next.js type check via `npm run build:check`

- [ ] **Step 1: Run comprehensive unit and invariant tests**

Run:
```bash
node --test test/dev-quick-fill.test.ts test/record-modal-draft.test.ts test/sales-components.test.ts test/supplier-modal.test.ts
```
Expected: All 4 targeted test suites pass with 0 failures.

- [ ] **Step 2: Run full regression test suite**

Run:
```bash
npm test
```
Expected: All tests pass (>= 527 tests, 0 failures).

- [ ] **Step 3: Run TypeScript & Next.js production build verification**

Run:
```bash
npm run build:check
```
Expected: Build succeeds with 0 type errors or JSX syntax issues.

- [ ] **Step 4: Final Git Status Check & Commit**

Verify git clean working tree and commit any remaining artifacts.
