# Implementation Plan: Hapus Halaman Pending Harga

**Tanggal:** 2026-10-28
**ADR:** docs/adr/0020-remove-pending-pricing-page.md
**Spec:** docs/superpowers/specs/2026-10-28-remove-pending-pricing-design.md
**Estimasi:** ~30 menit

---

## Baseline

```bash
npm test              # 968 pass, 0 fail
npm run build:check   # 0 errors
npm run drift:check   # 0 violations
```

Cek sebelum mulai. Jika berbeda → stop.

---

## Overview

| Phase | Aksi | File |
|-------|------|------|
| 1 | Hapus 7 file komponen + page | `src/components/pricing/Pending*.tsx` × 5, `src/components/dashboard/KpiCardPendingPricing.tsx`, `app/pending-pricing/page.tsx` |
| 2 | Edit `nav-config.ts` | Hapus item `pending-pricing` |
| 3 | Edit `KpiCards.tsx` | Hapus import + card ke-6 |
| 4 | Update 4 test file | Hapus referensi `pending-pricing` dari test |
| 5 | Hapus test file pending pricing | `test/pending-pricing-components.test.ts` |

**Urutan penting:** Phase 2–3 dulu sebelum Phase 4–5, agar build bisa dicek
setelah setiap phase.

---

## Phase 1 — Hapus File Komponen dan Page

Hapus 7 file berikut. Pastikan tidak ada file lain yang mengimpornya sebelum
menghapus (sudah dicek — tidak ada consumer selain yang akan diedit di Phase 2–3).

```bash
rm src/components/pricing/PendingPricingView.tsx
rm src/components/pricing/PendingPricingTable.tsx
rm src/components/pricing/PendingPricingToolbar.tsx
rm src/components/pricing/PendingPricingKpiStrip.tsx
rm src/components/pricing/PendingPricingEmptyState.tsx
rm src/components/dashboard/KpiCardPendingPricing.tsx
rm app/pending-pricing/page.tsx
rmdir app/pending-pricing   # hapus direktori jika kosong
```

### Checklist Phase 1
```
[ ] rm src/components/pricing/PendingPricingView.tsx
[ ] rm src/components/pricing/PendingPricingTable.tsx
[ ] rm src/components/pricing/PendingPricingToolbar.tsx
[ ] rm src/components/pricing/PendingPricingKpiStrip.tsx
[ ] rm src/components/pricing/PendingPricingEmptyState.tsx
[ ] rm src/components/dashboard/KpiCardPendingPricing.tsx
[ ] rm app/pending-pricing/page.tsx + rmdir app/pending-pricing
[ ] Verify: ls src/components/pricing/ → tidak ada file PendingPricing*.tsx
```

---

## Phase 2 — Hapus Nav Item dari `nav-config.ts`

**File:** `src/components/layout/nav-config.ts` (131 baris)

### Step 2A — Hapus item `pending-pricing`

Cari (section `stock-billing`, baris ~48):
```ts
      { id: 'inventory', labelId: 'Inventaris', labelZh: '库存', href: '/inventory' },
      { id: 'prices', labelId: 'Tabel Harga', labelZh: '价格表', href: '/prices' },
      { id: 'pending-pricing', labelId: 'Pending Harga', labelZh: '待定价', href: '/pending-pricing' },
      { id: 'report-periods', labelId: 'Periode Laporan', labelZh: '结账周期', href: '/report-periods' },
      { id: 'payment-forms', labelId: 'Form Pembayaran', labelZh: '付款单', href: '/payment-forms' },
```

Ganti dengan:
```ts
      { id: 'inventory', labelId: 'Inventaris', labelZh: '库存', href: '/inventory' },
      { id: 'prices', labelId: 'Tabel Harga', labelZh: '价格表', href: '/prices' },
      { id: 'report-periods', labelId: 'Periode Laporan', labelZh: '结账周期', href: '/report-periods' },
      { id: 'payment-forms', labelId: 'Form Pembayaran', labelZh: '付款单', href: '/payment-forms' },
```

### Checklist Phase 2
```
[ ] Baris { id: 'pending-pricing', ... } dihapus dari nav-config.ts
[ ] Verify: grep "pending-pricing" src/components/layout/nav-config.ts → 0 hasil
```

---

## Phase 3 — Hapus KpiCardPendingPricing dari `KpiCards.tsx`

**File:** `src/components/dashboard/KpiCards.tsx` (218 baris)

