# HANDOVER — Hapus Halaman Pending Harga

**Dibuat:** 2026-10-28
**Branch:** vicky
**Baseline:** 968 pass, 0 fail · 0 drift · build clean
**ADR:** docs/adr/0020-remove-pending-pricing-page.md
**Spec:** docs/superpowers/specs/2026-10-28-remove-pending-pricing-design.md
**Plan:** docs/superpowers/plans/2026-10-28-remove-pending-pricing.md

---

## === MANDATORY SESSION START ===

```bash
npm run drift:check   # harus 0 violations
npm test              # harus 968 pass, 0 fail
npm run build:check   # harus 0 errors
```

Jika berbeda → stop, investigasi dulu.

---

## === KONTEKS SINGKAT ===

### Mengapa dihapus
Halaman `/pending-pricing` dibuat untuk mengisi harga kayu secara manual setelah
fakta. Sejak tabel harga (`/prices`) ada dan auto-fill aktif saat input penerimaan
(ADR-0018 + ADR-0019), halaman ini menjadi redundan. Operator bisa edit harga
langsung dari Buku Besar via RecordModal.

### Yang dihapus (7 file)
```
app/pending-pricing/page.tsx
src/components/pricing/PendingPricingView.tsx
src/components/pricing/PendingPricingTable.tsx
src/components/pricing/PendingPricingToolbar.tsx
src/components/pricing/PendingPricingKpiStrip.tsx
src/components/pricing/PendingPricingEmptyState.tsx
src/components/dashboard/KpiCardPendingPricing.tsx
```

### Yang diedit (5 file)
```
src/components/layout/nav-config.ts       — hapus 1 baris nav item
src/components/dashboard/KpiCards.tsx     — hapus 2 baris JSX + 1 import + update grid
test/pending-pricing-components.test.ts   — HAPUS SELURUH FILE
test/nav-config.test.ts                   — update 2 array assertions
test/nav-routing.test.ts                  — update 2 array assertions
test/navbar.test.ts                       — update 1 array + hapus 4 baris assertion
```

### Yang TIDAK berubah
- `src/types/index.ts` — field `pendingPricingCount` di `DashboardMetrics` tetap ada
- `src/utils/timber-calc.ts` — kalkulasi tetap jalan
- `src/utils/payment-form-grouping.ts` — `PENDING_PRICE` skip reason tetap valid
- `app/api/records/[id]/price/route.ts` — endpoint tetap ada (RecordModal masih pakai)

---

## === PHASE 1 — Hapus 7 File ===

Jalankan di terminal dari root project:

```bash
rm src/components/pricing/PendingPricingView.tsx
rm src/components/pricing/PendingPricingTable.tsx
rm src/components/pricing/PendingPricingToolbar.tsx
rm src/components/pricing/PendingPricingKpiStrip.tsx
rm src/components/pricing/PendingPricingEmptyState.tsx
rm src/components/dashboard/KpiCardPendingPricing.tsx
rm app/pending-pricing/page.tsx
rmdir app/pending-pricing
```

Verifikasi:
```bash
ls src/components/pricing/
# Expected: direktori kosong (atau bisa dihapus juga dengan rmdir)

ls app/pending-pricing 2>/dev/null || echo "OK — direktori sudah tidak ada"
```

### Checklist Phase 1
```
[ ] 5 file PendingPricing*.tsx di src/components/pricing/ dihapus
[ ] KpiCardPendingPricing.tsx dihapus
[ ] app/pending-pricing/page.tsx dihapus
[ ] Direktori app/pending-pricing/ dihapus
```

---

## === PHASE 2 — Edit nav-config.ts ===

**File:** `src/components/layout/nav-config.ts`

Hapus 1 baris ini (dalam section `stock-billing`):
```ts
      { id: 'pending-pricing', labelId: 'Pending Harga', labelZh: '待定价', href: '/pending-pricing' },
```

Sebelum:
```ts
      { id: 'inventory', labelId: 'Inventaris', labelZh: '库存', href: '/inventory' },
      { id: 'prices', labelId: 'Tabel Harga', labelZh: '价格表', href: '/prices' },
      { id: 'pending-pricing', labelId: 'Pending Harga', labelZh: '待定价', href: '/pending-pricing' },
      { id: 'report-periods', labelId: 'Periode Laporan', labelZh: '结账周期', href: '/report-periods' },
      { id: 'payment-forms', labelId: 'Form Pembayaran', labelZh: '付款单', href: '/payment-forms' },
```

