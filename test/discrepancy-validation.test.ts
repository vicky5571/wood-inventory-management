/**
 * test/discrepancy-validation.test.ts
 *
 * Unit tests for validateDiscrepancyInputs.
 * Verifies non-negative input constraints for tally and delivered measurements.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDiscrepancyInputs } from '../src/utils/discrepancy-validation.ts';

test('Discrepancy Input Validation Suite', async (t) => {
  await t.test('All positive values -> ok=true, errors empty', () => {
    const res = validateDiscrepancyInputs({
      tallyVolumeM3: 12.5,
      deliveredVolumeM3: 13.0,
      tallyPieces: 45,
      deliveredPieces: 48,
    });
    assert.equal(res.ok, true);
    assert.deepEqual(res.errors, {});
  });

  await t.test('Zero values allowed (not negative)', () => {
    const res = validateDiscrepancyInputs({
      tallyVolumeM3: 0,
      deliveredVolumeM3: 0,
      tallyPieces: 0,
      deliveredPieces: 0,
    });
    assert.equal(res.ok, true);
    assert.deepEqual(res.errors, {});
  });

  await t.test('Negative tallyVolumeM3 -> ok=false, error flagged', () => {
    const res = validateDiscrepancyInputs({
      tallyVolumeM3: -1.2,
      deliveredVolumeM3: 10.0,
    });
    assert.equal(res.ok, false);
    assert.ok(res.errors.tallyVolumeM3);
  });

  await t.test('Negative deliveredVolumeM3 -> ok=false, error flagged', () => {
    const res = validateDiscrepancyInputs({
      tallyVolumeM3: 10.0,
      deliveredVolumeM3: -0.5,
    });
    assert.equal(res.ok, false);
    assert.ok(res.errors.deliveredVolumeM3);
  });

  await t.test('Negative pieces -> ok=false, error flagged on piece fields', () => {
    const res = validateDiscrepancyInputs({
      tallyPieces: -5,
      deliveredPieces: -10,
    });
    assert.equal(res.ok, false);
    assert.ok(res.errors.tallyPieces);
    assert.ok(res.errors.deliveredPieces);
  });

  await t.test('Partial inputs validate defined fields only', () => {
    const res = validateDiscrepancyInputs({
      tallyVolumeM3: 5.0,
    });
    assert.equal(res.ok, true);
  });
});
