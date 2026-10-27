# Implementation Plan: Price Auto-Fill saat Input Penerimaan

**Date:** 2026-10-28
**Status:** Ready to implement
**Related ADR:** docs/adr/0018-price-autofill-on-receiving-input.md
**Related Spec:** docs/superpowers/specs/2026-10-28-price-autofill-receiving-design.md
**Baseline:** 949 passed, 0 failed

---

## Ringkasan

Saat operator memilih `woodSpecies` di `ManifestItemRow`, sistem melakukan lookup
ke tabel harga dan mengisi `timberPricePerM3` + `timberPphRate` otomatis.
Badge kecil ditampilkan sebagai konfirmasi sumber harga.

## Scope Perubahan

| File | Jenis | Net LOC |
|------|-------|---------|
| `src/components/ledger/RecordModal.tsx` | Tambah hook + pass props | +6 LOC |
| `src/components/ledger/ManifestItemsTable.tsx` | Pass-through props | +6 LOC |
| `src/components/ledger/ManifestItemRow.tsx` | Logika auto-fill + badge | +25 LOC |
| `test/price-autofill-receiving.test.ts` | File baru, unit test | +70 LOC |

**Tidak ada perubahan:** API, DB schema, types SSOT, `lookupPriceForRecord`, `useTimberPrices`

---

## Phase 1 — RecordModal.tsx

**File:** `src/components/ledger/RecordModal.tsx`
Saat ini 234 baris. Harus tetap < 250 setelah perubahan.

### Step 1A — Import `useTimberPrices`

Cari baris import hooks (sekitar line 17):
```ts
import { useSettings } from '@/src/hooks/useSettings';
```

Tambahkan tepat sesudahnya:
```ts
import { useTimberPrices } from '@/src/hooks/useTimberPrices';
```

### Step 1B — Ambil `activeEntries` dari hook

Cari baris (sekitar line 49):
```ts
const { settings } = useSettings();
```

Tambahkan tepat sesudahnya:
```ts
const { activeEntries: priceEntries } = useTimberPrices();
```

### Step 1C — Pass props ke `ManifestItemsTable`

Cari baris ini (sekitar line 217):
```tsx
<ManifestItemsTable items={items} onChange={setItems} availableSpecies={availableSpecies} />
```

Ganti dengan:
```tsx
<ManifestItemsTable
  items={items}
  onChange={setItems}
  availableSpecies={availableSpecies}
  priceEntries={priceEntries}
  supplierName={form.supplierName}
  receiptDate={form.receiptDate}
/>
```

### Checklist Phase 1
```
[ ] Import useTimberPrices
[ ] Tambah: const { activeEntries: priceEntries } = useTimberPrices();
[ ] Ubah: pass priceEntries, supplierName, receiptDate ke ManifestItemsTable
[ ] Verify: wc -l file < 250
```

---

## Phase 2 — ManifestItemsTable.tsx

**File:** `src/components/ledger/ManifestItemsTable.tsx`

### Step 2A — Import type `TimberPriceEntry`

Cari baris import types (line 3):
```ts
import type { ManifestItemInput } from '@/src/types';
```

Ganti dengan:
```ts
import type { ManifestItemInput, TimberPriceEntry } from '@/src/types';
```

### Step 2B — Tambah props ke `ManifestItemsTableProps`

Cari:
```ts
export interface ManifestItemsTableProps {
  items: ManifestItemInput[];
  onChange?: (items: ManifestItemInput[]) => void;
  setItems?: React.Dispatch<React.SetStateAction<ManifestItemInput[]>>;
  availableSpecies?: string[];
}
```

Ganti dengan:
```ts
export interface ManifestItemsTableProps {
  items: ManifestItemInput[];
  onChange?: (items: ManifestItemInput[]) => void;
  setItems?: React.Dispatch<React.SetStateAction<ManifestItemInput[]>>;
  availableSpecies?: string[];
  priceEntries?: TimberPriceEntry[];
  supplierName?: string;
  receiptDate?: string;
}
```

### Step 2C — Destructure props baru di fungsi

Cari:
```ts
export function ManifestItemsTable({
  items,
  onChange,
  setItems,
  availableSpecies,
}: ManifestItemsTableProps) {
```

Ganti dengan:
```ts
export function ManifestItemsTable({
  items,
  onChange,
  setItems,
  availableSpecies,
  priceEntries,
  supplierName,
  receiptDate,
}: ManifestItemsTableProps) {
```

