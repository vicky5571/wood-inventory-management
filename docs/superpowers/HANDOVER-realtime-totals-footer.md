# HANDOVER — Real-Time Totals Footer (Payment Form DRAFT)

**Dibuat:** 2026-10-28
**Branch:** vicky
**Baseline:** 949 passed, 0 failed · 0 drift violations
**ADR:** docs/adr/0017-payment-form-totals-source-of-truth.md

---

## === MANDATORY SESSION START ===

Baca dalam urutan ini sebelum menyentuh kode apapun:

1. `AGENTS.md` — mandatory protocol, 250 LOC cap, SSOT rules, commit convention
2. `docs/SESSION_STATE.md` — verify baseline: 949 pass, 0 fail, 0 drift
3. `docs/adr/0017-payment-form-totals-source-of-truth.md` — keputusan arsitektur
4. `docs/superpowers/specs/2026-10-28-payment-form-realtime-totals-design.md` — spec lengkap
5. `docs/superpowers/plans/2026-10-28-fix-payment-form-realtime-totals.md` — implementation plan
6. `src/components/payment-forms/PaymentFormDetailView.tsx` — file utama yang diubah
7. `src/components/payment-forms/PaymentFormTotalsFooter.tsx` — file UI yang diubah
8. `src/utils/payment-form-grouping.ts` — lihat `computeFormTotals` (tidak diubah)

Verifikasi sebelum mulai:
```bash
npm run drift:check   # harus 0 violations
npm test              # harus 949 pass, 0 fail
npm run build:check   # harus 0 errors
```

---

## === KONTEKS SINGKAT ===

### Masalah yang diselesaikan

`PaymentFormTotalsFooter` menampilkan 5 angka agregat. Saat form DRAFT, angka-angka
ini dibaca dari `activeForm` (DB snapshot). Saat operator mengedit baris di
`LineItemEditor`, **4 dari 5 field tidak update** sampai klik "Simpan Perubahan".

Ada partial fix yang sudah ada di `PaymentFormDetailView` line 156 — hanya
`totalAmountIDR` yang di-override dari `computeFormTotals(lines)`. Empat field lain
(`totalTallyVolumeM3`, `totalTallyPieces`, `totalTimberGrossIDR`, `totalTimberPphIDR`,
`totalTimberNetIDR`) masih stale. Fix ini menyelesaikan semua 5 field sekaligus.

Bonus: form yang dibuat via manual POST dengan angka acak di body tapi `lines = []`
akan menampilkan footer 0 (benar) bukan angka dari DB yang tidak sinkron.

### Yang berubah

- `PaymentFormDetailView.tsx` — tambah `isDirty` state + `footerTotals` computed var
- `PaymentFormTotalsFooter.tsx` — tambah prop `isDirty?` + badge "Preview — Belum Disimpan"
- `test/payment-form-totals-footer.test.ts` — file baru, 4 unit test

### Yang TIDAK berubah

- API endpoints — tidak ada perubahan
- DB schema — tidak ada perubahan
- `src/types/index.ts` — tidak ada perubahan
- `src/utils/payment-form-grouping.ts` — `computeFormTotals` tidak diubah
- Behavior form ISSUED / PAID / VOID — tetap baca dari DB snapshot

---

## === TASK: 3 PHASE, MULAI DARI PHASE 1 ===

---

## Phase 1 — PaymentFormDetailView.tsx

**File:** `src/components/payment-forms/PaymentFormDetailView.tsx`

Saat ini 193 baris. Setelah perubahan harus tetap < 250 baris.

### Step 1A — Tambah `isDirty` state

Cari baris ini (sekitar line 47):
```ts
const [isSaving, setIsSaving] = useState(false);
```

Tambahkan tepat sesudahnya:
```ts
const [isDirty, setIsDirty] = useState(false);
```

### Step 1B — Set `isDirty = true` di `handleLinesChange`

Cari fungsi ini (sekitar line 68):
```ts
const handleLinesChange = (newLines: PaymentFormLineItem[]) => {
  setLines(newLines);
  const totals = computeFormTotals(newLines);
  setTerbilangVal(totals.terbilang);
};
```

