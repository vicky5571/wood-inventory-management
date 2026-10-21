import React from 'react';
import { Check } from 'lucide-react';
import { PRESETS, LoginPresetKeyConfig, LoginPresetConfig } from './login-presets';

interface LoginPresetChipsProps {
  activePreset: LoginPresetKeyConfig;
  onSelect: (preset: LoginPresetConfig) => void;
}

export function LoginPresetChips({ activePreset, onSelect }: LoginPresetChipsProps) {
  return (
    <div className="mt-1 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Akun Preset (1-Klik Isi)
        </span>
        <span className="text-[9px] font-semibold text-slate-400">Sandbox</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => onSelect(preset)}
            className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col ${
              activePreset === preset.key
                ? 'bg-amber-50 border-amber-300 shadow-sm'
                : 'bg-white border-slate-200 hover:border-amber-200 hover:bg-amber-50/30'
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className={`text-[8px] font-black uppercase tracking-tight px-1.5 py-0.5 rounded-md ${preset.badgeColor}`}>
                {preset.label}
              </span>
              {activePreset === preset.key && (
                <Check className="w-3 h-3 text-amber-600" strokeWidth={3} />
              )}
            </div>
            <span className="text-[10px] font-extrabold text-slate-800 leading-tight">{preset.name}</span>
            <span className="text-[8px] text-slate-400 font-medium truncate mt-0.5">{preset.email}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
