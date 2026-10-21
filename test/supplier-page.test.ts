import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateSupplierSummaries } from '../src/utils/supplier-metrics.ts';
import { SEED_WOOD_RECORDS } from '../src/persistence/seed/fixtures.ts';

test('Supplier View Contracts Suite', async (t) => {
  await t.test('calculates correct ranking and status badges for top suppliers', () => {
    const suppliers = calculateSupplierSummaries(SEED_WOOD_RECORDS);
    assert.ok(suppliers.length >= 4);

    // Highest tally volume should be first
    assert.ok(suppliers[0].totalTallyVolumeM3 >= suppliers[1].totalTallyVolumeM3);

    // All suppliers have valid status
    for (const s of suppliers) {
      assert.ok(['OPTIMAL', 'ACCEPTABLE', 'ATTENTION'].includes(s.status));
      assert.ok(s.totalDeliveries > 0);
      assert.ok(s.totalTallyVolumeM3 > 0);
      assert.ok(Array.isArray(s.primarySpecies));
    }
  });

  await t.test('handles single delivery supplier calculations', () => {
    const single = [SEED_WOOD_RECORDS[0]];
    const res = calculateSupplierSummaries(single);
    assert.equal(res.length, 1);
    assert.equal(res[0].supplierName, SEED_WOOD_RECORDS[0].supplierName);
    assert.equal(res[0].totalDeliveries, 1);
  });
});