Tambahkan satu baris `setIsDirty(true)` di akhir body:
```ts
const handleLinesChange = (newLines: PaymentFormLineItem[]) => {
  setLines(newLines);
  const totals = computeFormTotals(newLines);
  setTerbilangVal(totals.terbilang);
  setIsDirty(true);
};
```

### Step 1C — Set `isDirty = false` setelah save berhasil

Cari fungsi `handleSaveDraft` (sekitar line 74). Tambahkan `setIsDirty(false)` di
dalam blok `try`, **setelah** `await updateForm(...)` — bukan di `finally`:

```ts
// SEBELUM:
try {
  const totals = computeFormTotals(lines);
  await updateForm(activeForm.id, {
    ...
  });
} finally {
  setIsSaving(false);
}

// SESUDAH:
try {
  const totals = computeFormTotals(lines);
  await updateForm(activeForm.id, {
    ...
  });
  setIsDirty(false);   // ← reset hanya jika save berhasil
} finally {
  setIsSaving(false);
}
```

### Step 1D — Tambah `footerTotals` computed variable

Cari baris ini (sekitar line 123):
```ts
const isDraft = activeForm.status === 'DRAFT';
```

Tambahkan tepat sesudahnya:
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

### Step 1E — Ubah pass ke `PaymentFormTotalsFooter`

Cari baris ini (sekitar line 156):
```tsx
<PaymentFormTotalsFooter form={{ ...activeForm, lines, totalAmountIDR: computeFormTotals(lines).totalAmountIDR }} />
```

Ganti dengan:
```tsx
<PaymentFormTotalsFooter form={{ ...activeForm, ...footerTotals }} isDirty={isDirty} />
```

### Checklist Phase 1
```
[ ] Tambah: const [isDirty, setIsDirty] = useState(false);
[ ] Tambah: setIsDirty(true) di handleLinesChange
[ ] Tambah: setIsDirty(false) di handleSaveDraft dalam try (bukan finally)
[ ] Tambah: const footerTotals = isDraft ? computeFormTotals(lines) : { ...activeForm fields }
[ ] Ubah: pass ke PaymentFormTotalsFooter pakai footerTotals + isDirty
[ ] Verify: wc -l file < 250
[ ] Verify: grep "totalAmountIDR: computeFormTotals" → 0 hasil (partial override lama hilang)
```

---

## Phase 2 — PaymentFormTotalsFooter.tsx

**File:** `src/components/payment-forms/PaymentFormTotalsFooter.tsx`

Saat ini 74 baris. Setelah perubahan harus tetap < 100 baris.

### Step 2A — Tambah `isDirty` ke props interface

Cari:
```ts
interface PaymentFormTotalsFooterProps {
  form: PaymentForm;
}
```

Ganti dengan:
```ts
interface PaymentFormTotalsFooterProps {
  form: PaymentForm;
  isDirty?: boolean;
}
```

### Step 2B — Destructure `isDirty` di function signature

Cari:
```ts
export function PaymentFormTotalsFooter({ form }: PaymentFormTotalsFooterProps) {
```

Ganti dengan:
```ts
export function PaymentFormTotalsFooter({ form, isDirty }: PaymentFormTotalsFooterProps) {
```

### Step 2C — Ganti `<h3>` dengan wrapper flex + badge

Cari:
```tsx
<h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">
  Ringkasan Keuangan & Volume (金额及体积汇总)
</h3>
```

Ganti dengan:
```tsx
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
[ ] Tambah isDirty?: boolean ke interface
[ ] Destructure isDirty di function signature
[ ] Ganti <h3> dengan <div> flex wrapper + badge conditional
[ ] Verify: wc -l file < 100
[ ] Verify: grep "isDirty" → >= 3 baris
```

---

## Phase 3 — Test Baru

**File:** `test/payment-form-totals-footer.test.ts` (file baru)

Buat file baru dengan isi berikut:

