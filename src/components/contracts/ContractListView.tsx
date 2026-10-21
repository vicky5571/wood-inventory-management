'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useContracts } from '@/src/hooks/useContracts';
import { useWoodRecords } from '@/src/hooks/useWoodRecords';
import { useAuth } from '@/src/hooks/useAuth';
import { ContractKpiStrip } from './ContractKpiStrip';
import { ContractToolbar } from './ContractToolbar';
import { ContractTable } from './ContractTable';
import { ContractEmptyState } from './ContractEmptyState';
import { ContractFormModal } from './ContractFormModal';
import { ConfirmDialog } from '@/src/components/ui/ConfirmDialog';
import type { ContractWithDetails, ContractStatus, ContractFormInput } from '@/src/types/index';
import { FileText, Plus, RefreshCw, ArrowLeft } from 'lucide-react';

export function ContractListView() {
  const { canWrite } = useAuth();
  const { allRecords } = useWoodRecords();
  const {
    contracts,
    items,
    isSyncing,
    saveContract,
    deleteContract,
    getContractDetails,
  } = useContracts(allRecords);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'ALL'>('ALL');
  const [nearExpiryOnly, setNearExpiryOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<ContractWithDetails | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Derive detailed contracts list with fulfillment metrics
  const contractsWithDetails = useMemo(() => {
    return contracts
      .map((c) => getContractDetails(c.id))
      .filter((c): c is ContractWithDetails => c !== null);
  }, [contracts, getContractDetails]);

  // Apply filters
  const filteredContracts = useMemo(() => {
    return contractsWithDetails.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (nearExpiryOnly && (!c.summary.isNearExpiry || c.summary.remainingVolumeM3 <= 0)) return false;
      if (overdueOnly && (!c.summary.isOverdue || c.summary.remainingVolumeM3 <= 0)) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.contractNumber.toLowerCase().includes(q) ||
        c.kphOrigin.toLowerCase().includes(q) ||
        (c.poNumber && c.poNumber.toLowerCase().includes(q))
      );
    });
  }, [contractsWithDetails, statusFilter, nearExpiryOnly, overdueOnly, searchQuery]);

  const handleOpenCreate = () => {
    setEditingContract(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (contract: ContractWithDetails) => {
    setEditingContract(contract);
    setIsModalOpen(true);
  };

  const handleSave = async (form: ContractFormInput) => {
    await saveContract(form);
  };

  const handleConfirmDelete = async () => {
    if (pendingDeleteId) {
      await deleteContract(pendingDeleteId);
      setPendingDeleteId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/ledger"
              className="inline-flex items-center gap-1 text-xs text-amber-800 hover:text-amber-950 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Buku Besar (入库总账)</span>
            </Link>
          </div>
          <h1 className="text-xl font-bold text-[#101828] tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-700 shrink-0" />
            <span>Pemantauan Kontrak Perhutani (林业采购合同)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Pelacakan realisasi SKSHHK kayu log dari kontrak Perhutani, sisa kuota sortimen, dan cicilan kwitansi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSyncing && (
            <span className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
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
              <span>Tambah Kontrak (录入合同)</span>
            </button>
          )}
        </div>
      </div>

      {contracts.length === 0 ? (
        <ContractEmptyState onCreateClick={handleOpenCreate} canWrite={canWrite} />
      ) : (
        <>
          <ContractKpiStrip contracts={contractsWithDetails} />

          <ContractToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            nearExpiryOnly={nearExpiryOnly}
            onNearExpiryChange={setNearExpiryOnly}
            overdueOnly={overdueOnly}
            onOverdueChange={setOverdueOnly}
          />

          <ContractTable
            contracts={filteredContracts}
            onEdit={handleOpenEdit}
            onDelete={(id) => setPendingDeleteId(id)}
            canWrite={canWrite}
          />
        </>
      )}

      <ContractFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={editingContract}
        initialItems={editingContract ? items.filter((i) => i.contractId === editingContract.id) : undefined}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingDeleteId)}
        title="Hapus Kontrak Perhutani? (确认删除合同)"
        description="Kontrak dan seluruh data rincian sortimen serta kwitansi terkait akan dihapus. Data penerimaan SKSHHK tetap tersimpan di buku besar."
        confirmLabel="Hapus Kontrak"
        cancelLabel="Batal"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
