# Implementation Plan: Fix Seed Data — Hapus Pending Pricing dari fixtures-receiving.ts

**Tanggal:** 2026-10-28
**Tipe:** Data fix (bukan ADR baru — tidak ada keputusan arsitektur baru)
**File utama:** `src/persistence/seed/fixtures-receiving.ts`

---

## Baseline

```bash
npm test              # 961 pass, 0 fail
npm run build:check   # 0 errors
npm run drift:check   # 0 violations
```

---

## Masalah

8 records di `fixtures-receiving.ts` masih punya `timberPricePerM3: null` dengan
komentar `// PENDING PRICING`. Dua di antaranya juga masih pakai nama species lama
(sebelum ADR-0019).

### Inventory masalah

| ID | Species di seed | Masalah | Harga dari tabel |
|----|----------------|---------|-----------------|
| `ITM-W39-008-1` | `Teak / Jati (柚木)` | null price | Rp 4.500.000 |
| `ITM-W39-008-2` | `Teak / Jati (柚木)` | null price | Rp 4.500.000 |
| `ITM-W40-009-1` | `Keruing (克隆木)` | null price | Rp 2.400.000 |
| `ITM-W40-009-2` | `Meranti (柳安木)` | null price | Rp 2.600.000 |
| `ITM-W41-010-1` | `Sengon / Albizia (南洋楹)` | null price | Rp 950.000 |
| `rec-2026-10-08` | `Jati / Teak (柚木)` | null price + **nama lama** | Rp 4.500.000 |
| `rec-2026-10-09` | `Keruing (克鲁)` | null price + **nama lama** | Rp 2.400.000 |
| `rec-2026-10-10` | `Sengon / Albasia (南洋楹)` | null price + **typo nama** | Rp 950.000 |

### Derived fields yang harus diisi sekaligus

Karena `createSeedWoodRecord()` memanggil `computeRecordCalculations()` secara
otomatis, untuk **manifest items** (`ITM-*`) cukup set `timberPricePerM3` — derived
fields dihitung oleh helper.

Untuk **top-level records** (`rec-*`) yang menggunakan `createSeedWoodRecord()`,
sama — cukup set `timberPricePerM3` dan fix nama.

Namun kita tetap mencatat nilai yang diharapkan sebagai sanity check.

---

## Nilai yang Dihitung

### Manifest Items (freight = 0, broker = 0)

| ID | `timberPricePerM3` | `timberGrossTotal` | `timberPphAmount` | `timberNetPayable` | `grandNetPayable` |
|----|-------------------|--------------------|-------------------|--------------------|-------------------|
| ITM-W39-008-1 | 4_500_000 | 54_000_000 | 270_000 | 53_730_000 | 53_730_000 |
| ITM-W39-008-2 | 4_500_000 | 33_750_000 | 168_750 | 33_581_250 | 33_581_250 |
| ITM-W40-009-1 | 2_400_000 | 33_600_000 | 168_000 | 33_432_000 | 33_432_000 |
| ITM-W40-009-2 | 2_600_000 | 29_900_000 | 149_500 | 29_750_500 | 29_750_500 |
| ITM-W41-010-1 | 950_000   |  9_310_000 |  46_550 |  9_263_450 |  9_263_450 |

### Top-level Records

| ID | `timberPricePerM3` | `timberGrossTotal` | `timberPphAmount` | `timberNetPayable` | `grandNetPayable` |
|----|-------------------|--------------------|-------------------|--------------------|-------------------|
| rec-2026-10-08 | 4_500_000 | 87_750_000 | 438_750 | 87_311_250 | 91_133_250 |
| rec-2026-10-09 | 2_400_000 | 61_200_000 | 306_000 | 60_894_000 | 69_040_900 |
| rec-2026-10-10 |   950_000 |  9_310_000 |  46_550 |  9_263_450 | 10_613_950 |

---

## Perubahan di `fixtures-receiving.ts`

### Bagian A — Manifest Items (5 records, hanya `timberPricePerM3`)

