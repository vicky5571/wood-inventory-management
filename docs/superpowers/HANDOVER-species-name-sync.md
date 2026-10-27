# HANDOVER — Species Name Canonical Sync

**Dibuat:** 2026-10-28
**Branch:** vicky
**Baseline:** 963 pass, 0 fail · 0 drift · build clean
**ADR:** docs/adr/0019-species-name-canonical-sync.md
**Spec:** docs/superpowers/specs/2026-10-28-species-name-sync-design.md
**Plan:** docs/superpowers/plans/2026-10-28-species-name-sync.md

---

## === MANDATORY SESSION START ===

Verifikasi baseline sebelum menyentuh kode apapun:
```bash
npm run drift:check   # harus 0 violations
npm test              # harus 963 pass, 0 fail
npm run build:check   # harus 0 errors
```

Jika berbeda → stop, investigasi dulu.

---

## === KONTEKS SINGKAT ===

### Masalah
`lookupPriceForRecord()` melakukan exact case-insensitive match pada `woodSpecies`.
Operator memilih species dari combobox yang bersumber dari `DEFAULT_TIMBER_SPECIES`.
Jika tabel harga menyimpan nama berbeda satu karakter pun → auto-fill gagal diam-diam.

Contoh yang sudah terjadi dan sudah difix manual 2026-10-28:
- `Jati / Teak (柚木)` → harusnya `Teak / Jati (柚木)`
- `Mahoni (桃花心木)` → harusnya `Mahoni / Mahogany (桃花心木)`
- `Sengon / Albasia` → harusnya `Sengon / Albizia` (typo)
- `Keruing (克鲁)` → harusnya `Keruing (克隆木)`

### Solusi
Tambahkan normalisasi di `savePriceEntryToDb`: sebelum INSERT, cek apakah
`woodSpeciesName` match (case-insensitive) ke salah satu entry `TIMBER_SPECIES_CATALOGUE`.
Jika ya → gunakan `commonName` canonical. Jika tidak → simpan as-is (custom species).

### Yang berubah
| File | Perubahan |
|------|-----------|
| `src/persistence/sqlite/price-queries.ts` | Import catalogue + 3 baris normalisasi + 2 substitusi variabel |
| `test/species-name-sync.test.ts` | File baru, 5 unit test |

### Yang TIDAK berubah
- `src/utils/timber-species.ts` — SSOT, tidak disentuh
- `src/utils/price-lookup.ts` — tidak disentuh
- `src/components/prices/PriceFormModal.tsx` — tidak disentuh
- API endpoints, DB schema, types SSOT

---

## === PHASE 1 — price-queries.ts ===

**File:** `src/persistence/sqlite/price-queries.ts` (167 baris)

### Step 1A — Import `TIMBER_SPECIES_CATALOGUE`

Cari (baris 6):
```ts
import type { TimberPriceEntry } from '../../types/index.ts';
```

Tambahkan tepat sesudahnya:
```ts
import { TIMBER_SPECIES_CATALOGUE } from '../../utils/timber-species.ts';
```

### Step 1B — Tambah 3 baris normalisasi

Cari blok ini (baris 95-97):
```ts
  const woodSpeciesName = entry.woodSpecies?.trim() || (
    (db.prepare(`SELECT common_name FROM wood_species WHERE id = ?;`).get(speciesId) as { common_name: string } | undefined)?.common_name || speciesId
  );
```

Ganti dengan:
```ts
  const woodSpeciesName = entry.woodSpecies?.trim() || (
    (db.prepare(`SELECT common_name FROM wood_species WHERE id = ?;`).get(speciesId) as { common_name: string } | undefined)?.common_name || speciesId
  );
  const catalogueMatch = TIMBER_SPECIES_CATALOGUE.find(
    (s) => s.commonName.toLowerCase() === woodSpeciesName.toLowerCase()
  );
  const normalizedSpeciesName = catalogueMatch ? catalogueMatch.commonName : woodSpeciesName;
```

### Step 1C — Ganti `woodSpeciesName` → `normalizedSpeciesName` di `.run()`

Di dalam `.run(...)`, `woodSpeciesName` adalah argumen ke-4 (setelah `speciesId`).
Cari argumen tersebut:
```ts
    woodSpeciesName,
```

