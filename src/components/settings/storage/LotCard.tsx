'use client';

import React, { useState } from 'react';
import { CheckCircle2, AlertOctagon, Wrench, Trash2, Loader2 } from 'lucide-react';
import type { StorageLotWithYard, StorageLotStatus } from '@/src/types';

export interface LotCardProps {
  lot: StorageLotWithYard;
  occupancyM3: number;
  canWrite: boolean;
  onStatusChange: (lotId: string, status: StorageLotStatus) => Promise<void>;
  onDelete: (lot: StorageLotWithYard) => void;
}

export function LotCard({ lot, occupancyM3, canWrite, onStatusChange, onDelete }: LotCardProps) {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleSelectStatus = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = e.target.value as StorageLotStatus;
    if (nextStatus === lot.status) return;
    setIsUpdatingStatus(true);
    try {
      await onStatusChange(lot.id, nextStatus);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusBadge = () => {
    switch (lot.status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Aktif
          </span>
        );
      case 'FULL':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200/80">
            <AlertOctagon className="w-3 h-3 text-red-600" />
            Penuh
          </span>
        );
      case 'MAINTENANCE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
            <Wrench className="w-3 h-3 text-gray-500" />
            Perawatan
          </span>
        );
      default:
        return null;
    }
  };

  const hasStock = occupancyM3 > 0;

  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col justify-between gap-3 hover:border-gray-300 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
            {lot.lotCode}
          </span>
          {lot.yardName && (
            <span className="text-xs font-medium text-gray-500 truncate max-w-[120px]">
              {lot.yardName}
            </span>
          )}
        </div>
        {getStatusBadge()}
      </div>

      {/* Volume chip */}
      <div className="flex items-center justify-between text-xs py-1">
        <span className="text-gray-500 text-[11px]">Volume Kayu:</span>
        {hasStock ? (
          <span className="font-mono font-semibold text-gray-900 bg-amber-50/80 px-2 py-0.5 rounded-md border border-amber-100 text-[11px]">
            {occupancyM3.toFixed(2)} m³ terisi
          </span>
        ) : (
          <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 text-[11px] font-medium">
            Kosong
          </span>
        )}
      </div>

      {/* Actions (Level 1 only) */}
      {canWrite && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 gap-2">
          <div className="flex items-center gap-1.5 flex-1">
            <label htmlFor={`status-${lot.id}`} className="text-[10px] text-gray-400 font-medium">
              Status:
            </label>
            <div className="relative inline-flex items-center">
              <select
                id={`status-${lot.id}`}
                value={lot.status}
                onChange={handleSelectStatus}
                disabled={isUpdatingStatus}
                aria-label={`Ubah status kavling ${lot.lotCode}`}
                className="text-[11px] font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors disabled:opacity-50"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="FULL">FULL</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>
              {isUpdatingStatus && (
                <Loader2 className="w-3 h-3 text-amber-600 animate-spin ml-1.5" />
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onDelete(lot)}
            disabled={hasStock}
            title={hasStock ? 'Kavling masih memiliki stok aktif' : 'Hapus kavling'}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
