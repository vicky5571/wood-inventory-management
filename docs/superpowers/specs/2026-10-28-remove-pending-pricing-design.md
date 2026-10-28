# Spec: Hapus Halaman Pending Harga

**Tanggal:** 2026-10-28
**ADR:** docs/adr/0020-remove-pending-pricing-page.md
**Status:** Accepted

---

## Latar Belakang

Dengan ADR-0018 (auto-fill harga saat input penerimaan) dan ADR-0019 (species name
canonical sync), `timberPricePerM3` sekarang ter-isi otomatis saat operator memilih
species di form penerimaan — selama species tersebut ada di tabel harga.

Halaman `/pending-pricing` adalah workflow manual untuk kasus sebelum tabel harga ada.
Sekarang menjadi redundan dan menyesatkan.

---

## Scope

### Yang dihapus
| File | Alasan |
|------|--------|
| `app/pending-pricing/page.tsx` | Route halaman |
| `src/components/pricing/PendingPricingView.tsx` | Coordinator component |
| `src/components/pricing/PendingPricingTable.tsx` | Tabel input harga manual |
| `src/components/pricing/PendingPricingToolbar.tsx` | Filter & search toolbar |
| `src/components/pricing/PendingPricingKpiStrip.tsx` | KPI strip header |
| `src/components/pricing/PendingPricingEmptyState.tsx` | Empty state |
| `src/components/dashboard/KpiCardPendingPricing.tsx` | Dashboard KPI card |

### Yang diedit
| File | Perubahan |
|------|-----------|
| `src/components/layout/nav-config.ts` | Hapus item `'pending-pricing'` dari section `'stock-billing'` |
| `src/components/dashboard/KpiCards.tsx` | Hapus import + render `<KpiCardPendingPricing />` |

### Yang TIDAK berubah
| File | Alasan |
|------|--------|
| `src/types/index.ts` | `DashboardMetrics` tetap punya 3 field pending pricing — bukan breaking change, field hanya tidak ditampilkan |
| `src/utils/timber-calc.ts` | `aggregateDashboardMetrics` tetap menghitung `pendingPricingCount` — konsumen lain mungkin ada |
| `src/utils/payment-form-grouping.ts` | `PENDING_PRICE` skip reason tetap valid — record unpriced tetap tidak bisa masuk payment form |
| `src/utils/price-lookup.ts` | Tidak berubah |
| `app/api/records/[id]/price/route.ts` | PATCH endpoint tetap ada — RecordModal masih bisa update harga |
| `src/hooks/useWoodRecords.ts` | `updateRecordPrice` tetap ada |

---

## Behaviour yang Diharapkan Setelah Penghapusan

### Navigasi
- Sidebar tidak lagi menampilkan "Pending Harga" — section "Stok & Tagihan" berisi
  4 item: Inventaris, Tabel Harga, Periode Laporan, Form Pembayaran
- URL `/pending-pricing` menghasilkan Next.js 404 (tidak ada page.tsx di sana)

### Dashboard
- KPI card "Pending Harga" tidak ada lagi — dashboard menampilkan 5 KPI card
  (jumlah sebelumnya 6, sekarang 5, atau digantikan card lain — lihat catatan implementasi)

### Operator workflow untuk record unpriced
- Buka Buku Besar → cari record → klik Edit → isi `timberPricePerM3` di RecordModal
- Atau: saat buat penerimaan baru — auto-fill sudah jalan jika species ada di tabel harga

---

## Catatan Penting

### `KpiCards.tsx` — card ke berapa yang dihapus?
`KpiCardPendingPricing` adalah card ke-6 di `KpiCards.tsx`. Setelah dihapus,
dashboard punya 5 card. Jika layout mengasumsikan grid 6-col atau 3-col × 2-row,
pastikan grid CSS masih rapi dengan 5 card. Cek class `grid-cols-*` di `KpiCards.tsx`
sebelum commit.

### Import chain
`KpiCardPendingPricing` di-import hanya di `KpiCards.tsx`. Tidak ada consumer lain.
Cukup hapus import + JSX di `KpiCards.tsx`, lalu hapus file component-nya.

### Test
Cari test yang mereferensikan `PendingPricing` atau `pending-pricing` — pastikan
dihapus atau diupdate agar tidak ada test yang import komponen yang sudah dihapus.

---

## Test Cases

### TC-01: Nav tidak lagi punya item pending-pricing
- Cek `NAV_SECTIONS` di `nav-config.ts` — tidak ada item dengan `href: '/pending-pricing'`

### TC-02: `KpiCards` tidak import `KpiCardPendingPricing`
- Cek `src/components/dashboard/KpiCards.tsx` — tidak ada import `KpiCardPendingPricing`

### TC-03: File komponen pricing dihapus semua
- `ls src/components/pricing/` tidak menampilkan file `PendingPricing*.tsx` apapun

### TC-04: Semua test tetap pass setelah penghapusan
- `npm test` — ≥ 968 pass, 0 fail

### TC-05: Build bersih
- `npm run build:check` — 0 errors (tidak ada broken import dari file yang dihapus)

---

## Risk Assessment

| Risk | Likelihood | Mitigasi |
|------|-----------|----------|
| Ada test yang import komponen dihapus | Medium | Grep untuk `PendingPricing` di `test/` sebelum hapus |
| `KpiCards.tsx` grid layout rusak setelah card dihapus | Low | Cek class grid, adjust jika perlu |
| Ada halaman lain yang link ke `/pending-pricing` | Low | Grep `pending-pricing` di seluruh `src/` dan `app/` |
| `DashboardMetrics` type complaint dari TypeScript | None | Type tidak diubah — field tetap ada, hanya tidak di-render |
