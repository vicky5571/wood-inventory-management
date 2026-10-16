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


