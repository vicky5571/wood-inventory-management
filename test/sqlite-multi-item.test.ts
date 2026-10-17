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
  });

  await t.test('deleting manifest cascades and removes all associated line items', async () => {
    const deleted = await store.deleteManifest('man-multi-1');
    assert.strictEqual(deleted, true);

    const all = await store.getAll();
    assert.ok(!all.some((r) => r.manifest_id === 'man-multi-1'));
  });
});
