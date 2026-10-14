import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCubicFromCentimeters } from '../src/utils/timber-calc.ts';

test('Tally Dimensional Calculator Suite', async (t) => {
  await t.test('calculates cubic meters correctly for typical timber dimensions', () => {
    // 20cm x 20cm x 400cm (4m), 10 beams = 1.6 m³
    const vol = calculateCubicFromCentimeters(20, 20, 400, 10);
    assert.strictEqual(vol, 1.6);
  });

  await t.test('handles decimal dimensions with precision', () => {
    // 12.5cm x 25cm x 420cm, 5 pieces = 0.6563 m³
    const vol = calculateCubicFromCentimeters(12.5, 25, 420, 5);
    assert.strictEqual(vol, 0.6563);
  });

  await t.test('returns 0 when pieces or any dimension is 0', () => {
    assert.strictEqual(calculateCubicFromCentimeters(0, 20, 400, 10), 0);
    assert.strictEqual(calculateCubicFromCentimeters(20, 0, 400, 10), 0);
    assert.strictEqual(calculateCubicFromCentimeters(20, 20, 0, 10), 0);
    assert.strictEqual(calculateCubicFromCentimeters(20, 20, 400, 0), 0);
  });

  await t.test('throws RangeError on negative inputs', () => {
    assert.throws(() => calculateCubicFromCentimeters(-10, 20, 400, 1), RangeError);
    assert.throws(() => calculateCubicFromCentimeters(10, -20, 400, 1), RangeError);
    assert.throws(() => calculateCubicFromCentimeters(10, 20, -400, 1), RangeError);
    assert.throws(() => calculateCubicFromCentimeters(10, 20, 400, -1), RangeError);
  });
});
