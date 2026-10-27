# Implementation Plan: Species Name Canonical Sync

**Tanggal:** 2026-10-28
**ADR:** docs/adr/0019-species-name-canonical-sync.md
**Spec:** docs/superpowers/specs/2026-10-28-species-name-sync-design.md
**Estimasi:** ~25 menit

---

## Baseline

```bash
npm test              # 963 pass, 0 fail
npm run build:check   # 0 errors
npm run drift:check   # 0 violations
```

Cek sebelum mulai. Jika berbeda, stop dan investigasi.

---

## Overview

Satu file diubah (`price-queries.ts`), satu file baru dibuat (test).
Tidak ada perubahan API, schema, atau type.

| Phase | File | Jenis |
|-------|------|-------|
| 1 | `src/persistence/sqlite/price-queries.ts` | Edit |
| 2 | `test/species-name-sync.test.ts` | Buat baru |

---

## Phase 1 — Normalisasi di `savePriceEntryToDb`

**File:** `src/persistence/sqlite/price-queries.ts` (167 baris)

### Step 1A — Tambah import `TIMBER_SPECIES_CATALOGUE`

Cari baris 6 (import type):
```ts
import type { TimberPriceEntry } from '../../types/index.ts';
```

Tambahkan tepat sesudahnya:
```ts
import { TIMBER_SPECIES_CATALOGUE } from '../../utils/timber-species.ts';
```

### Step 1B — Tambah normalisasi setelah `woodSpeciesName` di-resolve

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

### Step 1C — Ganti `woodSpeciesName` dengan `normalizedSpeciesName` di INSERT dan return

Cari (dalam `.run(...)` — baris 116-131):
```ts
    woodSpeciesName,
```
(Baris keempat di `.run(...)` setelah `speciesId`)

Ganti dengan:
```ts
    normalizedSpeciesName,
```

Cari di return statement (baris 132):
```ts
  return { ...entry, id, speciesId, woodSpecies: woodSpeciesName, createdAt: now, updatedAt: now } as TimberPriceEntry;
```

Ganti dengan:
```ts
  return { ...entry, id, speciesId, woodSpecies: normalizedSpeciesName, createdAt: now, updatedAt: now } as TimberPriceEntry;
```

### Checklist Phase 1
```
[ ] Import TIMBER_SPECIES_CATALOGUE di baris 7
[ ] Tambah 3 baris normalisasi setelah woodSpeciesName di-resolve
[ ] Ganti woodSpeciesName → normalizedSpeciesName di .run() (1 tempat)
[ ] Ganti woodSpeciesName → normalizedSpeciesName di return (1 tempat)
[ ] Verify: wc -l src/persistence/sqlite/price-queries.ts → 171 (naik 4 baris)
```

---

## Phase 2 — Test Baru

**File:** `test/species-name-sync.test.ts` (buat baru)

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

/**
 * Buat in-memory DB minimal yang cukup untuk savePriceEntryToDb.
 * Butuh: tenants, wood_species, suppliers (untuk FK).
 */
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
  // Pakai speciesId yang valid, tapi nama custom (tidak ada di TIMBER_SPECIES_CATALOGUE)
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
[ ] Semua 5 test pass
```

---

## Verification Gate

Jalankan setelah Phase 2 selesai:

```bash
# 1. Tests — harus 968 pass (963 + 5 baru), 0 fail
npm test

# 2. Build
npm run build:check

# 3. Drift
npm run drift:check

# 4. Verifikasi normalisasi ada di price-queries.ts
grep -n "normalizedSpeciesName\|catalogueMatch\|TIMBER_SPECIES_CATALOGUE" \
  src/persistence/sqlite/price-queries.ts
# Expected: 3+ baris

# 5. LOC check
wc -l src/persistence/sqlite/price-queries.ts
# Expected: ~171 baris (< 250 ✅)
```

---

## Rollback

Jika ada test fail:
1. Revert import TIMBER_SPECIES_CATALOGUE dari `price-queries.ts`
2. Revert 3 baris normalisasi
3. Revert 2 substitusi `woodSpeciesName` → `normalizedSpeciesName`
4. Hapus `test/species-name-sync.test.ts`

---

## Commit Message

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

## Catatan Penting

1. **Hanya case normalization, bukan typo fixing** — `Sengon / Albasia` (typo lama)
   tidak akan dinormalisasi ke `Sengon / Albizia` karena case-insensitive compare
   memerlukan string identik kecuali case. Typo dicegah dari UI (dropdown modal).
   Data historis sudah difix manual 2026-10-28.

2. **`TIMBER_SPECIES_CATALOGUE` vs `DEFAULT_TIMBER_SPECIES`** — keduanya harus sinkron.
   `TIMBER_SPECIES_CATALOGUE[i].commonName === DEFAULT_TIMBER_SPECIES[i]` untuk semua i.
   Saat ini sudah benar. Jika ditambah species baru, update **keduanya**.

3. **In-memory DB test** — `makeTestDb()` di test file menggunakan FK yang minimal.
   Jika schema `timber_price_entries` berubah (kolom baru), update `ensurePriceTables`
   dan test DB setup sesuai.

4. **`savePriceEntryToDb` LOC setelah edit** — naik dari 167 ke ~171 baris. Masih
   sangat jauh dari batas 250.