### Step 2D — Tambah props ke `MemoRowProps` interface

Cari:
```ts
interface MemoRowProps {
  item: ManifestItemInput;
  index: number;
  totalItems: number;
  onUpdate: (index: number, updated: ManifestItemInput) => void;
  onDelete: (index: number) => void;
  availableSpecies?: string[];
  disabledDelete?: boolean;
}
```

Ganti dengan:
```ts
interface MemoRowProps {
  item: ManifestItemInput;
  index: number;
  totalItems: number;
  onUpdate: (index: number, updated: ManifestItemInput) => void;
  onDelete: (index: number) => void;
  availableSpecies?: string[];
  disabledDelete?: boolean;
  priceEntries?: TimberPriceEntry[];
  supplierName?: string;
  receiptDate?: string;
}
```

### Step 2E — Pass props ke `MemoizedManifestRow` (destructure + render)

Cari di fungsi `MemoizedManifestRow`:
```ts
const MemoizedManifestRow = React.memo(function MemoizedManifestRow({
  item, index, totalItems, onUpdate, onDelete, availableSpecies, disabledDelete,
}: MemoRowProps) {
```

Ganti dengan:
```ts
const MemoizedManifestRow = React.memo(function MemoizedManifestRow({
  item, index, totalItems, onUpdate, onDelete, availableSpecies, disabledDelete,
  priceEntries, supplierName, receiptDate,
}: MemoRowProps) {
```

Cari di return `MemoizedManifestRow`:
```tsx
return (
  <ManifestItemRow
    item={item}
    index={index}
    totalItems={totalItems}
    onChange={handleChange}
    onDelete={handleDelete}
    availableSpecies={availableSpecies}
    disabledDelete={disabledDelete}
  />
);
```

Ganti dengan:
```tsx
return (
  <ManifestItemRow
    item={item}
    index={index}
    totalItems={totalItems}
    onChange={handleChange}
    onDelete={handleDelete}
    availableSpecies={availableSpecies}
    disabledDelete={disabledDelete}
    priceEntries={priceEntries}
    supplierName={supplierName}
    receiptDate={receiptDate}
  />
);
```

### Step 2F — Pass props ke `MemoizedManifestRow` di render loop

Cari di JSX render loop (dalam `items.map`):
```tsx
<MemoizedManifestRow
  key={item.id || `item-${index}`}
  item={item}
  index={index}
  totalItems={items.length}
  onUpdate={handleUpdateItem}
  onDelete={handleDeleteItem}
  availableSpecies={availableSpecies}
  disabledDelete={items.length <= 1}
/>
```

Ganti dengan:
```tsx
<MemoizedManifestRow
  key={item.id || `item-${index}`}
  item={item}
  index={index}
  totalItems={items.length}
  onUpdate={handleUpdateItem}
  onDelete={handleDeleteItem}
  availableSpecies={availableSpecies}
  disabledDelete={items.length <= 1}
  priceEntries={priceEntries}
  supplierName={supplierName}
  receiptDate={receiptDate}
/>
```

### Checklist Phase 2
```
[ ] Import TimberPriceEntry ke types import
[ ] Tambah 3 props baru ke ManifestItemsTableProps
[ ] Destructure 3 props baru di fungsi ManifestItemsTable
[ ] Tambah 3 props baru ke MemoRowProps interface
[ ] Destructure + pass ke ManifestItemRow di MemoizedManifestRow
[ ] Pass 3 props baru ke MemoizedManifestRow di render loop
```

---

## Phase 3 — ManifestItemRow.tsx

**File:** `src/components/ledger/ManifestItemRow.tsx`
Saat ini 208 baris. Harus tetap < 250 setelah perubahan.

### Step 3A — Import `TimberPriceEntry` dan `lookupPriceForRecord`

Cari baris import (line 3-4):
```ts
import type { ManifestItemInput } from '@/src/types';
import { SpeciesCombobox } from './SpeciesCombobox';
```

Ganti dengan:
```ts
import type { ManifestItemInput, TimberPriceEntry } from '@/src/types';
import { lookupPriceForRecord } from '@/src/utils/price-lookup';
import { SpeciesCombobox } from './SpeciesCombobox';
```

### Step 3B — Tambah props baru ke `ManifestItemRowProps`

Cari:
```ts
export interface ManifestItemRowProps {
  item: ManifestItemInput;
  index: number;
  totalItems: number;
  onChange: (updated: ManifestItemInput) => void;
  onDelete: () => void;
  availableSpecies?: string[];
  disabledDelete?: boolean;
}
```

