import test from 'node:test';
import assert from 'node:assert/strict';
import { ServerRecordStore } from '../src/persistence/server-record-store.ts';
import { salesStore } from '../src/persistence/sales-store.ts';

test('Server Persistence Bridge Delegation Suite', async (t) => {
  const origFetch = globalThis.fetch;
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  t.after(() => {
    globalThis.fetch = origFetch;
    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
  });

  await t.test('ServerRecordStore delegates to SQLite when Supabase is unconfigured', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const store = new ServerRecordStore();
    const records = await store.getAll();
    assert.ok(Array.isArray(records));
  });

  await t.test('ServerRecordStore delegates to Supabase when configured', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://bridge-test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

    let reachedSupabase = false;
    globalThis.fetch = async (url) => {
      reachedSupabase = true;
      return new Response(JSON.stringify([
        {
          id: 'rec-sb-1',
          manifest_id: 'rec-sb-1',
          receiptDate: '2026-10-19',
          woodSpecies: 'Teak / Jati (柚木)',
          tallyPieces: 10,
          tallyVolumeM3: 2.5,
          grandNetPayable: 15000000,
        }
      ]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    const store = new ServerRecordStore();
    const records = await store.getAll();

    assert.equal(reachedSupabase, true);
    assert.equal(records.length, 1);
    assert.equal(records[0].id, 'rec-sb-1');
  });

  await t.test('ServerRecordStore falls back to SQLite if Supabase fetch fails', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://bridge-test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

    globalThis.fetch = async () => {
      throw new Error('Supabase network down');
    };

    const store = new ServerRecordStore();
    const records = await store.getAll();
    assert.ok(Array.isArray(records));
  });

  await t.test('salesStore delegates to Supabase when configured', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://bridge-test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

    globalThis.fetch = async () => {
      return new Response(JSON.stringify([
        {
          id: 'sls-bridge-1',
          sale_date: '2026-10-19',
          delivery_order_number: 'DO-BR-1',
          truck_plate_number: 'B 1111 AA',
          customer_name: 'Bridge Customer',
          storage_yard: 'TPK-Timur',
          kavling_number: 'KAV-01',
          wood_species: 'Teak / Jati (柚木)',
          pieces: 10,
          volume_m3: 2.0,
          price_per_m3: 5000000,
          total_price: 10000000,
          payment_status: 'PAID',
          created_at: '2026-10-19T00:00:00Z',
          updated_at: '2026-10-19T00:00:00Z',
        }
      ]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    const sales = await salesStore.getAll();
    assert.equal(sales.length, 1);
    assert.equal(sales[0].id, 'sls-bridge-1');
  });
});
