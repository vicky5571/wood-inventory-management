'use client';

import React, { useState, useEffect } from 'react';
import type { TimberPriceEntry } from '../../types/index.ts';
import { TIMBER_SPECIES_CATALOGUE } from '../../utils/timber-species.ts';
import { X, DollarSign, Loader2 } from 'lucide-react';

export interface SpeciesOption { id: string; commonName: string; }

export interface PriceFormModalProps {
  isOpen: boolean;
  entry: TimberPriceEntry | null;
  speciesList?: string[];
  speciesOptions?: SpeciesOption[];
  suppliers: Array<{ id: string; name: string }>;
  defaultPphRate?: number;
  onClose: () => void;
  onSave: (entry: Partial<TimberPriceEntry> & {
    speciesId: string; woodSpecies: string; pricePerM3: number; effectiveFrom: string;
  }) => Promise<unknown>;
}

export function PriceFormModal({
  isOpen, entry, speciesList, speciesOptions: propSpeciesOptions,
  suppliers, defaultPphRate = 0.5, onClose, onSave,
}: PriceFormModalProps) {
  const [speciesId, setSpeciesId] = useState('');
  const [woodSpecies, setWoodSpecies] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [pricePerM3, setPricePerM3] = useState<number | ''>('');
  const [timberPphRate, setTimberPphRate] = useState<number>(defaultPphRate);
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speciesOptions, setSpeciesOptions] = useState<SpeciesOption[]>(() =>
    propSpeciesOptions && propSpeciesOptions.length > 0
      ? propSpeciesOptions
      : TIMBER_SPECIES_CATALOGUE.map((s) => ({ id: s.id, commonName: s.commonName }))
  );

  useEffect(() => {
    if (propSpeciesOptions && propSpeciesOptions.length > 0) {
      setSpeciesOptions(propSpeciesOptions);
      return;
    }
    fetch('/api/species')
      .then((r) => r.json())
      .then((j) => {
        if (j.success && Array.isArray(j.data) && j.data.length > 0) {
          setSpeciesOptions(j.data.map((s: { id: string; commonName: string }) => ({ id: s.id, commonName: s.commonName })));
        }
      }).catch(() => {});
  }, [propSpeciesOptions]);

  useEffect(() => {
    if (entry) {
      setSpeciesId(entry.speciesId || '');
      setWoodSpecies(entry.woodSpecies || '');
      setSupplierId(entry.supplierId || '');
      setPricePerM3(entry.pricePerM3);
      setTimberPphRate(entry.timberPphRate ?? defaultPphRate);
      setEffectiveFrom(entry.effectiveFrom);
      setEffectiveTo(entry.effectiveTo || '');
      setNotes(entry.notes || '');
    } else {
      const first = speciesOptions[0];
      setSpeciesId(first ? first.id : '');
      setWoodSpecies(first ? first.commonName : (speciesList?.[0] || ''));
      setSupplierId('');
      setPricePerM3('');
      setTimberPphRate(defaultPphRate);
      setEffectiveFrom(new Date().toISOString().slice(0, 10));
      setEffectiveTo('');
      setNotes('');
    }
    setError(null);
  }, [entry, isOpen, speciesOptions, speciesList, defaultPphRate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const resolved = speciesOptions.find((s) => s.id === speciesId);
    const finalId = speciesId || resolved?.id;
    const finalName = (woodSpecies || resolved?.commonName || '').trim();

    if (!finalId || !finalName) { setError('Jenis kayu wajib dipilih'); return; }
    if (pricePerM3 === '' || Number(pricePerM3) < 0) { setError('Harga per m³ harus berupa angka positif'); return; }
    if (!effectiveFrom) { setError('Tanggal mulai berlaku wajib diisi'); return; }
    if (effectiveTo && effectiveTo < effectiveFrom) {
      setError('Tanggal berakhir tidak boleh mendahului tanggal mulai berlaku');
      return;
    }

    const selSup = suppliers.find((s) => s.id === supplierId);
    setIsSubmitting(true);
    try {
      await onSave({
        ...(entry?.id ? { id: entry.id } : {}),
        speciesId: finalId,
        woodSpecies: finalName,
        supplierId: supplierId || undefined,
        supplierName: selSup ? selSup.name : undefined,
        pricePerM3: Number(pricePerM3),
        timberPphRate: Number(timberPphRate),
        effectiveFrom,
        effectiveTo: effectiveTo || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan harga');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">{entry ? 'Ubah Patokan Harga Kayu' : 'Tambah Patokan Harga Kayu'}</h2>
              <p className="text-[11px] text-gray-500">Standarisasi harga untuk penutupan laporan</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3.5 text-xs">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Jenis Kayu *</label>
              <select
                value={speciesId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSpeciesId(id);
                  const found = speciesOptions.find((s) => s.id === id);
                  if (found) setWoodSpecies(found.commonName);
                }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-500 font-medium"
                required
              >
                <option value="">Pilih Jenis Kayu</option>
                {speciesOptions.map((s) => (<option key={s.id} value={s.id}>{s.commonName}</option>))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Khusus Supplier (Opsional)</label>
              <select
                value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-500 text-gray-800"
              >
                <option value="">Semua Supplier (Global)</option>
                {suppliers.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Harga per m³ (IDR) *</label>
              <input
                type="number" min="0" step="1000" value={pricePerM3}
                onChange={(e) => setPricePerM3(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Contoh: 3500000" required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-500 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Tarif PPh (%) *</label>
              <input
                type="number" min="0" max="100" step="0.1" value={timberPphRate}
                onChange={(e) => setTimberPphRate(Number(e.target.value))} required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Berlaku Dari *</label>
              <input
                type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Berlaku Sampai (Opsional)</label>
              <input
                type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Catatan Tambahan</label>
            <textarea
              rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Misal: Kesepakatan harga perhutani Q1 2026"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div className="mt-2 pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors">
              Batal
            </button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5">
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{entry ? 'Simpan Perubahan' : 'Tambah Harga'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
