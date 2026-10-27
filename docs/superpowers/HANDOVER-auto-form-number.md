# HANDOVER — Auto-Generated Form Number (KWT-YYYYMM-NNNN)

**Dibuat:** 2026-10-28
**Branch:** vicky
**Baseline:** 949 passed, 0 failed · 25/25 routes · 0 drift violations
**ADR:** docs/adr/0016-auto-generated-form-number.md (supersedes ADR-0006)

---

## === MANDATORY SESSION START ===

Baca dalam urutan ini sebelum menyentuh kode apapun:

1. `AGENTS.md` — mandatory protocol, 250 LOC cap, SSOT rules, commit convention
2. `docs/SESSION_STATE.md` — verify baseline: 949 pass, 0 fail, 0 drift
3. `docs/adr/0006-preprinted-form-number-manual-input.md` — ADR lama yang disupersede
4. `docs/adr/0016-auto-generated-form-number.md` — ADR baru, baca semua
5. `docs/superpowers/plans/2026-10-28-auto-form-number.md` — implementation plan lengkap
6. `src/persistence/sqlite/payment-form-queries.ts` — file utama yang dimodifikasi
7. `app/api/payment-forms/[id]/status/route.ts` — API route yang dimodifikasi
8. `src/components/payment-forms/IssueFormModal.tsx` — UI modal yang dimodifikasi
9. `test/api-payment-forms.test.ts` — test file yang diupdate

Verifikasi sebelum mulai:
```bash
npm run drift:check   # harus 0 violations
npm test              # harus 949 pass, 0 fail
npm run build:check   # harus 0 errors
```

---

## === KONTEKS SINGKAT ===

### Yang berubah (keputusan bisnis)
- Sebelumnya: operator mengetik nomor dari buku kwitansi karbon fisik (e.g. `018532`)
- Sekarang: sistem auto-generate nomor format `KWT-YYYYMM-NNNN` (e.g. `KWT-202611-0001`)
- Buku fisik tidak lagi digunakan — sistem adalah satu-satunya sumber kebenaran

### Yang TIDAK berubah
- Kolom DB `preprinted_number TEXT NOT NULL DEFAULT ''` — tidak ada schema change
- `preprintedNumber: string` di TypeScript type — tetap ada, hanya isi yang berubah
- Behavior DRAFT: tetap kosong `''` sampai ISSUED
- Behavior VOID: nomor tidak dibebaskan kembali (permanen untuk audit trail)
- Data lama dengan nomor manual (e.g. `'018532'`) — tidak diubah, tetap terbaca

---

## === TASK ===

Implementasi 5 phase sesuai plan. Setiap phase kecil — total ~60 LOC net change.

### Phase 1 — payment-form-queries.ts ← MULAI DI SINI

**File:** `src/persistence/sqlite/payment-form-queries.ts`

**Dua perubahan:**

**A. Tambah fungsi `generateFormNumber()`** sebelum `updatePaymentFormStatus` (sekitar baris 389):

```ts
function generateFormNumber(db: DatabaseSync, tenantId: string, issueDate: string): string {
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

**B. Ubah `updatePaymentFormStatus()`** (sekitar baris 391–435):

Hapus dari signature `data?`:
```ts
// HAPUS dari data? parameter:
preprintedNumber?: string;
```

Ganti blok validasi (baris 403–408):
```ts
// HAPUS:
const prepNum = data?.preprintedNumber !== undefined ? data.preprintedNumber : existing.preprintedNumber;
const issDate = data?.issueDate !== undefined ? data.issueDate : existing.issueDate;
if (targetStatus === 'ISSUED') {
  if (!prepNum.trim()) throw new Error('No. Kwitansi Buku (preprintedNumber) wajib diisi sebelum menerbitkan form');
  if (!issDate.trim()) throw new Error('Tanggal Terbit (issueDate) wajib diisi sebelum menerbitkan form');
}

// GANTI DENGAN:
const issDate = data?.issueDate !== undefined ? data.issueDate : existing.issueDate;
if (targetStatus === 'ISSUED') {
  if (!issDate.trim()) throw new Error('Tanggal Terbit (issueDate) wajib diisi sebelum menerbitkan form');
}
const prepNum = (targetStatus === 'ISSUED' && !existing.preprintedNumber.trim())
  ? generateFormNumber(db, tenantId, issDate)
  : existing.preprintedNumber;
```

Run test setelah Phase 1: `npm test` — beberapa test akan merah (expected, akan fix di Phase 5).

---

### Phase 2 — app/api/payment-forms/[id]/status/route.ts

Cari baris `preprintedNumber: body.preprintedNumber` (sekitar baris 47) dan hapus.

```ts
// HAPUS baris ini:
preprintedNumber: body.preprintedNumber,
```

---

### Phase 3 — src/components/payment-forms/IssueFormModal.tsx

**A. Hapus state:**
```ts
// HAPUS:
const [preprintedNumber, setPreprintedNumber] = useState(form.preprintedNumber || '');
```

**B. Hapus validasi client-side:**
```ts
// HAPUS:
if (!preprintedNumber.trim()) {
  setValidationError('Nomor Kwitansi Buku fisik wajib diisi (e.g. 018532)');
  return;
}
```

**C. Hapus input JSX, tambah read-only display:**

Hapus seluruh `<div>` yang berisi input `preprintedNumber` (label "No. Kwitansi Buku Fisik",
input type="text", helper span). Ganti dengan:

```tsx
<div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
  <span className="text-xs text-gray-500 shrink-0">No. Kwitansi</span>
  <span className="text-xs font-mono font-bold text-gray-400 italic">
    {form.preprintedNumber?.trim()
      ? form.preprintedNumber
      : 'Akan di-generate otomatis'}
  </span>
