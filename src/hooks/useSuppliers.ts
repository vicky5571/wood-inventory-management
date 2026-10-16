'use client';

import { useMemo } from 'react';
import type { WoodReceivingRecord, SupplierSummary } from '../types/index.ts';
import { calculateSupplierSummaries } from '../utils/supplier-metrics.ts';

export function useSuppliers(records: WoodReceivingRecord[]) {
  const suppliers: SupplierSummary[] = useMemo(() => {
    return calculateSupplierSummaries(records);
  }, [records]);

  const topSuppliers = useMemo(() => {
    return suppliers.slice(0, 5);
  }, [suppliers]);

  const stats = useMemo(() => {
    const totalVendors = suppliers.length;
    const optimalCount = suppliers.filter((s) => s.status === 'OPTIMAL').length;
    const attentionCount = suppliers.filter((s) => s.status === 'ATTENTION').length;
    const totalVolumeM3 = suppliers.reduce((acc, s) => acc + s.totalTallyVolumeM3, 0);
    const avgDiscrepancyPct = totalVendors > 0
      ? Number((suppliers.reduce((acc, s) => acc + s.discrepancyRatePercent, 0) / totalVendors).toFixed(2))
      : 0;

    return {
      totalVendors,
      optimalCount,
      attentionCount,
      totalVolumeM3,
      avgDiscrepancyPct,
    };
  }, [suppliers]);

  return {
    suppliers,
    topSuppliers,
    stats,
  };
}
