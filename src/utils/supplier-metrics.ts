import type { WoodReceivingRecord, SupplierSummary, Supplier, SupplierWithMetrics } from '../types/index.ts';

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

export function mergeSuppliersWithMetrics(
  suppliers: Supplier[] = [],
  records: WoodReceivingRecord[] = []
): SupplierWithMetrics[] {
  const deliveryMap = new Map<string, {
    rawName: string;
    totalDeliveries: number;
    totalDeliveredVolumeM3: number;
    totalTallyVolumeM3: number;
    totalGrandNetPayable: number;
    speciesSet: Set<string>;
    latestDate: string;
  }>();

  for (const r of records) {
    const raw = (r.supplierName || 'Pemasok Tidak Diketahui').trim();
    const key = raw.toLowerCase();
    const existing = deliveryMap.get(key) || {
      rawName: raw,
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

    deliveryMap.set(key, existing);
  }

  const registeredNormalized = new Set<string>();
  const result: SupplierWithMetrics[] = [];

  for (const s of suppliers) {
    const key = s.name.trim().toLowerCase();
    registeredNormalized.add(key);

    const delivery = deliveryMap.get(key);
    if (delivery) {
      const delVol = Number(delivery.totalDeliveredVolumeM3.toFixed(4));
      const talVol = Number(delivery.totalTallyVolumeM3.toFixed(4));
      const discrepancyM3 = Number((talVol - delVol).toFixed(4));
      const ratePct = delVol > 0 ? Number(((discrepancyM3 / delVol) * 100).toFixed(2)) : 0;

      let ratingStatus: 'OPTIMAL' | 'ACCEPTABLE' | 'ATTENTION' = 'OPTIMAL';
      if (Math.abs(ratePct) > 3) {
        ratingStatus = 'ATTENTION';
      } else if (Math.abs(ratePct) > 1) {
        ratingStatus = 'ACCEPTABLE';
      }

      result.push({
        ...s,
        supplierName: s.name,
        totalDeliveries: delivery.totalDeliveries,
        totalDeliveredVolumeM3: delVol,
        totalTallyVolumeM3: talVol,
        volumeDiscrepancyM3: discrepancyM3,
        discrepancyRatePercent: ratePct,
        totalGrandNetPayable: Number(delivery.totalGrandNetPayable.toFixed(2)),
        primarySpecies: Array.from(delivery.speciesSet),
        lastDeliveryDate: delivery.latestDate,
        ratingStatus,
      });
    } else {
      // 0 deliveries yet
      result.push({
        ...s,
        supplierName: s.name,
        totalDeliveries: 0,
        totalDeliveredVolumeM3: 0,
        totalTallyVolumeM3: 0,
        volumeDiscrepancyM3: 0,
        discrepancyRatePercent: 0,
        totalGrandNetPayable: 0,
        primarySpecies: [],
        lastDeliveryDate: '',
        ratingStatus: 'OPTIMAL',
      });
    }
  }

  // Add any suppliers found in delivery records but not in registered suppliers list
  let autoIndex = 1;
  for (const [key, delivery] of deliveryMap.entries()) {
    if (!registeredNormalized.has(key)) {
      const delVol = Number(delivery.totalDeliveredVolumeM3.toFixed(4));
      const talVol = Number(delivery.totalTallyVolumeM3.toFixed(4));
      const discrepancyM3 = Number((talVol - delVol).toFixed(4));
      const ratePct = delVol > 0 ? Number(((discrepancyM3 / delVol) * 100).toFixed(2)) : 0;

      let ratingStatus: 'OPTIMAL' | 'ACCEPTABLE' | 'ATTENTION' = 'OPTIMAL';
      if (Math.abs(ratePct) > 3) {
        ratingStatus = 'ATTENTION';
      } else if (Math.abs(ratePct) > 1) {
        ratingStatus = 'ACCEPTABLE';
      }

      result.push({
        id: `spl-adhoc-${autoIndex++}`,
        code: `SPL-REC`,
        name: delivery.rawName,
        supplierName: delivery.rawName,
        status: 'ACTIVE',
        createdAt: delivery.latestDate ? `${delivery.latestDate}T00:00:00Z` : new Date().toISOString(),
        updatedAt: delivery.latestDate ? `${delivery.latestDate}T00:00:00Z` : new Date().toISOString(),
        totalDeliveries: delivery.totalDeliveries,
        totalDeliveredVolumeM3: delVol,
        totalTallyVolumeM3: talVol,
        volumeDiscrepancyM3: discrepancyM3,
        discrepancyRatePercent: ratePct,
        totalGrandNetPayable: Number(delivery.totalGrandNetPayable.toFixed(2)),
        primarySpecies: Array.from(delivery.speciesSet),
        lastDeliveryDate: delivery.latestDate,
        ratingStatus,
      });
    }
  }

  return result.sort((a, b) => {
    if (b.totalTallyVolumeM3 !== a.totalTallyVolumeM3) {
      return b.totalTallyVolumeM3 - a.totalTallyVolumeM3;
    }
    return a.name.localeCompare(b.name);
  });
}