</div>
```

**D. Ubah onConfirm call** — hapus `preprintedNumber` dari payload:
```ts
// SEBELUM:
await onConfirm(form.id, { preprintedNumber: preprintedNumber.trim(), issueDate: issueDate.trim() });

// SESUDAH:
await onConfirm(form.id, { issueDate: issueDate.trim() });
```

**E. Ubah interface prop:**
```ts
// SEBELUM:
onConfirm: (formId: string, data?: { preprintedNumber: string; issueDate: string }) => Promise<unknown>;

// SESUDAH:
onConfirm: (formId: string, data?: { issueDate: string }) => Promise<unknown>;
```

---

### Phase 4 — src/types/index.ts

Hanya update komentar di baris 1207:
```ts
// SEBELUM:
preprintedNumber: string;           // User-input from physical carbon book (e.g. "018532")

// SESUDAH:
preprintedNumber: string;           // Auto-generated at ISSUED: "KWT-YYYYMM-NNNN" (ADR-0016). Empty string while DRAFT.
```

---

### Phase 5 — test/api-payment-forms.test.ts

Cari semua baris dengan `preprintedNumber: '018999'` dan `preprintedNumber: '018532'`.

**Ubah assertion PUT test:**
```ts
// HAPUS: preprintedNumber: '018999' dari PUT body
// HAPUS: assert.equal(putJson.data.preprintedNumber, '018999')
// (DRAFT tidak punya nomor — tidak perlu di-assert)
```

**Ubah assertion ISSUED test:**
```ts
// HAPUS: preprintedNumber: '018532' dari PATCH body
// HAPUS: assert.equal(issueJson.data.preprintedNumber, '018532')

// TAMBAH assertion format auto-generated:
assert.match(issueJson.data.preprintedNumber, /^KWT-\d{6}-\d{4}$/);
assert.notEqual(issueJson.data.preprintedNumber.trim(), '');
```

**Hapus test "ISSUED gagal tanpa preprintedNumber"** jika ada.

**Pertahankan test "ISSUED gagal tanpa issueDate"** — validasi ini masih berlaku.

**Tambah test sequence increment** (opsional tapi direkomendasikan):
```ts
// Jika test suite punya dua form yang di-ISSUED di bulan sama,
// verifikasi nomor sequential:
// form1: KWT-YYYYMM-0001
// form2: KWT-YYYYMM-0002
```

---

## === VERIFICATION GATE ===

Setelah semua 5 phase selesai:

```bash
# 1. Drift
npm run drift:check
# Expected: 0 violations

# 2. Tests
npm test
# Expected: >= 949 pass, 0 fail

# 3. Build
npm run build:check
# Expected: 0 errors

# 4. Grep checks
grep -n "preprintedNumber" src/components/payment-forms/IssueFormModal.tsx
# Expected: hanya read-only display (tidak ada input, tidak ada state setter)

grep -n "generateFormNumber" src/persistence/sqlite/payment-form-queries.ts
# Expected: >= 2 baris (definisi fungsi + call di updatePaymentFormStatus)

grep -n "KWT-" test/api-payment-forms.test.ts
# Expected: >= 1 baris (assertion format)

grep -n "preprintedNumber.*wajib" src/persistence/sqlite/payment-form-queries.ts
# Expected: 0 hasil
```

---

## === COMMIT MESSAGE ===

```
feat(payment-forms): auto-generate KWT-YYYYMM-NNNN form number at ISSUED

- Remove manual preprintedNumber input from IssueFormModal
- Add generateFormNumber() in payment-form-queries.ts
- Format: KWT-{YYYYMM}-{NNNN}, sequence per tenant per month
- VOID forms do not free their sequence slot
- Update API route: stop reading body.preprintedNumber
- Update tests: assert /^KWT-\d{6}-\d{4}$/ format

Supersedes ADR-0006. Implements ADR-0016.
```

---

## === NOTES PENTING ===

1. **Tidak ada schema migration** — kolom DB tidak berubah, tidak ada ALTER TABLE.

2. **Data lama aman** — logic `!existing.preprintedNumber.trim()` memastikan
   form lama dengan nomor manual (e.g. `'018532'`) tidak di-overwrite.

3. **SQLite single-writer** — tidak ada race condition di SQLite mode.
   Untuk Supabase mode: `generateFormNumber` belum di-port ke Supabase store —
   jika Supabase support dibutuhkan, perlu buat SQL function/RPC terpisah.

4. **SUBSTR index** — `SUBSTR(preprinted_number, prefix.length + 1)` mengekstrak
   angka di belakang prefix. `prefix.length + 1` karena SUBSTR SQLite 1-indexed.
   Contoh: `KWT-202611-` panjang 11 karakter → `SUBSTR(..., 12)` ambil `0001`.
