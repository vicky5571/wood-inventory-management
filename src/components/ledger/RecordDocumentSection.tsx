'use client';

import React from 'react';
import type { WoodReceivingRecord } from '@/src/types';
import { SpeciesCombobox } from './SpeciesCombobox';
import { SupplierCombobox } from './SupplierCombobox';
import { ContractCombobox } from '../contracts/ContractCombobox';
import { FileText, Boxes } from 'lucide-react';

export interface RecordDocumentSectionProps {
  form: Partial<WoodReceivingRecord>;
  setForm: React.Dispatch<React.SetStateAction<Partial<WoodReceivingRecord>>>;
  availableSpecies?: string[];
  hideSpeciesSection?: boolean;
}

export const RecordDocumentSection = React.memo(function RecordDocumentSection({
  form,
  setForm,
  availableSpecies,
  hideSpeciesSection = false,
}: RecordDocumentSectionProps) {
  return (
    <>
      {/* Section 1: Dokumen & Pengiriman */}
      <div className="bg-gray-50/70 border border-gray-200/70 rounded-2xl p-4.5">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-6 h-6 rounded-lg bg-[#ffc908] text-[#101828] text-xs font-bold flex items-center justify-center shadow-2xs">
            1
          </span>
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#101828] uppercase tracking-wider">
            <FileText className="w-4 h-4 text-gray-500" />
            <span>Dokumen & Pengiriman (发货单据与物流)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Tanggal Penerimaan (到货日期) <span className="text-[#ed1c24]">*</span>
            </label>
            <input
              type="date"
              required
              value={form.receiptDate || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, receiptDate: e.target.value }))}
              className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Dokumen Tanggal (发货时间)
            </label>
            <input
              type="date"
              value={form.docDate || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, docDate: e.target.value }))}
              className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              No. Polisi Truk (车牌号) <span className="text-[#ed1c24]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: B 1234 CD"
              value={form.truckPlateNumber || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, truckPlateNumber: e.target.value }))}
              className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs uppercase"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              SKSHHK / DKP (送货单号) <span className="text-[#ed1c24]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="SKSHHK-2026-..."
              value={form.forestryDocNumber || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, forestryDocNumber: e.target.value }))}
              className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              No. Kwitansi (订货单号)
            </label>
            <input
              type="text"
              placeholder="KW-2026-..."
              value={form.receiptNumber || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, receiptNumber: e.target.value }))}
              className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              No. Kontrak (合同编号)
            </label>
            <ContractCombobox
              value={form.contractNumber || ''}
              onChange={(val) => setForm((prev) => ({ ...prev, contractNumber: val }))}
              onSelectContract={(contract) => {
                setForm((prev) => ({
                  ...prev,
                  contractNumber: contract.contractNumber,
                  supplierName: prev.supplierName ? prev.supplierName : `Perhutani ${contract.kphOrigin}`,
                }));
              }}
            />
          </div>
          <div className="sm:col-span-2 md:col-span-3">
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Supplier / Pemilik Kayu (供应商) <span className="text-[#ed1c24]">*</span>
            </label>
            <SupplierCombobox
              value={form.supplierName || ''}
              onChange={(val) => setForm((prev) => ({ ...prev, supplierName: val }))}
              required
            />
          </div>
        </div>
      </div>

      {/* Section 2: Spesifikasi Kayu & Lokasi */}
      {!hideSpeciesSection && (
        <div className="bg-gray-50/70 border border-gray-200/70 rounded-2xl p-4.5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-lg bg-[#ffc908] text-[#101828] text-xs font-bold flex items-center justify-center shadow-2xs">
              2
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#101828] uppercase tracking-wider">
              <Boxes className="w-4 h-4 text-gray-500" />
              <span>Spesifikasi Kayu & Alokasi Kavling (材种与批号)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Jenis Kayu (树种) <span className="text-[#ed1c24]">*</span>
              </label>
              <SpeciesCombobox
                value={form.woodSpecies || ''}
                onChange={(species) => setForm((prev) => ({ ...prev, woodSpecies: species }))}
                availableSpecies={availableSpecies}
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Panjang Kayu m (长度)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={form.woodLengthM ?? 4.0}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, woodLengthM: parseFloat(e.target.value) || 0 }))
                }
                className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Nomer Kavling (进厂批号) <span className="text-[#ed1c24]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="KAV-01"
                value={form.kavlingNumber || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, kavlingNumber: e.target.value }))}
                className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs uppercase"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                TPK / Lapangan (场地)
              </label>
              <input
                type="text"
                placeholder="TPK-Timur"
                value={form.storageYard || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, storageYard: e.target.value }))}
                className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
});
