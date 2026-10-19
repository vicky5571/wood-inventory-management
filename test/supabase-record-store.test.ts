import test from 'node:test';
import assert from 'node:assert/strict';
import { SupabaseRecordStore } from '../src/persistence/supabase/supabase-record-store.ts';
import type { ManifestFormInput, WoodReceivingRecord } from '../src/types/index.ts';

test('SupabaseRecordStore Suite', async (t) => {
  const origFetch = globalThis.fetch;
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  t.after(() => {
    globalThis.fetch = origFetch;
    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
  });

  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';

  await t.test('getAll queries v_buku_besar_flat and returns mapped records', async () => {
    globalThis.fetch = async (url) => {
      assert.ok(String(url).includes('v_buku_besar_flat'));
      return new Response(JSON.stringify([
        {
          id: 'rec-001',
          manifest_id: 'rec-001',
          item_id: 'item-001',
          tenant_id: 'default-tenant',
          receiptDate: '2026-10-01',
          truckPlateNumber: 'B 9283 TDA',
          woodSpecies: 'Teak / Jati (柚木)',
          tallyPieces: 85,
          tallyVolumeM3: 14.65,
          grandNetPayable: 65311600,
          paymentStatus: 'UNPAID',
        }
      ]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    const store = new SupabaseRecordStore();
    const records = await store.getAll();
    assert.equal(records.length, 1);
    assert.equal(records[0].id, 'rec-001');
    assert.equal(records[0].tallyVolumeM3, 14.65);
    assert.equal(records[0].grandNetPayable, 65311600);
  });

  await t.test('getPaginated filters and sorts records accurately', async () => {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify([
        {
          id: 'rec-001',
          manifest_id: 'rec-001',
          receiptDate: '2026-10-01',
          truckPlateNumber: 'B 9283 TDA',
          woodSpecies: 'Teak / Jati (柚木)',
          storageYard: 'TPK-Timur',
          kavlingNumber: 'KAV-01',
          tallyVolumeM3: 14.65,
          grandNetPayable: 65311600,
          paymentStatus: 'UNPAID',
        },
        {
          id: 'rec-002',
          manifest_id: 'rec-002',
          receiptDate: '2026-10-05',
          truckPlateNumber: 'DK 8821 BB',
          woodSpecies: 'Merbau (菠萝格)',
          storageYard: 'TPK-Barat',
          kavlingNumber: 'KAV-02',
          tallyVolumeM3: 8.5,
          grandNetPayable: 42000000,
          paymentStatus: 'PAID',
        }
      ]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    const store = new SupabaseRecordStore();
    const result = await store.getPaginated({ species: 'Teak / Jati (柚木)' });
    assert.equal(result.data.length, 1);
    assert.equal(result.data[0].id, 'rec-001');
    assert.equal(result.meta.totalCount, 1);
  });

  await t.test('saveManifest resolves references and inserts manifests and items', async () => {
    const postedEntities: Record<string, any[]> = {};

    globalThis.fetch = async (url, init) => {
      const urlStr = String(url);
      const method = init?.method || 'GET';

      if (urlStr.includes('/suppliers')) {
        if (method === 'GET') {
          return new Response(JSON.stringify([{ id: 'sup-1', name: 'PT Sumber Kayu' }]), { status: 200 });
        }
      }
      if (urlStr.includes('/wood_species')) {
        if (method === 'GET') {
          return new Response(JSON.stringify([{ id: 'spec-1', common_name: 'Teak / Jati (柚木)' }]), { status: 200 });
        }
      }
      if (urlStr.includes('/storage_yards')) {
        if (method === 'GET') {
          return new Response(JSON.stringify([{ id: 'yard-1', name: 'TPK-Timur' }]), { status: 200 });
        }
      }
      if (urlStr.includes('/storage_lots')) {
        if (method === 'GET') {
          return new Response(JSON.stringify([{ id: 'lot-1', lot_code: 'KAV-01' }]), { status: 200 });
        }
      }
      if (urlStr.includes('/receiving_manifests') && method === 'POST') {
        const body = JSON.parse(init?.body as string);
        postedEntities['manifest'] = [body];
        return new Response(JSON.stringify([body]), { status: 201 });
      }
      if (urlStr.includes('/receiving_items')) {
        if (method === 'DELETE') {
          return new Response(null, { status: 204 });
        }
        if (method === 'POST') {
          const body = JSON.parse(init?.body as string);
          postedEntities['items'] = [body];
          return new Response(JSON.stringify([body]), { status: 201 });
        }
      }
      if (urlStr.includes('/v_buku_besar_flat')) {
        return new Response(JSON.stringify([
          {
            id: 'rec-test-1',
            manifest_id: 'rec-test-1',
            receiptDate: '2026-10-19',
            truckPlateNumber: 'B 1111 AA',
            woodSpecies: 'Teak / Jati (柚木)',
            tallyVolumeM3: 5.0,
            grandNetPayable: 25000000,
          }
        ]), { status: 200 });
      }

      return new Response(JSON.stringify([]), { status: 200 });
    };

    const store = new SupabaseRecordStore();
    const manifestInput: ManifestFormInput = {
      id: 'rec-test-1',
      receiptDate: '2026-10-19',
      truckPlateNumber: 'B 1111 AA',
      forestryDocNumber: 'SKSHHK-001',
      receiptNumber: 'RCP-001',
      contractNumber: 'CTR-001',
      supplierName: 'PT Sumber Kayu',
      freightRatePerM3: 200000,
      brokerFee: 500000,
      paymentStatus: 'UNPAID',
      items: [
        {
          id: 'item-1',
          woodSpecies: 'Teak / Jati (柚木)',
          woodLengthM: 4.0,
          kavlingNumber: 'KAV-01',
          storageYard: 'TPK-Timur',
          deliveredPieces: 10,
          deliveredVolumeM3: 5.0,
          tallyPieces: 10,
          tallyVolumeM3: 5.0,
          timberPricePerM3: 4500000,
          timberPphRate: 0.5,
        }
      ]
    };

    const records = await store.saveManifest(manifestInput);
    assert.equal(records.length, 1);
    assert.equal(records[0].id, 'rec-test-1');
    assert.ok(postedEntities['manifest']);
    assert.ok(postedEntities['items']);
  });

  await t.test('deleteManifest calls DELETE on receiving_manifests', async () => {
    let capturedUrl = '';
    let capturedMethod = '';

    globalThis.fetch = async (url, init) => {
      capturedUrl = String(url);
      capturedMethod = init?.method || '';
      return new Response(null, { status: 204 });
    };

    const store = new SupabaseRecordStore();
    const success = await store.deleteManifest('rec-delete-1');

    assert.equal(capturedMethod, 'DELETE');
    assert.ok(capturedUrl.includes('/receiving_manifests?id=eq.rec-delete-1'));
    assert.equal(success, true);
  });
});
