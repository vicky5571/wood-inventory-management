# ADR-0018: Price Auto-Fill dari Tabel Harga saat Input Penerimaan

**Date:** 2026-10-28
**Status:** Accepted
**Deciders:** Owner + AI pair session

---

## Context

Sistem sudah memiliki tabel harga (`timber_price_entries`) dengan fungsi lookup yang
lengkap — `lookupPriceForRecord()` (pure) dan `lookupPriceEntryFromDb()` (SQLite) —
yang mendukung prioritas supplier-specific > global dan date-range matching.

Namun saat operator menginput penerimaan kayu baru di `RecordModal` →
`ManifestItemsTable` → `ManifestItemRow`, field `timberPricePerM3` selalu kosong
(null). Sistem tidak pernah mengkonsultasi tabel harga. Akibatnya:

1. Semua penerimaan masuk sebagai "pending pricing" meskipun harga sudah tersedia
2. Operator harus pergi ke halaman terpisah (Kelola Harga Tertunda) untuk mengisi
   harga satu per satu secara manual
3. `lookupPriceForRecord()` hanya dipakai saat generate Payment Form (sebagai filter
   skip), bukan sebagai alat bantu input

Constraint: kayu kadang tiba sebelum harga disepakati. Behavior null/pending harus
tetap valid — auto-fill tidak boleh memblokir simpan.

---

## Decision

**Saat operator memilih `woodSpecies` di `ManifestItemRow`, sistem langsung melakukan
lookup ke tabel harga dan mengisi `timberPricePerM3` dan `timberPphRate` secara
otomatis jika ada match. Operator dapat mengubah atau mengosongkan nilai tersebut.**

Mekanisme:
- `ManifestItemRow` menerima prop baru `priceEntries: TimberPriceEntry[]`
- Saat `woodSpecies` berubah dan `timberPricePerM3` masih null, panggil
  `lookupPriceForRecord()` dengan data form saat itu
- Jika match ditemukan: isi `timberPricePerM3` dan `timberPphRate` dari entry
- Tampilkan badge sumber harga di sebelah field harga ("Auto dari tabel harga")
- Jika tidak ada match: field tetap null, tidak ada error, tidak ada badge
- Operator dapat override kapan saja — nilai yang sudah diedit manual tidak
  di-overwrite oleh perubahan species berikutnya

```ts
// Trigger di ManifestItemRow saat woodSpecies berubah:
const result = lookupPriceForRecord(
  { woodSpecies: newSpecies, supplierName: supplierName, receiptDate: receiptDate },
  priceEntries
);
if (result.matched && item.timberPricePerM3 === null) {
  onChange({ ...item, woodSpecies: newSpecies,
    timberPricePerM3: result.entry.pricePerM3,
    timberPphRate:    result.entry.timberPphRate,
  });
}
```

`priceEntries` di-pass dari `RecordModal` yang memanggil `useTimberPrices()` —
tidak ada fetch baru, hook sudah ada dan sudah dipakai di halaman Prices.

---

## Rejected Alternatives

### A: Lookup saat form dibuka (bukan saat species dipilih)
**Rejected:** Form dibuka sebelum species dipilih. Lookup di awal tidak berguna
karena `woodSpecies` masih kosong string.

### B: Auto-fill di API route (server-side) saat POST penerimaan
**Rejected:** Menambah latency dan coupling di API layer. UI harus memberi feedback
real-time kepada operator — tidak bisa menunggu round-trip ke server.

### C: Tombol "Cari Harga" manual (bukan otomatis saat species berubah)
**Rejected:** Menambah langkah manual yang tidak perlu jika harga sudah tersedia.
Tujuan ADR ini adalah mengurangi friction input, bukan mengganti satu langkah
dengan langkah lain.

### D: Auto-overwrite harga existing saat species berubah
**Rejected:** Berbahaya untuk form edit. Operator yang mengedit species di record
lama tidak boleh kehilangan harga yang sudah tersimpan. Auto-fill hanya terjadi
saat `timberPricePerM3 === null`.

---

## Consequences

### Positive
- Mayoritas penerimaan tidak lagi masuk sebagai "pending pricing" jika harga sudah
  dikonfigurasi di tabel harga
- Halaman Kelola Harga Tertunda hanya dipakai untuk exception (harga belum ada /
  negosiasi setelah barang tiba)
- `lookupPriceForRecord()` akhirnya dipakai sesuai tujuan utamanya
- Tidak ada perubahan API, DB schema, atau types SSOT
- `timberPphRate` juga ikut ter-fill — mengurangi error input tarif pajak manual

### Negative / Trade-offs
- `ManifestItemRow` menjadi sedikit lebih kompleks (prop `priceEntries` + badge UI)
- `ManifestItemsTable` harus pass-through prop `priceEntries`
- `RecordModal` perlu memanggil `useTimberPrices()` — satu hook tambahan
- Auto-fill hanya terjadi saat species **berubah** dari null/empty, tidak saat form
  edit dibuka dengan species yang sudah terisi. Ini by design untuk mencegah
  overwrite harga yang sudah tersimpan di DB.

### Follow-up Obligations
- Jika `supplierName` belum diisi saat species dipilih, lookup memakai global entry
  saja. Future enhancement: re-trigger lookup saat supplier berubah (tidak dalam
  scope ADR ini).
- `ManifestItemsTable.handleAddItem()` juga bisa mengisi harga dari baris terakhir —
  sudah ada behavior copy-from-last, tidak perlu diubah.

---

## References

- Spec: `docs/superpowers/specs/2026-10-28-price-autofill-receiving-design.md`
- Plan: `docs/superpowers/plans/2026-10-28-price-autofill-receiving.md`
- Related: `src/utils/price-lookup.ts` — `lookupPriceForRecord()` (tidak diubah)
- Related: `src/hooks/useTimberPrices.ts` — hook yang sudah ada (tidak diubah)
- Related ADRs: ADR-0002 (null vs zero untuk pending price)