Ganti dengan:
```ts
    normalizedSpeciesName,
```

> **Perhatian:** Ada satu kemunculan di `.run()`. Jangan ubah variabel `woodSpeciesName`
> yang lain (di baris resolve di atas).

### Step 1D — Ganti `woodSpeciesName` → `normalizedSpeciesName` di return

Cari (baris 132):
```ts
  return { ...entry, id, speciesId, woodSpecies: woodSpeciesName, createdAt: now, updatedAt: now } as TimberPriceEntry;
```

Ganti dengan:
```ts
  return { ...entry, id, speciesId, woodSpecies: normalizedSpeciesName, createdAt: now, updatedAt: now } as TimberPriceEntry;
```

### Checklist Phase 1
```
[ ] Import TIMBER_SPECIES_CATALOGUE ditambahkan (baris 7)
[ ] 3 baris normalisasi ditambahkan setelah woodSpeciesName di-resolve
[ ] woodSpeciesName → normalizedSpeciesName di .run() (1 tempat)
[ ] woodSpeciesName → normalizedSpeciesName di return (1 tempat)
[ ] wc -l src/persistence/sqlite/price-queries.ts → ~171 (< 250 ✅)
```

---

## === PHASE 2 — Test Baru ===

**File:** `test/species-name-sync.test.ts` (buat baru)

Buat file ini dengan isi berikut persis:

```ts
/**
 * test/species-name-sync.test.ts
 *
 * Unit tests untuk normalisasi nama species di savePriceEntryToDb.
 * Memastikan TIMBER_SPECIES_CATALOGUE menjadi canonical source untuk
 * wood_species_name yang disimpan ke DB.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { savePriceEntryToDb, ensurePriceTables } from '../src/persistence/sqlite/price-queries.ts';

function makeTestDb(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
    INSERT INTO tenants VALUES ('default-tenant', 'Test Tenant');

    CREATE TABLE wood_species (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      common_name TEXT NOT NULL,
      is_hardwood INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    INSERT INTO wood_species VALUES
      ('sp-teak',    'TEAK',    'Teak / Jati (柚木)',           1, '2026-01-01', '2026-01-01'),
      ('sp-meranti', 'MERANTI', 'Meranti (柳安木)',              0, '2026-01-01', '2026-01-01'),
      ('sp-mahoni',  'MAHONI',  'Mahoni / Mahogany (桃花心木)', 1, '2026-01-01', '2026-01-01');

    CREATE TABLE suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  ensurePriceTables(db);
  return db;
}

function baseEntry() {
  return {
    tenantId: 'default-tenant',
    speciesId: 'sp-teak',
    woodSpecies: 'Teak / Jati (柚木)',
    effectiveFrom: '2026-01-01',
    pricePerM3: 4_500_000,
    timberPphRate: 0.5,
  };
}

test('species-name-sync: nama canonical disimpan as-is', () => {
  const db = makeTestDb();
  const result = savePriceEntryToDb(db, baseEntry());
  assert.equal(result.woodSpecies, 'Teak / Jati (柚木)');
});

test('species-name-sync: nama lowercase dinormalisasi ke canonical', () => {
  const db = makeTestDb();
  const result = savePriceEntryToDb(db, { ...baseEntry(), woodSpecies: 'teak / jati (柚木)' });
  assert.equal(result.woodSpecies, 'Teak / Jati (柚木)');
});

test('species-name-sync: nama uppercase dinormalisasi ke canonical', () => {
  const db = makeTestDb();
  const result = savePriceEntryToDb(db, {
    ...baseEntry(), speciesId: 'sp-meranti', woodSpecies: 'MERANTI (柳安木)',
  });
  assert.equal(result.woodSpecies, 'Meranti (柳安木)');
});

test('species-name-sync: custom species tidak di-katalog disimpan as-is', () => {
  const db = makeTestDb();
  const result = savePriceEntryToDb(db, {
    ...baseEntry(), woodSpecies: 'Kayu Custom Eksotis',
  });
  assert.equal(result.woodSpecies, 'Kayu Custom Eksotis');
});

test('species-name-sync: return value woodSpecies menggunakan normalized name', () => {
  const db = makeTestDb();
  const result = savePriceEntryToDb(db, {
    ...baseEntry(), speciesId: 'sp-mahoni', woodSpecies: 'mahoni / mahogany (桃花心木)',
  });
  assert.equal(result.woodSpecies, 'Mahoni / Mahogany (桃花心木)');
});
```