Sesudah:
```ts
      { id: 'inventory', labelId: 'Inventaris', labelZh: '库存', href: '/inventory' },
      { id: 'prices', labelId: 'Tabel Harga', labelZh: '价格表', href: '/prices' },
      { id: 'report-periods', labelId: 'Periode Laporan', labelZh: '结账周期', href: '/report-periods' },
      { id: 'payment-forms', labelId: 'Form Pembayaran', labelZh: '付款单', href: '/payment-forms' },
```

### Checklist Phase 2
```
[ ] Baris pending-pricing dihapus dari nav-config.ts
[ ] grep "pending-pricing" src/components/layout/nav-config.ts → 0 hasil
```

---

## === PHASE 3 — Edit KpiCards.tsx ===

**File:** `src/components/dashboard/KpiCards.tsx`

### Step 3A — Hapus import (baris 4)

Hapus baris:
```ts
import { KpiCardPendingPricing } from './KpiCardPendingPricing';
```

### Step 3B — Hapus card ke-6 (dekat akhir file)

Cari:
```tsx
      {/* 6. Pending Pricing Card */}
      <KpiCardPendingPricing metrics={metrics} />
    </div>
```

Ganti dengan:
```tsx
    </div>
```

### Step 3C — Update grid dari 6 → 5 kolom

Cari:
```tsx
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
```

Ganti dengan:
```tsx
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
```

### Checklist Phase 3
```
[ ] Import KpiCardPendingPricing dihapus
[ ] JSX comment + <KpiCardPendingPricing /> dihapus
[ ] xl:grid-cols-6 → xl:grid-cols-5
[ ] npm run build:check → 0 errors ← jalankan setelah step ini
```

---

## === PHASE 4 — Update 3 Test File ===

### 4A — `test/nav-config.test.ts`

**Perubahan 1** — array items section `stock-billing`:

Cari:
```ts
      ['inventory', 'prices', 'pending-pricing', 'report-periods', 'payment-forms']
```

Ganti dengan:
```ts
      ['inventory', 'prices', 'report-periods', 'payment-forms']
```

**Perubahan 2** — array flat semua NAV_ITEMS IDs:

Cari:
```ts
      'inventory',
      'prices',
      'pending-pricing',
      'report-periods',
```

Ganti dengan:
```ts
      'inventory',
      'prices',
      'report-periods',
```

### 4B — `test/nav-routing.test.ts`

**Perubahan 1** — array hrefs:

Cari:
```ts
      '/inventory',
      '/prices',
      '/pending-pricing',
      '/report-periods',
```

Ganti dengan:
```ts
      '/inventory',
      '/prices',
      '/report-periods',
```

**Perubahan 2** — array IDs:

Cari:
```ts
      'inventory',
      'prices',
      'pending-pricing',
      'report-periods',
```

Ganti dengan:
```ts
      'inventory',
      'prices',
      'report-periods',
```

### 4C — `test/navbar.test.ts`

**Perubahan 1** — array IDs dalam test semua items:

Cari:
```ts
      'inventory',
      'prices',
      'pending-pricing',
      'report-periods',
```

Ganti dengan:
```ts
      'inventory',
      'prices',
      'report-periods',
```

**Perubahan 2** — hapus blok 4 baris assertion item spesifik:

Cari (4 baris berturutan):
```ts
    const pendingPricing = NAV_ITEMS.find((item) => item.id === 'pending-pricing')!;
    assert.equal(pendingPricing.href, '/pending-pricing');
    assert.equal(pendingPricing.labelId, 'Pending Harga');
    assert.equal(pendingPricing.labelZh, '待定价');
```

Hapus keempat baris ini seluruhnya.

### Checklist Phase 4
```
[ ] nav-config.test.ts — 'pending-pricing' dihapus dari 2 array
[ ] nav-routing.test.ts — '/pending-pricing' dan 'pending-pricing' dihapus dari 2 array
[ ] navbar.test.ts — 'pending-pricing' dihapus dari 1 array + 4 baris assertion dihapus
[ ] grep "pending-pricing" test/nav-config.test.ts test/nav-routing.test.ts test/navbar.test.ts → 0 hasil
```

