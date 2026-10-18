/**
 * src/utils/manifest-calc.ts
 *
 * Dedicated pure domain calculation helper for multi-item receiving manifests.
 * Decomposed from timber-calc.ts to respect the <250 LOC Strangler invariant.
 */

import type {
  ManifestFormInput,
  ManifestCalculationOutput,
} from '../types/index.ts';

/**
 * Computes pure domain calculations and financial aggregations for multi-item receiving manifests.
 * Handles per-line timber totals, aggregate delivered/tally volumes, volumetric discrepancies,
 * truck freight on total tally volume, and grand net payable.
 */
export function computeManifestCalculations(manifest: ManifestFormInput): ManifestCalculationOutput {
  let totalDeliveredPieces = 0, totalDeliveredVolumeM3 = 0;
  let totalTallyPieces = 0, totalTallyVolumeM3 = 0;
  let totalTimberGross = 0, totalTimberPph = 0, totalTimberNet = 0;

  const items = (manifest.items || []).map((item) => {
    const deliveredPieces = Math.max(0, Number(item.deliveredPieces) || 0);
    const deliveredVolumeM3 = Math.max(0, Number(item.deliveredVolumeM3) || 0);
    const tallyPieces = Math.max(0, Number(item.tallyPieces) || 0);
    const tallyVolumeM3 = Math.max(0, Number(item.tallyVolumeM3) || 0);
    const timberPricePerM3 = Math.max(0, Number(item.timberPricePerM3) || 0);
    const timberPphRate = Math.max(0, Number(item.timberPphRate) || 0);

    const timberGrossTotal = Math.round(tallyVolumeM3 * timberPricePerM3);
    const timberPphAmount = Math.round(timberGrossTotal * (timberPphRate / 100));
    const timberNetPayable = timberGrossTotal - timberPphAmount;

    const volumeDiscrepancyM3 = Number((tallyVolumeM3 - deliveredVolumeM3).toFixed(4));
    const pieceDiscrepancy = tallyPieces - deliveredPieces;

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