### Checklist Phase 2
```
[ ] Buat file test/species-name-sync.test.ts
[ ] npm test menunjukkan 5 test baru pass
```

---

## === JIKA TEST GAGAL ===

### Kemungkinan 1: Schema `makeTestDb()` tidak cocok

`ensurePriceTables` memerlukan tabel `tenants`, `wood_species`, `suppliers`.
Jika ada FK lain yang dibutuhkan (misal `receiving_items`), tambahkan ke `makeTestDb()`.
Cek error message dari test untuk tahu FK mana yang kurang.

### Kemungkinan 2: `wood_species` column name salah

Cek schema aktual:
```bash
node --input-type=module << 'EOF'
import { sqliteRecordStore } from './src/persistence/sqlite-record-store.ts';
const db = sqliteRecordStore.getDatabase();
const info = db.prepare("PRAGMA table_info(wood_species)").all();
console.log(JSON.stringify(info, null, 2));
EOF
```

Sesuaikan nama kolom di `INSERT INTO wood_species` di `makeTestDb()`.

### Kemungkinan 3: Normalisasi tidak bekerja untuk test case

Verifikasi manual:
```bash
node --input-type=module << 'EOF'
import { TIMBER_SPECIES_CATALOGUE } from './src/utils/timber-species.ts';
const test = 'teak / jati (柚木)';
const match = TIMBER_SPECIES_CATALOGUE.find(
  s => s.commonName.toLowerCase() === test.toLowerCase()
);
console.log('match:', match?.commonName ?? 'TIDAK ADA');
EOF
```

---

## === VERIFICATION GATE ===

```bash
# 1. Tests — >= 968 pass (963 + 5 baru), 0 fail
npm test

# 2. Build
npm run build:check

# 3. Drift
npm run drift:check

# 4. Normalisasi ada di price-queries.ts
grep -n "normalizedSpeciesName\|catalogueMatch\|TIMBER_SPECIES_CATALOGUE" \
  src/persistence/sqlite/price-queries.ts
# Expected: 4+ baris

# 5. LOC
wc -l src/persistence/sqlite/price-queries.ts
# Expected: ~171 (< 250 ✅)
```

---

## === COMMIT MESSAGE ===

```
feat(prices): normalisasi nama species ke canonical saat simpan ke DB

- savePriceEntryToDb: setelah resolve woodSpeciesName, cari match
  case-insensitive di TIMBER_SPECIES_CATALOGUE; jika match → gunakan
  commonName canonical; jika tidak → simpan as-is (custom species)
- test: 5 unit test di species-name-sync.test.ts (canonical, lowercase,
  uppercase, custom, return value)

Mencegah mismatch antara combobox (DEFAULT_TIMBER_SPECIES) dan tabel
harga yang menyebabkan lookupPriceForRecord gagal tanpa error.

Implements ADR-0019.
```

---

## === CATATAN PENTING ===

1. **Hanya case normalization, bukan typo fixing** — `Sengon / Albasia` (typo) tidak
   akan dinormalisasi ke `Sengon / Albizia` karena keduanya beda string bukan hanya case.
   Typo dicegah dari UI (dropdown modal). Data historis sudah difix manual 2026-10-28.

2. **`TIMBER_SPECIES_CATALOGUE` vs `DEFAULT_TIMBER_SPECIES` harus sinkron** — saat ini
   sudah selaras. Jika ditambah species baru di masa depan, update **keduanya** dan
   jalankan SQL UPDATE untuk data historis.

3. **2 tempat substitusi `normalizedSpeciesName`** — satu di `.run()` (INSERT), satu di
   `return`. Keduanya harus diganti. Jangan tinggalkan salah satu pakai `woodSpeciesName`.

4. **`woodSpeciesName` tetap ada** — variabel itu digunakan sebagai intermediate sebelum
   normalisasi. Jangan hapus, hanya tambahkan 3 baris setelahnya.
