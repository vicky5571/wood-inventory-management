# HANDOVER — Price Auto-Fill dari Tabel Harga saat Input Penerimaan

**Dibuat:** 2026-10-28
**Branch:** vicky
**Baseline:** 949 passed, 0 failed · 0 drift violations
**ADR:** docs/adr/0018-price-autofill-on-receiving-input.md

---

## === MANDATORY SESSION START ===

Baca dalam urutan ini sebelum menyentuh kode apapun:

1. `AGENTS.md` — mandatory protocol, 250 LOC cap, SSOT rules
2. `docs/SESSION_STATE.md` — verify baseline
3. `docs/adr/0018-price-autofill-on-receiving-input.md` — keputusan arsitektur
4. `docs/superpowers/specs/2026-10-28-price-autofill-receiving-design.md` — spec lengkap
5. `docs/superpowers/plans/2026-10-28-price-autofill-receiving.md` — implementation plan
6. `src/utils/price-lookup.ts` — `lookupPriceForRecord()` yang akan dipakai (TIDAK diubah)
7. `src/hooks/useTimberPrices.ts` — hook yang akan dipanggil (TIDAK diubah)
8. `src/components/ledger/RecordModal.tsx` — file Phase 1
9. `src/components/ledger/ManifestItemsTable.tsx` — file Phase 2
10. `src/components/ledger/ManifestItemRow.tsx` — file Phase 3 (logika utama)

Verifikasi sebelum mulai:
```bash
npm run drift:check   # harus 0 violations
npm test              # harus 949 pass, 0 fail
npm run build:check   # harus 0 errors
```

---

## === KONTEKS SINGKAT ===

### Masalah

`ManifestItemRow` punya field `timberPricePerM3` yang selalu kosong (null) saat
penerimaan baru dibuat. Sistem tidak pernah mengkonsultasi tabel harga
(`timber_price_entries`) meskipun `lookupPriceForRecord()` sudah ada dan lengkap.

Akibat: semua penerimaan masuk "Pending Pricing" meski harga sudah dikonfigurasi.
Operator harus isi manual satu per satu di halaman terpisah.

### Solusi

Saat operator memilih `woodSpecies` di `ManifestItemRow`:
1. Lookup tabel harga via `lookupPriceForRecord()`
2. Jika match → auto-fill `timberPricePerM3` + `timberPphRate`
3. Tampilkan badge konfirmasi "Auto: Rp X · Label"
4. Operator bisa override kapan saja
5. Jika tidak ada match → field tetap null (pending pricing tetap valid)

### Guard penting

Auto-fill **hanya terjadi** jika `item.timberPricePerM3 === null`.
Form edit dengan harga existing tidak akan ter-overwrite.

### Yang berubah

| File | Perubahan |
|------|-----------|
| `RecordModal.tsx` | Tambah `useTimberPrices()` + pass 3 props |
| `ManifestItemsTable.tsx` | Pass-through 3 props baru |
| `ManifestItemRow.tsx` | Logika auto-fill + badge UI |
| `test/price-autofill-receiving.test.ts` | File baru, 7 unit test |

### Yang TIDAK berubah

- `src/utils/price-lookup.ts` — tidak diubah
- `src/hooks/useTimberPrices.ts` — tidak diubah
- API endpoints, DB schema, types SSOT
- Halaman Pending Pricing — tetap berfungsi untuk exception

---

## === PHASE 1 — RecordModal.tsx ===

**File:** `src/components/ledger/RecordModal.tsx` (saat ini 234 baris, harus < 250)

### Step 1A — Import `useTimberPrices`

Cari (sekitar line 17):
```ts
import { useSettings } from '@/src/hooks/useSettings';
```

Tambahkan tepat sesudahnya:
```ts
import { useTimberPrices } from '@/src/hooks/useTimberPrices';
```

### Step 1B — Ambil `activeEntries` dari hook

Cari (sekitar line 49):
```ts
const { settings } = useSettings();
```

Tambahkan tepat sesudahnya:
```ts
const { activeEntries: priceEntries } = useTimberPrices();
```

### Step 1C — Pass props ke `ManifestItemsTable`

Cari (sekitar line 217):
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
[ ] Ubah ManifestItemsTable — tambah 3 props baru
[ ] Verify: wc -l src/components/ledger/RecordModal.tsx → < 250
```

---

## === PHASE 2 — ManifestItemsTable.tsx ===

**File:** `src/components/ledger/ManifestItemsTable.tsx`

### Step 2A — Import `TimberPriceEntry`

Cari (line 3):
```ts
import type { ManifestItemInput } from '@/src/types';
```

Ganti dengan:
```ts
import type { ManifestItemInput, TimberPriceEntry } from '@/src/types';
```

### Step 2B — Tambah 3 props ke `ManifestItemsTableProps`

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

### Step 2C — Destructure 3 props baru di fungsi

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

### Step 2D — Tambah 3 props ke `MemoRowProps`

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

### Step 2E — Destructure + pass di `MemoizedManifestRow`

Cari destructure di `MemoizedManifestRow`:
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

Cari return JSX di `MemoizedManifestRow`:
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

### Step 2F — Pass 3 props ke `MemoizedManifestRow` di render loop

Cari di `items.map(...)`:
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
[ ] Import TimberPriceEntry
[ ] Tambah 3 props ke ManifestItemsTableProps
[ ] Destructure 3 props di fungsi ManifestItemsTable
[ ] Tambah 3 props ke MemoRowProps
[ ] Destructure + pass di MemoizedManifestRow (destructure + JSX return)
[ ] Pass 3 props di render loop items.map
```

---

## === PHASE 3 — ManifestItemRow.tsx ===

