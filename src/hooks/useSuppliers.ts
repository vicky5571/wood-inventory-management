'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { WoodReceivingRecord, Supplier, SupplierWithMetrics } from '../types/index.ts';
import { SupplierRepository } from '../persistence/supplier-repository.ts';
import { mergeSuppliersWithMetrics } from '../utils/supplier-metrics.ts';

const repo = new SupplierRepository();

export function useSuppliers(records: WoodReceivingRecord[] = []) {
  const [rawSuppliers, setRawSuppliers] = useState<Supplier[]>([]);

  const reload = useCallback(() => {
    setRawSuppliers(repo.getAll());
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const suppliers: SupplierWithMetrics[] = useMemo(() => {
    return mergeSuppliersWithMetrics(rawSuppliers, records);
  }, [rawSuppliers, records]);

  const topSuppliers = useMemo(() => {
    return [...suppliers]
      .sort((a, b) => b.totalTallyVolumeM3 - a.totalTallyVolumeM3)
      .slice(0, 5);
  }, [suppliers]);

  const stats = useMemo(() => {
    const totalVendors = suppliers.length;
    const optimalCount = suppliers.filter((s) => s.ratingStatus === 'OPTIMAL').length;
    const attentionCount = suppliers.filter((s) => s.ratingStatus === 'ATTENTION').length;
    const totalVolumeM3 = suppliers.reduce((acc, s) => acc + s.totalTallyVolumeM3, 0);
    const avgDiscrepancyPct =
      totalVendors > 0
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

  const addSupplier = useCallback((data: Partial<Supplier> & { name: string }) => {
    const saved = repo.save(data);
    reload();
    return saved;
  }, [reload]);

  const updateSupplier = useCallback((id: string, data: Partial<Supplier>) => {
    const saved = repo.save({ ...data, id, name: data.name || '' });
    reload();
    return saved;
  }, [reload]);

  const deleteSupplier = useCallback((id: string) => {
    const success = repo.delete(id);
    if (success) reload();
    return success;
  }, [reload]);

  return {
    suppliers,
    rawSuppliers,
    topSuppliers,
    stats,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    refreshSuppliers: reload,
  };
}