```ts
/**
 * test/payment-form-totals-footer.test.ts
 *
 * Unit tests untuk computeFormTotals yang menjadi sumber kebenaran
 * PaymentFormTotalsFooter saat form berstatus DRAFT.
 */

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

test('computeFormTotals: lines kosong menghasilkan semua 0', () => {
  const result = computeFormTotals([]);
  assert.equal(result.totalAmountIDR, 0);
  assert.equal(result.totalTallyVolumeM3, 0);
  assert.equal(result.totalTallyPieces, 0);
  assert.equal(result.totalTimberGrossIDR, 0);
  assert.equal(result.totalTimberPphIDR, 0);
  assert.equal(result.totalTimberNetIDR, 0);
});

test('computeFormTotals: satu baris m3 menghitung agregat dengan benar', () => {
  const result = computeFormTotals([makeLine()]);
  assert.equal(result.totalTallyVolumeM3, 5.0);
  assert.equal(result.totalTallyPieces, 10);
  assert.equal(result.totalTimberGrossIDR, 15_000_000);
  assert.equal(result.totalTimberPphIDR, 37_500);
  assert.equal(result.totalTimberNetIDR, 14_962_500);
  assert.equal(result.totalAmountIDR, 14_962_500);
});

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
[ ] Test 4: unit batang → tidak masuk totalTallyVolumeM3
```

---

## === VERIFICATION GATE ===

Jalankan semua ini setelah Phase 3 selesai:

```bash
# 1. Tests — harus >= 953 pass (949 lama + 4 baru), 0 fail
npm test

# 2. Build bersih
npm run build:check

# 3. Drift
npm run drift:check

# 4. isDirty ada di kedua komponen
grep -n "isDirty" src/components/payment-forms/PaymentFormDetailView.tsx
# Expected: >= 4 baris

grep -n "isDirty" src/components/payment-forms/PaymentFormTotalsFooter.tsx
# Expected: >= 3 baris

# 5. Partial override lama sudah hilang
grep -n "totalAmountIDR: computeFormTotals" src/components/payment-forms/PaymentFormDetailView.tsx
# Expected: 0 hasil

# 6. footerTotals ada
grep -n "footerTotals" src/components/payment-forms/PaymentFormDetailView.tsx
# Expected: >= 2 baris

# 7. LOC check
wc -l src/components/payment-forms/PaymentFormDetailView.tsx
# Expected: < 250

wc -l src/components/payment-forms/PaymentFormTotalsFooter.tsx
# Expected: < 100
```

---

## === COMMIT MESSAGE ===

```
fix(payment-forms): real-time totals footer untuk DRAFT + badge belum disimpan

- PaymentFormDetailView: tambah isDirty state, reset setelah save berhasil
- PaymentFormDetailView: footerTotals dihitung dari computeFormTotals(lines)
  untuk DRAFT (semua 5 field), bukan partial override totalAmountIDR saja
- PaymentFormTotalsFooter: terima isDirty prop, tampilkan badge
  "Preview — Belum Disimpan" saat ada unsaved changes
- test: tambah 4 unit test computeFormTotals di payment-form-totals-footer.test.ts

Closes stale-footer issue untuk manual POST form dengan totals != 0 tapi lines = []
Ref: ADR-0017, spec 2026-10-28-payment-form-realtime-totals-design.md
```

---

## === CATATAN PENTING ===

1. **`setIsDirty(false)` di dalam `try`, BUKAN di `finally`** — kalau di `finally`,
   badge hilang bahkan saat save gagal. Operator tidak tahu data belum tersimpan.

2. **Spread order di `footerTotals`**: `{ ...activeForm, ...footerTotals }` —
   `footerTotals` di kanan agar override `activeForm`. Jangan balik urutannya.

3. **Non-DRAFT tidak pakai `computeFormTotals`** — `footerTotals` untuk ISSUED/PAID/VOID
   baca langsung dari `activeForm` fields, zero overhead.

4. **`isDirty` tidak pernah true untuk non-DRAFT** — `LineItemEditor` tidak dirender
   untuk non-DRAFT, jadi `handleLinesChange` tidak pernah dipanggil.

5. **Test baru di `payment-form-totals-footer.test.ts`** mengetes `computeFormTotals`
   secara unit — bukan komponen React. Tidak butuh jsdom atau testing framework berat.
