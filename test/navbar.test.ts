import test from 'node:test';
import assert from 'node:assert/strict';
import { NAV_ITEMS, resolveActiveNavSection } from '../src/components/layout/nav-config.ts';

test('Navbar Navigation & Layout Config Suite', async (t) => {
  await t.test('NAV_ITEMS contains bilingual configuration for all required sections', () => {
    assert.equal(NAV_ITEMS.length, 3);

    const ids = NAV_ITEMS.map((item) => item.id);
    assert.deepEqual(ids, ['dashboard', 'ledger', 'species']);

    const dashboard = NAV_ITEMS.find((item) => item.id === 'dashboard')!;
    assert.equal(dashboard.href, '#dashboard');
    assert.equal(dashboard.labelId, 'Dashboard');
    assert.equal(dashboard.labelZh, '仪表板');

    const ledger = NAV_ITEMS.find((item) => item.id === 'ledger')!;
    assert.equal(ledger.href, '#ledger');
    assert.equal(ledger.labelId, 'Buku Besar');
    assert.equal(ledger.labelZh, '入库总账');

    const species = NAV_ITEMS.find((item) => item.id === 'species')!;
    assert.equal(species.href, '#species');
    assert.equal(species.labelId, 'Spesies');
    assert.equal(species.labelZh, '木材种类');
  });

  await t.test('resolveActiveNavSection correctly resolves section based on scroll offsets', () => {
    const offsets = {
      dashboard: 0,
      species: 400,
      ledger: 800,
    };

    // Top of page
    assert.equal(resolveActiveNavSection(0, offsets), 'dashboard');
    assert.equal(resolveActiveNavSection(200, offsets), 'dashboard');

    // Scrolled past species threshold (400 - 120 = 280)
    assert.equal(resolveActiveNavSection(300, offsets), 'species');
    assert.equal(resolveActiveNavSection(500, offsets), 'species');

    // Scrolled past ledger threshold (800 - 120 = 680)
    assert.equal(resolveActiveNavSection(700, offsets), 'ledger');
    assert.equal(resolveActiveNavSection(1200, offsets), 'ledger');
  });

  await t.test('resolveActiveNavSection falls back to dashboard when elements are not in DOM', () => {
    assert.equal(resolveActiveNavSection(500, {}), 'dashboard');
  });
});

