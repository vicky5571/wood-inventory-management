/**
 * test/production-calc.test.ts
 *
 * Unit tests for sawmill production yield formula, waste computation,
 * boundary edge cases, and metric rollups.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { computeProductionYield, aggregateProductionMetrics } from '../src/utils/production-calc.ts';
import type { SawmillProductionRecord } from '../src/types/index.ts';

const mockProduction = (overrides: Partial<SawmillProductionRecord> = {}): SawmillProductionRecord => ({
  id: 'prod-1',
  tenantId: 'tenant-default',
  productionDate: '2026-10-21',
  shift: 'PAGI',
  sourceStorageYard: 'TPK-Timur',
  sourceKavlingNumber: 'KAV-01',
  inputSpecies: 'Jati',
  inputVolumeM3: 10.0,
  inputPieces: 20,
  outputProduct: 'Papan 2x20x400cm',
  outputVolumeM3: 7.0,
  outputPieces: 30,
  yieldPercent: 70.0,
  wasteVolumeM3: 3.0,
  operatorName: 'Pak Joko',
  createdAt: '2026-10-21T00:00:00.000Z',
  updatedAt: '2026-10-21T00:00:00.000Z',
  ...overrides,
});

test('Sawmill Production Calculation Engine Suite', async (t) => {
  await t.test('computeProductionYield computes standard 70% yield and 30% waste correctly', () => {
    const res = computeProductionYield({ inputVolumeM3: 10.0, outputVolumeM3: 7.0 });
    assert.equal(res.yieldPercent, 70.0);
    assert.equal(res.wasteVolumeM3, 3.0);
  });

  await t.test('computeProductionYield handles zero output (100% waste)', () => {
    const res = computeProductionYield({ inputVolumeM3: 5.0, outputVolumeM3: 0.0 });
    assert.equal(res.yieldPercent, 0.0);
    assert.equal(res.wasteVolumeM3, 5.0);
  });

  await t.test('computeProductionYield handles 100% lossless output', () => {
    const res = computeProductionYield({ inputVolumeM3: 8.5, outputVolumeM3: 8.5 });
    assert.equal(res.yieldPercent, 100.0);
    assert.equal(res.wasteVolumeM3, 0.0);
  });

  await t.test('computeProductionYield defends against division by zero when input is 0', () => {
    const res = computeProductionYield({ inputVolumeM3: 0, outputVolumeM3: 0 });
    assert.equal(res.yieldPercent, 0);
    assert.equal(res.wasteVolumeM3, 0);
  });

  await t.test('aggregateProductionMetrics aggregates inputs, outputs, waste, and weighted average yield', () => {
    const records = [
      mockProduction({ id: 'p1', inputVolumeM3: 10.0, outputVolumeM3: 7.0, wasteVolumeM3: 3.0 }),
      mockProduction({ id: 'p2', inputVolumeM3: 10.0, outputVolumeM3: 5.0, wasteVolumeM3: 5.0 }),
    ];

    const metrics = aggregateProductionMetrics(records);

    assert.equal(metrics.recordCount, 2);
    assert.equal(metrics.totalInputVolumeM3, 20.0);
    assert.equal(metrics.totalOutputVolumeM3, 12.0);
    assert.equal(metrics.totalWasteVolumeM3, 8.0);
    assert.equal(metrics.averageYieldPercent, 60.0); // 12 / 20 * 100 = 60%
  });

  await t.test('aggregateProductionMetrics filters by date range', () => {
    const records = [
      mockProduction({ id: 'p1', productionDate: '2026-10-18', inputVolumeM3: 10.0, outputVolumeM3: 7.0 }),
      mockProduction({ id: 'p2', productionDate: '2026-10-21', inputVolumeM3: 10.0, outputVolumeM3: 8.0 }),
    ];

    const metrics = aggregateProductionMetrics(records, {
      startDate: '2026-10-20',
      endDate: '2026-10-22',
    });

    assert.equal(metrics.recordCount, 1);
    assert.equal(metrics.totalInputVolumeM3, 10.0);
    assert.equal(metrics.totalOutputVolumeM3, 8.0);
  });
});
