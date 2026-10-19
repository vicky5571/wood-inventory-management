'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { SalesModalProps, SalesFormInput, PaymentStatus } from '@/src/types/index';
import { calculateLotStockBalance, validateSalesStockAllowance, calculateSalesFinancials } from '@/src/utils/stock-balance';
import { YardSelect } from '@/src/components/ledger/YardSelect';
import { KavlingSelect } from '@/src/components/ledger/KavlingSelect';
import { SpeciesCombobox } from '@/src/components/ledger/SpeciesCombobox';
import { X, AlertTriangle, Layers, Save, Zap } from 'lucide-react';
import { toast } from '@/src/utils/toast-store';
import { getQuickSalesDraft } from '@/src/utils/dev-quick-fill.ts';

const defaultInput: SalesFormInput = {
  saleDate: new Date().toISOString().split('T')[0],
  deliveryOrderNumber: '', truckPlateNumber: '', driverName: '', customerName: '',
  storageYard: 'TPK-Timur', kavlingNumber: 'KAV-01', woodSpecies: 'Meranti',
  pieces: 10, volumeM3: 5.0, pricePerM3: 1800000, paymentStatus: 'UNPAID', invoiceNumber: '', notes: '',
};

export function SalesModal({
  isOpen, onClose, onSave, inboundRecords, existingSales, customerHistory, initialData,
}: SalesModalProps) {
  const [formData, setFormData] = useState<SalesFormInput>(defaultInput);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id, saleDate: initialData.saleDate,
        deliveryOrderNumber: initialData.deliveryOrderNumber,
        truckPlateNumber: initialData.truckPlateNumber, driverName: initialData.driverName || '',
        customerName: initialData.customerName, storageYard: initialData.storageYard,
        kavlingNumber: initialData.kavlingNumber, woodSpecies: initialData.woodSpecies,
        pieces: initialData.pieces, volumeM3: initialData.volumeM3,
        pricePerM3: initialData.pricePerM3, paymentStatus: initialData.paymentStatus,
        invoiceNumber: initialData.invoiceNumber || '', notes: initialData.notes || '',
      });
    } else {
      setFormData({
        ...defaultInput,
        deliveryOrderNumber: `DO/${new Date().getFullYear()}/${Date.now().toString().slice(-4)}`,
      });
    }
  }, [initialData, isOpen]);

  const netSales = useMemo(
    () => (initialData ? existingSales.filter((s) => s.id !== initialData.id) : existingSales),
    [existingSales, initialData]
  );

  const balance = useMemo(
    () => calculateLotStockBalance(inboundRecords, netSales, formData.storageYard, formData.kavlingNumber),
    [inboundRecords, netSales, formData.storageYard, formData.kavlingNumber]
  );

  const stockCheck = useMemo(
    () => validateSalesStockAllowance(balance, formData.volumeM3, formData.pieces),
    [balance, formData.volumeM3, formData.pieces]
  );

  const totalPrice = useMemo(
    () => calculateSalesFinancials(formData.volumeM3, formData.pricePerM3).totalPrice,
    [formData.volumeM3, formData.pricePerM3]
  );

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !stockCheck.isAllowed) return;
    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isSubmitting, stockCheck.isAllowed, onSave, onClose]);

  const handleQuickFill = useCallback(() => {
    const devDraft = getQuickSalesDraft(customerHistory);
    setFormData(devDraft);
    toast.info('Form Terisi Otomatis (开发填充)', 'Data sampel penjualan telah dimuat.');
  }, [customerHistory]);

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 bg-gray-900 text-white">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#ffc908]" />
            <h2 className="text-sm font-bold tracking-wide">{initialData ? 'Edit Surat Jalan Penjualan' : 'Catat Penjualan & Pengeluaran Kayu (木材出库)'}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleQuickFill}
              className="px-2.5 py-1 text-2xs font-semibold text-amber-300 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/40 rounded-lg flex items-center gap-1 transition cursor-pointer"
              title="Isi otomatis data penjualan untuk pengujian dev"
            >
              <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>Isi Cepat (Dev)</span>
            </button>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-white transition p-1"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Tanggal Keluar (日期)</label>
              <input type="date" required value={formData.saleDate} onChange={(e) => setFormData({ ...formData, saleDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">No. Surat Jalan (送货单号)</label>
              <input type="text" required value={formData.deliveryOrderNumber} onChange={(e) => setFormData({ ...formData, deliveryOrderNumber: e.target.value })} className="w-full px-3 py-2 border rounded-lg font-mono uppercase" />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">No. Polisi Truk (车牌号)</label>
              <input type="text" required placeholder="B 1234 ABC" value={formData.truckPlateNumber} onChange={(e) => setFormData({ ...formData, truckPlateNumber: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border rounded-lg font-mono uppercase" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Nama Customer / Pembeli (客户)</label>
              <input list="customer-history-list" required placeholder="Ketik atau pilih pembeli..." value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
              <datalist id="customer-history-list">
                {customerHistory.map((cust) => (<option key={cust} value={cust} />))}
              </datalist>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Nama Supir (司机)</label>
              <input type="text" placeholder="Nama sopir pengantar..." value={formData.driverName} onChange={(e) => setFormData({ ...formData, driverName: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>

          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-950 uppercase tracking-wider text-[11px]">Sumber Stok (Log Yard & Lot)</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-semibold">
                Sisa Stok: {balance.remainingVolumeM3.toFixed(4)} m³ ({balance.remainingPieces} btg)
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-600 mb-1">TPK Yard (场地)</label>
                <YardSelect value={formData.storageYard} onChange={(y) => setFormData({ ...formData, storageYard: y })} />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Kavling Lot (批号)</label>
                <KavlingSelect value={formData.kavlingNumber} selectedYard={formData.storageYard} onChange={(k) => setFormData({ ...formData, kavlingNumber: k })} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Jenis Kayu (树种)</label>
              <SpeciesCombobox value={formData.woodSpecies} onChange={(sp) => setFormData({ ...formData, woodSpecies: sp })} />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Batang (根数)</label>
              <input type="number" min={1} required value={formData.pieces} onChange={(e) => setFormData({ ...formData, pieces: Math.max(1, parseInt(e.target.value) || 0) })} className="w-full px-3 py-2 border rounded-lg font-mono" />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Volume (m³)</label>
              <input type="number" step="0.0001" min={0.0001} required value={formData.volumeM3} onChange={(e) => setFormData({ ...formData, volumeM3: Math.max(0.0001, parseFloat(e.target.value) || 0) })} className="w-full px-3 py-2 border rounded-lg font-mono" />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Harga / m³ (Rp)</label>
              <input type="number" min={0} value={formData.pricePerM3} onChange={(e) => setFormData({ ...formData, pricePerM3: Math.max(0, parseInt(e.target.value) || 0) })} className="w-full px-3 py-2 border rounded-lg font-mono" />
            </div>
          </div>

          {!stockCheck.isAllowed && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-800 rounded-lg border border-red-200">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span className="text-[11px] font-medium">{stockCheck.warning}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Status Bayar (付款状态)</label>
              <select value={formData.paymentStatus} onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as PaymentStatus })} className="w-full px-3 py-2 border rounded-lg bg-white">
                <option value="UNPAID">Belum Lunas (未付款)</option>
                <option value="PARTIAL">Sebagian (部分付款)</option>
                <option value="PAID">Lunas (已付清)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">No. Faktur (发票号)</label>
              <input type="text" placeholder="INV-..." value={formData.invoiceNumber} onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })} className="w-full px-3 py-2 border rounded-lg font-mono" />
            </div>
            <div className="bg-gray-50 p-2.5 rounded-lg border flex flex-col justify-center">
              <span className="text-gray-500 text-[10px]">Total Nilai Penjualan (总金额):</span>
              <span className="text-base font-black font-mono text-gray-900">Rp {totalPrice.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 font-medium">Batal (取消)</button>
            <button type="submit" disabled={isSubmitting || !stockCheck.isAllowed} className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-sm">
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Surat Jalan (保存)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

