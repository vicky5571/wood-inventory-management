'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronDown, Check, X, Users } from 'lucide-react';
import { BrokerRepository } from '@/src/persistence/broker-repository';
import type { Broker } from '@/src/types';

export interface BrokerComboboxProps {
  value?: string; // brokerId
  onChange: (brokerId: string | undefined, broker?: Broker) => void;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
}

const repo = new BrokerRepository();

export function BrokerCombobox({
  value,
  onChange,
  disabled = false,
  placeholder = 'Pilih broker (opsional)...',
  id = 'broker-combobox',
}: BrokerComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allBrokers = useMemo(() => {
    return repo.getAll().filter((b) => b.status === 'ACTIVE');
  }, []);

  const selectedBroker = useMemo(() => {
    if (!value) return undefined;
    return repo.getById(value);
  }, [value]);

  useEffect(() => {
    if (selectedBroker) {
      setQuery(selectedBroker.name);
    } else {
      setQuery('');
    }
  }, [selectedBroker]);

  const filteredBrokers = useMemo(() => {
    if (!query.trim() || (selectedBroker && query === selectedBroker.name)) {
      return allBrokers;
    }
    const q = query.toLowerCase().trim();
    return allBrokers.filter(
      (b) => b.name.toLowerCase().includes(q) || (b.code && b.code.toLowerCase().includes(q))
    );
  }, [allBrokers, query, selectedBroker]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (selectedBroker) {
          setQuery(selectedBroker.name);
        } else {
          setQuery('');
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedBroker]);

  const selectBroker = useCallback(
    (broker?: Broker) => {
      if (broker) {
        onChange(broker.id, broker);
        setQuery(broker.name);
      } else {
        onChange(undefined, undefined);
        setQuery('');
      }
      setIsOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.focus();
    },
    [onChange]
  );

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectBroker(undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }
    // Items: 0 is "No Broker", then filteredBrokers
    const totalItems = filteredBrokers.length + 1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < totalItems ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex === 0) {
        selectBroker(undefined);
      } else if (highlightedIndex > 0 && highlightedIndex <= filteredBrokers.length) {
        selectBroker(filteredBrokers[highlightedIndex - 1]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery(selectedBroker ? selectedBroker.name : '');
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          disabled={disabled}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          className="w-full text-xs pl-3 pr-14 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition shadow-2xs disabled:bg-gray-50 disabled:text-gray-400"
        />

        <div className="absolute right-1.5 flex items-center gap-0.5">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Hapus pilihan broker"
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label="Buka daftar broker"
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg transition cursor-pointer"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-amber-600' : ''}`}
            />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto py-1 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* None option */}
          <button
            type="button"
            onClick={() => selectBroker(undefined)}
            className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between border-b border-gray-100 transition cursor-pointer ${
              highlightedIndex === 0
                ? 'bg-amber-50 text-amber-900 font-semibold'
                : !value
                ? 'bg-gray-50 text-gray-800 font-medium'
                : 'hover:bg-gray-50 text-gray-600'
            }`}
          >
            <span className="italic text-gray-500">Tidak ada broker (无经纪人)</span>
            {!value && <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
          </button>

          {filteredBrokers.length > 0 ? (
            filteredBrokers.map((b, idx) => {
              const isSelected = value === b.id;
              const isHighlighted = highlightedIndex === idx + 1;

              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => selectBroker(b)}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition cursor-pointer ${
                    isHighlighted
                      ? 'bg-amber-50 text-amber-950 font-medium'
                      : isSelected
                      ? 'bg-amber-50/70 text-amber-950 font-semibold'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Users className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span className="truncate">{b.name}</span>
                    <span className="font-mono text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/80">
                      {b.code}
                    </span>
                    {b.defaultCommissionPerM3 ? (
                      <span className="text-[10px] text-gray-400">
                        (Rp {b.defaultCommissionPerM3.toLocaleString('id-ID')}/m³)
                      </span>
                    ) : null}
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 ml-2" />}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-3 text-center text-xs text-gray-400">Tidak ada broker yang cocok.</div>
          )}
        </div>
      )}
    </div>
  );
}