Ganti dengan:
```ts
export interface ManifestItemRowProps {
  item: ManifestItemInput;
  index: number;
  totalItems: number;
  onChange: (updated: ManifestItemInput) => void;
  onDelete: () => void;
  availableSpecies?: string[];
  disabledDelete?: boolean;
  priceEntries?: TimberPriceEntry[];
  supplierName?: string;
  receiptDate?: string;
}
```

### Step 3C — Destructure props baru di fungsi

Cari:
```ts
export const ManifestItemRow = React.memo(function ManifestItemRow({
  item, index, totalItems, onChange, onDelete, availableSpecies, disabledDelete,
}: ManifestItemRowProps) {
```

Ganti dengan:
```ts
export const ManifestItemRow = React.memo(function ManifestItemRow({
  item, index, totalItems, onChange, onDelete, availableSpecies, disabledDelete,
  priceEntries, supplierName, receiptDate,
}: ManifestItemRowProps) {
```

### Step 3D — Tambah local state `autoFilledLabel`

Tambahkan tepat setelah baris `const cannotDelete = ...` (sekitar line 43):

```ts
const [autoFilledLabel, setAutoFilledLabel] = React.useState<string | null>(null);
```

### Step 3E — Ubah handler species change dengan logika auto-fill

Saat ini species diubah langsung via `updateField`. Cari bagian `SpeciesCombobox`
di JSX (sekitar line 120):

```tsx
<SpeciesCombobox value={item.woodSpecies || ''} onChange={(val) => updateField('woodSpecies', val)}
  availableSpecies={availableSpecies} required id={`species-combobox-${item.id || index}`} />
```

Ganti dengan:

```tsx
<SpeciesCombobox
  value={item.woodSpecies || ''}
  onChange={(val) => {
    if (!val) { updateField('woodSpecies', val); return; }
    if (priceEntries && priceEntries.length > 0 && item.timberPricePerM3 === null) {
      const result = lookupPriceForRecord(
        {
          woodSpecies: val,
          supplierName: supplierName || '',
          receiptDate: receiptDate || new Date().toISOString().slice(0, 10),
        } as Parameters<typeof lookupPriceForRecord>[0],
        priceEntries
      );
      if (result.matched) {
        const label = result.entry.supplierName
          ? `${result.entry.woodSpecies} · ${result.entry.supplierName}`
          : `${result.entry.woodSpecies} (Global)`;
        setAutoFilledLabel(label);
        onChange({ ...item, woodSpecies: val,
          timberPricePerM3: result.entry.pricePerM3,
          timberPphRate: result.entry.timberPphRate,
        });
        return;
      }
    }
    setAutoFilledLabel(null);
    updateField('woodSpecies', val);
  }}
  availableSpecies={availableSpecies}
  required
  id={`species-combobox-${item.id || index}`}
/>
```

### Step 3F — Reset `autoFilledLabel` saat harga diubah manual

Cari input `timberPricePerM3` (sekitar line 191):
```tsx
onChange={(e) => {
  const val = e.target.value.trim();
  updateField('timberPricePerM3', val === '' ? null : (parseFloat(val) || 0));
}}
```

Ganti dengan:
```tsx
onChange={(e) => {
  const val = e.target.value.trim();
  setAutoFilledLabel(null);
  updateField('timberPricePerM3', val === '' ? null : (parseFloat(val) || 0));
}}
```

### Step 3G — Tambah badge di bawah input harga

Cari struktur div Cluster C (Komersial & Pajak), tepat setelah `</div>` penutup
grid 2-kolom (harga + PPh), sebelum `</div>` penutup Cluster C:

```tsx
{/* Tutup grid harga+PPh */}
</div>
```

Tambahkan badge setelah grid tersebut, sebelum `</div>` penutup Cluster C:

```tsx
{autoFilledLabel && (
  <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-1.5 py-0.5">
    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
    Auto: Rp {(item.timberPricePerM3 ?? 0).toLocaleString('id-ID')} · {autoFilledLabel}
  </span>
)}
```

### Checklist Phase 3
```
[ ] Import TimberPriceEntry dan lookupPriceForRecord
[ ] Tambah 3 props baru ke ManifestItemRowProps
[ ] Destructure 3 props baru di fungsi
[ ] Tambah: const [autoFilledLabel, setAutoFilledLabel] = React.useState<string | null>(null)
[ ] Ubah SpeciesCombobox onChange dengan logika auto-fill
[ ] Reset autoFilledLabel saat operator ubah harga manual
[ ] Tambah badge {autoFilledLabel && (...)} di Cluster C
[ ] Verify: wc -l file < 250
```

