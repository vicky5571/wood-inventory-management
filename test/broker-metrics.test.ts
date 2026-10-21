import test from 'node:test';
import assert from 'node:assert/strict';
import type { Broker, WoodReceivingRecord } from '../src/types/index.ts';
import { aggregateBrokerMetrics, computeBrokerStats } from '../src/utils/broker-metrics.ts';

const SAMPLE_BROKERS: Broker[] = [
  {
    id: 'brk-1',
    code: 'BRK-001',
    name: 'Pak Agus',
    contactPerson: 'Agus Santoso',
    phone: '08123456789',
    defaultCommissionPerM3: 50000,
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'brk-2',
    code: 'BRK-002',
    name: 'Ibu Rina',
    contactPerson: 'Rina Wijaya',
    phone: '08198765432',
    defaultCommissionPerM3: 75000,
    status: 'ACTIVE',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'brk-3',
    code: 'BRK-003',
    name: 'Pak Joko (Non-Aktif)',
    status: 'INACTIVE',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
];

function mockRecord(overrides: Partial<WoodReceivingRecord>): WoodReceivingRecord {
  return {
    id: 'rec-' + Math.random().toString(36).slice(2, 7),
    receiptDate: '2026-03-15',
    truckPlateNumber: 'B 1234 XY',
    forestryDocNumber: 'DKP-001',
    receiptNumber: 'RCP-001',
    contractNumber: 'CTR-001',
    supplierName: 'PT Sumber Kayu',
    woodSpecies: 'Meranti',
    woodLengthM: 4.0,
    kavlingNumber: 'KAV-01',
    storageYard: 'TPK-01',
    deliveredPieces: 10,
    deliveredVolumeM3: 5.0,
    tallyPieces: 10,
    tallyVolumeM3: 5.0,
    timberPricePerM3: 2000000,
    timberGrossTotal: 10000000,
    timberPphRate: 0.5,
    timberPphAmount: 50000,
    timberNetPayable: 9950000,
    freightRatePerM3: 150000,
    freightGrossTotal: 750000,
    freightPphAmount: 15000,
    freightNetPayable: 735000,
    brokerFee: 250000,
    grandNetPayable: 10935000,
    paymentStatus: 'PAID',
    createdAt: '2026-03-15T00:00:00Z',
    updatedAt: '2026-03-15T00:00:00Z',
    ...overrides,
  };
}

test('Broker Metrics & Aggregation Suite', async (t) => {
  await t.test('empty brokers and records returns empty metrics and zero stats', () => {
    const metrics = aggregateBrokerMetrics([], []);
    assert.deepEqual(metrics, []);

    const stats = computeBrokerStats([], []);
    assert.equal(stats.totalBrokers, 0);
    assert.equal(stats.activeCount, 0);
    assert.equal(stats.totalCommissionYtdIDR, 0);
    assert.equal(stats.totalVolumeFacilitatedYtdM3, 0);
  });

  await t.test('broker with no linked records returns zeroed metrics', () => {
    const metrics = aggregateBrokerMetrics([SAMPLE_BROKERS[0]], []);
    assert.equal(metrics.length, 1);
    const m = metrics[0];
    assert.equal(m.id, 'brk-1');
    assert.equal(m.totalDeals, 0);
    assert.equal(m.totalCommissionIDR, 0);
    assert.equal(m.totalVolumeM3Facilitated, 0);
    assert.equal(m.averageCommissionPerM3, 0);
    assert.deepEqual(m.primarySuppliers, []);
    assert.equal(m.lastDealDate, '-');
  });

  await t.test('broker with multiple records aggregates totals correctly', () => {
    const records = [
      mockRecord({ brokerId: 'brk-1', brokerFee: 300000, tallyVolumeM3: 6.0, receiptDate: '2026-02-10', supplierName: 'PT Kayu Abadi' }),
      mockRecord({ brokerId: 'brk-1', brokerFee: 200000, tallyVolumeM3: 4.0, receiptDate: '2026-03-20', supplierName: 'PT Sumber Kayu' }),
      mockRecord({ brokerId: 'brk-2', brokerFee: 500000, tallyVolumeM3: 10.0, receiptDate: '2026-03-01', supplierName: 'PT Rimba Raya' }),
    ];

    const metrics = aggregateBrokerMetrics(SAMPLE_BROKERS, records);
    assert.equal(metrics.length, 3);

    const agus = metrics.find((m) => m.id === 'brk-1')!;
    assert.equal(agus.totalDeals, 2);
    assert.equal(agus.totalCommissionIDR, 500000);
    assert.equal(agus.totalVolumeM3Facilitated, 10.0);
    assert.equal(agus.averageCommissionPerM3, 50000); // 500000 / 10
    assert.equal(agus.lastDealDate, '2026-03-20');

    const rina = metrics.find((m) => m.id === 'brk-2')!;
    assert.equal(rina.totalDeals, 1);
    assert.equal(rina.totalCommissionIDR, 500000);
    assert.equal(rina.totalVolumeM3Facilitated, 10.0);
    assert.equal(rina.averageCommissionPerM3, 50000);
    assert.equal(rina.lastDealDate, '2026-03-01');

    const joko = metrics.find((m) => m.id === 'brk-3')!;
    assert.equal(joko.totalDeals, 0);
  });

  await t.test('primarySuppliers ranks top 3 suppliers by deal count', () => {
    const records = [
      mockRecord({ brokerId: 'brk-1', supplierName: 'Supplier A' }),
      mockRecord({ brokerId: 'brk-1', supplierName: 'Supplier B' }),
      mockRecord({ brokerId: 'brk-1', supplierName: 'Supplier A' }),
      mockRecord({ brokerId: 'brk-1', supplierName: 'Supplier C' }),
      mockRecord({ brokerId: 'brk-1', supplierName: 'Supplier A' }),
      mockRecord({ brokerId: 'brk-1', supplierName: 'Supplier B' }),
      mockRecord({ brokerId: 'brk-1', supplierName: 'Supplier D' }),
    ];

    const metrics = aggregateBrokerMetrics([SAMPLE_BROKERS[0]], records);
    const m = metrics[0];
    // Supplier A has 3 deals, Supplier B has 2 deals, Supplier C has 1, Supplier D has 1
    assert.deepEqual(m.primarySuppliers.slice(0, 2), ['Supplier A', 'Supplier B']);
    assert.equal(m.primarySuppliers.length, 3);
  });

  await t.test('division by zero guarded when volume is 0 but commission exists', () => {
    const records = [
      mockRecord({ brokerId: 'brk-1', brokerFee: 150000, tallyVolumeM3: 0 }),
    ];
    const metrics = aggregateBrokerMetrics([SAMPLE_BROKERS[0]], records);
    assert.equal(metrics[0].averageCommissionPerM3, 0);
  });

  await t.test('computeBrokerStats computes YTD and active count accurately', () => {
    const currentYear = new Date().getFullYear();
    const records = [
      mockRecord({ brokerId: 'brk-1', brokerFee: 200000, tallyVolumeM3: 4.0, receiptDate: `${currentYear}-01-15` }),
      mockRecord({ brokerId: 'brk-2', brokerFee: 300000, tallyVolumeM3: 6.0, receiptDate: `${currentYear}-02-20` }),
      // Prior year record (should NOT count towards YTD)
      mockRecord({ brokerId: 'brk-1', brokerFee: 999999, tallyVolumeM3: 50.0, receiptDate: '2024-05-10' }),
    ];

    const stats = computeBrokerStats(SAMPLE_BROKERS, records);
    assert.equal(stats.totalBrokers, 3);
    assert.equal(stats.activeCount, 2); // 2 ACTIVE, 1 INACTIVE
    assert.equal(stats.totalCommissionYtdIDR, 500000); // 200k + 300k
    assert.equal(stats.totalVolumeFacilitatedYtdM3, 10.0); // 4 + 6
  });
});
