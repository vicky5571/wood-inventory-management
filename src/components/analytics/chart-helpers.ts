import type { WoodReceivingRecord } from '../../types/index.ts';

export interface VolumeTrendData {
  labels: string[];
  deliveredVolumes: number[];
  tallyVolumes: number[];
}

export interface SpeciesDonutData {
  labels: string[];
  values: number[];
  colors: string[];
}

export interface SupplierBarData {
  labels: string[];
  delivered: number[];
  tally: number[];
}

export const CHART_PALETTE = [
  '#b45309', // Warm Amber (Teak)
  '#ffc908', // Yellow (Pine/Albasia)
  '#0284c7', // Sky Blue (Merbau)
  '#00bb7f', // Emerald (Mahoni)
  '#6366f1', // Indigo (Sonokeling)
  '#ec4899', // Pink (Kamper)
  '#14b8a6', // Teal
  '#f97316', // Orange
];

/**
 * Prepares chronological timeline data of delivered vs measured tally cubic meters
 */
export function prepareVolumeTrendData(records: WoodReceivingRecord[]): VolumeTrendData {
  if (!records || records.length === 0) {
    return { labels: [], deliveredVolumes: [], tallyVolumes: [] };
  }

  // Group and accumulate by date
  const dateMap = new Map<string, { delivered: number; tally: number }>();

  for (const r of records) {
    const date = r.receiptDate || 'Unknown';
    const existing = dateMap.get(date) || { delivered: 0, tally: 0 };
    existing.delivered += r.deliveredVolumeM3 || 0;
    existing.tally += r.tallyVolumeM3 || 0;
    dateMap.set(date, existing);
  }

  // Sort dates chronologically
  const sortedDates = Array.from(dateMap.keys()).sort();

  return {
    labels: sortedDates,
    deliveredVolumes: sortedDates.map((d) => Number((dateMap.get(d)!.delivered).toFixed(2))),
    tallyVolumes: sortedDates.map((d) => Number((dateMap.get(d)!.tally).toFixed(2))),
  };
}

/**
 * Prepares breakdown by timber species for doughnut charts
 */
export function prepareSpeciesDonutData(records: WoodReceivingRecord[]): SpeciesDonutData {
  if (!records || records.length === 0) {
    return { labels: [], values: [], colors: [] };
  }

  const speciesMap = new Map<string, number>();

  for (const r of records) {
    const species = (r.woodSpecies || 'Lainnya').split('/')[0].trim();
    const current = speciesMap.get(species) || 0;
    speciesMap.set(species, current + (r.tallyVolumeM3 || 0));
  }

  const sorted = Array.from(speciesMap.entries())
    .filter(([_, vol]) => vol > 0)
    .sort((a, b) => b[1] - a[1]);

  return {
    labels: sorted.map(([sp]) => sp),
    values: sorted.map(([_, vol]) => Number(vol.toFixed(2))),
    colors: sorted.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]),
  };
}

/**
 * Prepares supplier volume comparison data for horizontal or vertical bar charts
 */
export function prepareSupplierBarData(records: WoodReceivingRecord[]): SupplierBarData {
  if (!records || records.length === 0) {
    return { labels: [], delivered: [], tally: [] };
  }

  const supplierMap = new Map<string, { del: number; tal: number }>();

  for (const r of records) {
    const name = (r.supplierName || 'Pemasok').trim();
    // Shorten long legal entity prefix for clean chart axis labels
    const shortName = name
      .replace(/^(PT|CV|Koperasi|UD)\.?\s+/i, '')
      .split(' ')
      .slice(0, 3)
      .join(' ');

    const existing = supplierMap.get(shortName) || { del: 0, tal: 0 };
    existing.del += r.deliveredVolumeM3 || 0;
    existing.tal += r.tallyVolumeM3 || 0;
    supplierMap.set(shortName, existing);
  }

  // Top 6 suppliers by volume
  const sorted = Array.from(supplierMap.entries())
    .sort((a, b) => b[1].tal - a[1].tal)
    .slice(0, 6);

  return {
    labels: sorted.map(([label]) => label),
    delivered: sorted.map(([_, val]) => Number(val.del.toFixed(2))),
    tally: sorted.map(([_, val]) => Number(val.tal.toFixed(2))),
  };
}
