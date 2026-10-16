import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEED_WOOD_RECORDS } from '../src/persistence/seed-data.ts';
import {
  prepareVolumeTrendData,
  prepareSpeciesDonutData,
  prepareSupplierBarData,
} from '../src/components/analytics/chart-helpers.ts';

test('Analytics Chart.js Data Preparation Suite', async (t) => {
  await t.test('prepares chronologically sorted volume trend data', () => {
    const trend = prepareVolumeTrendData(SEED_WOOD_RECORDS);
    assert.ok(trend.labels.length > 0);
    assert.equal(trend.tallyVolumes.length, trend.labels.length);
    assert.equal(trend.deliveredVolumes.length, trend.labels.length);
    // Chronological order verification
    assert.ok(trend.labels[0] <= trend.labels[trend.labels.length - 1]);
  });

  await t.test('prepares species doughnut data with positive values', () => {
    const donut = prepareSpeciesDonutData(SEED_WOOD_RECORDS);
    assert.ok(donut.labels.length > 0);
    assert.ok(donut.values.length > 0);
    const sum = donut.values.reduce((a, b) => a + b, 0);
    assert.ok(sum > 0);
  });

  await t.test('prepares supplier comparison bar data', () => {
    const supplierData = prepareSupplierBarData(SEED_WOOD_RECORDS);
    assert.ok(supplierData.labels.length > 0);
    assert.equal(supplierData.delivered.length, supplierData.labels.length);
    assert.equal(supplierData.tally.length, supplierData.labels.length);
  });

  await t.test('handles empty dataset gracefully without crash', () => {
    const trend = prepareVolumeTrendData([]);
    assert.deepEqual(trend.labels, []);
    assert.deepEqual(trend.tallyVolumes, []);

    const donut = prepareSpeciesDonutData([]);
    assert.deepEqual(donut.labels, []);
    assert.deepEqual(donut.values, []);

    const supplierData = prepareSupplierBarData([]);
    assert.deepEqual(supplierData.labels, []);
  });
});
