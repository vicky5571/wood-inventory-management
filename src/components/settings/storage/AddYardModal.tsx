'use client';

import React, { useState, useEffect } from 'react';
import { X, Warehouse, Loader2 } from 'lucide-react';

export interface AddYardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { yardCode?: string; name: string; description?: string }) => Promise<void>;
}

export function AddYardModal({ isOpen, onClose, onSave }: AddYardModalProps) {
  const [name, setName] = useState('');
  const [yardCode, setYardCode] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setYardCode('');
      setDescription('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama yard wajib diisi');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        yardCode: yardCode.trim() || undefined,
        description: description.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan yard');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-yard-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-gray-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup modal"
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Warehouse className="w-5 h-5" />
          </div>
          <div>
            <h3 id="add-yard-title" className="text-sm font-bold text-gray-900 leading-tight">
              Tambah Yard Baru
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Tambahkan area penimbunan kayu (TPK) baru
            </p>
          </div>
        </div>

        {error && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div>
            <label htmlFor="yard-name" className="block text-xs font-semibold text-gray-700 mb-1">
              Nama Yard <span className="text-red-500">*</span>
            </label>
            <input
              id="yard-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: TPK Barat"
              required
              className="w-full text-xs px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div>
            <label htmlFor="yard-code" className="block text-xs font-semibold text-gray-700 mb-1">
              Kode Yard <span className="text-gray-400 font-normal">(opsional)</span>
            </label>
            <input
              id="yard-code"
              type="text"
              value={yardCode}
              onChange={(e) => setYardCode(e.target.value.toUpperCase())}
              placeholder="Contoh: TPK-BRT"
              className="w-full text-xs font-mono uppercase px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div>
            <label htmlFor="yard-desc" className="block text-xs font-semibold text-gray-700 mb-1">
              Deskripsi <span className="text-gray-400 font-normal">(opsional)</span>
            </label>
            <textarea
              id="yard-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Keterangan area penimbunan..."
              rows={2}
              className="w-full text-xs px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Simpan Yard</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
