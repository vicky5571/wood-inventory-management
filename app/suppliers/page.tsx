'use client';

import React, { useState, useMemo } from 'react';
import { useWoodRecords } from '@/src/hooks/useWoodRecords';
import { useSuppliers } from '@/src/hooks/useSuppliers';
import { useAuth } from '@/src/hooks/useAuth';
import { useActivityLog } from '@/src/hooks/useActivityLog';
import { toast } from '@/src/utils/toast-store';
import { SupplierCard } from '@/src/components/suppliers/SupplierCard';
import { SupplierTable } from '@/src/components/suppliers/SupplierTable';
import { SupplierModal } from '@/src/components/suppliers/SupplierModal';
import { ConfirmDialog } from '@/src/components/ui/ConfirmDialog';
import type { Supplier, SupplierWithMetrics } from '@/src/types';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  LayoutGrid,
  List,
  Search,
  Box,
  Plus,
} from 'lucide-react';

export default function SuppliersPage() {
  const { records } = useWoodRecords();
  const { suppliers, stats, addSupplier, updateSupplier, deleteSupplier } = useSuppliers(records);
  const { user, canWrite } = useAuth();
  const { addLog } = useActivityLog();

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    supplier: Partial<Supplier> | null;
  }>({
    isOpen: false,
    supplier: null,
  });
  const [pendingDeleteSupplier, setPendingDeleteSupplier] = useState<{ id: string; name: string } | null>(null);


  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (statusFilter !== 'ALL' && s.status !== statusFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchName = s.name.toLowerCase().includes(q) || s.supplierName.toLowerCase().includes(q);
      const matchCode = s.code ? s.code.toLowerCase().includes(q) : false;
      const matchPic = s.contactPerson ? s.contactPerson.toLowerCase().includes(q) : false;
      const matchSpecies = s.primarySpecies.some((sp) => sp.toLowerCase().includes(q));
      return matchName || matchCode || matchPic || matchSpecies;
    });
  }, [suppliers, searchQuery, statusFilter]);

  const handleOpenAdd = () => {
    setModalState({ isOpen: true, supplier: null });
  };

  const handleOpenEdit = (supplier: SupplierWithMetrics) => {
    setModalState({ isOpen: true, supplier });
  };

  const handleCloseModal = () => {
    setModalState({ isOpen: false, supplier: null });
  };

  const handleSaveSupplier = (data: Partial<Supplier> & { name: string }) => {
    if (data.id) {
      const updated = updateSupplier(data.id, data);
      addLog({
        action: 'SUPPLIER_UPDATED',
        entityId: updated.id,
        entitySummary: `${updated.code} — ${updated.name}`,
        operatorName: user?.name,
        operatorRole: user?.title,
      });
      toast.success(
        'Data Pemasok Diperbarui (更新成功)',
        `${updated.name} (${updated.code}) berhasil disimpan.`
      );
    } else {
      const created = addSupplier(data);
      addLog({
        action: 'SUPPLIER_CREATED',
        entityId: created.id,
        entitySummary: `${created.code} — ${created.name}`,
        operatorName: user?.name,
        operatorRole: user?.title,
      });
      toast.success(
        'Pemasok Baru Didaftarkan (新增成功)',
        `${created.name} (${created.code}) berhasil masuk master data.`
      );
    }
  };

  const handleDeleteSupplier = (id: string, name: string) => {
    const deleted = deleteSupplier(id);
    if (deleted) {
      addLog({
        action: 'SUPPLIER_DELETED',
        entityId: id,
        entitySummary: name,
        operatorName: user?.name,
        operatorRole: user?.title,
      });
      toast.warning('Pemasok Dihapus (已删除)', `${name} telah dihapus dari direktori rekanan.`);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200/80">
        <div>
          <h1 className="text-xl font-bold text-[#101828] tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-sky-700 shrink-0" />
            <span>Manajemen & Direktori Pemasok (供应商名录与质检)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Pendaftaran rekanan kayu, master data kontak legalitas, dan evaluasi deviasi fisik vs surat jalan.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {canWrite && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-sky-700 hover:bg-sky-800 text-white shadow-xs hover:shadow transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Pemasok (新增)</span>
            </button>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200/80 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-sky-50 text-sky-700 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Tampilan Grid Kartu"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-sky-50 text-sky-700 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Tampilan Tabel Detail"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Tabel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Supplier Performance KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
              Total Pemasok Terdaftar
            </span>
            <span className="block text-xl font-bold font-mono text-[#101828]">
              {stats.totalVendors} Rekanan
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
              Kualitas Optimal (&lt;1%)
            </span>
            <span className="block text-xl font-bold font-mono text-emerald-700">
              {stats.optimalCount} Rekanan
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
              Perlu Perhatian (&gt;3%)
            </span>
            <span className="block text-xl font-bold font-mono text-rose-700">
              {stats.attentionCount} Rekanan
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
              Total Volume Pasokan
            </span>
            <span className="block text-xl font-bold font-mono text-[#101828]">
              {stats.totalVolumeM3.toFixed(2)} m³
            </span>
          </div>
        </div>
      </div>

      {/* Search Bar & Status Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nama, kode (SPL), kontak PIC, atau varietas kayu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition shadow-2xs"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5">
          {(
            [
              { id: 'ALL', label: 'Semua Rekanan (全部)' },
              { id: 'ACTIVE', label: 'Aktif (有效)' },
              { id: 'INACTIVE', label: 'Non-Aktif (已暂停)' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStatusFilter(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                statusFilter === item.id
                  ? 'bg-sky-50 text-sky-800 border-sky-300 font-bold shadow-2xs'
                  : 'bg-white text-gray-600 border-gray-200/80 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Rendering: Grid vs Table */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier) => (
            <SupplierCard
              key={supplier.id || supplier.supplierName}
              supplier={supplier}
              onEdit={handleOpenEdit}
              onDelete={(id, name) => setPendingDeleteSupplier({ id, name })}
              canWrite={canWrite}
            />
          ))}
        </div>
      ) : (
        <SupplierTable
          suppliers={filteredSuppliers}
          onEdit={handleOpenEdit}
          onDelete={(id, name) => setPendingDeleteSupplier({ id, name })}
          canWrite={canWrite}
        />
      )}

      {/* Add / Edit Supplier Modal */}
      <SupplierModal
        isOpen={modalState.isOpen}
        initialSupplier={modalState.supplier}
        onClose={handleCloseModal}
        onSave={handleSaveSupplier}
      />

      {/* Delete Confirmation Safeguard Dialog */}
      <ConfirmDialog
        isOpen={Boolean(pendingDeleteSupplier)}
        title="Hapus Rekanan Supplier? (确认删除供应商)"
        description={
          pendingDeleteSupplier
            ? `Data pemasok ${pendingDeleteSupplier.name} akan dihapus dari direktori aktif rekanan.`
            : 'Data pemasok akan dihapus dari direktori aktif rekanan.'
        }
        confirmLabel="Hapus Pemasok"
        cancelLabel="Batal"
        isDestructive={true}
        onConfirm={() => {
          if (pendingDeleteSupplier) {
            handleDeleteSupplier(pendingDeleteSupplier.id, pendingDeleteSupplier.name);
          }
          setPendingDeleteSupplier(null);
        }}
        onCancel={() => setPendingDeleteSupplier(null)}
      />
    </div>
  );
}
