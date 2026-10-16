import type { RecordFilterCriteria } from '@/src/types';
import { Search, Download, RotateCcw, Plus, X, Calendar } from 'lucide-react';

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
  const hasDateFilter = Boolean(filters.startDate || filters.endDate);

  const clearDateFilter = () => {
    onFilterChange({
      ...filters,
      startDate: undefined,
      endDate: undefined,
    });
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col gap-3">
      {/* Top Controls Row */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2.5 items-center flex-1 min-w-[280px]">
          {/* Search Bar with Clear Button */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari Plat / Dok / Supplier / Kav..."
              value={filters.searchQuery || ''}
              onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
              className={`w-full pl-9 ${
                filters.searchQuery ? 'pr-8' : 'pr-3'
              } py-2 text-xs border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs`}
            />
            {filters.searchQuery && (
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                title="Hapus pencarian (清空搜索)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Species Select Dropdown */}
          <select
            value={filters.species || ''}
            onChange={(e) => onFilterChange({ ...filters, species: e.target.value || undefined })}
            className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ffc908] focus:border-transparent transition shadow-2xs cursor-pointer"
          >
            <option value="">Semua Spesies (所有材种)</option>
            {speciesList.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Date Range Filter Group */}
          <div className="flex items-center gap-1.5 bg-gray-50/80 px-2.5 py-1.5 rounded-xl border border-gray-200/80 shadow-2xs text-xs">
            <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => onFilterChange({ ...filters, startDate: e.target.value || undefined })}
              className="bg-transparent text-gray-800 text-[11px] focus:outline-none cursor-pointer"
              title="Tanggal Awal (开始日期)"
            />
            <span className="text-gray-300 font-mono">-</span>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => onFilterChange({ ...filters, endDate: e.target.value || undefined })}
              className="bg-transparent text-gray-800 text-[11px] focus:outline-none cursor-pointer"
              title="Tanggal Akhir (结束日期)"
            />
            {hasDateFilter && (
              <button
                type="button"
                onClick={clearDateFilter}
                className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition cursor-pointer"
                title="Reset rentang tanggal"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Export CSV */}
          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition shadow-2xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-gray-500" />
            <span>Export CSV</span>
          </button>
        </div>

        {canWrite && (
          <div className="flex items-center gap-2">
            {/* Reset Demo */}
            <button
              type="button"
              onClick={onResetDemo}
              title="Muat ulang data demo awal"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition shadow-2xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
              <span>Reset Demo</span>
            </button>

            {/* New Entry CTA (IOH Gold) */}
            <button
              type="button"
              onClick={onNewEntry}
              className="inline-flex items-center gap-1.5 px-4.5 py-2 text-xs font-bold text-[#101828] bg-[#ffc908] hover:bg-[#f0bc00] active:scale-[0.99] rounded-xl shadow-xs hover:shadow transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#101828]" />
              <span>Input Penerimaan (新增入库)</span>
            </button>
          </div>
        )}
      </div>

      {/* Quick-Filter Species Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-gray-100/80">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">
          Spesies:
        </span>
        <button
          type="button"
          onClick={() => onFilterChange({ ...filters, species: undefined })}
          className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer font-medium ${
            !filters.species
              ? 'bg-[#ffc908] text-[#101828] border-[#ffc908] font-bold shadow-2xs'
              : 'bg-gray-50 text-gray-600 border-gray-200/80 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          Semua (全部)
        </button>
        {speciesList.map((s) => {
          const isSelected = filters.species === s;
          const shortLabel = s.split('/')[0].trim();
          return (
            <button
              key={s}
              type="button"
              onClick={() => onFilterChange({ ...filters, species: isSelected ? undefined : s })}
              title={s}
              className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 font-medium ${
                isSelected
                  ? 'bg-[#ffc908] text-[#101828] border-[#ffc908] font-bold shadow-2xs'
                  : 'bg-gray-50 text-gray-600 border-gray-200/80 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span>{shortLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
