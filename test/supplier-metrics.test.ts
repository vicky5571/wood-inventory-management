import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateSupplierSummaries } from '../src/utils/supplier-metrics.ts';
import { SEED_WOOD_RECORDS } from '../src/persistence/seed-data.ts';

test('Supplier Scorecards & Metrics Aggregation Suite', async (t) => {
  await t.test('aggregates supplier volume, deliveries, and discrepancy rates accurately', () => {
    const suppliers = calculateSupplierSummaries(SEED_WOOD_RECORDS);
    assert.ok(Array.isArray(suppliers));
    assert.equal(suppliers.length, 4);

    const wana = suppliers.find((s) => s.supplierName.includes('Wana Lestari'));
    assert.ok(wana);
    assert.equal(wana.totalDeliveries, 1);
    assert.equal(wana.totalDeliveredVolumeM3, 14.5);
    assert.equal(wana.totalTallyVolumeM3, 14.65);
    assert.equal(wana.totalGrandNetPayable, 65311600);
    assert.equal(wana.discrepancyRatePercent, 1.03); // (14.65 - 14.5) / 14.5 * 100
  });

  await t.test('handles empty records cleanly without division by zero', () => {
    const suppliers = calculateSupplierSummaries([]);
    assert.deepEqual(suppliers, []);
  });
});
