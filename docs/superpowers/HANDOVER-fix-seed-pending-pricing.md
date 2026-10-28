# HANDOVER — Fix Seed: Hapus Pending Pricing dari fixtures-receiving.ts

**Dibuat:** 2026-10-28
**Baseline:** 961 pass, 0 fail · 0 drift · build clean
**Plan:** docs/superpowers/plans/2026-10-28-fix-seed-pending-pricing.md

---

## === MANDATORY SESSION START ===

```bash
npm run drift:check   # harus 0 violations
npm test              # harus 961 pass, 0 fail
npm run build:check   # harus 0 errors
```

---

## === KONTEKS ===

8 records di `src/persistence/seed/fixtures-receiving.ts` masih punya
`timberPricePerM3: null // PENDING PRICING`. Ini sisa dari sebelum tabel
harga ada. Semua 8 records bisa diisi harga dari tabel harga yang sudah aktif.

2 records juga masih pakai nama species lama (sebelum ADR-0019):
- `rec-2026-10-09`: `Keruing (克鲁)` → harus `Keruing (克隆木)`
- `rec-2026-10-10`: `Sengon / Albasia (南洋楹)` → harus `Sengon / Albizia (南洋楹)`
- `rec-2026-10-08`: `Jati / Teak (柚木)` → harus `Teak / Jati (柚木)`

**Harga dari tabel harga:**
| Species | Harga/m³ | PPh |
|---------|----------|-----|
| `Teak / Jati (柚木)` | Rp 4.500.000 | 0.5% |
| `Keruing (克隆木)` | Rp 2.400.000 | 0.5% |
| `Meranti (柳安木)` | Rp 2.600.000 | 0.5% |
| `Sengon / Albizia (南洋楹)` | Rp 950.000 | 0.5% |

**File yang berubah:** hanya `src/persistence/seed/fixtures-receiving.ts` + DB patch.

---

## === PHASE 1 — Edit fixtures-receiving.ts (8 perubahan) ===

### 1-A: ITM-W39-008-1 — null → 4_500_000

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

### 1-B: ITM-W39-008-2 — null → 4_500_000

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

### 1-C: ITM-W40-009-1 — null → 2_400_000

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

### 1-D: ITM-W40-009-2 — null → 2_600_000

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

### 1-E: ITM-W41-010-1 — null → 950_000

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

### 1-F: rec-2026-10-08 — fix woodSpecies + null → 4_500_000

Cari:
```ts
    woodSpecies: 'Jati / Teak (柚木)',
```
(dalam blok `rec-2026-10-08`, bukan record lain)

Ganti dengan:
```ts
    woodSpecies: 'Teak / Jati (柚木)',
```

Lalu cari (dalam blok yang sama):
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

### 1-G: rec-2026-10-09 — fix woodSpecies + null → 2_400_000

Cari:
```ts
    woodSpecies: 'Keruing (克鲁)',
```

Ganti dengan:
```ts
    woodSpecies: 'Keruing (克隆木)',
```

Lalu cari (dalam blok yang sama):
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

### 1-H: rec-2026-10-10 — fix woodSpecies + null → 950_000

Cari:
```ts
    woodSpecies: 'Sengon / Albasia (南洋楹)',
```
(dalam blok `rec-2026-10-10`)

Ganti dengan:
```ts
    woodSpecies: 'Sengon / Albizia (南洋楹)',
```

Lalu cari (dalam blok yang sama):
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

### Checklist Phase 1
```
[ ] ITM-W39-008-1: null → 4_500_000
[ ] ITM-W39-008-2: null → 4_500_000
[ ] ITM-W40-009-1: null → 2_400_000
[ ] ITM-W40-009-2: null → 2_600_000
[ ] ITM-W41-010-1: null → 950_000
[ ] rec-2026-10-08: woodSpecies fix + null → 4_500_000
[ ] rec-2026-10-09: woodSpecies fix + null → 2_400_000
[ ] rec-2026-10-10: woodSpecies fix + null → 950_000
[ ] Verify: grep "PENDING PRICING" src/persistence/seed/fixtures-receiving.ts → 0 hasil
[ ] Verify: grep "timberPricePerM3: null" src/persistence/seed/fixtures-receiving.ts → 0 hasil
```

---

## === PHASE 2 — Patch DB Langsung ===

Jalankan script ini dari root project:

