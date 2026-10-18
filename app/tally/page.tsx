'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, ShieldAlert, Wifi, WifiOff, ClipboardCheck } from 'lucide-react';
import { useAuth } from '@/src/hooks/useAuth';
import { useWoodRecords } from '@/src/hooks/useWoodRecords';
import { YardSelect } from '@/src/components/ledger/YardSelect';
import { KavlingSelect } from '@/src/components/ledger/KavlingSelect';
import { TallyMeasurementPad, type TallyMeasurementResult } from '@/src/components/tally/TallyMeasurementPad';
import { TallyDiscrepancyCard } from '@/src/components/tally/TallyDiscrepancyCard';
import { toast } from '@/src/utils/toast-store';
import type { ManifestFormInput } from '@/src/types/index';

export default function MobileTallyPage() {
  const { canWrite } = useAuth();
  const { saveManifest } = useWoodRecords();
  const [isOnline, setIsOnline] = useState(true);
  const [truckPlateNumber, setTruckPlateNumber] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [woodSpecies, setWoodSpecies] = useState('Meranti');
  const [forestryDocNumber, setForestryDocNumber] = useState('');
  const [storageYard, setStorageYard] = useState('TPK-Timur');
  const [kavlingNumber, setKavlingNumber] = useState('KAV-01');
  const [deliveredVolumeM3, setDeliveredVolumeM3] = useState<number>(0);
  const [deliveredPieces, setDeliveredPieces] = useState<number>(0);
  const [tallyVolumeM3, setTallyVolumeM3] = useState<number>(0);
  const [tallyPieces, setTallyPieces] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const onSync = () => setIsOnline(true);
    const offSync = () => setIsOnline(false);
    window.addEventListener('online', onSync);
    window.addEventListener('offline', offSync);
    return () => { window.removeEventListener('online', onSync); window.removeEventListener('offline', offSync); };
  }, []);

  const handleApplyMeasurement = (res: TallyMeasurementResult) => {
    setTallyVolumeM3(res.volumeM3);
    setTallyPieces(res.pieces);
    toast.info('Hasil Ukur Diterapkan', `${res.dimensionSummary} (${res.volumeM3} m³)`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return toast.error('Akses Ditolak', 'Hanya Pemilik (Level 1) yang dapat menyimpan manifest.');
    if (!truckPlateNumber.trim() || !supplierName.trim()) {
      return toast.warning('Data Belum Lengkap', 'Plat truk dan pemasok wajib diisi.');
    }

    setIsSubmitting(true);
    try {
      const payload: ManifestFormInput = {
        id: `MF-${Date.now()}`,
        receiptDate: new Date().toISOString().split('T')[0],
        truckPlateNumber: truckPlateNumber.trim().toUpperCase(),
        forestryDocNumber: forestryDocNumber.trim() || `SKSHH-${Date.now().toString().slice(-6)}`,
        receiptNumber: `RCP-${Date.now().toString().slice(-6)}`,
        contractNumber: `CTR-${Date.now().toString().slice(-6)}`,
        supplierName: supplierName.trim(),
        freightRatePerM3: 0,
        brokerFee: 0,
        paymentStatus: 'UNPAID',
        items: [{
          id: `item-${Date.now()}`,
          woodSpecies: woodSpecies.trim(),
          woodLengthM: 4,
          storageYard: storageYard || 'TPK-Timur',
          kavlingNumber: kavlingNumber || 'KAV-01',
          deliveredPieces: deliveredPieces || tallyPieces,
          deliveredVolumeM3: deliveredVolumeM3 || tallyVolumeM3,
          tallyPieces,
          tallyVolumeM3,
          timberPricePerM3: 1500000,
          timberPphRate: 0.015,
        }],
      };
      await saveManifest(payload);
      toast.success('Manifest Tersimpan', `${payload.truckPlateNumber} berhasil direkam ke buku besar.`);
      setTruckPlateNumber('');
      setDeliveredVolumeM3(0);
      setDeliveredPieces(0);
      setTallyVolumeM3(0);
    } catch {
      toast.error('Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan data manifest.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-28 text-gray-900">
      <header className="sticky top-0 z-30 bg-[#101828] text-white px-4 py-3 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link href="/ledger" className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition">
            <ArrowLeft className="w-5 h-5 text-gray-200" />
          </Link>
          <div>
            <h1 className="text-sm font-black tracking-tight flex items-center gap-1.5">
              <span>Mode Tally Lapangan</span>
              <span className="text-[10px] bg-amber-400 text-gray-950 font-bold px-1.5 py-0.5 rounded">检尺</span>
            </h1>
            <p className="text-[10px] text-gray-400">Penerimaan & Pemeriksaan Fisik Kayu</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full bg-gray-800">
          {isOnline ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-amber-400" />}
          <span className="font-semibold text-gray-300">{isOnline ? 'Online Sync' : 'Offline Mode'}</span>
        </div>
      </header>

      <form onSubmit={handleSave} className="p-4 max-w-xl mx-auto space-y-4">
        {/* Identitas Angkutan */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs space-y-3">
          <div className="text-xs font-black text-gray-800 flex items-center gap-1.5 border-b pb-2">
            <ClipboardCheck className="w-4 h-4 text-amber-500" />
            <span>Identitas Angkutan (运输信息)</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">No. Plat Truk *</label>
              <input type="text" value={truckPlateNumber} onChange={(e) => setTruckPlateNumber(e.target.value.toUpperCase())} placeholder="KB 8888 XX" required className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black uppercase focus:bg-white focus:border-amber-400 outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">Pemasok *</label>
              <input type="text" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Nama Supplier" required className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:bg-white focus:border-amber-400 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">Jenis Kayu</label>
              <input type="text" value={woodSpecies} onChange={(e) => setWoodSpecies(e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-amber-400 outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">No. Dokumen / SKSHH</label>
              <input type="text" value={forestryDocNumber} onChange={(e) => setForestryDocNumber(e.target.value)} placeholder="SKSHH-00123" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-amber-400 outline-none" />
            </div>
          </div>
        </div>

        {/* Lokasi Penimbunan */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs space-y-3">
          <span className="text-xs font-black text-gray-800 block border-b pb-2">Lokasi Penimbunan (存储位置)</span>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">TPK / Log Yard</label>
              <YardSelect value={storageYard} onChange={setStorageYard} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">Kavling Lot</label>
              <KavlingSelect value={kavlingNumber} selectedYard={storageYard} onChange={setKavlingNumber} />
            </div>
          </div>
        </div>

        {/* Surat Jalan Figures */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs space-y-3">
          <span className="text-xs font-black text-gray-800 block border-b pb-2">Surat Jalan Sopir (送货单据)</span>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-1">Volume SJ (m³)</label>
              <input type="number" step="0.0001" value={deliveredVolumeM3 || ''} onChange={(e) => setDeliveredVolumeM3(Number(e.target.value) || 0)} placeholder="0.0000" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-center font-bold text-xs focus:bg-white focus:border-amber-400 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-1">Batang SJ (btg)</label>
              <input type="number" value={deliveredPieces || ''} onChange={(e) => setDeliveredPieces(Number(e.target.value) || 0)} placeholder="0" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-center font-bold text-xs focus:bg-white focus:border-amber-400 outline-none" />
            </div>
          </div>
        </div>

        <TallyMeasurementPad onApplyMeasurement={handleApplyMeasurement} initialPieces={tallyPieces} />
        <TallyDiscrepancyCard deliveredVolumeM3={deliveredVolumeM3} deliveredPieces={deliveredPieces} tallyVolumeM3={tallyVolumeM3} tallyPieces={tallyPieces} />

        {/* Sticky Action Footer */}
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-xl z-30">
          <div className="max-w-xl mx-auto">
            {canWrite ? (
              <button type="submit" disabled={isSubmitting} className="w-full py-3.5 px-4 bg-[#ffc908] hover:bg-amber-400 active:scale-[0.98] text-[#101828] font-black text-sm rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Menyimpan...' : 'Simpan & Sinkron Manifest (保存同步)'}</span>
              </button>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs font-bold text-amber-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Mode Monitor: Hanya Pemilik (Level 1) yang berhak menyimpan data tally.</span>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
