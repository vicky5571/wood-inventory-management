import { defaultStorage } from './persistence/storage.js';
import { WoodRecordRepository } from './persistence/record-repository.js';
import { aggregateDashboardMetrics } from './utils/timber-calc.js';
import { renderKpiDashboard, renderSpeciesBar } from './components/kpi-dashboard.js';
import { renderToolbar, renderRecordTable } from './components/record-table.js';
import { openRecordModal } from './components/record-modal.js';

export class AppCoordinator {
  constructor(repo) {
    this.repo = repo ?? new WoodRecordRepository(defaultStorage);
    this.currentFilters = {};
    this.kpiSection = null;
    this.speciesSection = null;
    this.toolbarSection = null;
    this.tableSection = null;
    this.modalContainer = null;
    this.btnNewEntry = null;
  }

  async init() {
    this.kpiSection = document.getElementById('kpi-section');
    this.speciesSection = document.getElementById('species-chart-section');
    this.toolbarSection = document.getElementById('toolbar-section');
    this.tableSection = document.getElementById('table-section');
    this.modalContainer = document.getElementById('modal-container');
    this.btnNewEntry = document.getElementById('btn-new-entry');

    this.btnNewEntry?.addEventListener('click', () => {
      if (!this.modalContainer) return;
      openRecordModal(this.modalContainer, null, async (newRec) => {
        await this.repo.save(newRec);
        await this.refreshAll();
      });
    });

    await this.refreshAll();
  }

  async refreshAll() {
    const allRecords = await this.repo.getAll();
    const speciesList = Array.from(new Set(allRecords.map((r) => r.woodSpecies))).filter(Boolean);

    if (this.toolbarSection) {
      renderToolbar(
        this.toolbarSection,
        speciesList,
        async (filters) => {
          this.currentFilters = filters;
          await this.refreshTableAndMetrics();
        },
        async () => {
          if (confirm('Reset semua data kembali ke contoh awal demo?')) {
            await this.repo.resetToSeed();
            this.currentFilters = {};
            await this.refreshAll();
          }
        },
        async () => {
          const records = await this.repo.getFiltered(this.currentFilters);
          this.exportCsv(records);
        }
      );
    }

    await this.refreshTableAndMetrics();
  }

  async refreshTableAndMetrics() {
    const filteredRecords = await this.repo.getFiltered(this.currentFilters);
    const metrics = aggregateDashboardMetrics(filteredRecords);

    if (this.kpiSection) renderKpiDashboard(this.kpiSection, metrics);
    if (this.speciesSection) {
      renderSpeciesBar(this.speciesSection, metrics.speciesVolumeBreakdown, metrics.totalTallyVolumeM3);
    }

    if (this.tableSection) {
      renderRecordTable(
        this.tableSection,
        filteredRecords,
        (rec) => {
          if (!this.modalContainer) return;
          openRecordModal(this.modalContainer, rec, async (updatedRec) => {
            await this.repo.save(updatedRec);
            await this.refreshAll();
          });
        },
        async (id) => {
          await this.repo.delete(id);
          await this.refreshAll();
        }
      );
    }
  }

  async refresh() {
    await this.refreshAll();
  }

  exportCsv(records) {
    const escapeCsv = (str) => `"${(str || '').replace(/"/g, '""')}"`;
    const headers = [
      'Penerimaan (到货日期)', 'No. Polisi (车牌号)', 'SKSHHK / DKP (送货单号)', 'No. Kontrak (合同编号)',
      'Supplier (供应商)', 'Jenis Kayu (树种)', 'No. Kav (进厂批号)', 'Batang Del (送货根数)',
      'Vol Del m³ (送货立方)', 'Batang Tally (检尺根数)', 'Vol Tally m³ (检尺立方)',
      'Net Kayu (木材应付)', 'Net Ongkir (运费应付)', 'Total Bayar (应付金额)',
    ];

    const rows = records.map((r) => [
      r.receiptDate, escapeCsv(r.truckPlateNumber), escapeCsv(r.forestryDocNumber),
      escapeCsv(r.contractNumber), escapeCsv(r.supplierName), escapeCsv(r.woodSpecies),
      escapeCsv(r.kavlingNumber), r.deliveredPieces, r.deliveredVolumeM3, r.tallyPieces,
      r.tallyVolumeM3, r.timberNetPayable, r.freightNetPayable, r.grandNetPayable,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    if (typeof Blob === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      return;
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `penerimaan_kayu_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      setTimeout(() => URL.revokeObjectURL(url), 100);
    }
  }
}

if (typeof document !== 'undefined') {
  const bootstrap = () => {
    const app = new AppCoordinator();
    app.init();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
}

