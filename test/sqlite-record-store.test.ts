import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SqliteRecordStore, sqliteRecordStore } from '../src/persistence/sqlite-record-store.ts';
import type { WoodReceivingRecord } from '../src/types/index.ts';

test('SqliteRecordStore CRUD & Contract Suite', async (t) => {
  const store = new SqliteRecordStore(':memory:');

  await t.test('initializes and hydrates seed data automatically on first getAll', async () => {
    const records = await store.getAll();
    assert.ok(records.length > 0, 'must have hydrated seed records');
    assert.ok(records[0].grandNetPayable > 0, 'must have calculated grandNetPayable');
  });

  await t.test('saves new record and returns fully computed record', async () => {
    const newRecord: WoodReceivingRecord = {
      id: '',
      receiptDate: '2026-10-18',
      truckPlateNumber: 'B 9999 XYZ',
      forestryDocNumber: 'SKSHHK-NEW-01',
      receiptNumber: 'KW-NEW-01',
      contractNumber: 'CTR-NEW-01',
      supplierName: 'PT Kayu Bersama',
      woodSpecies: 'Teak / Jati (柚木)',
      woodLengthM: 4.0,
      kavlingNumber: 'KAV-NEW',
      storageYard: 'TPK-Barat',
      deliveredPieces: 100,
      deliveredVolumeM3: 20.0,
      tallyPieces: 100,
      tallyVolumeM3: 20.0,
      timberPricePerM3: 3000000,
      timberGrossTotal: 0,
      timberPphRate: 0.5,
      timberPphAmount: 0,
      timberNetPayable: 0,
      freightRatePerM3: 100000,
      freightGrossTotal: 0,
      freightPphAmount: 0,
      freightNetPayable: 0,
      brokerFee: 0,
      grandNetPayable: 0,
      createdAt: '',
      updatedAt: '',
    };

    const saved = await store.save(newRecord);
    assert.ok(saved.id.length > 0, 'must assign an ID');
    assert.strictEqual(saved.timberGrossTotal, 60000000);
    assert.strictEqual(saved.timberPphAmount, 300000);
    assert.strictEqual(saved.timberNetPayable, 59700000);
    assert.strictEqual(saved.freightGrossTotal, 2000000);
    assert.strictEqual(saved.grandNetPayable, 61660000);

    const fetched = await store.getById(saved.id);
    assert.ok(fetched);
    assert.strictEqual(fetched?.truckPlateNumber, 'B 9999 XYZ');
    assert.strictEqual(fetched?.supplierName, 'PT Kayu Bersama');
    assert.strictEqual(fetched?.storageYard, 'TPK-Barat');
    assert.strictEqual(fetched?.kavlingNumber, 'KAV-NEW');
  });

  await t.test('updates existing record and re-calculates financials dynamically', async () => {
    const records = await store.getAll();
    const target = records[0];

    const updatedInput: WoodReceivingRecord = {
      ...target,
      truckPlateNumber: 'B 1234 UPD',
      tallyVolumeM3: 10.0,
      timberPricePerM3: 2000000,
      timberPphRate: 1.0,
      freightRatePerM3: 50000,
      brokerFee: 100000,
    };

    const updated = await store.save(updatedInput);
    assert.strictEqual(updated.id, target.id);
    assert.strictEqual(updated.truckPlateNumber, 'B 1234 UPD');
    // Timber gross: 10.0 * 2,000,000 = 20,000,000
    assert.strictEqual(updated.timberGrossTotal, 20000000);
    // Timber PPh: 20,000,000 * 1% = 200,000
    assert.strictEqual(updated.timberPphAmount, 200000);
    // Timber Net: 20,000,000 - 200,000 = 19,800,000
    assert.strictEqual(updated.timberNetPayable, 19800000);
    // Freight gross: 10.0 * 50,000 = 500,000
    assert.strictEqual(updated.freightGrossTotal, 500000);
    // Freight PPh: 500,000 * 2% = 10,000
    assert.strictEqual(updated.freightPphAmount, 10000);
    // Freight Net: 500,000 - 10,000 = 490,000
    assert.strictEqual(updated.freightNetPayable, 490000);
    // Grand Net: 19,800,000 + 490,000 + 100,000 = 20,390,000
    assert.strictEqual(updated.grandNetPayable, 20390000);

    const refetched = await store.getById(target.id);
    assert.ok(refetched);
    assert.strictEqual(refetched?.truckPlateNumber, 'B 1234 UPD');
    assert.strictEqual(refetched?.grandNetPayable, 20390000);
  });

  await t.test('deletes record by id and returns false for nonexistent id', async () => {
    const records = await store.getAll();
    const target = records[0];
    const initialCount = records.length;

    const deleted = await store.delete(target.id);
    assert.strictEqual(deleted, true);

    const check = await store.getById(target.id);
    assert.strictEqual(check, null);

    const afterDelete = await store.getAll();
    assert.strictEqual(afterDelete.length, initialCount - 1);

    const deleteAgain = await store.delete('non-existent-id');
    assert.strictEqual(deleteAgain, false);
  });

  await t.test('reset clears and re-hydrates seed data', async () => {
    const resetRecords = await store.reset();
    assert.ok(resetRecords.length >= 4, 'must restore seed records');
    const first = resetRecords[0];
    assert.ok(first.grandNetPayable > 0);

    const all = await store.getAll();
    assert.strictEqual(all.length, resetRecords.length);
  });

  await t.test('singleton sqliteRecordStore is exported and valid', async () => {
    assert.ok(sqliteRecordStore);
    assert.strictEqual(typeof sqliteRecordStore.getAll, 'function');
    assert.strictEqual(typeof sqliteRecordStore.getById, 'function');
    assert.strictEqual(typeof sqliteRecordStore.save, 'function');
    assert.strictEqual(typeof sqliteRecordStore.delete, 'function');
    assert.strictEqual(typeof sqliteRecordStore.reset, 'function');
  });

  await t.test('preserves empty state across restart without resurrecting seed data when manifests are deleted', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'wood-test-restart-'));
    const dbPath = join(tmpDir, 'test.db');
    try {
      const store1 = new SqliteRecordStore(dbPath);
      const initial = await store1.getAll();
      assert.ok(initial.length > 0, 'initial store must hydrate seed data');

      for (const rec of initial) {
        await store1.delete(rec.id);
      }
      const emptyCheck = await store1.getAll();
      assert.strictEqual(emptyCheck.length, 0);
      store1.close();

      // Restart store on same db file
      const store2 = new SqliteRecordStore(dbPath);
      const afterRestart = await store2.getAll();
      assert.strictEqual(afterRestart.length, 0, 'must not re-seed when tenants exist');
      store2.close();
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
