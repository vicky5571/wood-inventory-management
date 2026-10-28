# ADR-0020: Hapus Halaman Pending Harga — Gantikan dengan Auto-Apply dari Tabel Harga

**Date:** 2026-10-28
**Status:** Accepted
**Deciders:** Owner + AI pair session

---

## Context

Halaman `/pending-pricing` dibuat untuk menangani skenario di mana kayu tiba
sebelum harga kontrak disepakati — operator harus mengetik harga secara manual
satu per satu setelah fakta. Halaman ini juga muncul sebagai KPI card di
dashboard dan sebagai nav item di sidebar.

Sejak ADR-0018 (price autofill on receiving input) dan ADR-0019 (species name
canonical sync) diimplementasi, sistem sudah memiliki tabel harga (`timber_price_entries`)
yang aktif dan ter-lookup otomatis saat operator memilih species di form penerimaan.
Dalam penggunaan normal, `timberPricePerM3` sekarang ter-isi otomatis saat input —
sehingga kondisi `timberPricePerM3 === null` yang memicu "pending pricing" seharusnya
jarang atau tidak pernah terjadi.

Halaman pending pricing sekarang menjadi:
1. **Menyesatkan** — menampilkan halaman khusus untuk kondisi yang tidak lagi terjadi
2. **Redundan** — operator bisa set/ubah harga langsung dari Buku Besar (RecordModal)
3. **Menjaga workaround lama hidup** — field harga di form penerimaan memang nullable
   by design (ADR-0002), tapi workflow manual via halaman terpisah tidak lagi perlu

Satu-satunya kasus sah yang tersisa untuk `timberPricePerM3 === null` adalah species
yang memang belum ada di tabel harga sama sekali (6 dari 13 species saat ini).
Untuk kasus ini, operator sudah bisa mengisi harga langsung di form penerimaan atau
melalui RecordModal di Buku Besar — tidak perlu halaman terpisah.

---

## Decision

Hapus halaman `/pending-pricing` beserta semua komponen, nav item, dan KPI card
yang terkait. Gantikan dengan:

1. **Nav item "Pending Harga" dihapus** dari `nav-config.ts`
2. **`KpiCardPendingPricing`** di dashboard digantikan dengan card lain yang lebih
   relevan (atau dihapus jika tidak ada pengganti yang sesuai — TBD di implementasi)
3. **`app/pending-pricing/`** beserta `page.tsx` dihapus
4. **`src/components/pricing/`** (5 komponen PendingPricing*) dihapus seluruhnya
5. **`DashboardMetrics`** type tetap mempertahankan field `pendingPricingCount`,
   `pendingPricingVolumeM3`, `pendingPricingValueExposureIDR` agar tidak breaking
   type yang mungkin dipakai di tempat lain — tetapi tidak lagi ditampilkan di UI

Operator tetap bisa mengubah atau mengisi harga melalui:
- **Form penerimaan baru** (RecordModal) — auto-fill + override manual
- **Buku Besar → Edit record** — via RecordModal yang sudah ada

```ts
// Yang dihapus — bukan diubah:
// app/pending-pricing/page.tsx
// src/components/pricing/PendingPricingView.tsx
// src/components/pricing/PendingPricingTable.tsx
// src/components/pricing/PendingPricingToolbar.tsx
// src/components/pricing/PendingPricingKpiStrip.tsx
// src/components/pricing/PendingPricingEmptyState.tsx
// src/components/dashboard/KpiCardPendingPricing.tsx

// Yang diedit:
// src/components/layout/nav-config.ts — hapus item 'pending-pricing'
// src/components/dashboard/KpiCards.tsx — hapus <KpiCardPendingPricing />
```

---

## Rejected Alternatives

### Alternative A: Pertahankan halaman, tapi sembunyikan dari nav
**Rejected because:** Menyembunyikan UI tapi menjaga kode hidup menambah dead code
dan technical debt. Jika halaman tidak diperlukan, hapus tuntas.

### Alternative B: Ubah halaman menjadi "auto-apply" yang menjalankan batchLookupPrices
**Rejected because:** `batchLookupPrices` sudah dijalankan saat report period close
(ADR yang ada). Menambah trigger manual kedua untuk hal yang sama menambah kompleksitas
tanpa manfaat yang jelas. Auto-fill sudah terjadi real-time saat input.

### Alternative C: Pertahankan hanya KPI card (tanpa halaman)
**Rejected because:** KPI card yang menunjuk ke halaman yang tidak ada adalah broken UX.
Dan jika kita sudah memutuskan pending pricing bukan workflow utama lagi, menampilkan
"N item belum berharga" di dashboard hanya menambah noise.

---

## Consequences

### Positive
- Sidebar lebih ringkas — tidak ada workflow dead-end
- Dashboard bersih — tidak ada amber alert yang terus muncul untuk species tanpa harga
- Kode berkurang ~650 LOC (5 komponen pricing + 1 KpiCard + 1 page)
- Tidak ada lagi bifurkasi workflow (dua cara beda untuk hal yang sama)

### Negative / Trade-offs
- Jika ada species yang memang tidak punya entry harga dan operator lupa mengisi
  saat input penerimaan, tidak ada lagi satu tempat dedicated untuk melihat/resolve
  semua record unpriced — operator harus filter manual di Buku Besar
- `aggregateDashboardMetrics` masih menghitung `pendingPricingCount` — field ini
  tersisa di `DashboardMetrics` type tetapi tidak ditampilkan. Ini sedikit waste
  tapi tidak breaking.

### Follow-up Obligations
- Tambahkan filter "Belum Berharga" (price = null) di halaman Buku Besar sebagai
  pengganti discovery mechanism — ini memberi operator cara untuk menemukan record
  unpriced tanpa halaman terpisah (terpisah di ADR-0021 jika diperlukan)
- Pertimbangkan apakah `pendingPricingCount` perlu dikeluarkan dari
  `aggregateDashboardMetrics` di masa depan (breaking change pada `DashboardMetrics`
  type — defer ke ADR terpisah)

---

## References

- Spec: `docs/superpowers/specs/2026-10-28-remove-pending-pricing-design.md`
- Plan: `docs/superpowers/plans/2026-10-28-remove-pending-pricing.md`
- Related ADRs: ADR-0002 (null price by design), ADR-0018 (auto-fill receiving),
  ADR-0019 (species name sync)