---

## Phase 4 — Test Baru

**File:** `test/price-autofill-receiving.test.ts` (file baru)

`lookupPriceForRecord` sudah ada. Test ini memverifikasi behavior yang relevan
dengan auto-fill skenario di penerimaan.

```ts
/**
 * test/price-autofill-receiving.test.ts
 *
 * Unit tests untuk lookupPriceForRecord yang menjadi engine
 * auto-fill harga saat input penerimaan kayu.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lookupPriceForRecord } from '../src/utils/price-lookup.ts';
import type { TimberPriceEntry, WoodReceivingRecord } from '../src/types/index.ts';

function makeRecord(overrides: Partial<WoodReceivingRecord> = {}): WoodReceivingRecord {
  return {
    id: 'rec-test-1',
    receiptDate: '2026-10-15',
    truckPlateNumber: 'B 1234 AB',
    forestryDocNumber: 'DKP-001',
    receiptNumber: 'KW-001',
    contractNumber: '',
    supplierName: 'PT Rimba Jaya',
    woodSpecies: 'Jati',
    woodLengthM: 4.0,
    kavlingNumber: 'KAV-01',
    storageYard: 'TPK-Timur',
    deliveredPieces: 10, deliveredVolumeM3: 5.0,
    tallyPieces: 10, tallyVolumeM3: 5.0,
    timberPricePerM3: null, timberPphRate: 0.5,
    timberGrossTotal: null, timberPphAmount: null, timberNetPayable: null,
    freightRatePerM3: 0, freightGrossTotal: 0, freightPphAmount: 0, freightNetPayable: 0,
    brokerFee: 0, grandNetPayable: 0,
    paymentStatus: 'UNPAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeEntry(overrides: Partial<TimberPriceEntry> = {}): TimberPriceEntry {
  return {
    id: 'tpe-test-1',
    tenantId: 'default-tenant',
    speciesId: 'SPC-JATI',
    woodSpecies: 'Jati',
    effectiveFrom: '2026-01-01',
    pricePerM3: 4_500_000,
    timberPphRate: 0.5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

test('lookupPriceForRecord: global match ditemukan saat species cocok', () => {
  const result = lookupPriceForRecord(makeRecord(), [makeEntry()]);
  assert.equal(result.matched, true);
  if (result.matched) {
    assert.equal(result.entry.pricePerM3, 4_500_000);
    assert.equal(result.entry.timberPphRate, 0.5);
  }
});

test('lookupPriceForRecord: supplier-specific lebih prioritas dari global', () => {
  const global = makeEntry({ id: 'tpe-global', pricePerM3: 4_500_000 });
  const specific = makeEntry({
    id: 'tpe-specific',
    supplierName: 'PT Rimba Jaya',
    pricePerM3: 4_800_000,
    effectiveFrom: '2026-07-01',
  });
  const result = lookupPriceForRecord(makeRecord(), [global, specific]);
  assert.equal(result.matched, true);
  if (result.matched) {
    assert.equal(result.entry.pricePerM3, 4_800_000);
    assert.equal(result.entry.id, 'tpe-specific');
  }
});

test('lookupPriceForRecord: tidak match jika species berbeda', () => {
  const entry = makeEntry({ woodSpecies: 'Meranti' });
  const result = lookupPriceForRecord(makeRecord({ woodSpecies: 'Jati' }), [entry]);
  assert.equal(result.matched, false);
});

test('lookupPriceForRecord: tidak match jika receiptDate sebelum effectiveFrom', () => {
  const entry = makeEntry({ effectiveFrom: '2026-11-01' });
  const result = lookupPriceForRecord(makeRecord({ receiptDate: '2026-10-15' }), [entry]);
  assert.equal(result.matched, false);
});

test('lookupPriceForRecord: tidak match jika receiptDate setelah effectiveTo', () => {
  const entry = makeEntry({ effectiveFrom: '2026-01-01', effectiveTo: '2026-09-30' });
  const result = lookupPriceForRecord(makeRecord({ receiptDate: '2026-10-15' }), [entry]);
  assert.equal(result.matched, false);
});

test('lookupPriceForRecord: open-ended (tanpa effectiveTo) tetap match', () => {
  const entry = makeEntry({ effectiveFrom: '2026-01-01', effectiveTo: undefined });
  const result = lookupPriceForRecord(makeRecord({ receiptDate: '2026-12-31' }), [entry]);
  assert.equal(result.matched, true);
});

test('lookupPriceForRecord: entries kosong menghasilkan not matched', () => {
  const result = lookupPriceForRecord(makeRecord(), []);
  assert.equal(result.matched, false);
});
```

