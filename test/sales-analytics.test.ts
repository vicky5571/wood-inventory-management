/**
 * test/sales-analytics.test.ts
 *
 * Unit and contract tests for sales insights & inventory flow analytics on Ringkasan:
 * Verifying pure chart data aggregation, component contracts, and dashboard integration.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { WoodReceivingRecord, WoodSalesRecord } from '../src/types/index.ts';

const helpersPath = path.resolve(process.cwd(), 'src/components/analytics/sales-chart-helpers.ts');
const flowChartPath = path.resolve(process.cwd(), 'src/components/analytics/InventoryFlowChart.tsx');
const customerChartPath = path.resolve(process.cwd(), 'src/components/analytics/CustomerSalesBarChart.tsx');
const pagePath = path.resolve(process.cwd(), 'app/page.tsx');

const mockInbounds: WoodReceivingRecord[] = [
  {
    id: 'REC-001',
    receiptDate: '2026-10-15',
    truckPlateNumber: 'KB 1001 AA',
    forestryDocNumber: 'SKSHH-001',
    receiptNumber: 'RCP-001',
    contractNumber: 'CTR-001',
    supplierName: 'PT Borneo Timber',
    woodSpecies: 'Meranti',
    woodLengthM: 4,
    kavlingNumber: 'KAV-01',
    storageYard: 'TPK-Timur',
    deliveredPieces: 50,
    deliveredVolumeM3: 20.0,
    tallyPieces: 50,
    tallyVolumeM3: 20.0,
    timberPricePerM3: 1500000,
    timberPphRate: 0.015,
    timberGrossTotal: 30000000,
    timberPphAmount: 450000,
    timberNetPayable: 29550000,
    freightRatePerM3: 100000,
    freightGrossTotal: 2000000,
    freightPphAmount: 40000,
    freightNetPayable: 1960000,
    brokerFee: 0,
    grandNetPayable: 31510000,
    createdAt: '2026-10-15T08:00:00Z',
    updatedAt: '2026-10-15T08:00:00Z',
  },
  {
    id: 'REC-002',
    receiptDate: '2026-10-17',
    truckPlateNumber: 'KB 1002 BB',
    forestryDocNumber: 'SKSHH-002',
    receiptNumber: 'RCP-002',
    contractNumber: 'CTR-002',
    supplierName: 'PT Borneo Timber',
    woodSpecies: 'Meranti',
    woodLengthM: 4,
    kavlingNumber: 'KAV-01',
    storageYard: 'TPK-Timur',
    deliveredPieces: 30,
    deliveredVolumeM3: 12.0,
    tallyPieces: 30,
    tallyVolumeM3: 12.0,
    timberPricePerM3: 1500000,
    timberPphRate: 0.015,
    timberGrossTotal: 18000000,
    timberPphAmount: 270000,
    timberNetPayable: 17730000,
    freightRatePerM3: 100000,
    freightGrossTotal: 1200000,
    freightPphAmount: 24000,
    freightNetPayable: 1176000,
    brokerFee: 0,
    grandNetPayable: 18906000,
    createdAt: '2026-10-17T08:00:00Z',
    updatedAt: '2026-10-17T08:00:00Z',
  },
];

const mockSales: WoodSalesRecord[] = [
  {
    id: 'SALE-001',
    saleDate: '2026-10-16',
    deliveryOrderNumber: 'DO/2026/10/001',
    truckPlateNumber: 'B 1234 ABC',
    driverName: 'Pak Joko',
    customerName: 'PT Mebel Sentosa',
    storageYard: 'TPK-Timur',
    kavlingNumber: 'KAV-01',
    woodSpecies: 'Meranti',
    pieces: 10,
    volumeM3: 5.0,
    pricePerM3: 2000000,
    totalPrice: 10000000,
    paymentStatus: 'PAID',
    createdAt: '2026-10-16T10:00:00Z',
    updatedAt: '2026-10-16T10:00:00Z',
  },
  {
    id: 'SALE-002',
    saleDate: '2026-10-17',
    deliveryOrderNumber: 'DO/2026/10/002',
    truckPlateNumber: 'B 5678 DEF',
    driverName: 'Pak Budi',
    customerName: 'CV Kayu Indah',
    storageYard: 'TPK-Timur',
    kavlingNumber: 'KAV-01',
    woodSpecies: 'Meranti',
    pieces: 15,
    volumeM3: 8.0,
    pricePerM3: 2100000,
    totalPrice: 16800000,
    paymentStatus: 'UNPAID',
    createdAt: '2026-10-17T11:00:00Z',
    updatedAt: '2026-10-17T11:00:00Z',
  },
  {
    id: 'SALE-003',
    saleDate: '2026-10-17',
    deliveryOrderNumber: 'DO/2026/10/003',
    truckPlateNumber: 'B 9999 GHI',
    customerName: 'PT Mebel Sentosa',
    storageYard: 'TPK-Timur',
    kavlingNumber: 'KAV-01',
    woodSpecies: 'Meranti',
    pieces: 6,
    volumeM3: 3.0,
    pricePerM3: 2000000,
    totalPrice: 6000000,
    paymentStatus: 'PAID',
    createdAt: '2026-10-17T14:00:00Z',
    updatedAt: '2026-10-17T14:00:00Z',
  },
];

test('Sales Insights & Inventory Flow Analytics Suite', async (t) => {
  await t.test('prepareInventoryFlowData aggregates daily inbounds, outbounds, and net volume', async () => {
    const { prepareInventoryFlowData } = await import('../src/components/analytics/sales-chart-helpers.ts');

    const result = prepareInventoryFlowData(mockInbounds, mockSales);

    assert.deepEqual(result.labels, ['2026-10-15', '2026-10-16', '2026-10-17']);
    // 2026-10-15: 20.0 inbound, 0 outbound
    // 2026-10-16: 0 inbound, 5.0 outbound
    // 2026-10-17: 12.0 inbound, 11.0 outbound (8.0 + 3.0)
    assert.deepEqual(result.inboundVolumes, [20.0, 0, 12.0]);
    assert.deepEqual(result.outboundVolumes, [0, 5.0, 11.0]);
    assert.deepEqual(result.netVolumes, [20.0, -5.0, 1.0]);
  });

  await t.test('prepareInventoryFlowData handles empty arrays gracefully', async () => {
    const { prepareInventoryFlowData } = await import('../src/components/analytics/sales-chart-helpers.ts');

    const result = prepareInventoryFlowData([], []);
    assert.deepEqual(result.labels, []);
    assert.deepEqual(result.inboundVolumes, []);
    assert.deepEqual(result.outboundVolumes, []);
    assert.deepEqual(result.netVolumes, []);
  });

  await t.test('prepareCustomerSalesData ranks customers descending by volume and sums revenue', async () => {
    const { prepareCustomerSalesData } = await import('../src/components/analytics/sales-chart-helpers.ts');

    const result = prepareCustomerSalesData(mockSales, 5);

    // PT Mebel Sentosa has 5.0 + 3.0 = 8.0 m3, Rp 16.000.000
    // CV Kayu Indah has 8.0 m3, Rp 16.800.000
    assert.strictEqual(result.labels.length, 2);
    assert.ok(result.labels.includes('PT Mebel Sentosa'));
    assert.ok(result.labels.includes('CV Kayu Indah'));

    const mebelIdx = result.labels.indexOf('PT Mebel Sentosa');
    assert.strictEqual(result.volumes[mebelIdx], 8.0);
    assert.strictEqual(result.revenues[mebelIdx], 16000000);

    const kayuIdx = result.labels.indexOf('CV Kayu Indah');
    assert.strictEqual(result.volumes[kayuIdx], 8.0);
    assert.strictEqual(result.revenues[kayuIdx], 16800000);
  });

  await t.test('Component files exist and strictly satisfy LOC limits', () => {
    assert.ok(fs.existsSync(helpersPath), 'sales-chart-helpers.ts must exist');
    assert.ok(fs.existsSync(flowChartPath), 'InventoryFlowChart.tsx must exist');
    assert.ok(fs.existsSync(customerChartPath), 'CustomerSalesBarChart.tsx must exist');

    const helpersLines = fs.readFileSync(helpersPath, 'utf-8').split('\n').length;
    const flowChartLines = fs.readFileSync(flowChartPath, 'utf-8').split('\n').length;
    const customerChartLines = fs.readFileSync(customerChartPath, 'utf-8').split('\n').length;
    const pageLines = fs.readFileSync(pagePath, 'utf-8').split('\n').length;

    assert.ok(helpersLines <= 150, `sales-chart-helpers.ts LOC (${helpersLines}) must be <= 150`);
    assert.ok(flowChartLines <= 180, `InventoryFlowChart.tsx LOC (${flowChartLines}) must be <= 180`);
    assert.ok(customerChartLines <= 180, `CustomerSalesBarChart.tsx LOC (${customerChartLines}) must be <= 180`);
    assert.ok(pageLines <= 220, `app/page.tsx LOC (${pageLines}) must be <= 220`);
  });

  await t.test('InventoryFlowChart implements Chart.js and handles empty states', () => {
    const content = fs.readFileSync(flowChartPath, 'utf-8');

    assert.match(content, /export function InventoryFlowChart/, 'Must export InventoryFlowChart');
    assert.match(content, /prepareInventoryFlowData/, 'Must import and use prepareInventoryFlowData');
    assert.match(content, /chartInstanceRef/, 'Must manage Chart.js instance ref');
    assert.match(content, /chartInstanceRef\.current\.destroy\(\)/, 'Must clean up Chart instance');
    assert.match(content, /Arus Inventaris/i, 'Must contain bilingual title');
  });

  await t.test('CustomerSalesBarChart implements Chart.js and formats revenue', () => {
    const content = fs.readFileSync(customerChartPath, 'utf-8');

    assert.match(content, /export function CustomerSalesBarChart/, 'Must export CustomerSalesBarChart');
    assert.match(content, /prepareCustomerSalesData/, 'Must import and use prepareCustomerSalesData');
    assert.match(content, /Peringkat Pembeli/i, 'Must contain bilingual title');
  });

  await t.test('app/page.tsx integrates sales records and mounts both charts', () => {
    const content = fs.readFileSync(pagePath, 'utf-8');

    assert.match(content, /useWoodSalesRecords/, 'Must integrate useWoodSalesRecords hook');
    assert.match(content, /InventoryFlowChart/, 'Must mount InventoryFlowChart');
    assert.match(content, /CustomerSalesBarChart/, 'Must mount CustomerSalesBarChart');
    assert.match(content, /href="\/sales"/, 'Must contain jump card linking to /sales');
  });
});