#### ITM-W39-008-1

Cari:
```ts
    timberPricePerM3: null, // PENDING PRICING
    timberPphRate: 0.5,
    notes: 'Menunggu kesepakatan harga grading A1',
    createdAt: '2026-09-28T14:15:00.000Z',
    updatedAt: '2026-09-28T14:15:00.000Z',
  },
  {
    id: 'ITM-W39-008-2',
```

Ganti dengan:
```ts
    timberPricePerM3: 4_500_000,
    timberPphRate: 0.5,
    notes: 'Harga standar Jati 2026',
    createdAt: '2026-09-28T14:15:00.000Z',
    updatedAt: '2026-09-28T14:15:00.000Z',
  },
  {
    id: 'ITM-W39-008-2',
```

#### ITM-W39-008-2

Cari:
```ts
    timberPricePerM3: null, // PENDING PRICING
    timberPphRate: 0.5,
    notes: 'Menunggu kesepakatan harga sortir pendek',
    createdAt: '2026-09-28T14:15:00.000Z',
    updatedAt: '2026-09-28T14:15:00.000Z',
  },
  {
    id: 'ITM-W40-009-1',
```

Ganti dengan:
```ts
    timberPricePerM3: 4_500_000,
    timberPphRate: 0.5,
    notes: 'Harga standar Jati 2026',
    createdAt: '2026-09-28T14:15:00.000Z',
    updatedAt: '2026-09-28T14:15:00.000Z',
  },
  {
    id: 'ITM-W40-009-1',
```

#### ITM-W40-009-1

Cari:
```ts
    timberPricePerM3: null, // PENDING PRICING
    timberPphRate: 0.5,
    notes: 'Keruing dalam proses negosiasi harga',
```

Ganti dengan:
```ts
    timberPricePerM3: 2_400_000,
    timberPphRate: 0.5,
    notes: 'Harga standar Keruing 2026',
```

#### ITM-W40-009-2

Cari:
```ts
    timberPricePerM3: null, // PENDING PRICING
    timberPphRate: 0.5,
    notes: 'Meranti dalam proses negosiasi harga',
```

Ganti dengan:
```ts
    timberPricePerM3: 2_600_000,
    timberPphRate: 0.5,
    notes: 'Harga standar Meranti 2026',
```

#### ITM-W41-010-1

Cari:
```ts
    timberPricePerM3: null, // PENDING PRICING
    timberPphRate: 0.5,
    notes: 'Sengon kiriman terbaru menunggu harga lelang',
```

Ganti dengan:
```ts
    timberPricePerM3: 950_000,
    timberPphRate: 0.5,
    notes: 'Harga standar Sengon 2026',
```

---

### Bagian B — Top-level Records (3 records, fix nama + `timberPricePerM3`)

#### rec-2026-10-08

Cari blok lengkap:
```ts
  createSeedWoodRecord({
    id: 'rec-2026-10-08',
    receiptDate: '2026-09-28',
    docDate: '2026-09-27',
    truckPlateNumber: 'K 4421 GA',
    forestryDocNumber: 'SKSHHK-2026-008',
    receiptNumber: 'KW-2026-008',
    contractNumber: 'CTR-JMS-2026-01',
    supplierName: 'CV Jati Makmur Sentosa',
    woodSpecies: 'Jati / Teak (柚木)',
```

Ganti `woodSpecies`:
```ts
    woodSpecies: 'Teak / Jati (柚木)',
```

Kemudian cari:
```ts
    timberPricePerM3: null, // PENDING PRICING
    timberPphRate: 0.5,
    freightRatePerM3: 200000,
```

Ganti dengan:
```ts
    timberPricePerM3: 4_500_000,
    timberPphRate: 0.5,
    freightRatePerM3: 200000,
```

#### rec-2026-10-09

Cari:
```ts
    woodSpecies: 'Keruing (克鲁)',
```

Ganti dengan:
```ts
    woodSpecies: 'Keruing (克隆木)',
```

