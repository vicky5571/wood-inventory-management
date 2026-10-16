'use client';

import React, { useState } from 'react';
import { useSettings } from '@/src/hooks/useSettings';
import { useAuth } from '@/src/hooks/useAuth';
import { useActivityLog } from '@/src/hooks/useActivityLog';
import { SpeciesSettings } from '@/src/components/settings/SpeciesSettings';
import { TaxSettings } from '@/src/components/settings/TaxSettings';
import { StorageSettings } from '@/src/components/settings/StorageSettings';
import {
  Settings,
  Trees,
  Percent,
  Warehouse,
  ShieldCheck,
  User,
} from 'lucide-react';

export default function SettingsPage() {
  const { settings, saveSettings } = useSettings();
  const { user, canWrite } = useAuth();
  const { addLog } = useActivityLog();
  const [activeTab, setActiveTab] = useState<'species' | 'tax' | 'storage' | 'account'>('species');

  const handleSaveTax = (updated: Parameters<typeof saveSettings>[0]) => {
    saveSettings(updated);
    addLog({
      action: 'SETTINGS_UPDATED',
      entitySummary: 'Tarif PPh dan parameter toleransi selisih diperbarui',
      operatorName: user?.name,
      operatorRole: user?.title,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200/80">
        <div>
          <h1 className="text-xl font-bold text-[#101828] tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-700 shrink-0" />
            <span>Pengaturan Sistem & Master Data (系统设置与主数据)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Konfigurasi master varietas kayu, batasan pajak komoditas kehutanan, dan profil otorisasi pengguna.
          </p>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-gray-200/80 overflow-x-auto pb-px">
        {[
          { id: 'species', label: 'Katalog Spesies (树种)', icon: Trees },
          { id: 'tax', label: 'Pajak & Toleransi (税务)', icon: Percent },
          { id: 'storage', label: 'Gudang & TPK (场地)', icon: Warehouse },
          { id: 'account', label: 'Profil Otorisasi (权限)', icon: ShieldCheck },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-amber-600 text-amber-900 bg-amber-50/50 rounded-t-xl'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-600' : 'text-gray-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {activeTab === 'species' && <SpeciesSettings />}

      {activeTab === 'tax' && (
        <TaxSettings
          settings={settings}
          canWrite={canWrite}
          onSave={handleSaveTax}
        />
      )}

      {activeTab === 'storage' && <StorageSettings settings={settings} />}

      {activeTab === 'account' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs max-w-2xl flex flex-col gap-5">
          <div className="flex items-center gap-3.5 border-b border-gray-100 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 font-bold text-lg flex items-center justify-center">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'TK'}
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">{user?.name || 'User'}</h3>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Tingkat Hak Akses</span>
              <span className="font-bold text-gray-800 text-sm mt-0.5 block">
                Level {user?.roleLevel} — {user?.roleLevel === 1 ? 'Manager (Write)' : user?.roleLevel === 2 ? 'Admin (Audit)' : 'Monitor (View Only)'}
              </span>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Jabatan Resmi</span>
              <span className="font-bold text-gray-800 mt-0.5 block">
                {user?.title || 'Operator'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
