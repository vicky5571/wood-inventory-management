import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeSuppliersWithMetrics } from '../src/utils/supplier-metrics.ts';
import { SEED_SUPPLIERS, SEED_WOOD_RECORDS } from '../src/persistence/seed-data.ts';
import type { Supplier } from '../src/types/index.ts';

test('Supplier Merging & Scorecard Association Suite', async (t) => {
  await t.test('merges registered suppliers with receiving records correctly', () => {
    const merged = mergeSuppliersWithMetrics(SEED_SUPPLIERS, SEED_WOOD_RECORDS);

    assert.equal(merged.length, SEED_SUPPLIERS.length);
    const wana = merged.find((s) => s.name === 'PT Wana Lestari Abadi');
    assert.ok(wana);
    assert.equal(wana.code, 'SPL-001');
    assert.ok(wana.totalDeliveries > 0);
    assert.ok(wana.totalTallyVolumeM3 > 0);
    assert.ok(['OPTIMAL', 'ACCEPTABLE', 'ATTENTION'].includes(wana.ratingStatus));
  });

  await t.test('includes newly registered suppliers with 0 deliveries gracefully', () => {
    const newVendor: Supplier = {
      id: 'spl-999',
      code: 'SPL-999',
      name: 'PT Rekanan Baru',
      status: 'ACTIVE',
      createdAt: '2026-10-16T12:00:00Z',
      updatedAt: '2026-10-16T12:00:00Z',
    };

    const merged = mergeSuppliersWithMetrics([...SEED_SUPPLIERS, newVendor], SEED_WOOD_RECORDS);
    const added = merged.find((s) => s.id === 'spl-999');

    assert.ok(added);
    assert.equal(added.totalDeliveries, 0);
    assert.equal(added.totalTallyVolumeM3, 0);
    assert.equal(added.discrepancyRatePercent, 0);
    assert.equal(added.ratingStatus, 'OPTIMAL');
  });

  await t.test('synthesizes unregistered supplier names found in ledger records', () => {
    const adHocRecords = [
      ...SEED_WOOD_RECORDS,
      {
        ...SEED_WOOD_RECORDS[0],
        id: 'rec-adhoc-1',
        supplierName: 'UD Kayu Liar Adhoc',
      },
    ];

    const merged = mergeSuppliersWithMetrics(SEED_SUPPLIERS, adHocRecords);
    const adhoc = merged.find((s) => s.name === 'UD Kayu Liar Adhoc');

    assert.ok(adhoc);
    assert.equal(adhoc.totalDeliveries, 1);
    assert.equal(adhoc.status, 'ACTIVE');
  });
});
