'use client';

import React, { useState, useEffect } from 'react';
import type { Supplier } from '@/src/types';
import {
  Building2,
  X,
  Save,
  Phone,
  User,
  MapPin,
  FileText,
  CreditCard,
  CheckCircle,
  Zap,
} from 'lucide-react';
import { toast } from '@/src/utils/toast-store';
import { getQuickSupplierDraft } from '@/src/utils/dev-quick-fill.ts';

interface SupplierModalProps {
  isOpen: boolean;
  initialSupplier?: Partial<Supplier> | null;
  onClose: () => void;
  onSave: (data: Partial<Supplier> & { name: string }) => void;
}

export function SupplierModal({
  isOpen,
  initialSupplier,
  onClose,
  onSave,
}: SupplierModalProps) {
  const isEdit = Boolean(initialSupplier?.id);

  const [form, setForm] = useState<Partial<Supplier>>({
    name: '',
    code: '',
    contactPerson: '',
    phone: '',
    address: '',
    taxId: '',
    notes: '',
    status: 'ACTIVE',
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSupplier) {
      setForm({
        id: initialSupplier.id,
        name: initialSupplier.name || '',
        code: initialSupplier.code || '',
        contactPerson: initialSupplier.contactPerson || '',
        phone: initialSupplier.phone || '',
        address: initialSupplier.address || '',
        taxId: initialSupplier.taxId || '',
        notes: initialSupplier.notes || '',
        status: initialSupplier.status || 'ACTIVE',
      });
    } else {
      setForm({
        name: '',
        code: '',
        contactPerson: '',
        phone: '',
        address: '',
        taxId: '',
        notes: '',
        status: 'ACTIVE',
      });
    }
    setError(null);
  }, [initialSupplier, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleQuickFill = () => {
    const devSupplier = getQuickSupplierDraft();
    setForm((prev) => ({ ...prev, ...devSupplier }));
    setError(null);
    toast.info('Form Terisi Otomatis (开发填充)', 'Data rekanan pemasok dev telah dimuat.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || form.name.trim().length < 3) {
      setError('Nama pemasok wajib diisi minimal 3 karakter.');
      return;
    }

    onSave({
      ...form,
      name: form.name.trim(),
      code: form.code?.trim() || undefined,
      contactPerson: form.contactPerson?.trim() || undefined,
      phone: form.phone?.trim() || undefined,
      address: form.address?.trim() || undefined,
      taxId: form.taxId?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
      status: form.status || 'ACTIVE',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl border border-gray-200/90 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="supplier-modal-title"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="supplier-modal-title" className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span>{isEdit ? 'Edit Data Pemasok' : 'Tambah Pemasok Baru'}</span>
                <span className="text-[11px] font-normal text-gray-500">
                  {isEdit ? '(编辑供应商信息)' : '(新增供应商名录)'}
                </span>
              </h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Master data identitas rekanan kayu, kontak PIC, dan nomor pajak legal.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleQuickFill}
              className="px-2.5 py-1 text-2xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-lg flex items-center gap-1 transition cursor-pointer"
              title="Isi otomatis data pemasok untuk pengujian dev"
            >
              <Zap className="w-3 h-3 text-amber-600 fill-amber-500" />
              <span>Isi Cepat (Dev)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition cursor-pointer"
              aria-label="Tutup Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Supplier Name & Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">
                Nama Pemasok / Rekanan <span className="text-rose-500">*</span>
                <span className="block text-[10px] text-gray-400 font-normal">供应商全称 (PT / CV / Koperasi)</span>
              </label>
              <input
                type="text"
                required
                placeholder="misal: PT Wana Lestari Abadi"
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full p-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Kode Rekanan
                <span className="block text-[10px] text-gray-400 font-normal">编号 (Opsional)</span>
              </label>
              <input
                type="text"
                placeholder="SPL-005"
                value={form.code || ''}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full p-2.5 font-mono border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
              />
            </div>
          </div>

          {/* Contact Person & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-400" />
                <span>Penanggung Jawab (PIC)</span>
              </label>
              <input
                type="text"
                placeholder="Nama kontak rekanan"
                value={form.contactPerson || ''}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                className="w-full p-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                <span>Nomor Telepon / WA</span>
              </label>
              <input
                type="text"
                placeholder="0812-xxxx-xxxx"
                value={form.phone || ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full p-2.5 font-mono border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
              />
            </div>
          </div>

          {/* Tax ID & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                <span>NPWP / Nomor Pokok Wajib Pajak</span>
              </label>
              <input
                type="text"
                placeholder="01.xxx.xxx.x-xxx.xxx"
                value={form.taxId || ''}
                onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                className="w-full p-2.5 font-mono border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-gray-400" />
                <span>Status Hubungan Kerja</span>
              </label>
              <select
                value={form.status || 'ACTIVE'}
                onChange={(e) => setForm({ ...form, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                className="w-full p-2.5 border border-gray-200 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
              >
                <option value="ACTIVE">Aktif — Rekanan Reguler (合作中)</option>
                <option value="INACTIVE">Non-Aktif — Ditangguhkan (已暂停)</option>
              </select>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              <span>Alamat Kantor / Lokasi Konsesi TPK</span>
            </label>
            <input
              type="text"
              placeholder="Kabupaten, Kota, atau Asal HPH/TPK"
              value={form.address || ''}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full p-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
            />
          </div>

          {/* Notes / Legalities */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              <span>Catatan Legalitas & SVLK</span>
            </label>
            <textarea
              rows={2}
              placeholder="Nomor sertifikat SVLK, izin HPH, catatan mutu pengiriman..."
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full p-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition resize-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
            >
              Batal (取消)
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-sky-700 hover:bg-sky-800 text-white shadow-xs hover:shadow transition flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isEdit ? 'Simpan Perubahan (保存)' : 'Daftarkan Rekanan (保存)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
