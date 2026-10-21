/**
 * src/utils/timber-calc.ts
 *
 * Financial and tally calculation helpers for timber receiving records.
 * Single Source of Truth pure domain calculation module.
 */

import type {
  WoodReceivingRecord,
  DashboardMetrics,
  PaymentCalculationResult,
  RecordCalculationInput,
  RecordCalculationOutput,
  ManifestFormInput,
  ManifestCalculationOutput,
} from '../types/index.ts';
import { evaluateDiscrepancy } from './discrepancy.ts';

/**
 * Calculates gross, PPh tax, and net payable for timber material.
 * Volume is typically the measured tally volume in cubic meters (m³).
 */
export function calculateTimberPayment(
  volumeM3: number,
  pricePerM3: number,
  pphRatePercent: number = 0
): PaymentCalculationResult {
  if (volumeM3 < 0 || pricePerM3 < 0 || pphRatePercent < 0) {
    throw new RangeError('Values must be non-negative');
  }
  const gross = Number((volumeM3 * pricePerM3).toFixed(2));
  const pphAmount = Number((gross * (pphRatePercent / 100)).toFixed(2));
  const netPayable = Number((gross - pphAmount).toFixed(2));
  return { gross, pphAmount, netPayable };
}

/**
 * Calculates gross, PPh tax, and net payable for freight/logistics.
 * Volume is typically the measured tally volume in cubic meters (m³).
 */
export function calculateFreightPayment(
  volumeM3: number,
  freightRatePerM3: number,
  pphAmount: number = 0
): PaymentCalculationResult {
  if (volumeM3 < 0 || freightRatePerM3 < 0 || pphAmount < 0) {
    throw new RangeError('Values must be non-negative');
  }
  const gross = Number((volumeM3 * freightRatePerM3).toFixed(2));
  const netPayable = Number((gross - pphAmount).toFixed(2));
  return { gross, pphAmount, netPayable };
}

/**
 * Auto-computes calculated financial totals and measurement discrepancies from raw inputs.
 */
export function computeRecordCalculations(
  input: RecordCalculationInput
): RecordCalculationOutput {
  const timber = calculateTimberPayment(input.tallyVolumeM3, input.timberPricePerM3, input.timberPphRate ?? 0);
  const freight = calculateFreightPayment(input.tallyVolumeM3, input.freightRatePerM3, input.freightPphAmount ?? 0);
  const broker = input.brokerFee ?? 0;
  if (broker < 0) throw new RangeError('Broker fee must be non-negative');

  const grandNetPayable = Number((timber.netPayable + freight.netPayable + broker).toFixed(2));
  const volumeDiscrepancyM3 = Number((input.tallyVolumeM3 - input.deliveredVolumeM3).toFixed(4));
  const pieceDiscrepancy = input.tallyPieces - input.deliveredPieces;

  return {
    volumeDiscrepancyM3,
    pieceDiscrepancy,
    timberGrossTotal: timber.gross,
    timberPphAmount: timber.pphAmount,
    timberNetPayable: timber.netPayable,
    freightGrossTotal: freight.gross,
    freightNetPayable: freight.netPayable,
    grandNetPayable,
  };
}

/**
 * Aggregates high-level executive dashboard metrics across wood receiving records.
 */
