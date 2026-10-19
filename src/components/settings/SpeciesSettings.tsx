'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { TIMBER_SPECIES_CATALOGUE } from '@/src/utils/timber-species';
import type { WoodSpecies } from '@/src/types';
import { Trees, Search, ShieldCheck } from 'lucide-react';

export function SpeciesSettings() {
  const [speciesList, setSpeciesList] = useState<WoodSpecies[]>(TIMBER_SPECIES_CATALOGUE);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    fetch('/api/species')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!isMounted || !json?.success || !Array.isArray(json.data) || json.data.length === 0) return;
        setSpeciesList(json.data);
      })
      .catch((err) => {
        console.warn('[SpeciesSettings] Failed to fetch species from server:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return speciesList;
    const q = searchQuery.toLowerCase().trim();
    return speciesList.filter((s) => {
      return (
        s.commonName.toLowerCase().includes(q) ||
        (s.botanicalName && s.botanicalName.toLowerCase().includes(q)) ||
        s.code.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, speciesList]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h3 className="text-xs font-bold text-[#101828] uppercase tracking-wider flex items-center gap-2">
            <Trees className="w-4 h-4 text-emerald-600" />
            <span>Katalog Master Spesies Kayu Tropis (树种主数据目录)</span>
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Database acuan karakteristik botanis, kerapatan massa kering (kg/m³), dan klasifikasi kekerasan kayu.
          </p>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari kode atau nama botanis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Grid of Species */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
                  {item.code}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    item.isHardwood
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                      : 'bg-amber-50 text-amber-700 border-amber-200/80'
                  }`}
                >
                  {item.isHardwood ? 'Hardwood (硬木)' : 'Softwood (软木)'}
                </span>
              </div>

              <h4 className="text-xs font-bold text-gray-900 leading-snug">
                {item.commonName}
              </h4>
              <p className="text-[11px] italic text-gray-500 font-serif mt-0.5">
                {item.botanicalName}
              </p>
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs font-mono">
              <span className="text-[11px] text-gray-400 font-sans">Kerapatan Kering:</span>
              <span className="font-bold text-gray-800">{item.densityKgM3} kg/m³</span>
            </div>

            {item.notes && (
              <p className="text-[10px] text-gray-500 leading-relaxed bg-gray-50/70 p-2 rounded-xl border border-gray-100">
                {item.notes}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
