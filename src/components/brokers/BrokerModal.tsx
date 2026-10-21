'use client';

import React, { useState, useEffect } from 'react';
import { X, Users, Save } from 'lucide-react';
import type { Broker, BrokerFormInput } from '@/src/types';

export interface BrokerModalProps {
  isOpen: boolean;
  broker?: Broker | null;
  onClose: () => void;
  onSave: (data: BrokerFormInput) => void;
}

const INITIAL_FORM: BrokerFormInput = {
  code: '',
  name: '',
  contactPerson: '',
  phone: '',
  address: '',
  taxId: '',
  defaultCommissionPerM3: 0,
  status: 'ACTIVE',
  notes: '',
};

export function BrokerModal({ isOpen, broker, onClose, onSave }: BrokerModalProps) {
  const [formData, setFormData] = useState<BrokerFormInput>(INITIAL_FORM);
  const [errors, setErrors] = useState<{ name?: string; commission?: string }>({});

  useEffect(() => {
    if (broker) {
      setFormData({
        id: broker.id,
        code: broker.code || '',
        name: broker.name || '',
        contactPerson: broker.contactPerson || '',
        phone: broker.phone || '',
        address: broker.address || '',
        taxId: broker.taxId || '',
        defaultCommissionPerM3: broker.defaultCommissionPerM3 ?? 0,
        status: broker.status || 'ACTIVE',
        notes: broker.notes || '',
      });
    } else {
      setFormData(INITIAL_FORM);
    }
    setErrors({});
  }, [broker, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { name?: string; commission?: string } = {};
    if (!formData.name.trim()) newErrors.name = 'Nama broker wajib diisi';
    if (formData.defaultCommissionPerM3 !== undefined && formData.defaultCommissionPerM3 < 0) {
      newErrors.commission = 'Komisi tidak boleh negatif';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">
                {broker ? 'Edit Data Broker (编辑经纪人)' : 'Tambah Broker Baru (新增经纪人)'}
              </h2>
              <p className="text-[11px] text-gray-500">
                Profil perantara pihak ketiga untuk fasilitasi pembelian kayu.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          {/* Identity Section */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Kode Broker (代码)
              </label>
              <input
                type="text"
                placeholder="Otomatis (BRK-xxx)"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 font-mono text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Status Operasional
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="ACTIVE">Aktif (生效)</option>
                <option value="INACTIVE">Non-Aktif (停用)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              Nama Lengkap / Perusahaan *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Pak Agus Santoso / CV Maju Bersama"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: undefined });
              }}
              className={`w-full px-3 py-2 rounded-xl border ${
                errors.name ? 'border-rose-300 ring-2 ring-rose-100' : 'border-gray-200'
              } bg-white font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500`}
            />
            {errors.name && <p className="text-[10px] text-rose-600 mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Contact Person (PIC)
              </label>
              <input
                type="text"
                placeholder="Nama kontak"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                No. Telepon / WhatsApp
              </label>
              <input
                type="text"
                placeholder="08xxxxxxxxxx"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Commercial & Rate Defaults */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                NPWP (Opsional)
              </label>
              <input
                type="text"
                placeholder="00.000.000.0-000.000"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">Default Komisi per m³ (Rp)</label>
              <input
                type="number"
                step="5000"
                min="0"
                placeholder="Contoh: 50000"
                value={formData.defaultCommissionPerM3 || ''}
                onChange={(e) => {
                  setFormData({ ...formData, defaultCommissionPerM3: Number(e.target.value) });
                  if (errors.commission) setErrors({ ...errors, commission: undefined });
                }}
                className={`w-full px-3 py-2 rounded-xl border ${
                  errors.commission ? 'border-rose-300 ring-2 ring-rose-100' : 'border-gray-200'
                } bg-white font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500`}
              />
              <span className="text-[10px] text-gray-400 mt-0.5 block">Petunjuk awal saat input penerimaan (bisa diubah).</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">Alamat Lengkap</label>
            <input
              type="text"
              placeholder="Domisili atau alamat kantor broker"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">Catatan Khusus (备注)</label>
            <textarea
              rows={2}
              placeholder="Catatan wilayah operasi, rekanan supplier..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-semibold transition cursor-pointer">
              Batal
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer">
              <Save className="w-4 h-4" />
              <span>Simpan Broker</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
