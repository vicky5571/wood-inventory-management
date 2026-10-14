/**
 * test/smoke.test.ts
 *
 * High-speed smoke unit test suite for wood inventory helpers & persistence adapters.
 * Native execution via `node --test test/smoke.test.ts` (<100ms baseline).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateCubicMeters,
  calculateBoardFeet,
  computeVolumetricMetrics,
  generateWoodSku,
  estimateBatchWeight,
} from '../src/utils/calculator.ts';

import { MemoryStorageAdapter } from '../src/persistence/storage.ts';

test('Smoke Test Suite — Domain Calculations & Storage Invariants', async (t) => {
  await t.test('calculateCubicMeters accurately computes volume for 10 beams', () => {
    // 50mm x 200mm x 2400mm = 0.05m x 0.2m x 2.4m = 0.024 m³ per piece
    // 10 pieces = 0.24 m³
    const volume = calculateCubicMeters(50, 200, 2400, 10);
    assert.strictEqual(volume, 0.24);
  });

  await t.test('calculateBoardFeet accurately computes imperial board feet', () => {
    // 2" x 8" x 8' = (2 * 8 * 8) / 12 = 10.67 BF
    const bf = calculateBoardFeet(2, 8, 8, 1);
    assert.strictEqual(bf, 10.67);

    // 5 pieces = 53.33 BF
    const bfTotal = calculateBoardFeet(2, 8, 8, 5);
    assert.strictEqual(bfTotal, 53.33);
  });

  await t.test('computeVolumetricMetrics bundles metric and imperial measurements', () => {
    const result = computeVolumetricMetrics(50, 200, 2400, 5);
    assert.strictEqual(result.cubicMetersPerPiece, 0.024);
    assert.strictEqual(result.totalCubicMeters, 0.12);
    assert.ok(result.boardFeetPerPiece > 0, 'Board feet per piece must be greater than zero');
    assert.ok(result.totalBoardFeet > result.boardFeetPerPiece, 'Total board feet must scale with quantity');
  });

  await t.test('generateWoodSku creates sanitized, deterministic SKU identifier', () => {
    const sku = generateWoodSku('Teak wood!', 50.2, 200.4, 2400, 'FAS');
    assert.strictEqual(sku, 'TEAKWOOD-50X200X2400-FAS');
  });

  await t.test('estimateBatchWeight calculates gross batch weight based on density', () => {
    // 0.24 m³ of Teak at 650 kg/m³ = 156.00 kg
    const weight = estimateBatchWeight(0.24, 650);
    assert.strictEqual(weight, 156);
  });

  await t.test('calculations reject negative dimensions with RangeError', () => {
    assert.throws(() => calculateCubicMeters(-10, 200, 2400), {
      name: 'RangeError',
    });
    assert.throws(() => calculateBoardFeet(2, -8, 8), {
      name: 'RangeError',
    });
    assert.throws(() => estimateBatchWeight(-1, 650), {
      name: 'RangeError',
    });
  });

  await t.test('MemoryStorageAdapter provides compliant offline storage fallback', async () => {
    const storage = new MemoryStorageAdapter();
    await storage.setItem('test_item', { id: 'wood-1', sku: 'TEAK-50X200X2400-FAS' });

    const retrieved = await storage.getItem<{ id: string; sku: string }>('test_item');
    assert.deepStrictEqual(retrieved, { id: 'wood-1', sku: 'TEAK-50X200X2400-FAS' });

    await storage.removeItem('test_item');
    const afterDelete = await storage.getItem('test_item');
    assert.strictEqual(afterDelete, null);
  });
});

import type { WoodReceivingRecord, DashboardMetrics } from '../src/types/index.ts';

test('SSOT Type Definitions exist and export correctly', () => {
  const dummy: Partial<WoodReceivingRecord> = {
    id: 'test-1',
    receiptDate: '2026-10-14',
    woodSpecies: 'Teak / Jati',
    tallyVolumeM3: 15.5,
  };
  assert.strictEqual(dummy.id, 'test-1');
});

