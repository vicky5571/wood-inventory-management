import test from 'node:test';
import assert from 'node:assert/strict';
import { SupabaseSalesStore } from '../src/persistence/supabase/supabase-sales-store.ts';
import type { SalesFormInput } from '../src/types/index.ts';

test('SupabaseSalesStore Contract Suite', async (t) => {
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

  await t.test('getAll maps PostgreSQL snake_case rows to WoodSalesRecord', async () => {
    globalThis.fetch = async () => new Response(JSON.stringify([
      {
        id: 'sls-001',
        sale_date: '2026-10-15',
        delivery_order_number: 'DO-001',
        truck_plate_number: 'B 1234 CD',
        driver_name: 'Driver 1',
        customer_name: 'Customer A',
        storage_yard: 'TPK-Timur',
        kavling_number: 'KAV-01',
        wood_species: 'Teak / Jati (柚木)',
        pieces: 10,
        volume_m3: 2.5,
        price_per_m3: 5000000,
        total_price: 12500000,
        payment_status: 'PAID',
        invoice_number: 'INV-001',
        notes: 'Test note',
        created_at: '2026-10-15T00:00:00Z',
        updated_at: '2026-10-15T00:00:00Z',
      }
    ]), { status: 200, headers: { 'Content-Type': 'application/json' } });

    const store = new SupabaseSalesStore();
    const sales = await store.getAll();

    assert.equal(sales.length, 1);
    assert.equal(sales[0].id, 'sls-001');
    assert.equal(sales[0].deliveryOrderNumber, 'DO-001');
    assert.equal(sales[0].totalPrice, 12500000);
    assert.equal(sales[0].paymentStatus, 'PAID');
    assert.equal(sales[0].woodSpecies, 'Teak / Jati (柚木)');
  });

  await t.test('getById returns single WoodSalesRecord or null if not found', async () => {
    let capturedUrl = '';
    globalThis.fetch = async (input) => {
      capturedUrl = String(input);
      if (capturedUrl.includes('sls-found')) {
        return new Response(JSON.stringify([
          {
            id: 'sls-found',
            sale_date: '2026-10-16',
            delivery_order_number: 'DO-002',
            truck_plate_number: 'B 5678 EF',
            customer_name: 'Customer B',
            storage_yard: 'TPK-Barat',
            kavling_number: 'KAV-02',
            wood_species: 'Merbau (菠萝格)',
            pieces: 5,
            volume_m3: 1.2,
            price_per_m3: 4000000,
            total_price: 4800000,
            payment_status: 'UNPAID',
            created_at: '2026-10-16T00:00:00Z',
            updated_at: '2026-10-16T00:00:00Z',
          }
        ]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    const store = new SupabaseSalesStore();
    const found = await store.getById('sls-found');
    assert.ok(found);
    assert.equal(found?.id, 'sls-found');

    const notFound = await store.getById('sls-missing');
    assert.equal(notFound, null);
  });

  await t.test('save posts upsert payload with correct snake_case fields and returns created record', async () => {
    let capturedBody: any = null;
    let capturedMethod = '';
    let capturedPrefer = '';

    globalThis.fetch = async (input, init) => {
      capturedMethod = init?.method || 'GET';
      capturedPrefer = (init?.headers as Record<string, string>)?.['Prefer'] || '';
      capturedBody = JSON.parse(init?.body as string);

      return new Response(JSON.stringify([
        {
          ...capturedBody,
          created_at: '2026-10-19T10:00:00Z',
          updated_at: '2026-10-19T10:00:00Z',
        }
      ]), { status: 201, headers: { 'Content-Type': 'application/json' } });
    };

    const store = new SupabaseSalesStore();
    const input: SalesFormInput = {
      saleDate: '2026-10-19',
      deliveryOrderNumber: 'DO-999',
      truckPlateNumber: 'B 9999 ZZ',
      driverName: 'John Doe',
      customerName: 'Timber Co',
      storageYard: 'TPK-Timur',
      kavlingNumber: 'KAV-10',
      woodSpecies: 'Bangkirai (黄梢)',
      pieces: 20,
      volumeM3: 4.0,
      pricePerM3: 6000000,
      paymentStatus: 'PAID',
      notes: 'Urgent',
    };

    const saved = await store.save(input);

    assert.equal(capturedMethod, 'POST');
    assert.ok(capturedPrefer.includes('resolution=merge-duplicates'));
    assert.equal(capturedBody.delivery_order_number, 'DO-999');
    assert.equal(capturedBody.total_price, 24000000);
    assert.equal(saved.totalPrice, 24000000);
    assert.equal(saved.customerName, 'Timber Co');
  });

  await t.test('delete sends DELETE request and returns true', async () => {
    let capturedUrl = '';
    let capturedMethod = '';

    globalThis.fetch = async (input, init) => {
      capturedUrl = String(input);
      capturedMethod = init?.method || '';
      return new Response(null, { status: 204 });
    };

    const store = new SupabaseSalesStore();
    const result = await store.delete('sls-to-delete');

    assert.equal(capturedMethod, 'DELETE');
    assert.ok(capturedUrl.includes('id=eq.sls-to-delete'));
    assert.equal(result, true);
  });
});
