'use client';

import React, { useState, useMemo } from 'react';
import { useWoodRecords } from '@/src/hooks/useWoodRecords';
import { useBrokers } from '@/src/hooks/useBrokers';
import { useAuth } from '@/src/hooks/useAuth';
import { useActivityLog } from '@/src/hooks/useActivityLog';
import { BrokerCard } from './BrokerCard';
import { BrokerTable } from './BrokerTable';
import { BrokerModal } from './BrokerModal';
import { BrokerStatsGrid } from './BrokerStatsGrid';
import { ConfirmDialog } from '@/src/components/ui/ConfirmDialog';
import type { BrokerWithMetrics, BrokerFormInput } from '@/src/types';
import { Users, LayoutGrid, List, Search, Plus } from 'lucide-react';

export function BrokerDirectoryView() {
  const { records } = useWoodRecords();
  const { brokers, stats, addBroker, updateBroker, deleteBroker } = useBrokers(records);
  const { user, canWrite } = useAuth();
  const { addLog } = useActivityLog();

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [modalState, setModalState] = useState<{ isOpen: boolean; broker: BrokerWithMetrics | null }>({
    isOpen: false,
    broker: null,
  });
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const filteredBrokers = useMemo(() => {
    return brokers.filter((b) => {
      if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchName = b.name.toLowerCase().includes(q);
      const matchCode = b.code ? b.code.toLowerCase().includes(q) : false;
      const matchPic = b.contactPerson ? b.contactPerson.toLowerCase().includes(q) : false;
      const matchPhone = b.phone ? b.phone.toLowerCase().includes(q) : false;
      return matchName || matchCode || matchPic || matchPhone;
    });
  }, [brokers, searchQuery, statusFilter]);

  const handleOpenAdd = () => setModalState({ isOpen: true, broker: null });
  const handleOpenEdit = (broker: BrokerWithMetrics) => setModalState({ isOpen: true, broker });
  const handleCloseModal = () => setModalState({ isOpen: false, broker: null });

  const handleSaveBroker = (data: BrokerFormInput) => {
    if (data.id) {
      const updated = updateBroker(data.id, data);
      addLog({
        action: 'BROKER_UPDATED',
        entityId: updated.id,
        entitySummary: `${updated.code} — ${updated.name}`,
        operatorName: user?.name,
        operatorRole: user?.title,
      });
    } else {
      const created = addBroker(data);
      addLog({
        action: 'BROKER_CREATED',
        entityId: created.id,
        entitySummary: `${created.code} — ${created.name}`,
        operatorName: user?.name,
        operatorRole: user?.title,
      });
    }
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    deleteBroker(pendingDelete.id);
    addLog({
      action: 'BROKER_DELETED',
      entityId: pendingDelete.id,
      entitySummary: pendingDelete.name,
      operatorName: user?.name,
      operatorRole: user?.title,
    });
    setPendingDelete(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200/80">
        <div>
          <h1 className="text-xl font-bold text-[#101828] tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Direktori Broker Kayu (木材经纪人名录)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manajemen master data perantara, penetapan komisi standar per m³, dan evaluasi volume fasilitasi.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {canWrite && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs hover:shadow transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Broker (新增)</span>
            </button>
          )}

          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200/80 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'grid' ? 'bg-amber-50 text-amber-800 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
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
                viewMode === 'table' ? 'bg-amber-50 text-amber-800 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Tampilan Tabel Detail"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Tabel</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <BrokerStatsGrid stats={stats} />

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari kode (BRK-xxx), nama broker, kontak PIC, atau telepon..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(
            [
              { id: 'ALL', label: 'Semua Broker (全部)' },
              { id: 'ACTIVE', label: 'Aktif (生效)' },
              { id: 'INACTIVE', label: 'Non-Aktif (停用)' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStatusFilter(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                statusFilter === item.id
                  ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold shadow-2xs'
                  : 'bg-white text-gray-600 border-gray-200/80 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBrokers.map((broker) => (
            <BrokerCard
              key={broker.id}
              broker={broker}
              canWrite={canWrite}
              onEdit={handleOpenEdit}
              onDelete={(id) => setPendingDelete({ id, name: broker.name })}
            />
          ))}
        </div>
      ) : (
        <BrokerTable
          brokers={filteredBrokers}
          canWrite={canWrite}
          onEdit={handleOpenEdit}
          onDelete={(id) => {
            const target = brokers.find((b) => b.id === id);
            setPendingDelete({ id, name: target ? target.name : id });
          }}
        />
      )}

      {/* Modal */}
      <BrokerModal
        isOpen={modalState.isOpen}
        broker={modalState.broker}
        onClose={handleCloseModal}
        onSave={handleSaveBroker}
      />

      {/* Confirm Soft-Delete */}
      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title="Nonaktifkan Broker? (确认停用经纪人)"
        description={
          pendingDelete
            ? `Broker ${pendingDelete.name} akan dinonaktifkan. Data riwayat komisi dan penerimaan tetap dipertahankan.`
            : 'Broker akan dinonaktifkan.'
        }
        confirmLabel="Nonaktifkan (停用)"
        cancelLabel="Batal"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
