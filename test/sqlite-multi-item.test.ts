import test from 'node:test';
import assert from 'node:assert/strict';
import { SqliteRecordStore } from '../src/persistence/sqlite-record-store.ts';
import type { ManifestFormInput } from '../src/types/index.ts';

test('SqliteRecordStore Multi-Item Persistence Suite', async (t) => {
  const store = new SqliteRecordStore(':memory:');

  await t.test('saves a manifest with 2 line items and returns 2 projected flat records', async () => {
    const multiManifest: ManifestFormInput = {
      id: 'man-multi-1',
      receiptDate: '2026-10-18',
      truckPlateNumber: 'B 7777 WOD',
      forestryDocNumber: 'SKSHHK-MULTI-01',
      receiptNumber: 'KW-MULTI-01',
      contractNumber: 'CTR-MULTI-01',
      supplierName: 'PT Rimba Raya',
      freightRatePerM3: 150000,
      brokerFee: 200000,
      items: [
        {
          id: 'item-a',
          woodSpecies: 'Teak / Jati (柚木)',
          woodLengthM: 4.0,
          kavlingNumber: 'KAV-A',
          storageYard: 'TPK-1',
          deliveredPieces: 20,
          deliveredVolumeM3: 5.0,
          tallyPieces: 20,
          tallyVolumeM3: 5.0,
          timberPricePerM3: 4000000,
          timberPphRate: 0.5,
        },
        {
          id: 'item-b',
          woodSpecies: 'Mahoni (桃花心木)',
          woodLengthM: 3.0,
          kavlingNumber: 'KAV-B',
          storageYard: 'TPK-1',
          deliveredPieces: 15,
          deliveredVolumeM3: 3.0,
          tallyPieces: 15,
          tallyVolumeM3: 3.0,
          timberPricePerM3: 2000000,
          timberPphRate: 0.5,
        },
      ],
    };

    const flatRecords = await store.saveManifest(multiManifest);
    assert.strictEqual(flatRecords.length, 2, 'Must return 2 flat projected records for 2 line items');
    assert.strictEqual(flatRecords[0].manifest_id, 'man-multi-1');
    assert.strictEqual(flatRecords[1].manifest_id, 'man-multi-1');
    assert.notStrictEqual(flatRecords[0].id, flatRecords[1].id, 'Must have distinct synthetic IDs');
    assert.strictEqual(flatRecords[0].brokerFee, 125000, 'Broker fee allocated proportionally for item a (5/8 of 200k)');
    assert.strictEqual(flatRecords[1].brokerFee, 75000, 'Broker fee allocated proportionally for item b (3/8 of 200k)');
    assert.strictEqual(flatRecords[0].grandNetPayable + flatRecords[1].grandNetPayable, 27246000, 'Sum of grandNetPayable equals manifest total');
  });

  await t.test('delete() with synthetic id deletes line item and parent manifest when 0 items remain', async () => {
    const testManifest: ManifestFormInput = {
      id: 'man-synth-del',
      receiptDate: '2026-10-18',
      truckPlateNumber: 'B 3333 DEL',
      forestryDocNumber: 'DOC-DEL-01',
      receiptNumber: 'KW-DEL-01',
      contractNumber: 'CTR-DEL-01',
      supplierName: 'PT Delete Test',
      freightRatePerM3: 100000,
      brokerFee: 50000,
      items: [
        {
          id: 'item-d1',
          woodSpecies: 'Teak',
          woodLengthM: 4,
          kavlingNumber: 'K1',
          storageYard: 'Y1',
          deliveredPieces: 5,
          deliveredVolumeM3: 2,
          tallyPieces: 5,
          tallyVolumeM3: 2,
          timberPricePerM3: 1000000,
          timberPphRate: 0.5,
        },
        {
          id: 'item-d2',
          woodSpecies: 'Mahoni',
          woodLengthM: 4,
          kavlingNumber: 'K2',
          storageYard: 'Y1',
          deliveredPieces: 5,
          deliveredVolumeM3: 2,
          tallyPieces: 5,
          tallyVolumeM3: 2,
          timberPricePerM3: 1000000,
          timberPphRate: 0.5,
        },
      ],
    };

    const flat = await store.saveManifest(testManifest);
    assert.strictEqual(flat.length, 2);

    // Delete item 1 via synthetic ID
    const deletedItem1 = await store.delete('man-synth-del_item-d1');
    assert.strictEqual(deletedItem1, true);

    // One item remaining in manifest (now projected with single item id 'man-synth-del')
    const midState = await store.getAll();
    const remainingItems = midState.filter((r) => r.manifest_id === 'man-synth-del');
    assert.strictEqual(remainingItems.length, 1);
    assert.strictEqual(remainingItems[0].woodSpecies, 'Mahoni');

    // Delete last remaining item via manifest id
    const deletedLast = await store.delete('man-synth-del');
    assert.strictEqual(deletedLast, true);

    const finalState = await store.getAll();
    assert.ok(!finalState.some((r) => r.manifest_id === 'man-synth-del'));
  });

  await t.test('deleting manifest cascades and removes all associated line items', async () => {
    const deleted = await store.deleteManifest('man-multi-1');
    assert.strictEqual(deleted, true);

    const all = await store.getAll();
    assert.ok(!all.some((r) => r.manifest_id === 'man-multi-1'));
  });
});
