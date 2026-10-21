/**
 * src/utils/discrepancy.ts
 *
 * Pure business logic evaluator for volumetric and piece discrepancies.
 * Implements a 4-level severity model:
 * - MATCH: Exact alignment within epsilon tolerance
 * - SURPLUS: Positive discrepancy (informational / neutral)
 * - WITHIN_TOLERANCE: Negative discrepancy within acceptable thresholds
 * - ALARM: Negative discrepancy exceeding volume OR percentage thresholds
 */

import type { DiscrepancyEvaluation, DiscrepancySeverity } from '../types/index.ts';

export interface EvaluateDiscrepancyInput {
  tallyVolumeM3: number;
  deliveredVolumeM3: number;
  tallyPieces: number;
  deliveredPieces: number;
  volumeThresholdM3: number;
  percentThreshold: number;
}

const EPSILON = 0.001;

export function evaluateDiscrepancy(input: EvaluateDiscrepancyInput): DiscrepancyEvaluation {
  const {
    tallyVolumeM3,
    deliveredVolumeM3,
    tallyPieces,
    deliveredPieces,
    volumeThresholdM3,
    percentThreshold,
  } = input;

  const rawVolumeDiff = tallyVolumeM3 - deliveredVolumeM3;
  const volumeDiscrepancyM3 = Number(rawVolumeDiff.toFixed(4));
  const pieceDiscrepancy = tallyPieces - deliveredPieces;

  const volumeDiscrepancyPct = deliveredVolumeM3 > 0
    ? Number(((volumeDiscrepancyM3 / deliveredVolumeM3) * 100).toFixed(2))
    : 0;

  const pieceDiscrepancyPct = deliveredPieces > 0
    ? Number(((pieceDiscrepancy / deliveredPieces) * 100).toFixed(2))
    : 0;

  // 1. MATCH: absolute difference is within epsilon
  const isVolumeMatch = Math.abs(volumeDiscrepancyM3) < EPSILON;
  const isPieceMatch = pieceDiscrepancy === 0;

  if (isVolumeMatch && isPieceMatch) {
    return {
      severity: 'MATCH',
      volumeDiscrepancyM3: 0,
      volumeDiscrepancyPct: 0,
      pieceDiscrepancy: 0,
      pieceDiscrepancyPct: 0,
      isAlarm: false,
    };
  }

  // 2. SURPLUS: Positive deviation is informational/neutral, never triggers alarm
  if (volumeDiscrepancyM3 > 0 || (isVolumeMatch && pieceDiscrepancy > 0)) {
    return {
      severity: 'SURPLUS',
      volumeDiscrepancyM3,
      volumeDiscrepancyPct,
      pieceDiscrepancy,
      pieceDiscrepancyPct,
      isAlarm: false,
      reason: `Kelebihan fisik +${volumeDiscrepancyM3.toFixed(4)} m³ (+${volumeDiscrepancyPct}%) dari surat jalan`,
    };
  }

  // 3. NEGATIVE DISCREPANCY: Check dual-threshold OR gate (strict >)
  const absVol = Math.abs(volumeDiscrepancyM3);
  const absVolPct = Math.abs(volumeDiscrepancyPct);
  const absPiecePct = Math.abs(pieceDiscrepancyPct);

  const isVolAlarm = absVol > volumeThresholdM3;
  const isPctAlarm = absVolPct > percentThreshold;
  const isPiecePctAlarm = absPiecePct > percentThreshold;

  if (isVolAlarm || isPctAlarm || isPiecePctAlarm) {
    const reasons: string[] = [];
    if (isVolAlarm) {
      reasons.push(`volume (${absVol.toFixed(2)} m³ > ambang ${volumeThresholdM3.toFixed(2)} m³)`);
    }
    if (isPctAlarm) {
      reasons.push(`persentase (${absVolPct.toFixed(1)}% > ambang ${percentThreshold.toFixed(1)}%)`);
    }
    if (isPiecePctAlarm && !isPctAlarm) {
      reasons.push(`persentase batang (${absPiecePct.toFixed(1)}% > ambang ${percentThreshold.toFixed(1)}%)`);
    }

    return {
      severity: 'ALARM',
      volumeDiscrepancyM3,
      volumeDiscrepancyPct,
      pieceDiscrepancy,
      pieceDiscrepancyPct,
      isAlarm: true,
      reason: `Alarm penyusutan: selisih ${volumeDiscrepancyM3.toFixed(4)} m³ (${volumeDiscrepancyPct}%) melebihi ambang batas ${reasons.join(' dan ')}`,
    };
  }

  // 4. WITHIN_TOLERANCE: Negative deviation under both thresholds
  return {
    severity: 'WITHIN_TOLERANCE',
    volumeDiscrepancyM3,
    volumeDiscrepancyPct,
    pieceDiscrepancy,
    pieceDiscrepancyPct,
    isAlarm: false,
    reason: `Penyusutan ${volumeDiscrepancyM3.toFixed(4)} m³ (${volumeDiscrepancyPct}%) dalam toleransi wajar (ambang: ${volumeThresholdM3} m³ / ${percentThreshold}%)`,
  };
}
