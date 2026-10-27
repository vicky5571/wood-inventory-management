# Implementation Plan: Real-Time Totals Footer — Payment Form DRAFT

**Date:** 2026-10-28
**Status:** Ready to implement
**Related Spec:** `docs/superpowers/specs/2026-10-28-payment-form-realtime-totals-design.md`
**Related ADR:** `docs/adr/0017-payment-form-totals-source-of-truth.md`
**Baseline:** 949 passed, 0 failed

---

## Ringkasan Masalah

`PaymentFormTotalsFooter` membaca 5 field agregat dari `activeForm` (DB snapshot).
Saat operator mengedit baris di `LineItemEditor`, 4 dari 5 field footer tidak update
sampai klik "Simpan Perubahan" — stale display.

Partial fix sudah ada di `PaymentFormDetailView` line 156 (hanya `totalAmountIDR`
di-override), tapi 4 field lain masih stale.

---

## Scope Perubahan

| File | Jenis Perubahan | Net LOC |
|------|----------------|---------|
| `src/components/payment-forms/PaymentFormDetailView.tsx` | Logika state + pass props | +8 LOC |
| `src/components/payment-forms/PaymentFormTotalsFooter.tsx` | Prop baru + badge UI | +12 LOC |
| `test/payment-form-totals-footer.test.ts` | File baru (unit test) | +60 LOC |

**Tidak ada perubahan:** API, DB schema, types SSOT, hooks, utils.

---

## Phase 1 — PaymentFormDetailView.tsx

### Step 1A — Tambah `isDirty` state

Tambahkan setelah `const [isSaving, setIsSaving] = useState(false);` (line 47):

```ts
const [isDirty, setIsDirty] = useState(false);
```

### Step 1B — Set `isDirty = true` di `handleLinesChange`

Ubah `handleLinesChange` (line 68–72):

```ts
// SEBELUM:
const handleLinesChange = (newLines: PaymentFormLineItem[]) => {
  setLines(newLines);
  const totals = computeFormTotals(newLines);
  setTerbilangVal(totals.terbilang);
};

// SESUDAH:
const handleLinesChange = (newLines: PaymentFormLineItem[]) => {
  setLines(newLines);
  const totals = computeFormTotals(newLines);
  setTerbilangVal(totals.terbilang);
  setIsDirty(true);
};
```

### Step 1C — Set `isDirty = false` setelah save berhasil

Ubah `handleSaveDraft` — tambah `setIsDirty(false)` di dalam `try`, setelah `await updateForm(...)` selesai:

```ts
// SEBELUM:
const handleSaveDraft = async () => {
  if (!activeForm) return;
  setIsSaving(true);
  try {
    const totals = computeFormTotals(lines);
    await updateForm(activeForm.id, { ... });
  } finally {
    setIsSaving(false);
  }
};

// SESUDAH:
const handleSaveDraft = async () => {
  if (!activeForm) return;
  setIsSaving(true);
  try {
    const totals = computeFormTotals(lines);
    await updateForm(activeForm.id, { ... });
    setIsDirty(false);   // ← hanya reset jika save berhasil
  } finally {
    setIsSaving(false);
  }
};
```

### Step 1D — Ubah komputasi footer totals (hapus partial override)

Tambahkan derived variable `footerTotals` setelah `const isDraft = activeForm.status === 'DRAFT';` (line 123):

```ts
const footerTotals = isDraft
  ? computeFormTotals(lines)
  : {
      totalAmountIDR:      activeForm.totalAmountIDR,
      totalTallyVolumeM3:  activeForm.totalTallyVolumeM3,
      totalTallyPieces:    activeForm.totalTallyPieces,
      totalTimberGrossIDR: activeForm.totalTimberGrossIDR,
      totalTimberPphIDR:   activeForm.totalTimberPphIDR,
      totalTimberNetIDR:   activeForm.totalTimberNetIDR,
    };
```

### Step 1E — Ubah pass ke `PaymentFormTotalsFooter` (line 156)

```tsx
// SEBELUM:
<PaymentFormTotalsFooter form={{ ...activeForm, lines, totalAmountIDR: computeFormTotals(lines).totalAmountIDR }} />

// SESUDAH:
<PaymentFormTotalsFooter form={{ ...activeForm, ...footerTotals }} isDirty={isDirty} />
```

### Checklist Phase 1

```
[ ] Tambah: const [isDirty, setIsDirty] = useState(false);
[ ] Tambah: setIsDirty(true) di handleLinesChange
[ ] Tambah: setIsDirty(false) di handleSaveDraft (dalam try, setelah await updateForm)
[ ] Tambah: const footerTotals = isDraft ? computeFormTotals(lines) : { ...activeForm fields }
[ ] Ubah: pass ke PaymentFormTotalsFooter gunakan footerTotals + isDirty prop
[ ] Verifikasi: LOC file tetap < 250
```