### Checklist Phase 4
```
[ ] Buat file test/price-autofill-receiving.test.ts
[ ] 7 test cases semua pass
[ ] npm test >= 956 pass (949 + 7 baru), 0 fail
```

---

## Phase 5 — Verification

```bash
# 1. Tests
npm test
# Expected: >= 956 pass, 0 fail

# 2. Build
npm run build:check
# Expected: 0 errors

# 3. Drift
npm run drift:check
# Expected: 0 violations

# 4. Verifikasi props baru ada
grep -n "priceEntries" src/components/ledger/RecordModal.tsx
# Expected: >= 2 baris (hook + pass ke ManifestItemsTable)

grep -n "priceEntries" src/components/ledger/ManifestItemsTable.tsx
# Expected: >= 4 baris (interface, destructure, MemoRowProps, render loop)

grep -n "priceEntries" src/components/ledger/ManifestItemRow.tsx
# Expected: >= 2 baris (interface, destructure, usage di handler)

# 5. Verifikasi lookupPriceForRecord dipakai di ManifestItemRow
grep -n "lookupPriceForRecord" src/components/ledger/ManifestItemRow.tsx
# Expected: >= 1 baris

# 6. Verifikasi autoFilledLabel ada
grep -n "autoFilledLabel" src/components/ledger/ManifestItemRow.tsx
# Expected: >= 4 baris (useState, setAutoFilledLabel x2, render badge)

# 7. LOC check
wc -l src/components/ledger/RecordModal.tsx
# Expected: < 250

wc -l src/components/ledger/ManifestItemRow.tsx
# Expected: < 250
```

---

## Urutan Eksekusi

```
Phase 1 (RecordModal) → Phase 2 (ManifestItemsTable) → Phase 3 (ManifestItemRow)
→ Phase 4 (test) → Phase 5 (verify)
```

Phase 1 harus selesai sebelum Phase 2 karena ManifestItemsTable menerima props
dari RecordModal. Phase 3 bergantung Phase 2 untuk props interface yang konsisten.

---

## Risk Assessment

| Risk | Likelihood | Mitigasi |
|------|-----------|---------|
| `useTimberPrices()` menambah fetch saat RecordModal buka | Low | Hook sudah ada di app, fetch di-cache satu kali. Tidak ada fetch baru jika user sudah pernah buka halaman Prices. |
| Auto-fill overwrite harga di form edit | None | Kondisi `item.timberPricePerM3 === null` memastikan hanya null yang di-fill. Form edit selalu punya harga dari DB. |
| `lookupPriceForRecord` menerima partial record (tanpa semua field) | Low | Fungsi hanya mengakses `woodSpecies`, `supplierName`, `receiptDate` — semua tersedia. Cast `as Parameters<...>[0]` aman. |
| Badge muncul permanen di form edit | None | `autoFilledLabel` state mulai `null`, hanya di-set saat auto-fill terjadi yang mensyaratkan `timberPricePerM3 === null`. |
| LOC ManifestItemRow melewati 250 | Low | Saat ini 208 baris + ~25 baris perubahan = ~233 baris. Masih di bawah 250. |

---

## Commit Message

```
feat(receiving): auto-fill harga dari tabel harga saat pilih species

- ManifestItemRow: lookup tabel harga saat woodSpecies dipilih,
  auto-fill timberPricePerM3 + timberPphRate jika match ditemukan
- ManifestItemRow: badge "Auto: Rp X · Label" konfirmasi sumber harga,
  hilang saat operator ubah harga manual
- ManifestItemsTable: pass-through props priceEntries, supplierName, receiptDate
- RecordModal: tambah useTimberPrices() dan pass ke ManifestItemsTable
- test: 7 unit test lookupPriceForRecord di price-autofill-receiving.test.ts

Priority lookup: supplier-specific > global. Tidak auto-fill jika
timberPricePerM3 sudah ada (form edit aman).

Implements ADR-0018. Closes gap tabel harga tidak dipakai saat input penerimaan.
```
