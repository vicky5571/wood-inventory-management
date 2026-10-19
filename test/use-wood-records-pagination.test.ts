import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { buildRecordsApiUrl } from '../src/utils/record-query-url.ts';
import { useWoodRecords } from '../src/hooks/useWoodRecords.ts';

function renderHook<T>(hookFn: () => T): T {
  let result: T | undefined;
  function Component() {
    result = hookFn();
    return null;
  }
  renderToString(React.createElement(Component));
  return result as T;
}

test('buildRecordsApiUrl Query String Builder Suite', async (t) => {
  await t.test('serializes pagination and active filter criteria into /api/records URL', () => {
    const url = buildRecordsApiUrl({
      page: 2,
      pageSize: 25,
      searchQuery: 'KB 8888',
      species: 'Meranti',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      paymentStatus: 'UNPAID',
    });
    assert.equal(
      url,
      '/api/records?page=2&pageSize=25&searchQuery=KB+8888&species=Meranti&startDate=2026-10-01&endDate=2026-10-31&paymentStatus=UNPAID'
    );
  });

  await t.test('omits empty filters and ALL paymentStatus', () => {
    const url = buildRecordsApiUrl({
      page: 1,
      pageSize: 50,
      searchQuery: '   ',
      paymentStatus: 'ALL',
    });
    assert.equal(url, '/api/records?page=1&pageSize=50');
  });

  await t.test('useWoodRecords exports pagination contract with default values', () => {
    const hook = renderHook(useWoodRecords);
    assert.equal(typeof hook.page, 'number');
    assert.equal(hook.page, 1);
    assert.equal(typeof hook.pageSize, 'number');
    assert.equal(hook.pageSize, 50);
    assert.equal(typeof hook.setPage, 'function');
    assert.equal(typeof hook.setPageSize, 'function');
    assert.ok(typeof hook.pagination === 'object' && hook.pagination !== null);
    assert.equal(hook.pagination.page, 1);
  });

  await t.test('resetDemo initiates background POST sync with { action: "reset" }', async () => {
    const originalFetch = globalThis.fetch;
    let postedBody = '';
    let postedUrl = '';
    globalThis.fetch = async (url: any, opts: any) => {
      postedUrl = String(url);
      postedBody = opts?.body ? String(opts.body) : '';
      return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
    };

    try {
      const hook = renderHook(useWoodRecords);
      hook.resetDemo();
      await new Promise((r) => setTimeout(r, 20));
      assert.equal(postedUrl, '/api/records');
      assert.equal(postedBody, JSON.stringify({ action: 'reset' }));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
