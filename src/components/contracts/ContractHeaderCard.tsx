'use client';

import React from 'react';
import Link from 'next/link';
import type { ContractWithDetails } from '@/src/types/index';
import { ArrowLeft, Edit3, Calendar, MapPin, Hash, Clock } from 'lucide-react';

export interface ContractHeaderCardProps {
  contract: ContractWithDetails;
  onEdit: () => void;
  canWrite: boolean;
}

export function ContractHeaderCard({ contract, onEdit, canWrite }: ContractHeaderCardProps) {
  const { summary } = contract;

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href="/contracts"
              className="inline-flex items-center gap-1 text-xs text-amber-800 hover:text-amber-950 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Daftar Kontrak (合同列表)</span>
            </Link>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold font-mono text-[#101828] tracking-tight">
              {contract.contractNumber}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {contract.status}
            </span>
            {summary.isOverdue && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                Lewat Tempo
              </span>
            )}
            {summary.isNearExpiry && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                Mendekati Berakhir (≤30 hari)
              </span>
            )}
          </div>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-2xs transition self-start sm:self-auto cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Kontrak (编辑)</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
          <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1 mb-1">
            <MapPin className="w-3 h-3" /> Asal KPH
          </span>
          <span className="font-bold text-gray-900">{contract.kphOrigin}</span>
        </div>

        <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
          <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1 mb-1">
            <Hash className="w-3 h-3" /> Nomor PO / SPK
          </span>
          <span className="font-mono font-bold text-gray-900">{contract.poNumber || '-'}</span>
        </div>

        <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
          <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1 mb-1">
            <Calendar className="w-3 h-3" /> Tanggal Kontrak
          </span>
          <span className="font-mono font-bold text-gray-900">{contract.contractDate}</span>
        </div>

        <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
          <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3" /> Periode Berlaku
          </span>
          <span className="font-mono font-bold text-gray-900">
            {contract.effectiveStartDate} s/d {contract.effectiveEndDate}
          </span>
        </div>
      </div>

      {contract.notes && (
        <div className="text-xs text-gray-600 bg-amber-50/40 p-3 rounded-xl border border-amber-100">
          <span className="font-semibold text-amber-950">Catatan: </span>
          {contract.notes}
        </div>
      )}
    </div>
  );
}
