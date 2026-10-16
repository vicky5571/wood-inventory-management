import type { WoodReceivingRecord, SupplierSummary } from '../types/index.ts';

export function calculateSupplierSummaries(records: WoodReceivingRecord[]): SupplierSummary[] {
  if (!records || records.length === 0) return [];

  const map = new Map<string, {
    totalDeliveries: number;
    totalDeliveredVolumeM3: number;
    totalTallyVolumeM3: number;
    totalGrandNetPayable: number;
    speciesSet: Set<string>;
    latestDate: string;
  }>();

  for (const r of records) {
    const name = (r.supplierName || 'Pemasok Tidak Diketahui').trim();
    const existing = map.get(name) || {
      totalDeliveries: 0,
      totalDeliveredVolumeM3: 0,
      totalTallyVolumeM3: 0,
      totalGrandNetPayable: 0,
      speciesSet: new Set<string>(),
      latestDate: '',
    };

    existing.totalDeliveries += 1;
    existing.totalDeliveredVolumeM3 += r.deliveredVolumeM3 || 0;
    existing.totalTallyVolumeM3 += r.tallyVolumeM3 || 0;
    existing.totalGrandNetPayable += r.grandNetPayable || 0;
    if (r.woodSpecies) existing.speciesSet.add(r.woodSpecies.split('/')[0].trim());
    if (!existing.latestDate || (r.receiptDate && r.receiptDate > existing.latestDate)) {
      existing.latestDate = r.receiptDate;
    }

    map.set(name, existing);
  }

  return Array.from(map.entries()).map(([supplierName, data]) => {
    const delVol = Number(data.totalDeliveredVolumeM3.toFixed(4));
    const talVol = Number(data.totalTallyVolumeM3.toFixed(4));
    const discrepancyM3 = Number((talVol - delVol).toFixed(4));
    const ratePct = delVol > 0 ? Number(((discrepancyM3 / delVol) * 100).toFixed(2)) : 0;

    let status: 'OPTIMAL' | 'ACCEPTABLE' | 'ATTENTION' = 'OPTIMAL';
    if (Math.abs(ratePct) > 3) {
      status = 'ATTENTION';
    } else if (Math.abs(ratePct) > 1) {
      status = 'ACCEPTABLE';
    }

    return {
      supplierName,
      totalDeliveries: data.totalDeliveries,
      totalDeliveredVolumeM3: delVol,
      totalTallyVolumeM3: talVol,
      volumeDiscrepancyM3: discrepancyM3,
      discrepancyRatePercent: ratePct,
      totalGrandNetPayable: Number(data.totalGrandNetPayable.toFixed(2)),
      primarySpecies: Array.from(data.speciesSet),
      lastDeliveryDate: data.latestDate,
      status,
    };
  }).sort((a, b) => b.totalTallyVolumeM3 - a.totalTallyVolumeM3);
}
