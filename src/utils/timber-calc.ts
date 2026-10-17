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
  const timber = calculateTimberPayment(
    input.tallyVolumeM3,
    input.timberPricePerM3,
    input.timberPphRate ?? 0
  );

  const freight = calculateFreightPayment(
    input.tallyVolumeM3,
    input.freightRatePerM3,
    input.freightPphAmount ?? 0
  );

  const broker = input.brokerFee ?? 0;
  if (broker < 0) {
    throw new RangeError('Broker fee must be non-negative');
  }

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
  records: WoodReceivingRecord[]
): DashboardMetrics {
  let totalDeliveredVolumeM3 = 0;
  let totalTallyVolumeM3 = 0;
  let totalDeliveredPieces = 0;
  let totalTallyPieces = 0;
  let totalNetTimberPayable = 0;
  let totalNetFreightPayable = 0;
  let totalGrandExpenditure = 0;
  let totalOutstandingPayable = 0;
  let unpaidRecordsCount = 0;

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
 * Computes pure domain calculations and financial aggregations for multi-item receiving manifests.
 * Handles per-line timber totals, aggregate delivered/tally volumes, volumetric discrepancies,
 * truck freight on total tally volume, and grand net payable.
 */
export function computeManifestCalculations(manifest: ManifestFormInput): ManifestCalculationOutput {
  let totalDeliveredPieces = 0;
  let totalDeliveredVolumeM3 = 0;
  let totalTallyPieces = 0;
  let totalTallyVolumeM3 = 0;
  let totalTimberGross = 0;
  let totalTimberPph = 0;
  let totalTimberNet = 0;

  const items = (manifest.items || []).map((item) => {
    const deliveredPieces = Math.max(0, Number(item.deliveredPieces) || 0);
    const deliveredVolumeM3 = Math.max(0, Number(item.deliveredVolumeM3) || 0);
    const tallyPieces = Math.max(0, Number(item.tallyPieces) || 0);
    const tallyVolumeM3 = Math.max(0, Number(item.tallyVolumeM3) || 0);
    const timberPricePerM3 = Math.max(0, Number(item.timberPricePerM3) || 0);
    const timberPphRate = Math.max(0, Number(item.timberPphRate) || 0);

    const pieceDiscrepancy = tallyPieces - deliveredPieces;
    const volumeDiscrepancyM3 = Number((tallyVolumeM3 - deliveredVolumeM3).toFixed(4));
    const timberGrossTotal = Math.round(tallyVolumeM3 * timberPricePerM3);
    const timberPphAmount = Math.round(timberGrossTotal * (timberPphRate / 100));
    const timberNetPayable = timberGrossTotal - timberPphAmount;

    totalDeliveredPieces += deliveredPieces;
    totalDeliveredVolumeM3 += deliveredVolumeM3;
    totalTallyPieces += tallyPieces;
    totalTallyVolumeM3 += tallyVolumeM3;
    totalTimberGross += timberGrossTotal;
    totalTimberPph += timberPphAmount;
    totalTimberNet += timberNetPayable;

    return {
      ...item,
      deliveredPieces,
      deliveredVolumeM3,
      tallyPieces,
      tallyVolumeM3,
      timberPricePerM3,
      timberPphRate,
      timberGrossTotal,
      timberPphAmount,
      timberNetPayable,
      volumeDiscrepancyM3,
      pieceDiscrepancy,
    };
  });

  totalDeliveredVolumeM3 = Number(totalDeliveredVolumeM3.toFixed(4));
  totalTallyVolumeM3 = Number(totalTallyVolumeM3.toFixed(4));
  const volumeDiscrepancyM3 = Number((totalTallyVolumeM3 - totalDeliveredVolumeM3).toFixed(4));
  const pieceDiscrepancy = totalTallyPieces - totalDeliveredPieces;

  const freightRatePerM3 = Math.max(0, Number(manifest.freightRatePerM3) || 0);
  const freightGrossTotal = Math.round(totalTallyVolumeM3 * freightRatePerM3);
  const freightPphAmount = Math.round(freightGrossTotal * 0.02);
  const freightNetPayable = freightGrossTotal - freightPphAmount;
  const brokerFee = Math.max(0, Number(manifest.brokerFee) || 0);
  const grandNetPayable = totalTimberNet + freightNetPayable + brokerFee;

  return {
    totalDeliveredPieces,
    totalDeliveredVolumeM3,
    totalTallyPieces,
    totalTallyVolumeM3,
    volumeDiscrepancyM3,
    pieceDiscrepancy,
    totalTimberGross,
    totalTimberPph,
    totalTimberNet,
    freightGrossTotal,
    freightPphAmount,
    freightNetPayable,
    brokerFee,
    grandNetPayable,
    items,
  };
}