Cari:
```ts
    timberPricePerM3: null, // PENDING PRICING
    timberPphRate: 0.5,
    freightRatePerM3: 310000,
```

Ganti dengan:
```ts
    timberPricePerM3: 2_400_000,
    timberPphRate: 0.5,
    freightRatePerM3: 310000,
```

#### rec-2026-10-10

Cari:
```ts
    woodSpecies: 'Sengon / Albasia (南洋楹)',
```

Ganti dengan:
```ts
    woodSpecies: 'Sengon / Albizia (南洋楹)',
```

Cari:
```ts
    timberPricePerM3: null, // PENDING PRICING
    timberPphRate: 0.5,
    freightRatePerM3: 125000,
```

Ganti dengan:
```ts
    timberPricePerM3: 950_000,
    timberPphRate: 0.5,
    freightRatePerM3: 125000,
```

---

## Patch DB Langsung

Seed data yang sudah difix hanya berlaku untuk fresh seed. DB yang sudah berjalan
perlu di-patch langsung:

```bash
node --input-type=module << 'EOF'
import { sqliteRecordStore } from './src/persistence/sqlite-record-store.ts';

const db = sqliteRecordStore.getDatabase();
const now = new Date().toISOString();

// Fix manifest items — timber_price_per_m3 saja
// (kolom lain dihitung ulang saat di-read via view, atau cukup update yg tersimpan)
const itemFixes = [
  { id: 'ITM-W39-008-1', price: 4500000, gross: 54000000,  pph: 270000,  net: 53730000,  grand: 53730000  },
  { id: 'ITM-W39-008-2', price: 4500000, gross: 33750000,  pph: 168750,  net: 33581250,  grand: 33581250  },
  { id: 'ITM-W40-009-1', price: 2400000, gross: 33600000,  pph: 168000,  net: 33432000,  grand: 33432000  },
  { id: 'ITM-W40-009-2', price: 2600000, gross: 29900000,  pph: 149500,  net: 29750500,  grand: 29750500  },
  { id: 'ITM-W41-010-1', price: 950000,  gross:  9310000,  pph:  46550,  net:  9263450,  grand:  9263450  },
];

const stmtItem = db.prepare(`
  UPDATE receiving_items SET
    timber_price_per_m3 = ?,
    timber_gross_total  = ?,
    timber_pph_amount   = ?,
    timber_net_payable  = ?,
    grand_net_payable   = ?,
    updated_at = ?
  WHERE id = ?
`);

for (const f of itemFixes) {
  const r = stmtItem.run(f.price, f.gross, f.pph, f.net, f.grand, now, f.id);
  console.log(`${r.changes > 0 ? '✅' : '❌'} item ${f.id} → Rp ${f.price.toLocaleString('id-ID')}`);
}

// Fix top-level records — nama species + timber_price_per_m3 + derived fields
const recordFixes = [
  { id: 'rec-2026-10-08', species: 'Teak / Jati (柚木)',    price: 4500000, gross: 87750000, pph: 438750, net: 87311250, grand: 91133250 },
  { id: 'rec-2026-10-09', species: 'Keruing (克隆木)',       price: 2400000, gross: 61200000, pph: 306000, net: 60894000, grand: 69040900 },
  { id: 'rec-2026-10-10', species: 'Sengon / Albizia (南洋楹)', price: 950000, gross: 9310000, pph: 46550, net: 9263450, grand: 10613950 },
];

const stmtRec = db.prepare(`
  UPDATE wood_receiving_records SET
    wood_species        = ?,
    timber_price_per_m3 = ?,
    timber_gross_total  = ?,
    timber_pph_amount   = ?,
    timber_net_payable  = ?,
    grand_net_payable   = ?,
    updated_at = ?
  WHERE id = ?
`);

for (const f of recordFixes) {
  const r = stmtRec.run(f.species, f.price, f.gross, f.pph, f.net, f.grand, now, f.id);
  console.log(`${r.changes > 0 ? '✅' : '❌'} record ${f.id} → "${f.species}" Rp ${f.price.toLocaleString('id-ID')}`);
}
EOF
```

