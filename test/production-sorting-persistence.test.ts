/**
 * test/production-sorting-persistence.test.ts
 *
 * Tests verifying SQLite schema migrations, inserts, updates, and deletes
 * for Sawmill Production Records and Stock Sorting Records.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createSqliteDatabase } from '../src/persistence/sqlite/db.ts';
import { runMigrations } from '../src/persistence/sqlite/migrations.ts';
import { seedStorageLocationsIfEmpty } from '../src/persistence/sqlite/storage-locations-db.ts';
import { ProductionQueries } from '../src/persistence/sqlite/production-queries.ts';
import { SortingQueries } from '../src/persistence/sqlite/sorting-queries.ts';

test('Production & Sorting SQLite Persistence Suite', async (t) => {
  const db = createSqliteDatabase(':memory:');
  runMigrations(db);
  seedStorageLocationsIfEmpty(db);
  t.after(() => db.close());

  const prodQueries = new ProductionQueries(db);
  const sortQueries = new SortingQueries(db);

  await t.test('SawmillProduction: insert and retrieve record with computed yield and waste', () => {
    const inserted = prodQueries.insert({
      id: 'prd-test-1',
      productionDate: '2026-10-21',
      shift: 'PAGI',
      sourceStorageYard: 'TPK-Timur',
      sourceKavlingNumber: 'KAV-01',
      inputSpecies: 'Jati',
      inputVolumeM3: 10.0,
      inputPieces: 20,
      outputProduct: 'Papan 2x20x400cm',
      outputVolumeM3: 7.0,
      outputPieces: 15,
      operatorName: 'Pak Budi',
      notes: 'Log grade A',
    });

    assert.equal(inserted.id, 'prd-test-1');
    assert.equal(inserted.yieldPercent, 70.0);
    assert.equal(inserted.wasteVolumeM3, 3.0);
    assert.equal(inserted.inputVolumeM3, 10.0);

    const fetched = prodQueries.getById('prd-test-1');
    assert.ok(fetched);
    assert.equal(fetched.outputProduct, 'Papan 2x20x400cm');
    assert.equal(fetched.yieldPercent, 70.0);
  });

  await t.test('SawmillProduction: update existing record', () => {
    const updated = prodQueries.update({
      id: 'prd-test-1',
      outputVolumeM3: 8.0,
      outputPieces: 18,
    });

    assert.equal(updated.outputVolumeM3, 8.0);
    assert.equal(updated.outputPieces, 18);
    assert.equal(updated.yieldPercent, 80.0);
    assert.equal(updated.wasteVolumeM3, 2.0);
  });

  await t.test('SawmillProduction: delete record', () => {
    prodQueries.delete('prd-test-1');
    const fetched = prodQueries.getById('prd-test-1');
    assert.equal(fetched, null);
  });

  await t.test('StockSorting: insert and retrieve transfer record', () => {
    const inserted = sortQueries.insert({
      id: 'srt-test-1',
      sortingDate: '2026-10-21',
      species: 'Jati',
      sourceStorageYard: 'TPK-Timur',
      sourceKavlingNumber: 'KAV-01',
      targetStorageYard: 'TPK-Timur',
      targetKavlingNumber: 'KAV-02',
      volumeM3: 4.5,
      pieces: 9,
      reason: 'Regrade B ke kavling sortimen kecil',
      operatorName: 'Pak Joko',
      notes: 'Sortir kayu bengkok',
    });

    assert.equal(inserted.id, 'srt-test-1');
    assert.equal(inserted.volumeM3, 4.5);
    assert.equal(inserted.pieces, 9);
    assert.equal(inserted.targetKavlingNumber, 'KAV-02');

    const fetched = sortQueries.getById('srt-test-1');
    assert.ok(fetched);
    assert.equal(fetched.reason, 'Regrade B ke kavling sortimen kecil');
  });

  await t.test('StockSorting: update existing record', () => {
    const updated = sortQueries.update({
      id: 'srt-test-1',
      volumeM3: 5.0,
      pieces: 10,
    });

    assert.equal(updated.volumeM3, 5.0);
    assert.equal(updated.pieces, 10);
  });

  await t.test('StockSorting: prevent self-transfer to same yard & kavling via check constraint', () => {
    assert.throws(() => {
      sortQueries.insert({
        id: 'srt-fail-1',
        sortingDate: '2026-10-21',
        species: 'Jati',
        sourceStorageYard: 'TPK-Timur',
        sourceKavlingNumber: 'KAV-01',
        targetStorageYard: 'TPK-Timur',
        targetKavlingNumber: 'KAV-01',
        volumeM3: 1.0,
        pieces: 2,
        reason: 'Invalid self-transfer',
        operatorName: 'Pak Joko',
      });
    });
  });

  await t.test('StockSorting: delete record', () => {
    sortQueries.delete('srt-test-1');
    const fetched = sortQueries.getById('srt-test-1');
    assert.equal(fetched, null);
  });
});