**File:** `src/components/ledger/ManifestItemRow.tsx` (saat ini 208 baris, harus < 250)

### Step 3A — Import `TimberPriceEntry` dan `lookupPriceForRecord`

Cari (line 3-4):
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

### Step 3B — Tambah 3 props ke `ManifestItemRowProps`

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

### Step 3C — Destructure 3 props baru di fungsi

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

Cari (sekitar line 43):
```ts
const cannotDelete = disabledDelete ?? totalItems <= 1;
```

Tambahkan tepat sesudahnya:
```ts
const [autoFilledLabel, setAutoFilledLabel] = React.useState<string | null>(null);
```

### Step 3E — Ubah `SpeciesCombobox` onChange dengan logika auto-fill

Cari (sekitar line 120):
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

Di Cluster C (Komersial & Pajak), cari onChange input `timberPricePerM3`:
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

### Step 3G — Tambah badge di Cluster C

Di Cluster C (div `bg-gray-50/70 ... Komersial & Pajak`), cari penutup `</div>`
dari grid 2-kolom (harga + PPh). Tambahkan badge **setelah** grid tersebut,
sebelum `</div>` penutup Cluster C:

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
[ ] Tambah 3 props ke ManifestItemRowProps
[ ] Destructure 3 props di fungsi
[ ] Tambah: const [autoFilledLabel, setAutoFilledLabel] = React.useState<string | null>(null)
[ ] Ubah SpeciesCombobox onChange — logika auto-fill
[ ] Reset autoFilledLabel saat operator ubah harga manual
[ ] Tambah badge {autoFilledLabel && (...)} di Cluster C
[ ] Verify: wc -l src/components/ledger/ManifestItemRow.tsx → < 250
```

---

## === PHASE 4 — Test Baru ===

**File:** `test/price-autofill-receiving.test.ts` (file baru)

Buat file baru dengan isi berikut persis:

```ts
/**
 * test/price-autofill-receiving.test.ts
 *
 * Unit tests untuk lookupPriceForRecord — engine auto-fill harga
 * saat input penerimaan kayu.
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

test('lookupPriceForRecord: open-ended tanpa effectiveTo tetap match', () => {
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
[ ] Semua 7 test pass
```

---

## === VERIFICATION GATE ===

Jalankan semua ini setelah Phase 4 selesai:

```bash
# 1. Tests — >= 956 pass (949 lama + 7 baru), 0 fail
npm test

# 2. Build
npm run build:check

# 3. Drift
npm run drift:check

# 4. priceEntries ada di semua 3 file
grep -n "priceEntries" src/components/ledger/RecordModal.tsx
# Expected: >= 2 baris

grep -n "priceEntries" src/components/ledger/ManifestItemsTable.tsx
# Expected: >= 5 baris

grep -n "priceEntries" src/components/ledger/ManifestItemRow.tsx
# Expected: >= 2 baris

# 5. lookupPriceForRecord dipakai di ManifestItemRow
grep -n "lookupPriceForRecord" src/components/ledger/ManifestItemRow.tsx
# Expected: >= 1 baris

# 6. autoFilledLabel ada
grep -n "autoFilledLabel" src/components/ledger/ManifestItemRow.tsx
# Expected: >= 4 baris

# 7. LOC check
wc -l src/components/ledger/RecordModal.tsx
# Expected: < 250

wc -l src/components/ledger/ManifestItemRow.tsx
# Expected: < 250
```

---

## === COMMIT MESSAGE ===

```
feat(receiving): auto-fill harga dari tabel harga saat pilih species

- ManifestItemRow: lookup tabel harga saat woodSpecies dipilih,
  auto-fill timberPricePerM3 + timberPphRate jika match ditemukan
- ManifestItemRow: badge "Auto: Rp X · Label" konfirmasi sumber harga,
  hilang saat operator ubah harga manual
- ManifestItemsTable: pass-through props priceEntries, supplierName, receiptDate
- RecordModal: tambah useTimberPrices() dan pass ke ManifestItemsTable
- test: 7 unit test lookupPriceForRecord di price-autofill-receiving.test.ts

Guard: auto-fill hanya terjadi jika timberPricePerM3 === null.
Form edit dengan harga existing tidak terpengaruh.

Implements ADR-0018.
```

---

## === CATATAN PENTING ===

1. **Guard `timberPricePerM3 === null`** — ini kunci keamanan. Jangan ubah ke `!item.timberPricePerM3`
   karena itu akan match angka 0 yang mungkin sengaja diisi operator.

2. **Cast `as Parameters<typeof lookupPriceForRecord>[0]`** — `lookupPriceForRecord` menerima
   `WoodReceivingRecord` tapi kita hanya punya partial data di sini. Cast ini aman karena
   fungsi hanya mengakses 3 field: `woodSpecies`, `supplierName`, `receiptDate`.

3. **`autoFilledLabel` adalah local state, tidak disimpan ke DB** — hanya untuk UI feedback
   di session ini. Tidak perlu ditambahkan ke `ManifestItemInput` type.

4. **Urutan Phase penting** — Phase 1 → 2 → 3 harus berurutan karena props baru di
   RecordModal mengalir ke ManifestItemsTable lalu ke ManifestItemRow.

5. **`useTimberPrices()` fetch satu kali** — hook ini sudah di-cache di React state.
   Tidak ada fetch duplikat meski RecordModal dibuka berkali-kali.

6. **Jika `WoodReceivingRecord` tidak punya field `timberGrossTotal` nullable** — sesuaikan
   `makeRecord` di test agar cocok dengan tipe aktual. Cek `src/types/index.ts` untuk
   field yang wajib vs opsional.
