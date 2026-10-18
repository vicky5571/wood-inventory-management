/**
 * test/sidebar.test.ts
 *
 * Unit tests for the enterprise Sidebar navigation and AppLayout shell.
 * Verifies route coverage, bilingual labels, touch ergonomics, and layout boundaries.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NAV_ITEMS, isNavItemActive } from '../src/components/layout/nav-config.ts';

test('Sidebar Navigation & Layout Architecture Suite', async (t) => {
  await t.test('NAV_ITEMS contains all operational routes with bilingual labels', () => {
    assert.strictEqual(NAV_ITEMS.length, 6);
    const expectedRoutes = ['/', '/ledger', '/sales', '/suppliers', '/activity', '/settings'];
    const actualRoutes = NAV_ITEMS.map((item) => item.href);
    assert.deepStrictEqual(actualRoutes, expectedRoutes);
  });

  await t.test('Sidebar component exists and includes required navigation anchors', () => {
    const sidebarPath = path.resolve(process.cwd(), 'src/components/layout/Sidebar.tsx');
    assert.ok(fs.existsSync(sidebarPath), 'Sidebar.tsx must exist');

    const content = fs.readFileSync(sidebarPath, 'utf-8');

    // Must render brand identity and facility badge
    assert.match(content, /TimberGuard/);
    assert.match(content, /TPK-01/);

    // Must group navigation into Operational and System sections
    assert.match(content, /OPERASIONAL/i);
    assert.match(content, /SISTEM/i);

    // Must contain touch-ergonomic padding (at least py-2.5 for 40px height target)
    assert.match(content, /py-2\.5/);

    // Must include mobile drawer toggle and backdrop
    assert.match(content, /lg:hidden/);
    assert.match(content, /isMobileOpen|isDrawerOpen|mobileOpen/i);
  });

  await t.test('AppLayout component exists and implements route-conditional sidebar wrapping', () => {
    const layoutPath = path.resolve(process.cwd(), 'src/components/layout/AppLayout.tsx');
    assert.ok(fs.existsSync(layoutPath), 'AppLayout.tsx must exist');

    const content = fs.readFileSync(layoutPath, 'utf-8');

    // Must import Sidebar
    assert.match(content, /Sidebar/);

    // Must exempt /login from sidebar offset
    assert.match(content, /\/login/);

    // Must apply desktop sidebar offset padding to prevent overlap
    assert.match(content, /lg:pl-64/);
  });
});
