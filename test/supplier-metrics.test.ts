import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateSupplierSummaries } from '../src/utils/supplier-metrics.ts';
import { SEED_WOOD_RECORDS } from '../src/persistence/seed/fixtures.ts';

test('Supplier Scorecards & Metrics Aggregation Suite', async (t) => {
  await t.test('aggregates supplier volume, deliveries, and discrepancy rates accurately', () => {
    const suppliers = calculateSupplierSummaries(SEED_WOOD_RECORDS);
    assert.ok(Array.isArray(suppliers));
    assert.equal(suppliers.length, 7);

    const lestari = suppliers.find((s) => s.supplierName.includes('Hutan Lestari'));
    assert.ok(lestari);
    assert.equal(lestari.totalDeliveries, 1);
    assert.equal(lestari.totalDeliveredVolumeM3, 17.5);
    assert.equal(lestari.totalTallyVolumeM3, 17.5);
    assert.equal(lestari.totalGrandNetPayable, 132122500);
    assert.equal(lestari.discrepancyRatePercent, 0);
  });

  await t.test('handles empty records cleanly without division by zero', () => {
    const suppliers = calculateSupplierSummaries([]);
    assert.deepEqual(suppliers, []);
  });
});
