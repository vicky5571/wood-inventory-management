import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateDashboardMetrics } from '../src/utils/timber-calc.ts';
import { SEED_WOOD_RECORDS } from '../src/persistence/seed-data.ts';

test('Species Distribution & Volumetric Breakdown Suite', async (t) => {
  const metrics = aggregateDashboardMetrics(SEED_WOOD_RECORDS);

  await t.test('calculates non-empty species breakdown conforming to total volume', () => {
    const breakdown = metrics.speciesVolumeBreakdown;
    const speciesNames = Object.keys(breakdown);
    assert.ok(speciesNames.length > 0, 'Should have recorded species');

    const sumBreakdownVolume = Object.values(breakdown).reduce((acc, v) => acc + v, 0);
    assert.strictEqual(
      Number(sumBreakdownVolume.toFixed(2)),
      Number(metrics.totalTallyVolumeM3.toFixed(2)),
      'Sum of species volumes must equal total tally volume m³'
    );
  });

  await t.test('computes correct percentage proportions for each species', () => {
    const breakdown = metrics.speciesVolumeBreakdown;
    const total = metrics.totalTallyVolumeM3;

    for (const [species, vol] of Object.entries(breakdown)) {
      if (vol <= 0) continue;
      const pct = (vol / total) * 100;
      assert.ok(pct > 0 && pct <= 100, `Percentage for ${species} must be between 0 and 100%`);
    }
  });

  await t.test('handles empty dataset gracefully without division by zero', () => {
    const emptyMetrics = aggregateDashboardMetrics([]);
    assert.strictEqual(emptyMetrics.totalTallyVolumeM3, 0);
    assert.deepStrictEqual(emptyMetrics.speciesVolumeBreakdown, {});
  });
});
