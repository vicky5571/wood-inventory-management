# Implementation Plan: Auto-Generated Form Number (KWT-YYYYMM-NNNN)

**ADR:** docs/adr/0016-auto-generated-form-number.md (supersedes ADR-0006)
**Date:** 2026-10-28
**Branch:** vicky
**Test baseline:** 949 passed, 0 failed

---

## Overview

Ubah `preprintedNumber` dari manual-input menjadi auto-generated oleh sistem
saat transisi DRAFT → ISSUED. Format: `KWT-YYYYMM-NNNN`.

Tidak ada perubahan DB schema — kolom `preprinted_number TEXT NOT NULL DEFAULT ''`
sudah ada dan cukup. Hanya logika dan UI yang berubah.

---

## Scope of Change

| Layer | File | Perubahan |
|-------|------|-----------|
| DB queries | `src/persistence/sqlite/payment-form-queries.ts` | Tambah `generateFormNumber()`, ubah `updatePaymentFormStatus()` |
| API route | `app/api/payment-forms/[id]/status/route.ts` | Hapus pembacaan `body.preprintedNumber` |
| UI modal | `src/components/payment-forms/IssueFormModal.tsx` | Hapus input field, tampilkan preview read-only |
| Types | `src/types/index.ts` | Update komentar `preprintedNumber` |
| Tests | `test/api-payment-forms.test.ts` | Update assertions |

Total: 5 file dimodifikasi, ~60 LOC net change.

---

## Phase 1 — `generateFormNumber()` di payment-form-queries.ts

### Apa yang dilakukan
Fungsi baru yang di-call dari dalam `updatePaymentFormStatus()` saat `targetStatus === 'ISSUED'`.

### Implementasi

Tambahkan fungsi berikut ke `src/persistence/sqlite/payment-form-queries.ts`,
sebelum fungsi `updatePaymentFormStatus`:

```ts
/**
 * Generates the next sequential KWT-YYYYMM-NNNN form number.
 * Must be called inside a transaction (BEGIN IMMEDIATE) to prevent duplicates.
 * VOID forms do not free their sequence slot.
 */
function generateFormNumber(db: DatabaseSync, tenantId: string, issueDate: string): string {
  // issueDate is YYYY-MM-DD; extract YYYYMM
  const yyyymm = issueDate.slice(0, 7).replace('-', ''); // "2026-11-03" → "202611"
  const prefix = `KWT-${yyyymm}-`;

  const row = db.prepare(`
    SELECT COALESCE(MAX(CAST(SUBSTR(preprinted_number, ?) AS INTEGER)), 0) + 1 AS next_seq
    FROM payment_forms
    WHERE tenant_id = ?
      AND preprinted_number LIKE ?
      AND status != 'VOID'
  `).get(prefix.length + 1, tenantId, `${prefix}%`) as { next_seq: number };

  const seq = String(row.next_seq).padStart(4, '0');
  return `${prefix}${seq}`;
}
```

### Ubah `updatePaymentFormStatus()` — hapus manual input, tambah auto-generate

Baris yang DIHAPUS (sekitar baris 403–408):
```ts
// HAPUS: pembacaan preprintedNumber dari data param
const prepNum = data?.preprintedNumber !== undefined ? data.preprintedNumber : existing.preprintedNumber;
const issDate = data?.issueDate !== undefined ? data.issueDate : existing.issueDate;
if (targetStatus === 'ISSUED') {
  if (!prepNum.trim()) throw new Error('No. Kwitansi Buku (preprintedNumber) wajib diisi sebelum menerbitkan form');
  if (!issDate.trim()) throw new Error('Tanggal Terbit (issueDate) wajib diisi sebelum menerbitkan form');
}
```

Diganti dengan:
```ts
const issDate = data?.issueDate !== undefined ? data.issueDate : existing.issueDate;
if (targetStatus === 'ISSUED') {
  if (!issDate.trim()) throw new Error('Tanggal Terbit (issueDate) wajib diisi sebelum menerbitkan form');
}

// Auto-generate form number at ISSUED transition (ADR-0016)
const prepNum = (targetStatus === 'ISSUED' && !existing.preprintedNumber.trim())
  ? generateFormNumber(db, tenantId, issDate)
  : existing.preprintedNumber;
```

Penjelasan logika:
- Jika form sudah punya `preprintedNumber` (ISSUED ulang setelah re-open, atau data lama manual),
  tidak di-overwrite.
- Jika form belum punya nomor (normal DRAFT → ISSUED flow), generate baru.

Juga update signature `data?` parameter — hapus `preprintedNumber` dari parameter
yang diterima (tidak ada lagi input dari luar untuk field ini):

```ts
export function updatePaymentFormStatus(
  db: DatabaseSync, id: string, targetStatus: PaymentFormStatus,
  data?: { invoiceNumber?: string; paymentDate?: string; paymentMethod?: string; notes?: string; issueDate?: string },
  //      ↑ preprintedNumber dihapus dari sini
  tenantId: string = 'default-tenant'
): PaymentFormWithLines {
```

