'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronDown, Check, Plus, X, Building2 } from 'lucide-react';
import { useSuppliers } from '@/src/hooks/useSuppliers';

export interface SupplierOption {
  name: string;
  code?: string;
}

export interface SupplierComboboxProps {
  value: string;
  onChange: (supplierName: string) => void;
  availableSuppliers?: SupplierOption[];
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
}

export function SupplierCombobox({
  value,
  onChange,
  availableSuppliers,
  required = false,
  disabled = false,
  placeholder = 'Pilih atau ketik nama pemasok...',
  id = 'supplier-combobox',
}: SupplierComboboxProps) {
  const { suppliers: defaultSuppliers } = useSuppliers();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Synchronize internal query with external value changes
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  const allSuppliers: SupplierOption[] = useMemo(() => {
    if (availableSuppliers && availableSuppliers.length > 0) {
      return availableSuppliers;
    }
    return defaultSuppliers.map((s) => ({
      name: s.name || s.supplierName,
      code: s.code,
    }));
  }, [availableSuppliers, defaultSuppliers]);

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return allSuppliers;
    const q = query.toLowerCase().trim();
    return allSuppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.code && s.code.toLowerCase().includes(q))
    );
  }, [allSuppliers, query]);

  const hasExactMatch = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return true;
    return allSuppliers.some((s) => s.name.toLowerCase() === trimmed);
  }, [allSuppliers, query]);

  const showCustomOption = query.trim().length > 0 && !hasExactMatch;

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectOption = useCallback(
    (supplierName: string) => {
      onChange(supplierName);
      setQuery(supplierName);
      setIsOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.focus();
    },
    [onChange]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    const totalItems = filteredOptions.length + (showCustomOption ? 1 : 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < totalItems ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        selectOption(filteredOptions[highlightedIndex].name);
      } else if (showCustomOption && highlightedIndex === filteredOptions.length) {
        selectOption(query.trim());
      } else if (query.trim()) {
        selectOption(query.trim());
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
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          className="w-full text-xs pl-3 pr-14 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition shadow-2xs disabled:bg-gray-50 disabled:text-gray-400"
        />

        <div className="absolute right-1.5 flex items-center gap-0.5">
          {query && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Hapus pilihan pemasok"
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label="Buka daftar rekanan pemasok"
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg transition"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-sky-700' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto py-1 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Custom Entry Option */}
          {showCustomOption && (
            <button
              type="button"
              onClick={() => selectOption(query.trim())}
              className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between border-b border-gray-100 transition ${
                highlightedIndex === filteredOptions.length
                  ? 'bg-amber-100 text-[#101828] font-semibold'
                  : 'hover:bg-amber-50 text-gray-800'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-3.5 h-3.5" />
                </span>
                <span className="truncate">
                  Gunakan: <strong className="text-[#101828]">"{query.trim()}"</strong>
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 ml-2 flex-shrink-0">
                Kustom (自定义)
              </span>
            </button>
          )}

          {/* Filtered Options List */}
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, index) => {
              const isSelected = value.trim().toLowerCase() === opt.name.toLowerCase();
              const isHighlighted = highlightedIndex === index;

              return (
                <button
                  key={opt.name}
                  type="button"
                  onClick={() => selectOption(opt.name)}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition ${
                    isHighlighted
                      ? 'bg-sky-50 text-sky-950 font-medium'
                      : isSelected
                      ? 'bg-sky-50/70 text-sky-950 font-semibold'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                    <span className="truncate">{opt.name}</span>
                    {opt.code && (
                      <span className="font-mono text-[9px] font-bold text-sky-800 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200/80">
                        {opt.code}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 ml-2" />
                  )}
                </button>
              );
            })
          ) : !showCustomOption ? (
            <div className="px-3 py-3 text-center text-xs text-gray-400">
              Tidak ada pemasok yang cocok. Ketik untuk input manual.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