```bash
node --input-type=module << 'EOF'
import { sqliteRecordStore } from './src/persistence/sqlite-record-store.ts';

const db = sqliteRecordStore.getDatabase();
const now = new Date().toISOString();

// --- Manifest items ---
const itemFixes = [
  { id: 'ITM-W39-008-1', price: 4500000, gross: 54000000,  pph: 270000,  net: 53730000,  grand: 53730000  },
  { id: 'ITM-W39-008-2', price: 4500000, gross: 33750000,  pph: 168750,  net: 33581250,  grand: 33581250  },
  { id: 'ITM-W40-009-1', price: 2400000, gross: 33600000,  pph: 168000,  net: 33432000,  grand: 33432000  },
  { id: 'ITM-W40-009-2', price: 2600000, gross: 29900000,  pph: 149500,  net: 29750500,  grand: 29750500  },
  { id: 'ITM-W41-010-1', price:  950000, gross:  9310000,  pph:  46550,  net:  9263450,  grand:  9263450  },
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

// --- Top-level records ---
const recordFixes = [
  { id: 'rec-2026-10-08', species: 'Teak / Jati (柚木)',       price: 4500000, gross: 87750000, pph: 438750, net: 87311250, grand: 91133250 },
  { id: 'rec-2026-10-09', species: 'Keruing (克隆木)',          price: 2400000, gross: 61200000, pph: 306000, net: 60894000, grand: 69040900 },
  { id: 'rec-2026-10-10', species: 'Sengon / Albizia (南洋楹)', price:  950000, gross:  9310000, pph:  46550, net:  9263450, grand: 10613950 },
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

**Expected output:** 8 baris semua `✅`.

Jika ada `❌` — cek ID: mungkin record tidak ada di DB (fresh seed belum jalan).
Dalam kasus itu, DB akan update otomatis saat next seed run karena fixtures sudah difix.

### Checklist Phase 2
```
[ ] Script dijalankan
[ ] 5 item fixes: semua ✅
[ ] 3 record fixes: semua ✅
```

---

## === VERIFICATION GATE ===

```bash
# 1. Tidak ada pending pricing tersisa di fixture
grep "PENDING PRICING\|timberPricePerM3: null" src/persistence/seed/fixtures-receiving.ts
# Expected: 0 hasil

# 2. Semua species canonical
node --input-type=module << 'EOF'
import { SEED_WOOD_RECORDS } from './src/persistence/seed/fixtures-receiving.ts';
import { DEFAULT_TIMBER_SPECIES } from './src/utils/timber-species.ts';
const unpriced = SEED_WOOD_RECORDS.filter(r => r.timberPricePerM3 === null);
console.log('Unpriced records:', unpriced.length, unpriced.length === 0 ? '✅' : '❌');
const bad = SEED_WOOD_RECORDS.filter(r => r.woodSpecies && !DEFAULT_TIMBER_SPECIES.includes(r.woodSpecies)).map(r => r.id + ': ' + r.woodSpecies);
console.log('Non-canonical:', bad.length === 0 ? '✅ none' : bad);
EOF

# 3. DB bersih
node --input-type=module << 'EOF'
import { sqliteRecordStore } from './src/persistence/sqlite-record-store.ts';
const db = sqliteRecordStore.getDatabase();
const items = db.prepare("SELECT id FROM receiving_items WHERE timber_price_per_m3 IS NULL").all();
const recs  = db.prepare("SELECT id FROM wood_receiving_records WHERE timber_price_per_m3 IS NULL").all();
console.log('Items null:', items.length === 0 ? '✅ 0' : items);
console.log('Records null:', recs.length === 0 ? '✅ 0' : recs);
EOF

# 4. Tests
npm test
# Expected: 961 pass, 0 fail (angka tidak berubah — ini pure data fix)

# 5. Build + drift
npm run build:check && npm run drift:check
```

---

## === COMMIT MESSAGE ===

```
fix(seed): isi harga dan perbaiki nama species pada 8 record pending pricing

- 5 manifest items: timberPricePerM3 null → harga dari tabel harga
  (Jati 4.5jt, Keruing 2.4jt, Meranti 2.6jt, Sengon 950rb)
- 3 top-level records: fix woodSpecies ke canonical + isi timberPricePerM3
  (rec-10-08 Jati, rec-10-09 Keruing, rec-10-10 Sengon)
- DB patch: UPDATE langsung 8 rows agar DB sinkron dengan fixture

Dengan ADR-0018 + ADR-0019, pending pricing bukan workflow utama lagi.
Seed data harus mencerminkan kondisi normal: semua records sudah berharga.
```
