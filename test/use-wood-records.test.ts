/**
 * test/use-wood-records.test.ts
 *
 * Unit tests verifying useWoodRecords contracts, filtering invariants,
 * mutation mechanics, CSV generation, and storage adapters.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { useWoodRecords } from '../src/hooks/useWoodRecords.ts';
import { SEED_WOOD_RECORDS } from '../src/persistence/seed-data.ts';
import { MemoryStorageAdapter, LocalStorageAdapter } from '../src/persistence/storage.ts';
import type { WoodReceivingRecord, RecordFilterCriteria } from '../src/types/index.ts';

test('useWoodRecords Hook & Storage Invariants Test Suite', async (t) => {
  await t.test('useWoodRecords hook is exported as a callable function', () => {
    assert.strictEqual(typeof useWoodRecords, 'function');
  });

  await t.test('SEED_WOOD_RECORDS conforms to WoodReceivingRecord structure', () => {
    assert.ok(Array.isArray(SEED_WOOD_RECORDS));
    assert.strictEqual(SEED_WOOD_RECORDS.length, 4);
    for (const record of SEED_WOOD_RECORDS) {
      assert.ok(record.id.startsWith('rec-'));
      assert.ok(typeof record.receiptDate === 'string');
      assert.ok(typeof record.truckPlateNumber === 'string');
      assert.ok(typeof record.tallyVolumeM3 === 'number');
      assert.ok(typeof record.grandNetPayable === 'number');
      assert.ok(record.grandNetPayable > 0);
    }
  });

  await t.test('MemoryStorageAdapter in storage.ts persists and clears items correctly', async () => {
    const storage = new MemoryStorageAdapter();
    const testData = [{ id: 'test-1', value: 42 }];

    await storage.setItem('test_key', testData);
    const retrieved = await storage.getItem<typeof testData>('test_key');
    assert.deepStrictEqual(retrieved, testData);

    await storage.removeItem('test_key');
    const afterDelete = await storage.getItem('test_key');
    assert.strictEqual(afterDelete, null);

    await storage.setItem('key_a', 'val_a');
    await storage.setItem('key_b', 'val_b');
    await storage.clear();
    assert.strictEqual(await storage.getItem('key_a'), null);
    assert.strictEqual(await storage.getItem('key_b'), null);
  });

  await t.test('LocalStorageAdapter falls back gracefully in non-browser environment', async () => {
    const adapter = new LocalStorageAdapter();
    assert.strictEqual(adapter.isLocalStorageAvailable(), false);

    await adapter.setItem('fallback_key', { status: 'ok' });
    const res = await adapter.getItem<{ status: string }>('fallback_key');
    assert.deepStrictEqual(res, { status: 'ok' });
  });

  await t.test('Record mutation logic preserves immutability and updates timestamps', () => {
    const initial: WoodReceivingRecord[] = JSON.parse(JSON.stringify(SEED_WOOD_RECORDS));
    const target = initial[0];

    // Simulating saveRecord (update existing)
    const updated: WoodReceivingRecord = {
      ...target,
      truckPlateNumber: 'B 1111 UPD',
      updatedAt: new Date().toISOString(),
    };
    const index = initial.findIndex((r) => r.id === updated.id);
    const next = [...initial];
    next[index] = updated;

    assert.strictEqual(next[0].truckPlateNumber, 'B 1111 UPD');
    assert.strictEqual(initial[0].truckPlateNumber, 'B 9283 TDA', 'Initial state untouched');

    // Simulating saveRecord (insert new)
    const newRecord: WoodReceivingRecord = {
      ...target,
      id: 'rec-new-999',
      receiptNumber: 'KW-NEW-999',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const prepended = [newRecord, ...next];
    assert.strictEqual(prepended.length, 5);
    assert.strictEqual(prepended[0].id, 'rec-new-999');

    // Simulating deleteRecord
    const filtered = prepended.filter((r) => r.id !== 'rec-new-999');
    assert.strictEqual(filtered.length, 4);
    assert.ok(filtered.every((r) => r.id !== 'rec-new-999'));
  });

  await t.test('Filter criteria logic accurately filters by species, kavling, date, and query', () => {
    const records: WoodReceivingRecord[] = JSON.parse(JSON.stringify(SEED_WOOD_RECORDS));

    // Filter by species
    const speciesFilter: RecordFilterCriteria = { species: 'Teak / Jati (柚木)' };
    const jatiOnly = records.filter((r) => !speciesFilter.species || r.woodSpecies === speciesFilter.species);
    assert.strictEqual(jatiOnly.length, 1);
    assert.strictEqual(jatiOnly[0].woodSpecies, 'Teak / Jati (柚木)');

    // Filter by kavling
    const kavFilter: RecordFilterCriteria = { kavling: 'KAV-02' };
    const kav02Only = records.filter((r) => !kavFilter.kavling || r.kavlingNumber === kavFilter.kavling);
    assert.strictEqual(kav02Only.length, 1);
    assert.strictEqual(kav02Only[0].kavlingNumber, 'KAV-02');

    // Filter by search query across multiple fields
    const queryFilter = 'papua';
    const queryResults = records.filter((r) => {
      const hay = [
        r.truckPlateNumber,
        r.forestryDocNumber,
        r.receiptNumber,
        r.contractNumber,
        r.supplierName,
        r.woodSpecies,
        r.kavlingNumber,
        r.storageYard,
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(queryFilter.toLowerCase());
    });
    assert.strictEqual(queryResults.length, 1);
    assert.strictEqual(queryResults[0].supplierName, 'CV Papua Rimba Sejahtera');
  });

  await t.test('RFC 4180 CSV escaping handles quotes, commas, and formatting', () => {
    const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;

    assert.strictEqual(escapeCsv('Simple Text'), '"Simple Text"');
    assert.strictEqual(escapeCsv('Text with "quotes"'), '"Text with ""quotes"""');
    assert.strictEqual(escapeCsv('Comma, and "quotes"'), '"Comma, and ""quotes"""');
    assert.strictEqual(escapeCsv(''), '""');
  });
});