---

## === PHASE 5 — Hapus Test File Pending Pricing ===

```bash
rm test/pending-pricing-components.test.ts
```

File ini berisi test yang mengecek eksistensi file-file yang sudah dihapus di
Phase 1. Jika dibiarkan, `npm test` akan fail.

### Checklist Phase 5
```
[ ] rm test/pending-pricing-components.test.ts
[ ] ls test/pending-pricing* → no such file
```

---

## === VERIFICATION GATE ===

```bash
# 1. Tests — 0 fail (angka pass turun ~10-15 dari 968, itu normal)
npm test

# 2. Build
npm run build:check

# 3. Drift
npm run drift:check

# 4. Tidak ada sisa referensi di src/ dan app/
grep -rn "pending-pricing\|PendingPricing" src/components/ app/ \
  --include="*.tsx" --include="*.ts"
# Expected: 0 hasil

# 5. Tidak ada sisa di test/
grep -rn "pending-pricing\|PendingPricing" test/ --include="*.ts"
# Expected: 0 hasil

# 6. DashboardMetrics type tetap ada (tidak berubah)
grep -n "pendingPricingCount" src/types/index.ts
# Expected: masih ada (intentionally kept)
```

---

## === JIKA ADA MASALAH ===

### Build error: "Cannot find module './KpiCardPendingPricing'"
→ Kamu lupa hapus import di `KpiCards.tsx`. Kembali ke Phase 3A.

### Test fail: "PendingPricingKpiStrip must exist"
→ Kamu lupa hapus `test/pending-pricing-components.test.ts`. Kembali ke Phase 5.

### Test fail di nav-config/nav-routing/navbar: "Expected [...] to deeply equal [...]"
→ Ada array di test yang masih punya `'pending-pricing'`. Cari dengan:
```bash
grep -n "pending-pricing" test/nav-config.test.ts test/nav-routing.test.ts test/navbar.test.ts
```
Lalu fix baris yang ditemukan.

### Drift violation: MISSING_DOC atau GOD_FILE
→ Jalankan `npm run drift:check` untuk tahu aturan mana yang dilanggar.
   Kemungkinan: direktori `src/components/pricing/` sekarang kosong dan drift
   check komplain. Hapus direktori:
```bash
rmdir src/components/pricing/
```

---

## === COMMIT MESSAGE ===

```
feat(ux): hapus halaman Pending Harga — digantikan auto-fill tabel harga

- Hapus app/pending-pricing/page.tsx dan direktorinya
- Hapus src/components/pricing/PendingPricing*.tsx (5 file)
- Hapus src/components/dashboard/KpiCardPendingPricing.tsx
- nav-config.ts: hapus item 'pending-pricing' dari section stock-billing
- KpiCards.tsx: hapus card ke-6, grid xl:grid-cols-6 → xl:grid-cols-5
- test: hapus pending-pricing-components.test.ts
- test: update array fixtures di nav-config, nav-routing, navbar tests

Dengan ADR-0018 (price autofill) dan ADR-0019 (species name sync),
timberPricePerM3 kini terisi otomatis saat penerimaan. Halaman pending
pricing tidak lagi diperlukan sebagai workflow utama. Operator tetap bisa
mengedit harga via RecordModal di Buku Besar.

DashboardMetrics.pendingPricingCount tetap dihitung (tidak breaking)
tapi tidak lagi ditampilkan di UI.

Implements ADR-0020.
```

---

## === CATATAN PENTING ===

1. **Urutan fase penting** — Phase 1 (hapus file) harus sebelum Phase 3 (edit KpiCards),
   karena jika KpiCards masih import file yang sudah dihapus, build langsung error.
   Idealnya: Phase 1 → 2 → 3 → build check → 4 → 5 → final test.

2. **`src/components/pricing/` akan kosong** setelah Phase 1. Ini valid — bisa
   dibiarkan kosong atau di-rmdir. Tidak mempengaruhi build.

3. **Jumlah test setelah penghapusan** — berkurang sekitar 10-15 dari 968.
   Yang penting: **0 fail**. Jangan khawatir angka pass turun.

4. **`/api/records/[id]/price` endpoint tetap ada** — RecordModal di Buku Besar
   masih menggunakan endpoint ini untuk update harga. Jangan hapus.
