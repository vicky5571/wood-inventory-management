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
    totalRecordsCount: records.length,
    activeKavlingCount: kavlingSet.size,
    speciesVolumeBreakdown,
  };
}
