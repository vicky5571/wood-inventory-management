'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronDown, Check, Plus, X, Grid, AlertTriangle } from 'lucide-react';
import { getLotsForYard, filterLots, addLot, isLotFullOrMaintenance } from '@/src/utils/storage-locations';
import type { StorageLotStatus } from '@/src/types/index';

export interface KavlingSelectProps {
  value: string;
  selectedYard: string;
  onChange: (kavlingNumber: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  id?: string;
}

export function KavlingSelect({
  value,
  selectedYard,
  onChange,
  disabled = false,
  required = false,
  placeholder = 'Pilih atau ketik kavling... (选择或输入批号)',
  id = 'kavling-select',
}: KavlingSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [lotsVersion, setLotsVersion] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isYardSelected = Boolean(selectedYard && selectedYard.trim().length > 0);
  const isDisabled = disabled || !isYardSelected;
  const effectivePlaceholder = !isYardSelected ? 'Pilih TPK terlebih dahulu... (请先选择场地)' : placeholder;

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const availableLots = useMemo(
    () => (isYardSelected ? getLotsForYard(selectedYard) : []),
    [selectedYard, isYardSelected, lotsVersion]
  );
  const filteredLots = useMemo(() => filterLots(availableLots, query), [availableLots, query]);
  const currentLot = useMemo(() => {
    if (!value) return undefined;
    return availableLots.find((l) => l.lotCode.toLowerCase() === value.trim().toLowerCase());
  }, [availableLots, value]);

  const warning = useMemo(() => isLotFullOrMaintenance(currentLot), [currentLot]);
  const hasExactMatch = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return !trimmed || availableLots.some((l) => l.lotCode.toLowerCase() === trimmed);
  }, [availableLots, query]);

  const showCustomOption = isYardSelected && query.trim().length > 0 && !hasExactMatch;

  const selectOption = useCallback((lotCode: string) => {
    onChange(lotCode);
    setQuery(lotCode);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  }, [onChange]);

  const handleAddCustom = useCallback((lotName: string) => {
    if (!isYardSelected) return;
    try {
      const created = addLot(selectedYard, lotName);
      setLotsVersion((v) => v + 1);
      selectOption(created.lotCode);
    } catch {
      selectOption(lotName);
    }
  }, [isYardSelected, selectedYard, selectOption]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }
    const totalItems = filteredLots.length + (showCustomOption ? 1 : 0);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < totalItems ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredLots.length) {
        selectOption(filteredLots[highlightedIndex].lotCode);
      } else if (showCustomOption && (highlightedIndex === filteredLots.length || highlightedIndex === -1)) {
        handleAddCustom(query.trim());
      } else if (query.trim()) {
        handleAddCustom(query.trim());
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const renderStatusPill = (status: StorageLotStatus) => {
    if (status === 'FULL') return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 flex-shrink-0">⚠️ Penuh (已满)</span>;
    if (status === 'MAINTENANCE') return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 flex-shrink-0">🛠️ Perawatan (维护)</span>;
    return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 flex-shrink-0">Aktif (正常)</span>;
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          required={required}
          disabled={isDisabled}
          placeholder={effectivePlaceholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            if (!isDisabled) { setLotsVersion((v) => v + 1); setIsOpen(true); }
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          className="w-full text-xs pl-3 pr-14 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs disabled:bg-gray-50 disabled:text-gray-400"
        />

        <div className="absolute right-1.5 flex items-center gap-0.5">
          {query && !isDisabled && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(''); setQuery(''); setIsOpen(false); inputRef.current?.focus(); }}
              aria-label="Hapus pilihan kavling"
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            disabled={isDisabled}
            onClick={() => !isDisabled && setIsOpen((prev) => !prev)}
            aria-label="Buka daftar kavling"
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg transition"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#b38600]' : ''}`} />
          </button>
        </div>
      </div>

      {warning.isWarning && (
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 rounded-lg px-2.5 py-1 animate-in fade-in duration-150">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          <span>⚠️ Lot <strong>{value}</strong> berstatus {currentLot?.status === 'FULL' ? 'PENUH (批号已满)' : 'PERAWATAN (维护)'} - pastikan kapasitas lapangan</span>
        </div>
      )}

      {isOpen && !isDisabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto py-1 animate-in fade-in slide-in-from-top-2 duration-150">
          {showCustomOption && (
            <button
              type="button"
              onClick={() => handleAddCustom(query.trim())}
              className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between border-b border-gray-100 transition ${
                highlightedIndex === filteredLots.length ? 'bg-[#ffc908]/20 text-[#101828] font-semibold' : 'hover:bg-amber-50 text-gray-800'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 rounded-md bg-[#ffc908]/30 flex items-center justify-center flex-shrink-0 text-[#b38600]">
                  <Plus className="w-3.5 h-3.5" />
                </span>
                <span className="truncate">+ Tambah Kavling &quot;{query.trim()}&quot; (添加批号)</span>
              </div>
            </button>
          )}

          {filteredLots.length > 0 ? (
            filteredLots.map((lot, index) => {
              const isSelected = value.trim().toLowerCase() === lot.lotCode.toLowerCase();
              return (
                <button
                  key={lot.id}
                  type="button"
                  onClick={() => selectOption(lot.lotCode)}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition ${
                    highlightedIndex === index ? 'bg-[#ffc908]/20 text-[#101828] font-medium' : isSelected ? 'bg-amber-50/60 text-[#101828] font-semibold' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Grid className="w-3.5 h-3.5 text-[#b38600] flex-shrink-0" />
                    <span className="truncate font-mono">{lot.lotCode}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {renderStatusPill(lot.status)}
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#00bb7f]" />}
                  </div>
                </button>
              );
            })
          ) : !showCustomOption ? (
            <div className="px-3 py-3 text-center text-xs text-gray-400">Tidak ada kavling yang cocok. Ketik untuk membuat baru.</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
