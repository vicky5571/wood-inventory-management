import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { useWoodRecords } from '../src/hooks/useWoodRecords.ts';
import { toastStore } from '../src/utils/toast-store.ts';
import type { ManifestFormInput } from '../src/types/index.ts';

function renderHook<T>(hookFn: () => T): T {
  let result: T | undefined;
  function Component() {
    result = hookFn();
    return null;
  }
  renderToString(React.createElement(Component));
  return result as T;
}

test('useWoodRecords Multi-Item Manifest Integration Suite', async (t) => {
  await t.test('useWoodRecords exports saveManifest method', () => {
    const hook = renderHook(useWoodRecords);
    assert.ok(hook);
    assert.strictEqual(typeof hook.saveManifest, 'function', 'saveManifest must be exported as a function');
  });

  await t.test('saveManifest flattens multi-item manifest and returns WoodReceivingRecord items', async () => {
    const hook = renderHook(useWoodRecords);

    const manifestInput: ManifestFormInput = {
      id: 'man-test-client-1',
      receiptDate: '2026-10-18',
      truckPlateNumber: 'B 9999 TIM',
      forestryDocNumber: 'SKSHHK-TEST-01',
      receiptNumber: 'KW-TEST-01',
      contractNumber: 'CTR-TEST-01',
      supplierName: 'PT Kayu Bersama',
      freightRatePerM3: 120000,
      brokerFee: 150000,
      items: [
        {
          id: 'item-1',
          woodSpecies: 'Teak / Jati (柚木)',
          woodLengthM: 4.0,
          kavlingNumber: 'KAV-01',
          storageYard: 'TPK-1',
          deliveredPieces: 10,
          deliveredVolumeM3: 2.5,
          tallyPieces: 10,
          tallyVolumeM3: 2.5,
          timberPricePerM3: 5000000,
          timberPphRate: 0.5,
        },
        {
          id: 'item-2',
          woodSpecies: 'Merbau (波罗格)',
          woodLengthM: 4.0,
          kavlingNumber: 'KAV-02',
          storageYard: 'TPK-1',
          deliveredPieces: 8,
          deliveredVolumeM3: 2.0,
          tallyPieces: 8,
          tallyVolumeM3: 2.0,
          timberPricePerM3: 6000000,
          timberPphRate: 0.5,
        },
      ],
    };

    const savedRecords = await hook.saveManifest(manifestInput);
    assert.ok(Array.isArray(savedRecords), 'saveManifest must return an array of records');
    assert.strictEqual(savedRecords.length, 2, 'Must return 2 records for 2 line items');

    const [rec1, rec2] = savedRecords;
    assert.strictEqual(rec1.manifest_id, 'man-test-client-1');
    assert.strictEqual(rec2.manifest_id, 'man-test-client-1');
    assert.strictEqual(rec1.id, 'man-test-client-1_item-1');
    assert.strictEqual(rec2.id, 'man-test-client-1_item-2');
    assert.strictEqual(rec1.woodSpecies, 'Teak / Jati (柚木)');
    assert.strictEqual(rec2.woodSpecies, 'Merbau (波罗格)');
    assert.strictEqual(rec1.timberGrossTotal, 12500000);
    assert.strictEqual(rec2.timberGrossTotal, 12000000);
  });

  await t.test('saveManifest with single item projects id as manifest.id', async () => {
    const hook = renderHook(useWoodRecords);

    const singleManifest: ManifestFormInput = {
      id: 'man-single-item',
      receiptDate: '2026-10-18',
      truckPlateNumber: 'B 1111 ONE',
      forestryDocNumber: 'DOC-ONE',
      receiptNumber: 'KW-ONE',
      contractNumber: 'CTR-ONE',
      supplierName: 'PT Single Wood',
      freightRatePerM3: 100000,
      brokerFee: 50000,
      items: [
        {
          id: 'item-single',
          woodSpecies: 'Sonokeling (紫檀)',
          woodLengthM: 4.0,
          kavlingNumber: 'KAV-S',
          storageYard: 'TPK-S',
          deliveredPieces: 5,
          deliveredVolumeM3: 1.0,
          tallyPieces: 5,
          tallyVolumeM3: 1.0,
          timberPricePerM3: 8000000,
          timberPphRate: 0.5,
        },
      ],
    };

    const records = await hook.saveManifest(singleManifest);
    assert.strictEqual(records.length, 1);
    assert.strictEqual(records[0].id, 'man-single-item');
    assert.strictEqual(records[0].manifest_id, 'man-single-item');
    assert.strictEqual(records[0].item_id, 'item-single');
  });

  await t.test('saveManifest persists to localStorage and triggers server sync', async () => {
    const map = new Map<string, string>();
    const origWindow = globalThis.window;
    const origFetch = globalThis.fetch;
    const syncedBodies: string[] = [];

    globalThis.window = {
      localStorage: {
        getItem: (k: string) => map.get(k) || null,
        setItem: (k: string, v: string) => map.set(k, v),
        removeItem: (k: string) => map.delete(k),
        clear: () => map.clear(),
      },
    } as any;

    globalThis.fetch = (async (_url: any, opts: any) => {
      syncedBodies.push(String(opts?.body || ''));
      return new Response(JSON.stringify({ success: true }));
    }) as any;

    try {
      const hook = renderHook(useWoodRecords);
      const manifest: ManifestFormInput = {
        id: 'man-persist-sync',
        receiptDate: '2026-10-18',
        truckPlateNumber: 'B 8888 SYNC',
        forestryDocNumber: 'DOC-SYNC',
        receiptNumber: 'KW-SYNC',
        contractNumber: 'CTR-SYNC',
        supplierName: 'PT Sync Wood',
        freightRatePerM3: 100000,
        brokerFee: 50000,
        items: [
          {
            id: 'item-p1',
            woodSpecies: 'Teak',
            woodLengthM: 4,
            kavlingNumber: 'K1',
            storageYard: 'Y1',
            deliveredPieces: 10,
            deliveredVolumeM3: 2,
            tallyPieces: 10,
            tallyVolumeM3: 2,
            timberPricePerM3: 1000000,
            timberPphRate: 0.5,
          },
          {
            id: 'item-p2',
            woodSpecies: 'Mahoni',
            woodLengthM: 4,
            kavlingNumber: 'K2',
            storageYard: 'Y1',
            deliveredPieces: 10,
            deliveredVolumeM3: 2,
            tallyPieces: 10,
            tallyVolumeM3: 2,
            timberPricePerM3: 2000000,
            timberPphRate: 0.5,
          },
        ],
      };

      await hook.saveManifest(manifest);

      const savedJson = map.get('wood_receiving_records_next_v1');
      assert.ok(savedJson, 'Must save to localStorage');
      const parsed = JSON.parse(savedJson);
      assert.ok(parsed.some((r: any) => r.id === 'man-persist-sync_item-p1'));
      assert.ok(parsed.some((r: any) => r.id === 'man-persist-sync_item-p2'));

      // Wait briefly for background sync
      await new Promise((r) => setTimeout(r, 60));
      assert.strictEqual(syncedBodies.length, 2, 'Must sync both flattened records to server');
    } finally {
      globalThis.window = origWindow;
      globalThis.fetch = origFetch;
      toastStore.clearToasts();
    }
  });
});