---

## Phase 2 — PaymentFormTotalsFooter.tsx

### Step 2A — Tambah `isDirty` ke props interface

```ts
// SEBELUM:
interface PaymentFormTotalsFooterProps {
  form: PaymentForm;
}

// SESUDAH:
interface PaymentFormTotalsFooterProps {
  form: PaymentForm;
  isDirty?: boolean;
}
```

### Step 2B — Destructure `isDirty` di function signature

```ts
// SEBELUM:
export function PaymentFormTotalsFooter({ form }: PaymentFormTotalsFooterProps) {

// SESUDAH:
export function PaymentFormTotalsFooter({ form, isDirty }: PaymentFormTotalsFooterProps) {
```

### Step 2C — Tambah badge di header section

Ubah bagian `<h3>` di dalam return:

```tsx
// SEBELUM:
<h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">
  Ringkasan Keuangan & Volume (金额及体积汇总)
</h3>

// SESUDAH:
<div className="flex items-center justify-between mb-4">
  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
    Ringkasan Keuangan & Volume (金额及体积汇总)
  </h3>
  {isDirty && (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
      Preview — Belum Disimpan
    </span>
  )}
</div>
```

### Checklist Phase 2

```
[ ] Tambah isDirty?: boolean ke interface PaymentFormTotalsFooterProps
[ ] Destructure isDirty di function signature
[ ] Ubah <h3> menjadi <div> wrapper dengan flex justify-between
[ ] Tambah badge conditional {isDirty && (...)}
[ ] Verifikasi: LOC file tetap < 100
```

---

## Phase 3 — Test Baru

### File: `test/payment-form-totals-footer.test.ts`

Test ini menggunakan rendering ringan (tidak butuh jsdom) — cukup test bahwa
`computeFormTotals` menghasilkan nilai yang benar untuk berbagai skenario baris,
dan verifikasi prop logic secara unit.

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeFormTotals } from '../src/utils/payment-form-grouping.ts';
import type { PaymentFormLineItem } from '../src/types/index.ts';

function makeLine(overrides: Partial<PaymentFormLineItem> = {}): PaymentFormLineItem {
  return {
    id: 'line-test-1',
    paymentFormId: 'pay-test',
    itemSequence: 1,
    kategori: 'Pembelian Kayu',
    konten: 'DKP-001 - Jati',
    tujuan: 'PT Rimba Jaya',
    hargaSatuanIDR: 3_000_000,
    jumlah: 5.0,
    unit: 'm³',
    totalIDR: 14_962_500,
    tallyPieces: 10,
    tallyVolumeM3: 5.0,
    timberGrossIDR: 15_000_000,
    timberPphIDR: 37_500,
    timberNetIDR: 14_962_500,
    ...overrides,
  };
}

// Test 1: lines kosong → semua 0
test('computeFormTotals: lines kosong menghasilkan semua 0', () => {
  const result = computeFormTotals([]);
  assert.equal(result.totalAmountIDR, 0);
  assert.equal(result.totalTallyVolumeM3, 0);
  assert.equal(result.totalTallyPieces, 0);
  assert.equal(result.totalTimberGrossIDR, 0);
  assert.equal(result.totalTimberPphIDR, 0);
  assert.equal(result.totalTimberNetIDR, 0);
});

// Test 2: satu baris dengan tallyPieces dan timberGrossIDR
test('computeFormTotals: satu baris m3 menghitung agregat dengan benar', () => {
  const result = computeFormTotals([makeLine()]);
  assert.equal(result.totalTallyVolumeM3, 5.0);
  assert.equal(result.totalTallyPieces, 10);
  assert.equal(result.totalTimberGrossIDR, 15_000_000);
  assert.equal(result.totalTimberPphIDR, 37_500);
  assert.equal(result.totalTimberNetIDR, 14_962_500);
  assert.equal(result.totalAmountIDR, 14_962_500);
});

// Test 3: dua baris — agregat dijumlahkan
test('computeFormTotals: dua baris dijumlahkan dengan benar', () => {
  const line1 = makeLine({ id: 'line-1' });
  const line2 = makeLine({
    id: 'line-2',
    itemSequence: 2,
    jumlah: 3.0,
    totalIDR: 8_977_500,
    tallyPieces: 6,
    tallyVolumeM3: 3.0,
    timberGrossIDR: 9_000_000,
    timberPphIDR: 22_500,
    timberNetIDR: 8_977_500,
  });
  const result = computeFormTotals([line1, line2]);
  assert.equal(result.totalTallyVolumeM3, 8.0);
  assert.equal(result.totalTallyPieces, 16);
  assert.equal(result.totalTimberGrossIDR, 24_000_000);
  assert.equal(result.totalTimberPphIDR, 60_000);
  assert.equal(result.totalTimberNetIDR, 23_940_000);
});

