/**
 * src/utils/production-calc.ts
 *
 * Pure domain calculators for sawmill production yield, waste,
 * advisory warnings, and KPI aggregations.
 */

import type { SawmillProductionRecord } from '../types/index.ts';

export function computeProductionYield(
  inputOrVol: { inputVolumeM3: number; outputVolumeM3: number } | number,
  maybeOutputVol?: number
): { yieldPercent: number; wasteVolumeM3: number } {
  let inVol = 0;
  let outVol = 0;

  if (typeof inputOrVol === 'object' && inputOrVol !== null) {
    inVol = Math.max(0, Number(inputOrVol.inputVolumeM3) || 0);
    outVol = Math.max(0, Number(inputOrVol.outputVolumeM3) || 0);
  } else {
    inVol = Math.max(0, Number(inputOrVol) || 0);
    outVol = Math.max(0, Number(maybeOutputVol) || 0);
  }

  if (inVol === 0) {
    return { yieldPercent: 0, wasteVolumeM3: 0 };
  }

  const yieldPercent = Number(((outVol / inVol) * 100).toFixed(2));
  const wasteVolumeM3 = Number(Math.max(0, inVol - outVol).toFixed(4));

  return {
    yieldPercent,
    wasteVolumeM3,
  };
}

export function aggregateProductionMetrics(
  records: SawmillProductionRecord[],
  dateRange?: { startDate: string; endDate: string }
): {
  totalInputVolumeM3: number;
  totalOutputVolumeM3: number;
  totalWasteVolumeM3: number;
  averageYieldPercent: number;
  recordCount: number;
} {
  const filtered = (records || []).filter((r) => {
    if (!dateRange) return true;
    const d = r.productionDate;
    return d >= dateRange.startDate && d <= dateRange.endDate;
  });

  let totalInput = 0;
  let totalOutput = 0;
  let totalWaste = 0;

  for (const r of filtered) {
    totalInput += Number(r.inputVolumeM3) || 0;
    totalOutput += Number(r.outputVolumeM3) || 0;
    totalWaste += Number(r.wasteVolumeM3) || 0;
  }

  const averageYieldPercent =
    totalInput > 0 ? Number(((totalOutput / totalInput) * 100).toFixed(2)) : 0;

  return {
    totalInputVolumeM3: Number(totalInput.toFixed(4)),
    totalOutputVolumeM3: Number(totalOutput.toFixed(4)),
    totalWasteVolumeM3: Number(totalWaste.toFixed(4)),
    averageYieldPercent,
    recordCount: filtered.length,
  };
}