### Step 3A — Hapus import

Cari (baris 4):
```ts
import { KpiCardPendingPricing } from './KpiCardPendingPricing';
```

Hapus baris tersebut.

### Step 3B — Hapus card ke-6 + ubah grid

Cari (baris 213–215):
```tsx
      {/* 6. Pending Pricing Card */}
      <KpiCardPendingPricing metrics={metrics} />
    </div>
```

Ganti dengan:
```tsx
    </div>
```

### Step 3C — Update grid columns (dari 6 → 5)

Grid sekarang `xl:grid-cols-6` untuk 6 card. Setelah dihapus ada 5 card.
Ubah agar layout tetap rapi.

Cari (baris 14):
```tsx
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
```

Ganti dengan:
```tsx
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
```

### Checklist Phase 3
```
[ ] Import KpiCardPendingPricing dihapus dari KpiCards.tsx
[ ] JSX {/* 6. Pending Pricing Card */} + <KpiCardPendingPricing ... /> dihapus
[ ] xl:grid-cols-6 → xl:grid-cols-5
[ ] Verify: grep "KpiCardPendingPricing\|pending-pricing" src/components/dashboard/KpiCards.tsx → 0 hasil
[ ] npm run build:check → 0 errors (cek setelah phase ini)
```

---

## Phase 4 — Update 4 Test File

> **JANGAN** hapus test file ini — hanya edit bagian yang menyebut `pending-pricing`.

### 4A — `test/nav-config.test.ts`

**Perubahan 1:** Hapus `'pending-pricing'` dari array items section `stock-billing`.

Cari:
```ts
    assert.deepEqual(
      NAV_SECTIONS[2].items.map((i) => i.id),
      ['inventory', 'prices', 'pending-pricing', 'report-periods', 'payment-forms']
    );
```

Ganti dengan:
```ts
    assert.deepEqual(
      NAV_SECTIONS[2].items.map((i) => i.id),
      ['inventory', 'prices', 'report-periods', 'payment-forms']
    );
```

**Perubahan 2:** Hapus `'pending-pricing'` dari array flat `NAV_ITEMS` IDs.

Cari (dalam test yang memeriksa semua NAV_ITEMS):
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

**Perubahan 1:** Hapus `'/pending-pricing'` dari array hrefs.

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

**Perubahan 2:** Hapus `'pending-pricing'` dari array IDs.

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

**Perubahan 1:** Hapus `'pending-pricing'` dari array IDs dalam test semua items.

Cari (dalam assertion array NAV_ITEMS ids):
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

**Perubahan 2:** Hapus blok test yang mengecek pending-pricing item spesifik.

Cari:
```ts
    const pendingPricing = NAV_ITEMS.find((item) => item.id === 'pending-pricing')!;
    assert.equal(pendingPricing.href, '/pending-pricing');
    assert.equal(pendingPricing.labelId, 'Pending Harga');
    assert.equal(pendingPricing.labelZh, '待定价');
```

Hapus keempat baris tersebut seluruhnya.

### Checklist Phase 4
```
[ ] test/nav-config.test.ts — hapus 'pending-pricing' dari 2 array assertions
[ ] test/nav-routing.test.ts — hapus '/pending-pricing' dan 'pending-pricing' dari 2 array assertions
[ ] test/navbar.test.ts — hapus 'pending-pricing' dari 1 array + hapus 4 baris assertion item spesifik
[ ] Verify: grep "pending-pricing" test/nav-config.test.ts test/nav-routing.test.ts test/navbar.test.ts → 0 hasil
```

---

## Phase 5 — Hapus Test File Pending Pricing

**File:** `test/pending-pricing-components.test.ts` (81 baris)

File ini berisi test yang memeriksa eksistensi file-file yang sudah kita hapus.
Jika dibiarkan, `npm test` akan fail karena file tidak ada.

```bash
rm test/pending-pricing-components.test.ts
```

### Checklist Phase 5
```
[ ] rm test/pending-pricing-components.test.ts
[ ] Verify: ls test/pending-pricing* → file not found
```

---

## Verification Gate

Jalankan semua ini setelah Phase 5 selesai:

