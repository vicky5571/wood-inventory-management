import test from 'node:test';
import assert from 'node:assert/strict';
import { isSupabaseConfigured, getSupabaseConfig, supabaseFetch } from '../src/persistence/supabase/supabase-client.ts';

test('Supabase Client Configuration & Fetch Suite', async (t) => {
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const origAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const origFetch = globalThis.fetch;

  t.after(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = origAnon;
    globalThis.fetch = origFetch;
  });

  await t.test('isSupabaseConfigured returns false when env is unset', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    assert.equal(isSupabaseConfigured(), false);
    assert.equal(getSupabaseConfig(), null);
  });

  await t.test('isSupabaseConfigured returns true when URL and KEY are set', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'secret-service-key';
    assert.equal(isSupabaseConfigured(), true);
    const config = getSupabaseConfig();
    assert.deepEqual(config, {
      url: 'https://example.supabase.co',
      key: 'secret-service-key',
    });
  });

  await t.test('supabaseFetch sends proper headers and returns JSON data', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'secret-service-key';

    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};

    globalThis.fetch = async (input, init) => {
      capturedUrl = String(input);
      capturedHeaders = init?.headers as Record<string, string>;
      return new Response(JSON.stringify([{ id: 'tenant-1', name: 'Factory' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const res = await supabaseFetch<{ id: string; name: string }[]>('/tenants?select=*', {
      prefer: 'return=representation',
    });

    assert.equal(capturedUrl, 'https://example.supabase.co/rest/v1/tenants?select=*');
    assert.equal(capturedHeaders['apikey'], 'secret-service-key');
    assert.equal(capturedHeaders['Authorization'], 'Bearer secret-service-key');
    assert.equal(capturedHeaders['Prefer'], 'return=representation');
    assert.equal(res[0].id, 'tenant-1');
  });

  await t.test('supabaseFetch handles 204 No Content gracefully', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'secret-service-key';

    globalThis.fetch = async () => new Response(null, { status: 204 });
    const res = await supabaseFetch('/sales_records?id=eq.123', { method: 'DELETE' });
    assert.equal(res, null);
  });

  await t.test('supabaseFetch throws descriptive error on HTTP failure', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'secret-service-key';

    globalThis.fetch = async () => new Response('relation does not exist', {
      status: 404,
      statusText: 'Not Found',
    });

    await assert.rejects(
      async () => supabaseFetch('/missing_table'),
      /Supabase PostgREST error \(404 Not Found\): relation does not exist/
    );
  });
});
