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
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center justify-between">
      <div className="flex flex-wrap gap-3 items-center flex-1 min-w-[280px]">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari Plat / Dok / Supplier / Kav..."
            value={filters.searchQuery || ''}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <select
          value={filters.species || ''}
          onChange={(e) => onFilterChange({ ...filters, species: e.target.value || undefined })}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
        >
          <option value="">Semua Spesies (所有材种)</option>
          {speciesList.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <button
          onClick={onExportCsv}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {canWrite && (
        <div className="flex items-center gap-2">
          <button
            onClick={onResetDemo}
            title="Muat ulang data demo awal"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Demo</span>
          </button>

          <button
            onClick={onNewEntry}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Input Penerimaan (新增入库)</span>
          </button>
        </div>
      )}
    </div>
  );
}
