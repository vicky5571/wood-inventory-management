import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('Chart Rerender Optimization & In-Memory Cache Suite', async (t) => {
  await t.test('useWoodRecords maintains in-memory cache and sync equality guard', () => {
    const file = readFileSync(resolve('src/hooks/useWoodRecords.ts'), 'utf-8');
    assert.match(file, /memoryRecordsCache/, 'useWoodRecords must define module-scoped memoryRecordsCache');
    assert.match(file, /areRecordsEqual/, 'useWoodRecords must implement payload equality guard for server sync');
  });

  await t.test('useWoodSalesRecords maintains in-memory cache and sync equality guard', () => {
    const file = readFileSync(resolve('src/hooks/useWoodSalesRecords.ts'), 'utf-8');
    assert.match(file, /memorySalesCache/, 'useWoodSalesRecords must define module-scoped memorySalesCache');
    assert.match(file, /areSalesEqual/, 'useWoodSalesRecords must implement payload equality guard for server sync');
  });

  await t.test('areRecordsEqual correctly compares records arrays', async () => {
    const { areRecordsEqual } = await import('../src/hooks/useWoodRecords.ts');
    const r1 = [
      { id: '1', updatedAt: '2026-10-20T00:00:00Z', woodSpecies: 'Teak' } as any,
      { id: '2', updatedAt: '2026-10-20T00:00:00Z', woodSpecies: 'Pine' } as any,
    ];
    const r2 = [
      { id: '1', updatedAt: '2026-10-20T00:00:00Z', woodSpecies: 'Teak' } as any,
      { id: '2', updatedAt: '2026-10-20T00:00:00Z', woodSpecies: 'Pine' } as any,
    ];
    const r3 = [
      { id: '1', updatedAt: '2026-10-20T00:01:00Z', woodSpecies: 'Teak' } as any,
      { id: '2', updatedAt: '2026-10-20T00:00:00Z', woodSpecies: 'Pine' } as any,
    ];

    assert.equal(areRecordsEqual([], []), true);
    assert.equal(areRecordsEqual(r1, r2), true);
    assert.equal(areRecordsEqual(r1, r3), false);
    assert.equal(areRecordsEqual(r1, [r1[0]]), false);
  });

  await t.test('areSalesEqual correctly compares sales arrays', async () => {
    const { areSalesEqual } = await import('../src/hooks/useWoodSalesRecords.ts');
    const s1 = [
      { id: 'S1', updatedAt: '2026-10-20T00:00:00Z', customerName: 'Client A' } as any,
    ];
    const s2 = [
      { id: 'S1', updatedAt: '2026-10-20T00:00:00Z', customerName: 'Client A' } as any,
    ];
    const s3 = [
      { id: 'S1', updatedAt: '2026-10-20T01:00:00Z', customerName: 'Client A' } as any,
    ];

    assert.equal(areSalesEqual([], []), true);
    assert.equal(areSalesEqual(s1, s2), true);
    assert.equal(areSalesEqual(s1, s3), false);
  });

  await t.test('VolumeTrendChart and SpeciesDonutChart use in-place chart.update instead of teardown', () => {
    const volFile = readFileSync(resolve('src/components/analytics/VolumeTrendChart.tsx'), 'utf-8');
    assert.match(volFile, /chartInstanceRef\.current\.update/, 'VolumeTrendChart must call chart.update');
    assert.doesNotMatch(volFile, /if\s*\(chartInstanceRef\.current\)\s*\{\s*chartInstanceRef\.current\.destroy\(\);/m, 'VolumeTrendChart must not destroy chart on every render effect');

    const donutFile = readFileSync(resolve('src/components/analytics/SpeciesDonutChart.tsx'), 'utf-8');
    assert.match(donutFile, /useMemo\(/, 'SpeciesDonutChart must memoize donutData');
    assert.match(donutFile, /chartInstanceRef\.current\.update/, 'SpeciesDonutChart must call chart.update');
    assert.doesNotMatch(donutFile, /if\s*\(chartInstanceRef\.current\)\s*\{\s*chartInstanceRef\.current\.destroy\(\);/m, 'SpeciesDonutChart must not destroy chart on every render effect');
  });

  await t.test('SupplierBarChart, InventoryFlowChart, and CustomerSalesBarChart use in-place chart.update', () => {
    const supFile = readFileSync(resolve('src/components/analytics/SupplierBarChart.tsx'), 'utf-8');
    assert.match(supFile, /useMemo\(/, 'SupplierBarChart must memoize supplierData');
    assert.match(supFile, /chartInstanceRef\.current\.update/, 'SupplierBarChart must call chart.update');
    assert.doesNotMatch(supFile, /if\s*\(chartInstanceRef\.current\)\s*\{\s*chartInstanceRef\.current\.destroy\(\);/m, 'SupplierBarChart must not destroy chart on every render effect');

    const flowFile = readFileSync(resolve('src/components/analytics/InventoryFlowChart.tsx'), 'utf-8');
    assert.match(flowFile, /useMemo\(/, 'InventoryFlowChart must memoize flowData');
    assert.match(flowFile, /chartInstanceRef\.current\.update/, 'InventoryFlowChart must call chart.update');
    assert.doesNotMatch(flowFile, /if\s*\(chartInstanceRef\.current\)\s*\{\s*chartInstanceRef\.current\.destroy\(\);/m, 'InventoryFlowChart must not destroy chart on every render effect');

    const custFile = readFileSync(resolve('src/components/analytics/CustomerSalesBarChart.tsx'), 'utf-8');
    assert.match(custFile, /useMemo\(/, 'CustomerSalesBarChart must memoize customerData');
    assert.match(custFile, /chartInstanceRef\.current\.update/, 'CustomerSalesBarChart must call chart.update');
    assert.doesNotMatch(custFile, /if\s*\(chartInstanceRef\.current\)\s*\{\s*chartInstanceRef\.current\.destroy\(\);/m, 'CustomerSalesBarChart must not destroy chart on every render effect');
  });
});
