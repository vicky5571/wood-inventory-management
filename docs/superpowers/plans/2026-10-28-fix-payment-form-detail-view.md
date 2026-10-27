# Implementation Plan: Fix Payment Form Detail View "Tidak Tersedia"

**Date:** 2026-10-28
**Branch:** vicky
**Baseline:** 949 passed, 0 failed
**Bug:** Klik icon view di payment form → "Form yang Anda cari tidak tersedia"

---

## Diagnosis

Ada 3 bug terpisah, semua di hook dan detail view.

### Bug 1 — Race condition (PENYEBAB UTAMA)

`usePaymentForms()` selalu memanggil `refreshForms()` saat mount (baris 61–63):

```ts
useEffect(() => {
  refreshForms();   // ← jalan di SETIAP mount, termasuk detail page
}, [refreshForms]);
```

Di detail page, dua hal terjadi bersamaan:
1. `refreshForms()` → `isLoading=true` → fetch `/api/payment-forms` → `isLoading=false`
2. `loadFormById(id)` → `isLoading=true` → fetch `/api/payment-forms/${id}` → `activeForm=data` → `isLoading=false`

Keduanya share `isLoading` yang sama. Jika `refreshForms` selesai duluan:
- `isLoading = false`
- `activeForm` masih `null` (loadFormById belum selesai)
- Guard `if (isLoading && !activeForm)` → `false` (spinner hilang)
- Guard `if (error || !activeForm)` → `true` (error screen muncul)
- User melihat "tidak tersedia" — padahal data sedang loading

### Bug 2 — Silent null tanpa setError

`loadFormById` baris 72–76:
```ts
if (json.success && json.data) {
  setActiveForm(json.data);
  return json.data;
}
return null;  // ← tidak ada setError, activeForm tetap null, error tetap null
```

Jika API sukses tapi `json.data` adalah falsy: `isLoading=false`, `error=null`,
`activeForm=null` → error screen muncul tanpa pesan yang jelas.

### Bug 3 — isLoading shared antara list load dan detail load

`isLoading` adalah satu state untuk semua operasi. `refreshForms` dan
`loadFormById` bisa flip `isLoading=false` satu sama lain sebelum waktunya.

---

## Solusi

**3 perubahan minimal di 2 file. Tidak ada API change, tidak ada schema change.**

### Perubahan 1 — usePaymentForms: tambah opsi `skipListLoad`
### Perubahan 2 — usePaymentForms: tambah setError ke silent-null branch  
### Perubahan 3 — PaymentFormDetailView: pakai `skipListLoad` + local loading state

---

## Scope

| File | Perubahan | LOC estimate |
|------|-----------|-------------|
| `src/hooks/usePaymentForms.ts` | 2 perubahan kecil | ~5 LOC |
| `src/components/payment-forms/PaymentFormDetailView.tsx` | 3 perubahan | ~8 LOC |

**Total: ~13 LOC net. Tidak ada file lain yang tersentuh.**

---

## Phase 1 — usePaymentForms.ts

### Perubahan A: Tambah parameter `opts` ke fungsi

**Baris 21** — ubah signature:
```ts
// SEBELUM:
export function usePaymentForms(initialFilter?: PaymentFormFilterCriteria) {

// SESUDAH:
export function usePaymentForms(
  initialFilter?: PaymentFormFilterCriteria,
  opts?: { skipListLoad?: boolean }
) {
```

### Perubahan B: Guard `refreshForms` dengan `skipListLoad`

**Baris 61–63** — ubah useEffect:
```ts
// SEBELUM:
useEffect(() => {
  refreshForms();
}, [refreshForms]);

// SESUDAH:
useEffect(() => {
  if (!opts?.skipListLoad) {
    refreshForms();
  }
}, [refreshForms, opts?.skipListLoad]);
```

### Perubahan C: Tambah setError ke silent-null branch di loadFormById

**Baris 72–76** — ubah branch:
```ts
// SEBELUM:
if (json.success && json.data) {
  setActiveForm(json.data);
  return json.data;
}
return null;

// SESUDAH:
if (json.success && json.data) {
  setActiveForm(json.data);
  return json.data;
}
setError('Form tidak dapat dimuat.');
return null;
```

### Checklist Phase 1
```
[ ] MODIFY src/hooks/usePaymentForms.ts baris 21  — tambah opts parameter
[ ] MODIFY src/hooks/usePaymentForms.ts baris 61  — guard refreshForms dengan skipListLoad
[ ] MODIFY src/hooks/usePaymentForms.ts baris 76  — tambah setError ke silent-null branch
```

---

## Phase 2 — PaymentFormDetailView.tsx

### Perubahan A: Pakai skipListLoad + pisahkan isLoading

**Baris 31** — ubah hook call:
```ts
// SEBELUM:
const { activeForm, loadFormById, updateForm, updateStatus, voidForm, isLoading, error } = usePaymentForms();

// SESUDAH:
const { activeForm, loadFormById, updateForm, updateStatus, voidForm, error } = usePaymentForms(
  undefined,
  { skipListLoad: true }
);
```

