/**
 * test/discrepancy-eval.test.ts
 *
 * Unit tests for the pure discrepancy evaluator (evaluateDiscrepancy).
 * Verifies 4-level severity (MATCH, SURPLUS, WITHIN_TOLERANCE, ALARM),
 * negative-only alarm triggering, and dual-threshold OR gate logic.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDiscrepancy } from '../src/utils/discrepancy.ts';
import { classifyDiscrepancy } from '../src/utils/timber-calc.ts';

test('Discrepancy Evaluator & Alarm Suite', async (t) => {
  const DEFAULT_THRESHOLDS = {
    volumeThresholdM3: 1.5,
    percentThreshold: 2.0,
  };

  await t.test('Match: tally == delivered -> MATCH severity, isAlarm=false', () => {
    const res = evaluateDiscrepancy({
      tallyVolumeM3: 10.0,
      deliveredVolumeM3: 10.0,
      tallyPieces: 50,
      deliveredPieces: 50,
      ...DEFAULT_THRESHOLDS,
    });

    assert.equal(res.severity, 'MATCH');
    assert.equal(res.isAlarm, false);
    assert.equal(res.volumeDiscrepancyM3, 0);
    assert.equal(res.volumeDiscrepancyPct, 0);
    assert.equal(res.pieceDiscrepancy, 0);
    assert.equal(res.pieceDiscrepancyPct, 0);
  });

  await t.test('Surplus: small or large positive diff -> SURPLUS, isAlarm=false', () => {
    // Small surplus
    const smallSurplus = evaluateDiscrepancy({
      tallyVolumeM3: 10.5,
      deliveredVolumeM3: 10.0,
      tallyPieces: 52,
      deliveredPieces: 50,
      ...DEFAULT_THRESHOLDS,
    });
    assert.equal(smallSurplus.severity, 'SURPLUS');
    assert.equal(smallSurplus.isAlarm, false);
    assert.equal(smallSurplus.volumeDiscrepancyM3, 0.5);
    assert.equal(smallSurplus.volumeDiscrepancyPct, 5.0);

    // Large surplus (> volumeThreshold and > percentThreshold) still NEVER alarms
    const largeSurplus = evaluateDiscrepancy({
      tallyVolumeM3: 20.0,
      deliveredVolumeM3: 10.0,
      tallyPieces: 100,
      deliveredPieces: 50,
      ...DEFAULT_THRESHOLDS,
    });
    assert.equal(largeSurplus.severity, 'SURPLUS');
    assert.equal(largeSurplus.isAlarm, false);
    assert.equal(largeSurplus.volumeDiscrepancyM3, 10.0);
    assert.equal(largeSurplus.volumeDiscrepancyPct, 100.0);
  });

  await t.test('Within tolerance: negative diff below both thresholds -> WITHIN_TOLERANCE, isAlarm=false', () => {
    // Delivered 100m3, tally 99.5m3: diff = -0.5m3 (< 1.5m3), pct = -0.5% (< 2.0%)
    const res = evaluateDiscrepancy({
      tallyVolumeM3: 99.5,
      deliveredVolumeM3: 100.0,
      tallyPieces: 498,
      deliveredPieces: 500,
      ...DEFAULT_THRESHOLDS,
    });

    assert.equal(res.severity, 'WITHIN_TOLERANCE');
    assert.equal(res.isAlarm, false);
    assert.equal(res.volumeDiscrepancyM3, -0.5);
    assert.equal(res.volumeDiscrepancyPct, -0.5);
  });

  await t.test('Alarm by volume only: |diff| > 1.5m3 but |pct| <= 2.0% -> ALARM, isAlarm=true', () => {
    // Delivered 500m3, tally 498.0m3: diff = -2.0m3 (> 1.5), pct = -0.4% (<= 2.0%)
    const res = evaluateDiscrepancy({
      tallyVolumeM3: 498.0,
      deliveredVolumeM3: 500.0,
      tallyPieces: 2500,
      deliveredPieces: 2500,
      ...DEFAULT_THRESHOLDS,
    });

    assert.equal(res.severity, 'ALARM');
    assert.equal(res.isAlarm, true);
    assert.equal(res.volumeDiscrepancyM3, -2.0);
    assert.equal(res.volumeDiscrepancyPct, -0.4);
    assert.ok(res.reason?.includes('volume'), 'Reason should mention volume threshold');
  });

  await t.test('Alarm by percent only: |pct| > 2.0% but |diff| <= 1.5m3 -> ALARM, isAlarm=true', () => {
    // Delivered 20m3, tally 19.2m3: diff = -0.8m3 (<= 1.5), pct = -4.0% (> 2.0%)
    const res = evaluateDiscrepancy({
      tallyVolumeM3: 19.2,
      deliveredVolumeM3: 20.0,
      tallyPieces: 96,
      deliveredPieces: 100,
      ...DEFAULT_THRESHOLDS,
    });

    assert.equal(res.severity, 'ALARM');
    assert.equal(res.isAlarm, true);
    assert.equal(res.volumeDiscrepancyM3, -0.8);
    assert.equal(res.volumeDiscrepancyPct, -4.0);
    assert.ok(res.reason?.includes('persentase'), 'Reason should mention percentage threshold');
  });

  await t.test('Alarm by both volume and percent -> ALARM, isAlarm=true', () => {
    // Delivered 100m3, tally 97.0m3: diff = -3.0m3 (> 1.5), pct = -3.0% (> 2.0%)
    const res = evaluateDiscrepancy({
      tallyVolumeM3: 97.0,
      deliveredVolumeM3: 100.0,
      tallyPieces: 485,
      deliveredPieces: 500,
      ...DEFAULT_THRESHOLDS,
    });

    assert.equal(res.severity, 'ALARM');
    assert.equal(res.isAlarm, true);
    assert.equal(res.volumeDiscrepancyM3, -3.0);
    assert.equal(res.volumeDiscrepancyPct, -3.0);
  });

  await t.test('Boundary values: strict > condition does not trigger on exact threshold', () => {
    // Delivered 100m3, tally 98.5m3: diff = -1.5m3 (exact volumeThreshold), pct = -1.5% (< 2.0%)
    const exactVolume = evaluateDiscrepancy({
      tallyVolumeM3: 98.5,
      deliveredVolumeM3: 100.0,
      tallyPieces: 500,
      deliveredPieces: 500,
      ...DEFAULT_THRESHOLDS,
    });
    assert.equal(exactVolume.severity, 'WITHIN_TOLERANCE');
    assert.equal(exactVolume.isAlarm, false);

    // Delivered 50m3, tally 49.0m3: diff = -1.0m3 (< 1.5), pct = -2.0% (exact percentThreshold)
    const exactPercent = evaluateDiscrepancy({
      tallyVolumeM3: 49.0,
      deliveredVolumeM3: 50.0,
      tallyPieces: 500,
      deliveredPieces: 500,
      ...DEFAULT_THRESHOLDS,
    });
    assert.equal(exactPercent.severity, 'WITHIN_TOLERANCE');
    assert.equal(exactPercent.isAlarm, false);
  });

  await t.test('Zero delivered values guarded safely without NaN or division by zero', () => {
    const zeroDelivered = evaluateDiscrepancy({
      tallyVolumeM3: 0,
      deliveredVolumeM3: 0,
      tallyPieces: 0,
      deliveredPieces: 0,
      ...DEFAULT_THRESHOLDS,
    });

    assert.equal(zeroDelivered.severity, 'MATCH');
    assert.equal(zeroDelivered.isAlarm, false);
    assert.equal(zeroDelivered.volumeDiscrepancyPct, 0);
    assert.equal(zeroDelivered.pieceDiscrepancyPct, 0);

    // Delivered 0, but tally has volume -> surplus
    const zeroDeliveredWithTally = evaluateDiscrepancy({
      tallyVolumeM3: 2.0,
      deliveredVolumeM3: 0,
      tallyPieces: 10,
      deliveredPieces: 0,
      ...DEFAULT_THRESHOLDS,
    });
    assert.equal(zeroDeliveredWithTally.severity, 'SURPLUS');
    assert.equal(zeroDeliveredWithTally.isAlarm, false);
    assert.equal(zeroDeliveredWithTally.volumeDiscrepancyPct, 0);
  });

  await t.test('Legacy classifyDiscrepancy backward compatibility wrapper', () => {
    assert.equal(classifyDiscrepancy(0), 'match');
    assert.equal(classifyDiscrepancy(0.0005), 'match');
    assert.equal(classifyDiscrepancy(1.2), 'surplus');
    assert.equal(classifyDiscrepancy(-0.8), 'shortage');
  });
});