// Test 4: unit bukan m3 tidak masuk totalTallyVolumeM3
test('computeFormTotals: baris unit batang tidak masuk totalTallyVolumeM3', () => {
  const line = makeLine({ unit: 'batang', jumlah: 10, tallyVolumeM3: undefined });
  const result = computeFormTotals([line]);
  assert.equal(result.totalTallyVolumeM3, 0);
});
```

### Checklist Phase 3

```
[ ] Buat file test/payment-form-totals-footer.test.ts
[ ] Test 1: lines kosong → semua 0
[ ] Test 2: satu baris m3 → agregat benar
[ ] Test 3: dua baris → dijumlahkan
[ ] Test 4: unit bukan m3 → tidak masuk totalTallyVolumeM3
[ ] npm test — semua pass (>= 949 + 4 test baru)
```

---

## Phase 4 — Verification

```bash
# 1. Tests harus tetap hijau + test baru pass
npm test
# Expected: >= 953 pass, 0 fail

# 2. Build harus bersih
npm run build:check
# Expected: 0 errors

# 3. Drift check
npm run drift:check
# Expected: 0 violations

# 4. Verifikasi isDirty ada di kedua file
grep -n "isDirty" src/components/payment-forms/PaymentFormDetailView.tsx
# Expected: >= 4 baris (useState, handleLinesChange, handleSaveDraft, pass ke footer)

grep -n "isDirty" src/components/payment-forms/PaymentFormTotalsFooter.tsx
# Expected: >= 3 baris (interface, destructure, conditional render)

# 5. Verifikasi partial override lama sudah hilang
grep -n "totalAmountIDR: computeFormTotals" src/components/payment-forms/PaymentFormDetailView.tsx
# Expected: 0 hasil (partial override sudah diganti footerTotals)

# 6. Verifikasi footerTotals ada
grep -n "footerTotals" src/components/payment-forms/PaymentFormDetailView.tsx
# Expected: >= 2 baris (deklarasi dan penggunaan)

# 7. LOC check
wc -l src/components/payment-forms/PaymentFormDetailView.tsx
# Expected: < 250

wc -l src/components/payment-forms/PaymentFormTotalsFooter.tsx
# Expected: < 100
```

---

## Urutan Eksekusi

```
Phase 1 (DetailView) → Phase 2 (TotalsFooter) → Phase 3 (test) → Phase 4 (verify)
```

Phase 1 dan 2 tidak bergantung satu sama lain dan bisa dikerjakan paralel,
tapi Phase 3 bergantung keduanya sudah selesai agar build tidak error.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigasi |
|------|-----------|--------|---------|
| `footerTotals` untuk non-DRAFT salah karena spread order | Low | Medium | Pastikan `{ ...activeForm, ...footerTotals }` — `footerTotals` di kanan (override) |
| `isDirty` tidak reset jika navigate away dan kembali | None | None | Komponen unmount/remount → state reset ke default `false` |
| Badge muncul saat form pertama dimuat | None | None | `isDirty` default `false`, hanya jadi `true` via `handleLinesChange` |
| `computeFormTotals` dipanggil setiap render (overhead) | None | None | Pure function O(n), n < 20 baris — < 1ms |
| Form ISSUED/PAID terkena dampak | None | None | `footerTotals` untuk non-DRAFT baca dari `activeForm` langsung, bukan `computeFormTotals` |

---

## Commit Message

```
fix(payment-forms): real-time totals footer untuk DRAFT + badge belum disimpan

- PaymentFormDetailView: tambah isDirty state, reset setelah save berhasil
- PaymentFormDetailView: footerTotals dihitung dari computeFormTotals(lines)
  untuk DRAFT (semua 5 field), bukan partial override totalAmountIDR saja
- PaymentFormTotalsFooter: terima isDirty prop, tampilkan badge
  "Preview — Belum Disimpan" saat ada unsaved changes
- test: tambah 4 unit test computeFormTotals di payment-form-totals-footer.test.ts

Closes stale-footer issue untuk manual POST form dengan totals ≠ 0 tapi lines = []
Ref: ADR-0017, spec 2026-10-28-payment-form-realtime-totals-design.md
```