### Checklist Phase 1
```
[ ] MODIFY src/persistence/sqlite/payment-form-queries.ts
    — tambah generateFormNumber() sebelum updatePaymentFormStatus
    — ubah updatePaymentFormStatus: hapus preprintedNumber dari data param
    — ubah updatePaymentFormStatus: ganti validasi manual → auto-generate logic
```

---

## Phase 2 — API Route: hapus pembacaan body.preprintedNumber

### File: `app/api/payment-forms/[id]/status/route.ts`

Baris ~47 yang DIHAPUS:
```ts
preprintedNumber: body.preprintedNumber,
```

Setelah dihapus, `updateStatus` call tidak lagi meneruskan `preprintedNumber`:
```ts
const updated = await paymentFormStore.updateStatus(id, targetStatus, {
  invoiceNumber,
  paymentDate,
  paymentMethod,
  notes,
  // preprintedNumber: body.preprintedNumber,  ← DIHAPUS
  issueDate: body.issueDate,
});
```

### Checklist Phase 2
```
[ ] MODIFY app/api/payment-forms/[id]/status/route.ts
    — hapus baris `preprintedNumber: body.preprintedNumber`
```

---

## Phase 3 — UI: IssueFormModal.tsx

### Perubahan
Hapus input field `preprintedNumber`. Ganti dengan info text bahwa nomor akan
di-generate otomatis saat diterbitkan.

Tampilkan nomor yang sudah ada (jika re-opening form yang sudah issued) sebagai
read-only badge.

### State yang DIHAPUS
```ts
// HAPUS:
const [preprintedNumber, setPreprintedNumber] = useState(form.preprintedNumber || '');
```

### JSX yang DIHAPUS (sekitar baris 85–102)
```tsx
{/* HAPUS seluruh block ini: */}
<div>
  <label className="block text-xs font-semibold text-gray-800 mb-1">
    No. Kwitansi Buku Fisik (收据编号) <span className="text-rose-500">*</span>
  </label>
  <input
    type="text"
    value={preprintedNumber}
    onChange={(e) => { ... }}
    placeholder="Contoh: 018532"
    className="..."
  />
  <span className="text-[10px] text-gray-400 mt-1 block">
    Nomor seri tercetak di pojok kanan atas lembar kwitansi karbon
  </span>
</div>
```

### JSX yang DITAMBAHKAN (ganti block di atas)
```tsx
<div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
  <span className="text-xs text-gray-500 shrink-0">No. Kwitansi</span>
  <span className="text-xs font-mono font-bold text-gray-400 italic">
    {form.preprintedNumber && form.preprintedNumber.trim()
      ? form.preprintedNumber          // form sudah pernah issued — tampilkan nomor
      : 'Akan di-generate otomatis'}   // form baru — belum ada nomor
  </span>
</div>
```

### onConfirm call yang DIUBAH (baris 44–46)
```ts
// SEBELUM:
await onConfirm(form.id, {
  preprintedNumber: preprintedNumber.trim(),
  issueDate: issueDate.trim(),
});

// SESUDAH:
await onConfirm(form.id, {
  issueDate: issueDate.trim(),
  // preprintedNumber tidak dikirim — server yang generate
});
```

### Update interface prop
```ts
// SEBELUM:
onConfirm: (formId: string, data?: { preprintedNumber: string; issueDate: string }) => Promise<unknown>;

// SESUDAH:
onConfirm: (formId: string, data?: { issueDate: string }) => Promise<unknown>;
```

### Checklist Phase 3
```
[ ] MODIFY src/components/payment-forms/IssueFormModal.tsx
    — hapus state preprintedNumber
    — hapus validasi if (!preprintedNumber.trim())
    — hapus input field JSX, ganti dengan read-only display
    — ubah onConfirm call: hapus preprintedNumber dari payload
    — ubah onConfirm interface: hapus preprintedNumber dari data type
```

---

## Phase 4 — Types: update komentar

### File: `src/types/index.ts` — baris 1207

```ts
// SEBELUM:
preprintedNumber: string;           // User-input from physical carbon book (e.g. "018532")

// SESUDAH:
preprintedNumber: string;           // Auto-generated at ISSUED: "KWT-YYYYMM-NNNN" (ADR-0016). Empty string while DRAFT.
```

### Checklist Phase 4
```
[ ] MODIFY src/types/index.ts
    — update komentar preprintedNumber di PaymentForm interface
```

---

## Phase 5 — Tests: update test suite

### File: `test/api-payment-forms.test.ts`

Cari dan update test cases yang menggunakan `preprintedNumber` sebagai input:

**Test yang DIUBAH (sekitar baris 112, 133, 150, 157–167):**

```ts
// SEBELUM — test kirim preprintedNumber manual:
preprintedNumber: '018999',  // PUT body
assert.equal(putJson.data.preprintedNumber, '018999');

preprintedNumber: '018532',  // PATCH body untuk ISSUED
assert.equal(issueJson.data.preprintedNumber, '018532');

// SESUDAH — test verifikasi format auto-generated:
// PUT body: tidak ada preprintedNumber
// (tidak ada assertion karena DRAFT tidak punya nomor)

// PATCH body untuk ISSUED: tidak kirim preprintedNumber
// Assert format KWT-YYYYMM-NNNN:
assert.match(issueJson.data.preprintedNumber, /^KWT-\d{6}-\d{4}$/);
assert.notEqual(issueJson.data.preprintedNumber, '');
```

