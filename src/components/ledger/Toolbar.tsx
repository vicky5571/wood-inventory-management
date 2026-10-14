import type { RecordFilterCriteria } from '@/src/types';
import { Search, Download, RotateCcw, Plus } from 'lucide-react';

export function Toolbar({
  filters,
  speciesList,
  canWrite = true,
  onFilterChange,
  onResetDemo,
  onExportCsv,
  onNewEntry,
}: {
  filters: RecordFilterCriteria;
  speciesList: string[];
  canWrite?: boolean;
  onFilterChange: (filters: RecordFilterCriteria) => void;
  onResetDemo: () => void;
  onExportCsv: () => void;
  onNewEntry: () => void;
}) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-wrap gap-3 items-center justify-between">
      <div className="flex flex-wrap gap-3 items-center flex-1 min-w-[280px]">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari Plat / Dok / Supplier / Kav..."
            value={filters.searchQuery || ''}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs"
          />
        </div>

        {/* Species Select */}
        <select
          value={filters.species || ''}
          onChange={(e) => onFilterChange({ ...filters, species: e.target.value || undefined })}
          className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs"
        >
          <option value="">Semua Spesies (所有材种)</option>
          {speciesList.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Export CSV */}
        <button
          onClick={onExportCsv}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition shadow-2xs"
        >
          <Download className="w-4 h-4 text-gray-500" />
          <span>Export CSV</span>
        </button>
      </div>

      {canWrite && (
        <div className="flex items-center gap-2">
          {/* Reset Demo */}
          <button
            onClick={onResetDemo}
            title="Muat ulang data demo awal"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
            <span>Reset Demo</span>
          </button>

          {/* New Entry CTA (IOH Gold) */}
          <button
            onClick={onNewEntry}
            className="inline-flex items-center gap-1.5 px-4.5 py-2 text-xs font-bold text-[#101828] bg-[#ffc908] hover:bg-[#f0bc00] active:scale-[0.99] rounded-xl shadow-xs hover:shadow transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#101828]" />
            <span>Input Penerimaan (新增入库)</span>
          </button>
        </div>
      )}
    </div>
  );
}