export function aggregateDashboardMetrics(
  records: WoodReceivingRecord[],
  thresholds?: { volumeThresholdM3?: number; percentThreshold?: number }
): DashboardMetrics {
  const volThresh = thresholds?.volumeThresholdM3 ?? 1.5;
  const pctThresh = thresholds?.percentThreshold ?? 2.0;

  let totalDeliveredVolumeM3 = 0, totalTallyVolumeM3 = 0;
  let totalDeliveredPieces = 0, totalTallyPieces = 0;
  let totalNetTimberPayable = 0, totalNetFreightPayable = 0;
  let totalGrandExpenditure = 0, totalOutstandingPayable = 0;
  let unpaidRecordsCount = 0;
  let recordsWithAlarmCount = 0;

  const kavlingSet = new Set<string>();
  const speciesVolumeBreakdown: Record<string, number> = {};

  for (const r of records) {
    totalDeliveredVolumeM3 += r.deliveredVolumeM3;
    totalTallyVolumeM3 += r.tallyVolumeM3;
    totalDeliveredPieces += r.deliveredPieces;
    totalTallyPieces += r.tallyPieces;
    totalNetTimberPayable += r.timberNetPayable;
    totalNetFreightPayable += r.freightNetPayable;
    totalGrandExpenditure += r.grandNetPayable;

    const evalRes = evaluateDiscrepancy({
      tallyVolumeM3: r.tallyVolumeM3,
      deliveredVolumeM3: r.deliveredVolumeM3,
      tallyPieces: r.tallyPieces,
      deliveredPieces: r.deliveredPieces,
      volumeThresholdM3: volThresh,
      percentThreshold: pctThresh,
    });
    if (evalRes.isAlarm) {
      recordsWithAlarmCount += 1;
    }

    const status = r.paymentStatus || 'UNPAID';
    if (status !== 'PAID') {
      totalOutstandingPayable += r.grandNetPayable;
      unpaidRecordsCount += 1;
    }

    if (r.kavlingNumber && r.kavlingNumber.trim()) {
      kavlingSet.add(r.kavlingNumber.trim());
    }

    const species = r.woodSpecies && r.woodSpecies.trim() ? r.woodSpecies.trim() : 'Unknown';
    speciesVolumeBreakdown[species] = Number(
      ((speciesVolumeBreakdown[species] ?? 0) + r.tallyVolumeM3).toFixed(4)
    );
  }

  return {
    totalDeliveredVolumeM3: Number(totalDeliveredVolumeM3.toFixed(4)),
    totalTallyVolumeM3: Number(totalTallyVolumeM3.toFixed(4)),
    volumeDiscrepancyM3: Number((totalTallyVolumeM3 - totalDeliveredVolumeM3).toFixed(4)),
    totalDeliveredPieces,
    totalTallyPieces,
    pieceDiscrepancy: totalTallyPieces - totalDeliveredPieces,
    totalNetTimberPayable: Number(totalNetTimberPayable.toFixed(2)),
    totalNetFreightPayable: Number(totalNetFreightPayable.toFixed(2)),
    totalGrandExpenditure: Number(totalGrandExpenditure.toFixed(2)),
    totalOutstandingPayable: Number(totalOutstandingPayable.toFixed(2)),
    unpaidRecordsCount,
    totalRecordsCount: records.length,
    activeKavlingCount: kavlingSet.size,
    recordsWithAlarmCount,
    speciesVolumeBreakdown,
  };
}

/**
 * Calculates cubic meters (m³) from log/timber dimensions measured in centimeters.
 * Formula: (T_cm * L_cm * P_cm * pieces) / 1,000,000
 */
export function calculateCubicFromCentimeters(
  thicknessCm: number,
  widthCm: number,
  lengthCm: number,
  pieces: number = 1
): number {
  if (thicknessCm < 0 || widthCm < 0 || lengthCm < 0 || pieces < 0) {
    throw new RangeError('Dimensions and pieces must be non-negative values');
  }
  const total = (thicknessCm * widthCm * lengthCm * pieces) / 1000000;
  return Number(total.toFixed(4));
}

export type DiscrepancyStatus = 'match' | 'surplus' | 'shortage';

/**
 * Classifies volumetric or piece discrepancy into semantic status: match, surplus, or shortage.
 */
export function classifyDiscrepancy(diff: number, tolerance: number = 0.001): DiscrepancyStatus {
  if (Math.abs(diff) < tolerance) return 'match';
  return diff > 0 ? 'surplus' : 'shortage';
}

/**
 * Calculates cubic meters for round logs (kayu bulat) using standard cylindrical formula:
 * Volume (m³) = 0.7854 * (diameterCm)^2 * (lengthM) / 10,000 * pieces
 *
 * @param diameterCm - Average log diameter in centimeters
 * @param lengthM - Log length in meters
 * @param pieces - Quantity of logs (defaults to 1)
 */
export function calculateRoundLogVolumeM3(
  diameterCm: number,
  lengthM: number,
  pieces: number = 1
): number {
  if (diameterCm < 0 || lengthM < 0 || pieces < 0) {
    throw new RangeError('Dimensions and pieces must be non-negative values');
  }
  if (diameterCm === 0 || lengthM === 0 || pieces === 0) {
    return 0;
  }
  const rawVolume = (0.7854 * Math.pow(diameterCm, 2) * lengthM * pieces) / 10000;
  return Number(rawVolume.toFixed(4));
}

export { computeManifestCalculations } from './manifest-calc.ts';
