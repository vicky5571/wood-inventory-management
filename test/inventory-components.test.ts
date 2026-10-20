/**
 * test/inventory-components.test.ts
 *
 * Contract & architecture tests for the Inventory Live Lot Balance subsystem:
 * Verifying InventoryTable, InventoryKpiStrip, InventoryToolbar, InventoryEmptyState,
 * InventoryView coordinator, and app/inventory/page.tsx.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const emptyStatePath = path.resolve(process.cwd(), 'src/components/inventory/InventoryEmptyState.tsx');
const kpiStripPath = path.resolve(process.cwd(), 'src/components/inventory/InventoryKpiStrip.tsx');
const toolbarPath = path.resolve(process.cwd(), 'src/components/inventory/InventoryToolbar.tsx');
const tablePath = path.resolve(process.cwd(), 'src/components/inventory/InventoryTable.tsx');
const coordinatorPath = path.resolve(process.cwd(), 'src/components/inventory/InventoryView.tsx');
const pagePath = path.resolve(process.cwd(), 'app/inventory/page.tsx');

test('Inventory Subsystem Architecture & Presentation Suite', async (t) => {
  await t.test('All presentation files exist and strictly satisfy LOC ceiling limits (< 250 LOC)', () => {
    const files = [
      { path: emptyStatePath, name: 'InventoryEmptyState.tsx', max: 80 },
      { path: kpiStripPath, name: 'InventoryKpiStrip.tsx', max: 120 },
      { path: toolbarPath, name: 'InventoryToolbar.tsx', max: 120 },
      { path: tablePath, name: 'InventoryTable.tsx', max: 200 },
      { path: coordinatorPath, name: 'InventoryView.tsx', max: 200 },
      { path: pagePath, name: 'app/inventory/page.tsx', max: 50 },
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

  await t.test('InventoryKpiStrip renders 4 operational lot balance KPIs with bilingual labels', () => {
    const content = fs.readFileSync(kpiStripPath, 'utf-8');

    assert.match(content, /export function InventoryKpiStrip/, 'Must export InventoryKpiStrip');
    assert.match(content, /Kavling Aktif/, 'Must include Kavling Aktif KPI');
    assert.match(content, /Total Sisa Volume/, 'Must include Total Sisa Volume KPI');
    assert.match(content, /Total Sisa Batang/, 'Must include Total Sisa Batang KPI');
    assert.match(content, /Kavling Habis/, 'Must include Kavling Habis KPI');
  });

  await t.test('InventoryToolbar provides search input, yard select, and hide-depleted toggle', () => {
    const content = fs.readFileSync(toolbarPath, 'utf-8');

    assert.match(content, /export function InventoryToolbar/, 'Must export InventoryToolbar');
    assert.match(content, /searchQuery/, 'Must receive searchQuery prop');
    assert.match(content, /selectedYard/, 'Must receive selectedYard prop');
    assert.match(content, /availableYards/, 'Must receive availableYards prop');
    assert.match(content, /hideDepleted/, 'Must receive hideDepleted toggle prop');
    assert.match(content, /Sembunyikan kavling kosong/, 'Must render hide depleted checkbox label');
  });

  await t.test('InventoryTable renders lot balances, sortable headers, and status badges', () => {
    const content = fs.readFileSync(tablePath, 'utf-8');

    assert.match(content, /export function InventoryTable/, 'Must export InventoryTable');
    assert.match(content, /storageYard/, 'Must display storageYard');
    assert.match(content, /kavlingNumber/, 'Must display kavlingNumber');
    assert.match(content, /inboundVolumeM3/, 'Must display inbound volume');
    assert.match(content, /outboundVolumeM3/, 'Must display outbound volume');
    assert.match(content, /remainingVolumeM3/, 'Must display remaining volume');
    assert.match(content, /Habis|已清空/, 'Must render depleted status badge');
    assert.match(content, /Tersedia|在库/, 'Must render available status badge');
    assert.match(content, /handleSort/, 'Must support column header sorting');
  });

  await t.test('InventoryEmptyState renders helpful guidance with link to /ledger', () => {
    const content = fs.readFileSync(emptyStatePath, 'utf-8');

    assert.match(content, /export function InventoryEmptyState/, 'Must export InventoryEmptyState');
    assert.match(content, /href="\/ledger"/, 'Must link to /ledger');
  });

  await t.test('InventoryView coordinates hooks, pure aggregation, and delegates to subcomponents', () => {
    const content = fs.readFileSync(coordinatorPath, 'utf-8');

    assert.match(content, /export function InventoryView/, 'Must export InventoryView');
    assert.match(content, /useWoodRecords/, 'Must integrate useWoodRecords hook');
    assert.match(content, /useWoodSalesRecords/, 'Must integrate useWoodSalesRecords hook');
    assert.match(content, /aggregateAllLotBalances/, 'Must call aggregateAllLotBalances pure aggregator');
    assert.match(content, /<InventoryKpiStrip/, 'Must render InventoryKpiStrip');
    assert.match(content, /<InventoryToolbar/, 'Must render InventoryToolbar');
    assert.match(content, /<InventoryTable/, 'Must render InventoryTable');
    assert.match(content, /<InventoryEmptyState/, 'Must render InventoryEmptyState');
  });

  await t.test('app/inventory/page.tsx serves as minimal server component shell with metadata', () => {
    const content = fs.readFileSync(pagePath, 'utf-8');

    assert.match(content, /export default function InventoryPage/, 'Must export default InventoryPage');
    assert.match(content, /export const metadata/, 'Must export page metadata');
    assert.match(content, /<InventoryView/, 'Must render InventoryView');
  });
});
