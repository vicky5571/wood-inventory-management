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
    assert.strictEqual(NAV_ITEMS.length, 14);
    const expectedRoutes = [
      '/',
      '/ledger',
      '/pending-pricing',
      '/inventory',
      '/contracts',
      '/payment-forms',
      '/tally',
      '/sales',
      '/production',
      '/sorting',
      '/suppliers',
      '/brokers',
      '/activity',
      '/settings',
    ];
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

  await t.test('Sidebar conforms to strict coordinator complexity budget (< 250 LOC)', () => {
    const sidebarPath = path.resolve(process.cwd(), 'src/components/layout/Sidebar.tsx');
    const content = fs.readFileSync(sidebarPath, 'utf-8');
    const lineCount = content.split('\n').length;
    assert.ok(lineCount < 250, `Sidebar.tsx has ${lineCount} lines, expected < 250`);
  });

  await t.test('Sidebar links include prefetch optimization and immediate drawer closing', () => {
    const sidebarPath = path.resolve(process.cwd(), 'src/components/layout/Sidebar.tsx');
    const content = fs.readFileSync(sidebarPath, 'utf-8');
    assert.match(content, /prefetch=\{true\}/, 'Must configure prefetch={true} for instant routing');
    assert.match(content, /setIsMobileOpen\(false\)/, 'Must dismiss mobile drawer on link click');
  });

  await t.test('Root loading.tsx exists to provide instant skeleton loader on page switch', () => {
    const loadingPath = path.resolve(process.cwd(), 'app/loading.tsx');
    assert.ok(fs.existsSync(loadingPath), 'app/loading.tsx must exist');
  });

  await t.test('Sidebar integrates useNavigation for 0ms optimistic active highlighting', () => {
    const sidebarPath = path.resolve(process.cwd(), 'src/components/layout/Sidebar.tsx');
    const content = fs.readFileSync(sidebarPath, 'utf-8');
    assert.match(content, /useNavigation/);
    assert.match(content, /targetHref/);
    assert.match(content, /navigateTo/);
  });
});

