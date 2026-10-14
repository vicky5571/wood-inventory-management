import { defaultStorage } from './persistence/storage.ts';
import { WoodRecordRepository } from './persistence/record-repository.ts';
import { aggregateDashboardMetrics } from './utils/timber-calc.ts';
import { renderKpiDashboard, renderSpeciesBar } from './components/kpi-dashboard.ts';
import { renderToolbar, renderRecordTable } from './components/record-table.ts';
import { openRecordModal } from './components/record-modal.ts';
import type { RecordFilterCriteria, WoodReceivingRecord } from './types/index.ts';

export class AppCoordinator {
  private repo: WoodRecordRepository;
  private currentFilters: RecordFilterCriteria = {};

  private kpiSection: HTMLElement | null = null;
  private speciesSection: HTMLElement | null = null;
  private toolbarSection: HTMLElement | null = null;
  private tableSection: HTMLElement | null = null;
  private modalContainer: HTMLElement | null = null;
  private btnNewEntry: HTMLButtonElement | null = null;

  constructor(repo?: WoodRecordRepository) {
    this.repo = repo ?? new WoodRecordRepository(defaultStorage);
  }

  async init(): Promise<void> {
    this.kpiSection = document.getElementById('kpi-section');
    this.speciesSection = document.getElementById('species-chart-section');
    this.toolbarSection = document.getElementById('toolbar-section');
    this.tableSection = document.getElementById('table-section');
    this.modalContainer = document.getElementById('modal-container');
    this.btnNewEntry = document.getElementById('btn-new-entry') as HTMLButtonElement | null;

    this.btnNewEntry?.addEventListener('click', () => {
      if (!this.modalContainer) return;
      openRecordModal(this.modalContainer, null, async (newRec) => {
        await this.repo.save(newRec);
        await this.refresh();
      });
    });

    await this.refresh();
  }

  async refresh(): Promise<void> {
    const allRecords = await this.repo.getAll();
    const filteredRecords = await this.repo.getFiltered(this.currentFilters);
    const metrics = aggregateDashboardMetrics(filteredRecords);

    if (this.kpiSection) renderKpiDashboard(this.kpiSection, metrics);
    if (this.speciesSection) {
      renderSpeciesBar(this.speciesSection, metrics.speciesVolumeBreakdown, metrics.totalTallyVolumeM3);
    }

    const speciesList = Array.from(new Set(allRecords.map((r) => r.woodSpecies))).filter(Boolean);

    if (this.toolbarSection) {
      renderToolbar(
        this.toolbarSection,
        speciesList,
        (filters) => {
          this.currentFilters = filters;
          this.refresh();
        },
        async () => {
          if (confirm('Reset semua data kembali ke contoh awal demo?')) {
            await this.repo.resetToSeed();
            this.currentFilters = {};
            await this.refresh();
          }
        },
        () => this.exportCsv(filteredRecords)
      );
    }

    if (this.tableSection) {
      renderRecordTable(
        this.tableSection,
        filteredRecords,
        (rec) => {
          if (!this.modalContainer) return;
          openRecordModal(this.modalContainer, rec, async (updatedRec) => {
            await this.repo.save(updatedRec);
            await this.refresh();
          });
        },
        async (id) => {
          await this.repo.delete(id);
          await this.refresh();
        }
      );
    }
  }

  exportCsv(records: WoodReceivingRecord[]): void {
    const headers = [
      'Penerimaan (到货日期)', 'No. Polisi (车牌号)', 'SKSHHK / DKP (送货单号)',
      'No. Kontrak (合同编号)', 'Supplier (供应商)', 'Jenis Kayu (树种)',
      'No. Kav (进厂批号)', 'Batang Del (送货根数)', 'Vol Del m³ (送货立方)',
      'Batang Tally (检尺根数)', 'Vol Tally m³ (检尺立方)', 'Net Kayu (木材应付)',
      'Net Ongkir (运费应付)', 'Total Bayar (应付金额)',
    ];

    const rows = records.map((r) => [
      r.receiptDate, `"${r.truckPlateNumber}"`, `"${r.forestryDocNumber}"`,
      `"${r.contractNumber}"`, `"${r.supplierName}"`, `"${r.woodSpecies}"`,
      `"${r.kavlingNumber}"`, r.deliveredPieces, r.deliveredVolumeM3,
      r.tallyPieces, r.tallyVolumeM3, r.timberNetPayable,
      r.freightNetPayable, r.grandNetPayable,
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
