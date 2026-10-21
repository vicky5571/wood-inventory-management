'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useContracts } from '@/src/hooks/useContracts';
import { useWoodRecords } from '@/src/hooks/useWoodRecords';
import { useAuth } from '@/src/hooks/useAuth';
import { ContractHeaderCard } from './ContractHeaderCard';
import { ContractFulfillmentCard } from './ContractFulfillmentCard';
import { ContractSortimentTable } from './ContractSortimentTable';
import { ContractReceiptsPanel } from './ContractReceiptsPanel';
import { LinkedReceivingList } from './LinkedReceivingList';
import { ContractFormModal } from './ContractFormModal';
import { ReceiptFormModal } from './ReceiptFormModal';
import type { ContractFormInput, ContractReceiptFormInput } from '@/src/types/index';
import { ArrowLeft, RefreshCw, FileText } from 'lucide-react';

export interface ContractDetailViewProps {
  contractId: string;
}

export function ContractDetailView({ contractId }: ContractDetailViewProps) {
  const { canWrite } = useAuth();
  const { allRecords } = useWoodRecords();
  const {
    items,
    isSyncing,
    saveContract,
    saveReceipt,
    deleteReceipt,
    getContractDetails,
  } = useContracts(allRecords);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const contract = useMemo(() => {
    return getContractDetails(contractId);
  }, [contractId, getContractDetails]);

  const matchedReceivingRecords = useMemo(() => {
    if (!contract?.contractNumber) return [];
    const norm = contract.contractNumber.trim().toLowerCase();
    return allRecords.filter((r) => (r.contractNumber || '').trim().toLowerCase() === norm);
  }, [contract, allRecords]);

  if (!contract) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-2xs">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-gray-800">Kontrak Tidak Ditemukan (未找到合同)</h3>
        <p className="text-xs text-gray-500 mt-1">ID kontrak yang diminta tidak ada atau sudah dihapus.</p>
        <div className="mt-4">
          <Link
            href="/contracts"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-gray-950 bg-[#ffc908] hover:bg-[#e0b007] rounded-xl transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Daftar Kontrak</span>
          </Link>
        </div>
      </div>
    );
  }

  const handleSaveContract = async (form: ContractFormInput) => {
    await saveContract(form);
  };

  const handleSaveReceipt = async (form: ContractReceiptFormInput) => {
    await saveReceipt(form);
  };

  const handleDeleteReceipt = async (receiptId: string) => {
    await deleteReceipt(contractId, receiptId);
  };

  return (
    <div className="flex flex-col gap-5">
      {isSyncing && (
        <div className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 text-xs text-amber-900 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-300 shadow-md">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-700" />
          <span>Sinkronisasi data kontrak...</span>
        </div>
      )}

      <ContractHeaderCard
        contract={contract}
        onEdit={() => setIsEditModalOpen(true)}
        canWrite={canWrite}
      />

      <ContractFulfillmentCard summary={contract.summary} />

      <ContractSortimentTable items={contract.items} />

      <ContractReceiptsPanel
        receipts={contract.receipts}
        onAddReceipt={() => setIsReceiptModalOpen(true)}
        onDeleteReceipt={handleDeleteReceipt}
        canWrite={canWrite}
      />

      <LinkedReceivingList records={matchedReceivingRecords} />

      <ContractFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveContract}
        initialData={contract}
        initialItems={items.filter((i) => i.contractId === contractId)}
      />

      <ReceiptFormModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        onSave={handleSaveReceipt}
        contractId={contract.id}
        contractNumber={contract.contractNumber}
      />
    </div>
  );
}