---

## Checklist Lengkap

```
[ ] fixtures-receiving.ts — ITM-W39-008-1: null → 4_500_000, fix notes
[ ] fixtures-receiving.ts — ITM-W39-008-2: null → 4_500_000, fix notes
[ ] fixtures-receiving.ts — ITM-W40-009-1: null → 2_400_000, fix notes
[ ] fixtures-receiving.ts — ITM-W40-009-2: null → 2_600_000, fix notes
[ ] fixtures-receiving.ts — ITM-W41-010-1: null → 950_000, fix notes
[ ] fixtures-receiving.ts — rec-2026-10-08: woodSpecies fix + null → 4_500_000
[ ] fixtures-receiving.ts — rec-2026-10-09: woodSpecies fix + null → 2_400_000
[ ] fixtures-receiving.ts — rec-2026-10-10: woodSpecies fix + null → 950_000
[ ] Jalankan DB patch script
[ ] npm test → 0 fail
[ ] npm run build:check → 0 errors
[ ] npm run drift:check → 0 violations
[ ] Verify: grep "PENDING PRICING" src/persistence/seed/fixtures-receiving.ts → 0 hasil
[ ] Verify: grep "timberPricePerM3: null" src/persistence/seed/fixtures-receiving.ts → 0 hasil
```

---

## Verification

```bash
# Tidak ada lagi pending pricing di seed
grep "PENDING PRICING\|timberPricePerM3: null" src/persistence/seed/fixtures-receiving.ts
# Expected: 0 hasil

# Nama species di seed semua canonical
node --input-type=module << 'EOF'
import { SEED_WOOD_RECORDS } from './src/persistence/seed/fixtures-receiving.ts';
import { DEFAULT_TIMBER_SPECIES } from './src/utils/timber-species.ts';
const unpriced = SEED_WOOD_RECORDS.filter(r => r.timberPricePerM3 === null);
console.log('Unpriced records:', unpriced.length);
const nonCanonical = SEED_WOOD_RECORDS
  .filter(r => r.woodSpecies && !DEFAULT_TIMBER_SPECIES.includes(r.woodSpecies))
  .map(r => `${r.id}: "${r.woodSpecies}"`);
console.log('Non-canonical species:', nonCanonical.length > 0 ? nonCanonical : 'none ✅');
EOF

# DB patch berhasil
node --input-type=module << 'EOF'
import { sqliteRecordStore } from './src/persistence/sqlite-record-store.ts';
const db = sqliteRecordStore.getDatabase();
const rows = db.prepare(
  "SELECT id, timber_price_per_m3 FROM receiving_items WHERE timber_price_per_m3 IS NULL"
).all();
console.log('Receiving items masih null:', rows.length === 0 ? '✅ 0' : rows);
const recs = db.prepare(
  "SELECT id, wood_species, timber_price_per_m3 FROM wood_receiving_records WHERE timber_price_per_m3 IS NULL"
).all();
console.log('Records masih null:', recs.length === 0 ? '✅ 0' : recs);
EOF

npm test
```

---

## Commit Message

```
fix(seed): isi harga dan perbaiki nama species pada 8 record pending pricing

- fixtures-receiving.ts: 5 manifest items — timberPricePerM3 null → harga
  sesuai tabel harga (Jati 4.5jt, Keruing 2.4jt, Meranti 2.6jt, Sengon 950rb)
- fixtures-receiving.ts: 3 top-level records — fix woodSpecies ke canonical
  + isi timberPricePerM3 (rec-10-08 Jati, rec-10-09 Keruing, rec-10-10 Sengon)
- DB patch: UPDATE langsung untuk 8 rows agar DB sinkron dengan fixture baru

Dengan ADR-0018 (auto-fill) dan ADR-0019 (species sync), kondisi pending
pricing tidak lagi relevan sebagai contoh data seed.
```
