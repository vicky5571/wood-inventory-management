/**
 * test/pending-pricing-components.test.ts
 *
 * Contract & architecture tests for the Pending Pricing subsystem:
 * Verifying PendingPricingKpiStrip, PendingPricingToolbar, PendingPricingTable,
 * PendingPricingEmptyState, PendingPricingView coordinator, and app/pending-pricing/page.tsx.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const kpiStripPath = path.resolve(process.cwd(), 'src/components/pricing/PendingPricingKpiStrip.tsx');
const toolbarPath = path.resolve(process.cwd(), 'src/components/pricing/PendingPricingToolbar.tsx');
const tablePath = path.resolve(process.cwd(), 'src/components/pricing/PendingPricingTable.tsx');
const emptyStatePath = path.resolve(process.cwd(), 'src/components/pricing/PendingPricingEmptyState.tsx');
const coordinatorPath = path.resolve(process.cwd(), 'src/components/pricing/PendingPricingView.tsx');
const pagePath = path.resolve(process.cwd(), 'app/pending-pricing/page.tsx');

test('Pending Pricing Subsystem Architecture & Presentation Suite', async (t) => {
  await t.test('All presentation files exist and strictly satisfy LOC limits (< 250 LOC)', () => {
    const files = [
      { path: kpiStripPath, name: 'PendingPricingKpiStrip.tsx', max: 100 },
      { path: toolbarPath, name: 'PendingPricingToolbar.tsx', max: 120 },
      { path: tablePath, name: 'PendingPricingTable.tsx', max: 230 },
      { path: emptyStatePath, name: 'PendingPricingEmptyState.tsx', max: 80 },
      { path: coordinatorPath, name: 'PendingPricingView.tsx', max: 200 },
      { path: pagePath, name: 'app/pending-pricing/page.tsx', max: 50 },
    ];

    for (const file of files) {
      assert.ok(fs.existsSync(file.path), `${file.name} must exist`);
      const lines = fs.readFileSync(file.path, 'utf-8').split('\n').length;
      assert.ok(
        lines <= file.max,
        `${file.name} LOC (${lines}) must be <= ${file.max} LOC`
      );
    }
  });

  await t.test('PendingPricingKpiStrip exports component and renders 3 operational KPIs', () => {
    const content = fs.readFileSync(kpiStripPath, 'utf-8');
    assert.match(content, /export function PendingPricingKpiStrip/, 'Must export PendingPricingKpiStrip');
    assert.match(content, /Muatan Belum Dihargai/, 'Must display count label');
    assert.match(content, /Volume Pending/, 'Must display volume label');
    assert.match(content, /Estimasi Nilai Pajanan/, 'Must display exposure label');
  });

  await t.test('PendingPricingToolbar exports component with search, filter, and reset', () => {
    const content = fs.readFileSync(toolbarPath, 'utf-8');
    assert.match(content, /export function PendingPricingToolbar/, 'Must export PendingPricingToolbar');
    assert.match(content, /onSearchChange/, 'Must support search input');
    assert.match(content, /onSupplierChange/, 'Must support supplier selection');
    assert.match(content, /Reset Filter/, 'Must provide reset filter button');
  });

  await t.test('PendingPricingEmptyState provides clean state and filtered empty state', () => {
    const content = fs.readFileSync(emptyStatePath, 'utf-8');
    assert.match(content, /export function PendingPricingEmptyState/, 'Must export PendingPricingEmptyState');
    assert.match(content, /Semua Harga Kayu Telah Ditetapkan/, 'Must celebrate all priced state');
    assert.match(content, /Tidak Ada Data yang Cocok/, 'Must display filtered empty state');
    assert.match(content, /Kembali ke Buku Besar/, 'Must link back to ledger');
  });

  await t.test('PendingPricingTable renders inline quick-edit with live calculation and keyboard submit', () => {
    const content = fs.readFileSync(tablePath, 'utf-8');
    assert.match(content, /export function PendingPricingTable/, 'Must export PendingPricingTable');
    assert.match(content, /onUpdatePrice/, 'Must invoke onUpdatePrice');
    assert.match(content, /estimatedNet/, 'Must compute estimated net in realtime');
    assert.match(content, /handleKeyDown/, 'Must handle Enter key press');
  });

  await t.test('PendingPricingView coordinates state, auth, and subcomponents under 250 LOC', () => {
    const content = fs.readFileSync(coordinatorPath, 'utf-8');
    assert.match(content, /export function PendingPricingView/, 'Must export PendingPricingView');
    assert.match(content, /useWoodRecords/, 'Must integrate useWoodRecords');
    assert.match(content, /useAuth/, 'Must check auth permissions');
    assert.match(content, /updateRecordPrice/, 'Must use updateRecordPrice mutation');
  });
});
