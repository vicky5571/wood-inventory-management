import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NAV_ITEMS, isNavItemActive } from '../src/components/layout/nav-config.ts';

test('Multi-Route Navigation Configuration Suite', async (t) => {
  await t.test('NAV_ITEMS contains all operational routes including sales and tally', () => {
    const routePaths = NAV_ITEMS.map((item) => item.href);
    assert.deepEqual(routePaths, [
      '/',
      '/ledger',
      '/tally',
      '/sales',
      '/suppliers',
      '/activity',
      '/settings',
    ]);

    const ids = NAV_ITEMS.map((item) => item.id);
    assert.deepEqual(ids, ['analytics', 'ledger', 'tally', 'sales', 'suppliers', 'activity', 'settings']);
  });

  await t.test('isNavItemActive accurately matches root and sub-paths', () => {
    assert.equal(isNavItemActive('/', '/'), true);
    assert.equal(isNavItemActive('/', '/ledger'), false);
    assert.equal(isNavItemActive('/ledger', '/ledger'), true);
    assert.equal(isNavItemActive('/ledger', '/ledger?page=1'), true);
    assert.equal(isNavItemActive('/tally', '/tally'), true);
    assert.equal(isNavItemActive('/sales', '/sales'), true);
    assert.equal(isNavItemActive('/suppliers', '/suppliers'), true);
    assert.equal(isNavItemActive('/activity', '/activity'), true);
    assert.equal(isNavItemActive('/settings', '/settings'), true);
  });
});
