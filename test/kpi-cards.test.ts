import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateDashboardMetrics, classifyDiscrepancy } from '../src/utils/timber-calc.ts';
import { SEED_WOOD_RECORDS } from '../src/persistence/seed-data.ts';
import type { DashboardMetrics } from '../src/types/index.ts';

test('KPI Cards Sub-Metric Aggregation & Validation Suite', async (t) => {
  const metrics: DashboardMetrics = aggregateDashboardMetrics(SEED_WOOD_RECORDS);

  await t.test('calculates volumetric reconciliation with valid variance', () => {
    assert.ok(metrics.totalTallyVolumeM3 > 0, 'Total tally volume should be greater than 0');
    assert.ok(metrics.totalDeliveredVolumeM3 > 0, 'Total delivered volume should be greater than 0');
    
    // Variance calculation invariant: tally - delivered
    const expectedVariance = Number((metrics.totalTallyVolumeM3 - metrics.totalDeliveredVolumeM3).toFixed(2));
    assert.strictEqual(
      Number(metrics.volumeDiscrepancyM3.toFixed(2)),
      expectedVariance,
      'Volume discrepancy must exactly equal tally minus delivered volume'
    );
  });

  await t.test('classifies discrepancy into match, surplus, and shortage accurately', () => {
    // Exact zero / match within tolerance
    assert.strictEqual(classifyDiscrepancy(0), 'match');
    assert.strictEqual(classifyDiscrepancy(0.0004), 'match');
    assert.strictEqual(classifyDiscrepancy(-0.0004), 'match');

    // Positive surplus
    assert.strictEqual(classifyDiscrepancy(0.05), 'surplus');
    assert.strictEqual(classifyDiscrepancy(10), 'surplus');

    // Negative shortage/deficit
    assert.strictEqual(classifyDiscrepancy(-0.05), 'shortage');
    assert.strictEqual(classifyDiscrepancy(-5), 'shortage');
  });

  await t.test('calculates pieces and piece discrepancy correctly', () => {
    assert.ok(metrics.totalTallyPieces > 0, 'Tally pieces count should be positive');
    assert.ok(metrics.totalDeliveredPieces > 0, 'Delivered pieces count should be positive');
    
    const expectedPieceDiff = metrics.totalTallyPieces - metrics.totalDeliveredPieces;
    assert.strictEqual(metrics.pieceDiscrepancy, expectedPieceDiff);
  });

  await t.test('aggregates financial outlay with positive timber and freight payables', () => {
    assert.ok(metrics.totalGrandExpenditure > 0, 'Grand expenditure should be positive');
    assert.ok(metrics.totalNetTimberPayable > 0, 'Net timber payable should be positive');
    assert.ok(metrics.totalNetFreightPayable > 0, 'Net freight payable should be positive');
    
    assert.ok(
      metrics.totalGrandExpenditure >= metrics.totalNetTimberPayable + metrics.totalNetFreightPayable,
      'Grand expenditure must encompass timber, freight, and broker fees'
    );
  });

  await t.test('tracks active kavlings and total recorded shipments', () => {
    assert.ok(metrics.activeKavlingCount >= 1, 'Should have at least 1 active storage kavling');
    assert.strictEqual(metrics.totalRecordsCount, SEED_WOOD_RECORDS.length);
  });
});
