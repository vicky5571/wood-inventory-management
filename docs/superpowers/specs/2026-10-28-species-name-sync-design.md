# Spec: Species Name Canonical Sync

**Tanggal:** 2026-10-28
**ADR:** docs/adr/0019-species-name-canonical-sync.md
**Status:** Accepted

---

## Masalah

`lookupPriceForRecord()` melakukan exact case-insensitive match pada `woodSpecies`.
Operator memilih species di combobox yang bersumber dari `DEFAULT_TIMBER_SPECIES`.
Jika tabel harga menyimpan nama yang berbeda satu karakter pun, lookup gagal tanpa
pesan error — penerimaan masuk "pending pricing" meski harga sudah dikonfigurasi.

Contoh mismatch yang ditemukan 2026-10-28:

| Combobox (`DEFAULT_TIMBER_SPECIES`) | DB tabel harga | Akibat |
|--------------------------------------|----------------|--------|
| `Teak / Jati (柚木)` | `Jati / Teak (柚木)` | ❌ no match |
| `Mahoni / Mahogany (桃花心木)` | `Mahoni (桃花心木)` | ❌ no match |
| `Sengon / Albizia (南洋楹)` | `Sengon / Albasia (南洋楹)` | ❌ no match |
| `Keruing (克隆木)` | `Keruing (克鲁)` | ❌ no match |

Data ini sudah difix via direct SQL UPDATE (2026-10-28). Masalahnya: tidak ada
mekanisme yang mencegah mismatch terjadi lagi di masa depan.

---

## Scope

### In scope
- Normalisasi nama species saat `savePriceEntryToDb` dipanggil
- Test unit: normalisasi terjadi saat nama tidak canonical; nama custom tidak diubah
- Test unit: nama sudah canonical → tidak berubah

### Out of scope
- Perubahan `lookupPriceForRecord` — sudah benar, tidak disentuh
- Perubahan UI `PriceFormModal` — dropdown sudah bersumber dari `TIMBER_SPECIES_CATALOGUE`
- Perubahan schema DB — tidak ada kolom baru
- Migration script untuk data historis — data sudah difix manual; script utilitas
  adalah follow-up terpisah (lihat ADR-0019 Follow-up Obligations)

---

## Desain Solusi

### Normalisasi di `savePriceEntryToDb`

Setelah `woodSpeciesName` di-resolve (baris 95-97 di `price-queries.ts`), tambahkan
satu langkah normalisasi sebelum INSERT:

```ts
import { TIMBER_SPECIES_CATALOGUE } from '../../utils/timber-species.ts';

// Setelah woodSpeciesName diketahui:
const catalogueMatch = TIMBER_SPECIES_CATALOGUE.find(
  (s) => s.commonName.toLowerCase() === woodSpeciesName.toLowerCase()
);
const normalizedSpeciesName = catalogueMatch ? catalogueMatch.commonName : woodSpeciesName;
// Gunakan normalizedSpeciesName untuk kolom wood_species_name
```

**Behaviour yang diharapkan:**

| Input `woodSpecies` | Hasil tersimpan |
|---------------------|-----------------|
| `Jati / Teak (柚木)` (typo urutan) | `Teak / Jati (柚木)` ✅ |
| `mahoni (桃花心木)` (lowercase) | `Mahoni / Mahogany (桃花心木)` ✅ |
| `MERANTI (柳安木)` (uppercase) | `Meranti (柳安木)` ✅ |
| `Sengon / Albasia (南洋楹)` (typo) | Jika lowercase match → normalized; jika tidak → as-is |
| `Kayu Custom Lokal` (free-text) | `Kayu Custom Lokal` (tidak diubah) ✅ |

> **Catatan:** `Sengon / Albasia` tidak akan match ke `Sengon / Albizia` karena case-insensitive
> compare membutuhkan string identik kecuali case. Normalisasi hanya membantu kasus
> case-sensitivity, bukan typo. Typo harus dicegah dari UI (modal sudah pakai dropdown).

---

## Kontrak Fungsi

`savePriceEntryToDb` (tidak berubah secara API):
- Input: sama seperti sebelumnya
- Output: `TimberPriceEntry` — `woodSpecies` sekarang dijamin canonical jika ada match
  di `TIMBER_SPECIES_CATALOGUE`
- Side effect: DB menyimpan canonical name

---

## Test Cases

### TC-01: Nama canonical → disimpan as-is
- Input: `woodSpecies: 'Teak / Jati (柚木)'`
- Expected: `wood_species_name` di DB = `'Teak / Jati (柚木)'`

### TC-02: Nama dalam lowercase → dinormalisasi
- Input: `woodSpecies: 'teak / jati (柚木)'`
- Expected: `wood_species_name` = `'Teak / Jati (柚木)'`

### TC-03: Nama dengan urutan kata berbeda tapi case berbeda → case dinormalisasi
- Input: `woodSpecies: 'MERANTI (柳安木)'`
- Expected: `wood_species_name` = `'Meranti (柳安木)'`

### TC-04: Free-text custom species → tidak diubah
- Input: `woodSpecies: 'Kayu Custom Eksotis'`
- Expected: `wood_species_name` = `'Kayu Custom Eksotis'` (tidak ada di catalogue)

### TC-05: Nama match catalogue → return value `woodSpecies` juga canonical
- Input: `woodSpecies: 'mahoni / mahogany (桃花心木)'`
- Expected: returned `TimberPriceEntry.woodSpecies` = `'Mahoni / Mahogany (桃花心木)'`

---

## File yang Berubah

| File | Perubahan |
|------|-----------|
| `src/persistence/sqlite/price-queries.ts` | Import `TIMBER_SPECIES_CATALOGUE`, tambah normalisasi setelah resolve `woodSpeciesName` |
| `test/species-name-sync.test.ts` | File baru, 5 unit test |

**Tidak berubah:**
- `src/utils/timber-species.ts` — SSOT, tidak disentuh
- `src/utils/price-lookup.ts` — tidak disentuh
- `src/components/prices/PriceFormModal.tsx` — tidak disentuh
- `src/persistence/seed/fixtures-prices.ts` — sudah difix session ini
- DB schema — tidak ada perubahan
