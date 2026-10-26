'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { StorageYard, StorageLotWithYard, StorageLotStatus } from '@/src/types';
import { LotCard } from './LotCard';

export interface YardSectionProps {
  yard: StorageYard;
  lots: StorageLotWithYard[];
  lotOccupancy: Record<string, number>;
  canWrite: boolean;
  onOpenAddLot: (yardId: string) => void;
  onDeleteYard: (yard: StorageYard) => void;
  onStatusChange: (lotId: string, status: StorageLotStatus) => Promise<void>;
  onDeleteLot: (lot: StorageLotWithYard) => void;
}

export function YardSection({
  yard,
  lots,
  lotOccupancy,
  canWrite,
  onOpenAddLot,
  onDeleteYard,
  onStatusChange,
  onDeleteLot,
}: YardSectionProps) {
  const yardLots = lots.filter((l) => l.yardId === yard.id);
  const hasLots = yardLots.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between bg-gray-50/80 px-4 py-2.5 rounded-xl border border-gray-200">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs font-bold bg-white text-gray-800 px-2 py-0.5 rounded-md border border-gray-200">
            {yard.yardCode}
          </span>
          <span className="text-sm font-bold text-gray-900">{yard.name}</span>
          {yard.description && (
            <span className="text-xs text-gray-400 hidden sm:inline">• {yard.description}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canWrite && (
            <button
              type="button"
              onClick={() => onOpenAddLot(yard.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Kavling</span>
            </button>
          )}
          {canWrite && (
            <button
              type="button"
              onClick={() => onDeleteYard(yard)}
              disabled={hasLots}
              title={hasLots ? 'Hapus semua kavling di yard ini terlebih dahulu' : 'Hapus yard'}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {hasLots ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {yardLots.map((lot) => (
            <LotCard
              key={lot.id}
              lot={lot}
              occupancyM3={lotOccupancy[lot.lotCode] ?? 0}
              canWrite={canWrite}
              onStatusChange={onStatusChange}
              onDelete={onDeleteLot}
            />
          ))}
        </div>
      ) : (
        <div className="text-xs text-gray-400 italic py-3 px-4 bg-gray-50/40 rounded-xl border border-dashed border-gray-200">
          Belum ada kavling di yard ini.{' '}
          {canWrite && (
            <button
              type="button"
              onClick={() => onOpenAddLot(yard.id)}
              className="text-amber-600 underline font-semibold ml-1 cursor-pointer"
            >
              Tambah sekarang
            </button>
          )}
        </div>
      )}
    </div>
  );
}
