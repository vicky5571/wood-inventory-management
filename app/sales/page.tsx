'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useWoodRecords } from '@/src/hooks/useWoodRecords';
import { useWoodSalesRecords } from '@/src/hooks/useWoodSalesRecords';
import { useAuth } from '@/src/hooks/useAuth';
import { SalesSummaryCards } from '@/src/components/sales/SalesSummaryCards';
import { SalesTable } from '@/src/components/sales/SalesTable';
import { SalesModal } from '@/src/components/sales/SalesModal';
import { PrintDeliveryOrderModal } from '@/src/components/sales/PrintDeliveryOrderModal';
import { ConfirmDialog } from '@/src/components/ui/ConfirmDialog';
import type { WoodSalesRecord, SalesFormInput, PaymentStatus } from '@/src/types/index';
import { Truck, Plus, Search, ArrowLeft, RefreshCw } from 'lucide-react';

export default function SalesPage() {
  const { canWrite } = useAuth();
  const { allRecords } = useWoodRecords();
  const { sales, isSyncing, saveSale, deleteSale, customerHistory } = useWoodSalesRecords(allRecords);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PaymentStatus>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<WoodSalesRecord | null>(null);
  const [printingSale, setPrintingSale] = useState<WoodSalesRecord | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (statusFilter !== 'ALL' && s.paymentStatus !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.customerName.toLowerCase().includes(q) ||
        s.deliveryOrderNumber.toLowerCase().includes(q) ||
        s.truckPlateNumber.toLowerCase().includes(q) ||
        s.woodSpecies.toLowerCase().includes(q) ||
        s.storageYard.toLowerCase().includes(q) ||
        s.kavlingNumber.toLowerCase().includes(q)
      );
    });
  }, [sales, searchQuery, statusFilter]);

  const handleOpenCreate = () => {
    setEditingSale(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (record: WoodSalesRecord) => {
    setEditingSale(record);
    setIsModalOpen(true);
  };

  const handleSave = async (form: SalesFormInput) => {
    await saveSale(form);
  };

  const handleConfirmDelete = async () => {
    if (pendingDeleteId) {
      await deleteSale(pendingDeleteId);
      setPendingDeleteId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/ledger"
              className="inline-flex items-center gap-1 text-xs text-amber-800 hover:text-amber-950 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Buku Penerimaan (入库总账)</span>
            </Link>
          </div>
          <h1 className="text-xl font-bold text-[#101828] tracking-tight flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-700 shrink-0" />
            <span>Buku Penjualan & Pengeluaran Kayu (木材销售与出库)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Pencatatan Surat Jalan Keluar (DO), pengurangan stok live kavling TPK, dan pelacakan piutang.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSyncing && (
            <span className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Sinkronisasi...</span>
            </span>
          )}
          {canWrite && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-gray-950 bg-[#ffc908] hover:bg-[#e0b007] rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Penjualan (出库录入)</span>
            </button>
          )}
        </div>
      </div>

      <SalesSummaryCards sales={filteredSales} />

      <div className="p-3 bg-white rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari customer, DO, plat truk, kavling..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border rounded-xl bg-gray-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-medium text-gray-500">Status Bayar:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 text-xs border rounded-xl bg-white text-gray-800"
          >
            <option value="ALL">Semua Status (全部)</option>
            <option value="UNPAID">Belum Lunas (未付款)</option>
            <option value="PARTIAL">Sebagian (部分付款)</option>
            <option value="PAID">Lunas (已付清)</option>
          </select>
        </div>
      </div>

      <SalesTable
        sales={filteredSales}
        onPrint={(sale) => setPrintingSale(sale)}
        onEdit={handleOpenEdit}
        onDelete={(id) => setPendingDeleteId(id)}
        canWrite={canWrite}
      />

      <SalesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        inboundRecords={allRecords}
        existingSales={sales}
        customerHistory={customerHistory}
        initialData={editingSale}
      />

      <PrintDeliveryOrderModal
        isOpen={Boolean(printingSale)}
        onClose={() => setPrintingSale(null)}
        record={printingSale}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingDeleteId)}
        title="Hapus Penjualan Kayu? (确认删除出库记录)"
        description="Surat jalan penjualan ini akan dihapus dari buku keluar dan stok kayu kavling akan dikembalikan secara otomatis."
        confirmLabel="Hapus Penjualan"
        cancelLabel="Batal"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}