### Perubahan B: Tambah local loading state

**Setelah baris 31** (setelah destructure hook), tambahkan:
```ts
const [localLoading, setLocalLoading] = useState(true);
```

`useState` sudah diimport di baris 10 — tidak perlu import baru.

### Perubahan C: Ubah useEffect loadFormById untuk set localLoading

**Baris 45–49** — ubah useEffect:
```ts
// SEBELUM:
useEffect(() => {
  if (formId) {
    loadFormById(formId);
  }
}, [formId, loadFormById]);

// SESUDAH:
useEffect(() => {
  if (formId) {
    setLocalLoading(true);
    loadFormById(formId).finally(() => setLocalLoading(false));
  }
}, [formId, loadFormById]);
```

### Perubahan D: Ubah guard loading dari isLoading ke localLoading

**Baris 90** — ubah guard:
```ts
// SEBELUM:
if (isLoading && !activeForm) {

// SESUDAH:
if (localLoading) {
```

Penjelasan: `localLoading` dimulai dari `true` dan hanya di-set `false` setelah
`loadFormById` selesai (baik berhasil maupun gagal). Tidak akan terinterupsi oleh
`refreshForms` karena detail page tidak lagi memanggil `refreshForms`.

### Checklist Phase 2
```
[ ] MODIFY src/components/payment-forms/PaymentFormDetailView.tsx baris 31
    — tambah opts { skipListLoad: true } ke usePaymentForms()
    — hapus isLoading dari destructure
[ ] MODIFY PaymentFormDetailView.tsx setelah baris 31
    — tambah: const [localLoading, setLocalLoading] = useState(true);
[ ] MODIFY PaymentFormDetailView.tsx baris 45-49
    — loadFormById(formId).finally(() => setLocalLoading(false))
[ ] MODIFY PaymentFormDetailView.tsx baris 90
    — ganti: if (isLoading && !activeForm)  →  if (localLoading)
```

---

## Phase 3 — Verification

```bash
# 1. Tests harus tetap hijau
npm test
# Expected: >= 949 pass, 0 fail

# 2. Build harus bersih
npm run build:check
# Expected: 0 errors

# 3. Drift
npm run drift:check
# Expected: 0 violations

# 4. Grep: skipListLoad ada di kedua file
grep -n "skipListLoad" src/hooks/usePaymentForms.ts
# Expected: 2 baris (di signature dan di useEffect)

grep -n "skipListLoad" src/components/payment-forms/PaymentFormDetailView.tsx
# Expected: 1 baris (di usePaymentForms call)

# 5. Grep: localLoading ada di detail view
grep -n "localLoading" src/components/payment-forms/PaymentFormDetailView.tsx
# Expected: >= 3 baris (useState, setLocalLoading, if guard)

# 6. Grep: isLoading tidak lagi dipakai di detail view sebagai guard
grep -n "isLoading" src/components/payment-forms/PaymentFormDetailView.tsx
# Expected: 0 hasil (tidak ada lagi pakai isLoading dari hook)
```

---

## Urutan Eksekusi

```
Phase 1 (hook) → Phase 2 (detail view) → Phase 3 (verify)
```

Phase 1 harus selesai sebelum Phase 2 karena detail view menggunakan `opts`
parameter yang baru ditambahkan.

---

## Commit Message

```
fix(payment-forms): resolve detail view race condition showing "tidak tersedia"

- Add opts.skipListLoad to usePaymentForms to prevent refreshForms()
  racing with loadFormById() on detail page mount
- Add local loading state in PaymentFormDetailView so spinner stays
  visible until loadFormById() specifically completes
- Add setError() to silent-null branch in loadFormById for clearer
  error messaging when API returns empty data

Fixes: "Form yang Anda cari tidak tersedia" on view click
```

---

## Risk

| Risk | Deteksi | Mitigasi |
|------|---------|---------|
| `opts` parameter baru bisa break list page jika dipass undefined | `PaymentFormListView` tidak pass `opts` → default `undefined` → `!opts?.skipListLoad` = `true` → `refreshForms` tetap jalan. List page tidak terpengaruh. | Optional chaining `opts?.skipListLoad` aman untuk undefined. |
| `localLoading` dimulai `true` — jika `formId` tidak ada, spinner infinite | Guard `if (formId)` di useEffect — jika tidak ada formId, `setLocalLoading(false)` tidak pernah dipanggil | Tambah else: `else { setLocalLoading(false); }` jika perlu. Tapi `formId` selalu ada di `/payment-forms/[id]/page.tsx`. |
| `loadFormById.finally()` — jika loadFormById tidak return Promise | `loadFormById` sudah dideklarasikan `async` di baris 65 — selalu return Promise. `.finally()` aman. | Tidak ada risk. |
