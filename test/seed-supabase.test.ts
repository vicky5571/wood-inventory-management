import test from 'node:test';
import assert from 'node:assert/strict';
import { seedSupabaseDatabase } from '../scripts/seed-supabase.ts';

test('Supabase Seeding Engine Suite', async (t) => {
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

  await t.test('seedSupabaseDatabase posts master entities, manifests and sales to Supabase', async () => {
    const postedTables = new Set<string>();

    globalThis.fetch = async (url, init) => {
      const urlStr = String(url);
      const method = init?.method || 'GET';

      const match = urlStr.match(/\/rest\/v1\/([^?]+)/);
      if (match) {
        postedTables.add(match[1]);
      }

      if (urlStr.includes('/v_buku_besar_flat')) {
        return new Response(JSON.stringify([{ id: 'rec-test-1' }]), { status: 200 });
      }

      if (method === 'POST') {
        const body = JSON.parse(init?.body as string);
        return new Response(JSON.stringify(Array.isArray(body) ? body : [body]), { status: 201 });
      }

      return new Response(JSON.stringify([]), { status: 200 });
    };

    const stats = await seedSupabaseDatabase();

    assert.ok(postedTables.has('tenants'), 'tenants must be seeded');
    assert.ok(postedTables.has('wood_species'), 'wood_species must be seeded');
    assert.ok(postedTables.has('storage_yards'), 'storage_yards must be seeded');
    assert.ok(postedTables.has('storage_lots'), 'storage_lots must be seeded');
    assert.ok(postedTables.has('suppliers'), 'suppliers must be seeded');
    assert.ok(postedTables.has('receiving_manifests'), 'receiving_manifests must be seeded');
    assert.ok(postedTables.has('receiving_items'), 'receiving_items must be seeded');
    assert.ok(postedTables.has('sales_records'), 'sales_records must be seeded');

    assert.ok(stats.tenants >= 1);
    assert.ok(stats.species >= 8);
    assert.ok(stats.yards >= 3);
    assert.ok(stats.lots >= 8);
    assert.ok(stats.suppliers >= 4);
    assert.ok(stats.manifests >= 4);
    assert.ok(stats.sales >= 5);
  });
});