**Test yang DITAMBAHKAN — sequence increments:**
```ts
// Dua form issued di bulan yang sama → nomor sequential
// form1.preprintedNumber = "KWT-202611-0001"
// form2.preprintedNumber = "KWT-202611-0002"
assert.match(form1Json.data.preprintedNumber, /^KWT-\d{6}-0001$/);
assert.match(form2Json.data.preprintedNumber, /^KWT-\d{6}-0002$/);
```

**Test yang DITAMBAHKAN — ISSUED fails without issueDate:**
```ts
// ISSUED tanpa issueDate masih harus 400
// (validasi issueDate tetap ada, hanya preprintedNumber yang dihapus)
const res = await PATCH('/api/payment-forms/{id}/status', { status: 'ISSUED' });
assert.equal(res.status, 400);
assert.match(await res.json().error, /Tanggal Terbit/);
```

**Test yang DIHAPUS:**
```ts
// HAPUS: test yang verifikasi ISSUED gagal tanpa preprintedNumber
// (behavior ini tidak berlaku lagi)
```

### Checklist Phase 5
```
[ ] MODIFY test/api-payment-forms.test.ts
    — hapus PUT test kirim preprintedNumber manual
    — hapus ISSUED test kirim preprintedNumber manual
    — ubah assertions: verifikasi format /^KWT-\d{6}-\d{4}$/
    — tambah sequence increment test
    — hapus test "ISSUED fails without preprintedNumber"
    — pertahankan test "ISSUED fails without issueDate"
```

---

## Phase 6 — Verification Gate

```bash
# 1. Drift check
npm run drift:check
# Expected: 0 violations

# 2. Full test suite
npm test
# Expected: >= 949 pass, 0 fail

# 3. Build check
npm run build:check
# Expected: 0 errors

# 4. Grep: tidak ada input preprintedNumber di IssueFormModal
grep -n "preprintedNumber" src/components/payment-forms/IssueFormModal.tsx
# Expected: 0 hasil (field input sudah dihapus)
# Atau hanya satu baris read-only display yang pakai form.preprintedNumber

# 5. Grep: generateFormNumber ada di queries
grep -n "generateFormNumber" src/persistence/sqlite/payment-form-queries.ts
# Expected: >= 2 hasil (definisi + call)

# 6. Grep: format KWT ada di test assertions
grep -n "KWT-" test/api-payment-forms.test.ts
# Expected: >= 1 hasil

# 7. Grep: tidak ada lagi "wajib diisi" error untuk preprintedNumber
grep -n "preprintedNumber.*wajib" src/persistence/sqlite/payment-form-queries.ts
# Expected: 0 hasil
```

---

## Urutan Eksekusi

```
Phase 1 (queries) → Phase 2 (API) → Phase 3 (UI) → Phase 4 (types) → Phase 5 (tests) → Phase 6 (verify)
```

Phase 1 harus selesai sebelum Phase 2 karena API route memanggil `paymentFormStore.updateStatus`
yang signature-nya berubah.

Phase 3 (UI) dan Phase 4 (types) bisa paralel setelah Phase 2 selesai.

Phase 5 (tests) harus setelah semua implementasi selesai.

---

## Commit Message

```
feat(payment-forms): auto-generate KWT-YYYYMM-NNNN form number at ISSUED

- Remove manual preprintedNumber input from IssueFormModal
- Add generateFormNumber() in payment-form-queries.ts
- Format: KWT-{YYYYMM}-{NNNN}, sequence per tenant per month
- VOID forms do not free their sequence slot
- Update API route: stop reading body.preprintedNumber
- Update tests: assert /^KWT-\d{6}-\d{4}$/ format

Supersedes ADR-0006. Implements ADR-0016.
Refs: docs/superpowers/plans/2026-10-28-auto-form-number.md
```

---

## Risk

| Risk | Deteksi | Mitigasi |
|------|---------|---------|
| Race condition dua form issued bersamaan (same month, same tenant) | Sequence gap atau duplicate nomor | SQLite single-writer architecture eliminates this — satu writer satu waktu. Untuk Supabase cloud mode: wrap dalam function/RPC jika diperlukan. |
| Data lama dengan manual `preprintedNumber` (e.g. `'018532'`) | Field tetap terbaca sebagai-is | Logic: hanya generate jika `!existing.preprintedNumber.trim()`. Form lama yang sudah ISSUED tidak terpengaruh. |
| `issueDate` kosong menyebabkan YYYYMM extraction salah | `generateFormNumber` menghasilkan `KWT--NNNN` | Validasi `issueDate` wajib ada sebelum generate — error dilempar lebih awal. |
| Test yang bergantung `preprintedNumber: '018532'` jadi merah | `npm test` gagal | Semua test tersebut di-update di Phase 5 sebelum push. |
