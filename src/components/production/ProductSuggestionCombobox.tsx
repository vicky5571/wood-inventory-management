'use client';

/**
 * src/components/production/ProductSuggestionCombobox.tsx
 *
 * Autocomplete combobox for sawmill product outputs.
 * Allows free-text entry while learning and recommending historical products.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronDown, Check, Plus, Package } from 'lucide-react';

export interface ProductSuggestionComboboxProps {
  value: string;
  onChange: (val: string) => void;
  suggestions?: string[];
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
}

const DEFAULT_PRODUCTS = [
  'Papan 2x20x400cm',
  'Papan 3x20x400cm',
  'Balok 6x12x400cm',
  'Balok 8x12x400cm',
  'Kaso 4x6x400cm',
  'Kaso 5x7x400cm',
  'Reng 2x3x400cm',
  'Reng 3x4x400cm',
  'Papan Sortimen Khusus',
];

export function ProductSuggestionCombobox({
  value,
  onChange,
  suggestions = [],
  required = false,
  disabled = false,
  placeholder = 'Pilih atau ketik jenis produk output...',
  id = 'product-suggestion-combobox',
}: ProductSuggestionComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  const allOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of suggestions) {
      if (p?.trim()) set.add(p.trim());
    }
    for (const p of DEFAULT_PRODUCTS) {
      set.add(p);
    }
    return Array.from(set);
  }, [suggestions]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allOptions;
    return allOptions.filter((opt) => opt.toLowerCase().includes(q));
  }, [allOptions, query]);

  const hasExactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return allOptions.some((opt) => opt.toLowerCase() === q);
  }, [allOptions, query]);

  const showCustomOption = query.trim().length > 0 && !hasExactMatch;

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
    (option: string) => {
      onChange(option);
      setQuery(option);
      setIsOpen(false);
      inputRef.current?.focus();
    },
    [onChange]
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          className="w-full pl-3.5 pr-9 py-2 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            onChange(next);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          autoComplete="off"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 cursor-pointer"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl py-1 text-xs">
          {showCustomOption && (
            <button
              type="button"
              onClick={() => selectOption(query.trim())}
              className="w-full text-left px-3.5 py-2.5 flex items-center gap-2.5 text-amber-700 hover:bg-amber-50 transition-colors font-semibold border-b border-gray-100 cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Gunakan: &ldquo;{query.trim()}&rdquo;</span>
            </button>
          )}

          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => {
              const isSelected = opt.toLowerCase() === value?.trim().toLowerCase();
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => selectOption(opt)}
                  className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-amber-50 text-amber-900 font-semibold'
                      : 'text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Package className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{opt}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-amber-700 shrink-0 ml-2" />}
                </button>
              );
            })
          ) : (
            !showCustomOption && (
              <div className="px-3.5 py-3 text-center text-xs text-gray-400">
                Tidak ada saran produk yang sesuai
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
