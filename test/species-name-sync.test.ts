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
