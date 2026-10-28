# Spec: Fix Seed Data — Hapus Pending Pricing dari fixtures-receiving.ts

**Tanggal:** 2026-10-28
**Plan:** docs/superpowers/plans/2026-10-28-fix-seed-pending-pricing.md
**Status:** Accepted

---

## 1. Executive Summary

Setelah implementasi ADR-0018 (auto-fill harga saat input penerimaan), ADR-0019 (species name canonical sync), dan ADR-0020 (penghapusan halaman `/pending-pricing`), workflow pending pricing tidak lagi digunakan.
Namun pada `src/persistence/seed/fixtures-receiving.ts`, masih terdapat 8 record (5 manifest items dan 3 top-level records) yang memiliki `timberPricePerM3: null` dengan komentar `// PENDING PRICING`. Selain itu, 3 record masih menggunakan penamaan species non-kanonikal yang mendahului ADR-0019.

Spec ini mendefinisikan standardisasi data seed agar seluruh record penerimaan kayu memiliki harga terisi sesuai tabel harga aktif dan nama species kanonikal, serta penyesuaian langsung pada SQLite database yang sedang berjalan.

---

## 2. Definisi Perubahan Data

### 2.1 Pemetaan Harga dari Tabel Harga Aktif
| Species | Kode Standar | Harga/m³ (IDR) | PPh Rate |
|---|---|---|---|
| `Teak / Jati (柚木)` | JAT | Rp 4.500.000 | 0.5% |
| `Keruing (克隆木)` | KRG | Rp 2.400.000 | 0.5% |
| `Meranti (柳安木)` | MRT | Rp 2.600.000 | 0.5% |
| `Sengon / Albizia (南洋楹)` | SNG | Rp 950.000 | 0.5% |

### 2.2 Koreksi Manifest Items (`ITM-*`)
1. `ITM-W39-008-1` (Teak / Jati, 12.0 m³):
   - `timberPricePerM3`: `null` → `4_500_000`
   - `notes`: `'Menunggu kesepakatan harga grading A1'` → `'Harga standar Jati 2026'`
2. `ITM-W39-008-2` (Teak / Jati, 7.5 m³):
   - `timberPricePerM3`: `null` → `4_500_000`
   - `notes`: `'Menunggu kesepakatan harga sortir pendek'` → `'Harga standar Jati 2026'`
3. `ITM-W40-009-1` (Keruing, 14.0 m³):
   - `timberPricePerM3`: `null` → `2_400_000`
   - `notes`: `'Keruing dalam proses negosiasi harga'` → `'Harga standar Keruing 2026'`
4. `ITM-W40-009-2` (Meranti, 11.5 m³):
   - `timberPricePerM3`: `null` → `2_600_000`
   - `notes`: `'Meranti dalam proses negosiasi harga'` → `'Harga standar Meranti 2026'`
5. `ITM-W41-010-1` (Sengon, 9.8 m³):
   - `timberPricePerM3`: `null` → `950_000`
   - `notes`: `'Sengon kiriman terbaru menunggu harga lelang'` → `'Harga standar Sengon 2026'`

### 2.3 Koreksi Top-Level Records (`rec-*`)
1. `rec-2026-10-08`:
   - `woodSpecies`: `'Jati / Teak (柚木)'` → `'Teak / Jati (柚木)'`
   - `timberPricePerM3`: `null` → `4_500_000`
2. `rec-2026-10-09`:
   - `woodSpecies`: `'Keruing (克鲁)'` → `'Keruing (克隆木)'`
   - `timberPricePerM3`: `null` → `2_400_000`
3. `rec-2026-10-10`:
   - `woodSpecies`: `'Sengon / Albasia (南洋楹)'` → `'Sengon / Albizia (南洋楹)'`
   - `timberPricePerM3`: `null` → `950_000`

---

## 3. Database Sync & Patch

Database lokal (`data/wood_inventory.db`) harus disinkronkan secara langsung melalui query SQL `UPDATE` pada tabel `receiving_items` dan `wood_receiving_records` dengan nilai kalkulasi finansial turunan (`timber_gross_total`, `timber_pph_amount`, `timber_net_payable`, `grand_net_payable`).

---

## 4. Acceptance Criteria & Verification

1. `grep "PENDING PRICING\|timberPricePerM3: null" src/persistence/seed/fixtures-receiving.ts` menghasilkan 0 baris.
2. Semua species di `SEED_WOOD_RECORDS` cocok dengan `DEFAULT_TIMBER_SPECIES` kanonikal.
3. Query `SELECT COUNT(*) FROM receiving_items WHERE timber_price_per_m3 IS NULL` menghasilkan 0.
4. Query `SELECT COUNT(*) FROM wood_receiving_records WHERE timber_price_per_m3 IS NULL` menghasilkan 0.
5. Seluruh rangkaian test (`npm test`) tetap 100% lulus (961 passing, 0 failing).
6. Next.js production build (`npm run build:check`) bersih dengan 0 error.
7. Drift check (`npm run drift:check`) bebas dari pelanggaran.
