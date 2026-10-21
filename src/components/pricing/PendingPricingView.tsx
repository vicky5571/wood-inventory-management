'use client';

import React, { useState, useMemo } from 'react';
import { useWoodRecords } from '@/src/hooks/useWoodRecords';
import { useAuth } from '@/src/hooks/useAuth';
import { PendingPricingKpiStrip } from './PendingPricingKpiStrip';
import { PendingPricingToolbar } from './PendingPricingToolbar';
import { PendingPricingTable } from './PendingPricingTable';
import { PendingPricingEmptyState } from './PendingPricingEmptyState';
import { toast } from '@/src/utils/toast-store';
import { Tag } from 'lucide-react';

export function PendingPricingView() {
  const { allRecords, updateRecordPrice } = useWoodRecords();
  const { canWrite } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');

  // Extract all unpriced records
  const pendingRecords = useMemo(
    () => allRecords.filter((r) => r.timberPricePerM3 === null),
    [allRecords]
  );

  // Extract unique suppliers from pending records
  const suppliers = useMemo(
    () =>
      Array.from(new Set(pendingRecords.map((r) => r.supplierName).filter(Boolean))).sort(),
    [pendingRecords]
  );

  // Compute overall KPI metrics
  const pendingCount = pendingRecords.length;
  const pendingVolumeM3 = useMemo(
    () => pendingRecords.reduce((sum, r) => sum + r.tallyVolumeM3, 0),
    [pendingRecords]
  );

  const exposureIDR = useMemo(() => {
    const priced = allRecords.filter((r) => r.timberPricePerM3 !== null);
    if (priced.length === 0) return 0;
    const sumPrice = priced.reduce((sum, r) => sum + (r.timberPricePerM3 ?? 0), 0);
    const avgPrice = sumPrice / priced.length;
    return Math.round(pendingVolumeM3 * avgPrice);
  }, [allRecords, pendingVolumeM3]);

  // Apply filters
  const filteredRecords = useMemo(() => {
    return pendingRecords.filter((r) => {
      if (selectedSupplier && r.supplierName !== selectedSupplier) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesPlate = r.truckPlateNumber.toLowerCase().includes(query);
        const matchesSupplier = r.supplierName.toLowerCase().includes(query);
        const matchesDoc = (r.forestryDocNumber || '').toLowerCase().includes(query);
        const matchesReceipt = (r.receiptNumber || '').toLowerCase().includes(query);
        const matchesSpecies = (r.woodSpecies || '').toLowerCase().includes(query);
        if (!matchesPlate && !matchesSupplier && !matchesDoc && !matchesReceipt && !matchesSpecies) {
          return false;
        }
      }
      return true;
    });
  }, [pendingRecords, selectedSupplier, searchQuery]);

  const handleUpdatePrice = async (id: string, price: number | null) => {
    try {
      await updateRecordPrice(id, price);
      toast.success(
        'Harga Ditetapkan (定价成功)',
        `Harga kayu telah diperbarui menjadi Rp ${(price ?? 0).toLocaleString('id-ID')}/m³`
      );
    } catch {
      toast.error('Gagal Menyimpan (保存失败)', 'Terjadi kesalahan saat menyimpan harga.');
    }
  };

  const isFiltered = searchQuery.trim() !== '' || selectedSupplier !== '';

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center font-bold">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-950 tracking-tight">
              Kelola Harga Kayu Tertunda (待定价木材管理)
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Tetapkan harga per m³ untuk muatan kayu yang tiba sebelum kontrak disepakati.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <PendingPricingKpiStrip
        pendingCount={pendingCount}
        pendingVolumeM3={pendingVolumeM3}
        exposureIDR={exposureIDR}
      />

      {/* Toolbar */}
      <PendingPricingToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedSupplier={selectedSupplier}
        onSupplierChange={setSelectedSupplier}
        suppliers={suppliers}
        totalFiltered={filteredRecords.length}
      />

      {/* Table or Empty State */}
      {filteredRecords.length === 0 ? (
        <PendingPricingEmptyState
          isFiltered={isFiltered}
          onResetFilter={() => {
            setSearchQuery('');
            setSelectedSupplier('');
          }}
        />
      ) : (
        <PendingPricingTable
          records={filteredRecords}
          onUpdatePrice={handleUpdatePrice}
          canWrite={canWrite}
        />
      )}
    </div>
  );
}
