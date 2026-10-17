'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronDown, Check, Plus, X, Warehouse } from 'lucide-react';
import { getYards, filterYards, addYard } from '@/src/utils/storage-locations';
import type { StorageYard } from '@/src/types/index';

export interface YardSelectProps {
  value: string;
  onChange: (yardName: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  id?: string;
}

export function YardSelect({
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder = 'Pilih atau ketik TPK... (选择或输入场地)',
  id = 'yard-select',
}: YardSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [yards, setYards] = useState<StorageYard[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setYards(getYards()); }, []);
  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredYards = useMemo(() => filterYards(yards, query), [yards, query]);
  const hasExactMatch = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return !trimmed || yards.some((y) => y.name.toLowerCase() === trimmed || y.yardCode.toLowerCase() === trimmed);
  }, [yards, query]);

  const showCustomOption = query.trim().length > 0 && !hasExactMatch;

  const selectOption = useCallback((yardName: string) => {
    onChange(yardName);
    setQuery(yardName);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  }, [onChange]);

  const handleAddCustom = useCallback((customName: string) => {
    try {
      const created = addYard(customName);
      setYards(getYards());
      selectOption(created.name);
    } catch {
      selectOption(customName);
    }
  }, [selectOption]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }
    const totalItems = filteredYards.length + (showCustomOption ? 1 : 0);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < totalItems ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredYards.length) {
        selectOption(filteredYards[highlightedIndex].name);
      } else if (showCustomOption && (highlightedIndex === filteredYards.length || highlightedIndex === -1)) {
        handleAddCustom(query.trim());
      } else if (query.trim()) {
        handleAddCustom(query.trim());
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => { if (!disabled) { setYards(getYards()); setIsOpen(true); } }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          className="w-full text-xs pl-3 pr-14 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs disabled:bg-gray-50 disabled:text-gray-400"
        />

        <div className="absolute right-1.5 flex items-center gap-0.5">
          {query && !disabled && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(''); setQuery(''); setIsOpen(false); inputRef.current?.focus(); }}
              aria-label="Hapus pilihan TPK"
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            disabled={disabled}
            onClick={() => { if (!disabled) { setYards(getYards()); setIsOpen((prev) => !prev); } }}
            aria-label="Buka daftar TPK"
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg transition"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#b38600]' : ''}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto py-1 animate-in fade-in slide-in-from-top-2 duration-150">
          {showCustomOption && (
            <button
              type="button"
              onClick={() => handleAddCustom(query.trim())}
              className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between border-b border-gray-100 transition ${
                highlightedIndex === filteredYards.length ? 'bg-[#ffc908]/20 text-[#101828] font-semibold' : 'hover:bg-amber-50 text-gray-800'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 rounded-md bg-[#ffc908]/30 flex items-center justify-center flex-shrink-0 text-[#b38600]">
                  <Plus className="w-3.5 h-3.5" />
                </span>
                <span className="truncate">+ Tambah TPK &quot;{query.trim()}&quot; (添加场地)</span>
              </div>
            </button>
          )}

          {filteredYards.length > 0 ? (
            filteredYards.map((yard, index) => {
              const isSelected = value.trim().toLowerCase() === yard.name.toLowerCase() || value.trim().toLowerCase() === yard.yardCode.toLowerCase();
              return (
                <button
                  key={yard.id}
                  type="button"
                  onClick={() => selectOption(yard.name)}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition ${
                    highlightedIndex === index ? 'bg-[#ffc908]/20 text-[#101828] font-medium' : isSelected ? 'bg-amber-50/60 text-[#101828] font-semibold' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Warehouse className="w-3.5 h-3.5 text-[#b38600] flex-shrink-0" />
                    <span className="truncate">{yard.name}</span>
                    <span className="text-[10px] text-gray-400 font-mono">({yard.yardCode})</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#00bb7f] flex-shrink-0 ml-2" />}
                </button>
              );
            })
          ) : !showCustomOption ? (
            <div className="px-3 py-3 text-center text-xs text-gray-400">Tidak ada TPK yang cocok. Ketik untuk membuat baru.</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