```bash
# 1. Tests — harus (968 - 6) = 962 pass, 0 fail
# (Menghapus: 1 suite dari pending-pricing-components = ~6 assertions,
#  plus beberapa assertions di nav tests yang dihapus)
# Angka pastinya sekitar 950-962. Yang penting: 0 fail.
npm test

# 2. Build — harus 0 errors
npm run build:check

# 3. Drift
npm run drift:check

# 4. Tidak ada referensi pending-pricing tersisa di src/ dan app/
grep -rn "pending-pricing\|PendingPricing\|pendingPricing" \
  src/components/ app/ \
  --include="*.tsx" --include="*.ts"
# Expected: 0 hasil (kecuali jika ada di DashboardMetrics type — itu OK)

# 5. Tidak ada referensi di test files
grep -rn "pending-pricing\|PendingPricing" test/ --include="*.ts"
# Expected: 0 hasil

# 6. Direktori pricing masih ada (tapi hanya KpiCards dan helper, bukan PendingPricing*)
ls src/components/pricing/
# Expected: direktori kosong ATAU tidak ada — OK jika direktori dihapus juga

# 7. src/types/index.ts masih valid (tidak berubah)
grep -n "pendingPricingCount" src/types/index.ts
# Expected: masih ada di baris 479 (DashboardMetrics — intentionally kept)
```

---

## Catatan Implementasi

### Grid layout setelah card dihapus
Sebelum: `xl:grid-cols-6` untuk 6 card.
Setelah: `xl:grid-cols-5` untuk 5 card.

Jika dirasa layout 5-col terlalu lebar dan tidak rapi, alternatif:
- `xl:grid-cols-5` — 5 card sejajar di XL screen (direkomendasikan)
- `xl:grid-cols-3 xl:grid-rows-2` — grid 3×2 (perubahan lebih besar)

Pilih `xl:grid-cols-5` — perubahan minimal.

### `src/components/pricing/` menjadi kosong
Setelah Phase 1, direktori `src/components/pricing/` akan kosong.
Bisa dibiarkan (Next.js tidak peduli direktori kosong) atau dihapus:
```bash
rmdir src/components/pricing/   # hanya berhasil jika kosong
```
Tidak wajib — tidak mempengaruhi build atau test.

### `DashboardMetrics` fields tetap ada
`pendingPricingCount`, `pendingPricingVolumeM3`, `pendingPricingValueExposureIDR`
tetap di `src/types/index.ts` dan dihitung di `timber-calc.ts`. Ini intentional —
tidak ada consumer UI yang tersisa tapi menghapus field ini adalah breaking change
pada type yang mungkin dipakai di test atau query lain. Defer.

### Jumlah test setelah penghapusan
Baseline: 968 pass.
Yang hilang:
- `test/pending-pricing-components.test.ts` — 1 suite, ~6 sub-tests
- Beberapa assertions di nav-config/nav-routing/navbar tests yang kita edit

Estimasi setelah: sekitar 955–962 pass. Yang penting 0 fail.

---

## Rollback

Jika ada yang salah:
```bash
git restore src/components/layout/nav-config.ts
git restore src/components/dashboard/KpiCards.tsx
git restore test/nav-config.test.ts
git restore test/nav-routing.test.ts
git restore test/navbar.test.ts
git checkout HEAD -- src/components/pricing/
git checkout HEAD -- src/components/dashboard/KpiCardPendingPricing.tsx
git checkout HEAD -- app/pending-pricing/
git checkout HEAD -- test/pending-pricing-components.test.ts
```

---

## Commit Message

```
feat(ux): hapus halaman Pending Harga — digantikan auto-fill tabel harga

- Hapus app/pending-pricing/page.tsx dan direktorinya
- Hapus src/components/pricing/PendingPricing*.tsx (5 file)
- Hapus src/components/dashboard/KpiCardPendingPricing.tsx
- nav-config.ts: hapus item 'pending-pricing' dari section stock-billing
- KpiCards.tsx: hapus card ke-6, grid xl:grid-cols-6 → xl:grid-cols-5
- test: hapus pending-pricing-components.test.ts, update nav test fixtures

Dengan ADR-0018 (price autofill) dan ADR-0019 (species name sync),
timberPricePerM3 kini terisi otomatis saat penerimaan. Halaman pending
pricing tidak lagi diperlukan sebagai workflow utama. Operator tetap bisa
mengedit harga via RecordModal di Buku Besar.

DashboardMetrics.pendingPricingCount tetap dihitung di timber-calc.ts
(tidak breaking) tapi tidak lagi ditampilkan di UI.

Implements ADR-0020.
```
