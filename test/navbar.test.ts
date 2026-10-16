import test from 'node:test';
import assert from 'node:assert/strict';
import { NAV_ITEMS, resolveActiveNavSection, isNavItemActive } from '../src/components/layout/nav-config.ts';

test('Navbar Navigation & Layout Config Suite', async (t) => {
  await t.test('NAV_ITEMS contains bilingual configuration for all 5 required operational routes', () => {
    assert.equal(NAV_ITEMS.length, 5);

    const ids = NAV_ITEMS.map((item) => item.id);
    assert.deepEqual(ids, ['analytics', 'ledger', 'suppliers', 'activity', 'settings']);

    const analytics = NAV_ITEMS.find((item) => item.id === 'analytics')!;
    assert.equal(analytics.href, '/');
    assert.equal(analytics.labelId, 'Ringkasan');
    assert.equal(analytics.labelZh, '运营概况');

    const ledger = NAV_ITEMS.find((item) => item.id === 'ledger')!;
    assert.equal(ledger.href, '/ledger');
    assert.equal(ledger.labelId, 'Buku Besar');
    assert.equal(ledger.labelZh, '入库总账');

    const suppliers = NAV_ITEMS.find((item) => item.id === 'suppliers')!;
    assert.equal(suppliers.href, '/suppliers');
    assert.equal(suppliers.labelId, 'Pemasok');
    assert.equal(suppliers.labelZh, '供应商');

    const activity = NAV_ITEMS.find((item) => item.id === 'activity')!;
    assert.equal(activity.href, '/activity');
    assert.equal(activity.labelId, 'Aktivitas');
    assert.equal(activity.labelZh, '审计日志');

    const settings = NAV_ITEMS.find((item) => item.id === 'settings')!;
    assert.equal(settings.href, '/settings');
    assert.equal(settings.labelId, 'Pengaturan');
    assert.equal(settings.labelZh, '系统设置');
  });

  await t.test('isNavItemActive matches operational routes accurately', () => {
    assert.equal(isNavItemActive('/', '/'), true);
    assert.equal(isNavItemActive('/', '/ledger'), false);
    assert.equal(isNavItemActive('/ledger', '/ledger'), true);
    assert.equal(isNavItemActive('/suppliers', '/suppliers'), true);
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

  await t.test('UserNav logout button uses normalized padding and eliminates redundant margin', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const userNavContent = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/layout/UserNav.tsx'),
      'utf-8'
    );

    // Button should use p-2 for 32x32px hit target and NOT contain redundant ml-2
    assert.match(userNavContent, /className="[^"]*p-2 text-gray-400[^"]*"/);
    assert.doesNotMatch(userNavContent, /className="[^"]*ml-2[^"]*"/);
  });

  await t.test('Navbar mobile drawer links conform to 40px touch ergonomic height', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const navbarContent = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/layout/Navbar.tsx'),
      'utf-8'
    );

    // Mobile links must use py-2.5 to provide optimal 40px touch height
    assert.match(navbarContent, /px-3 py-2\.5 rounded-lg text-sm/);
  });
});
