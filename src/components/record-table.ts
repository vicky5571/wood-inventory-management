/**
 * src/components/record-table.ts
 *
 * Renders toolbar filter controls and records data table with discrepancy badges,
 * formatting, and action button delegates.
 */

import type { WoodReceivingRecord, RecordFilterCriteria } from '../types/index.ts';

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderToolbar(
  container: HTMLElement,
  speciesList: string[],
  onFilterChange: (criteria: RecordFilterCriteria) => void,
  onResetDemo: () => void,
  onExportCsv: () => void
): void {
  const speciesOptions = speciesList
    .map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`)
    .join('');

  container.innerHTML = `
    <div class="toolbar-card">
      <div class="filter-group">
        <input id="filter-search" class="input-control" type="text" placeholder="Cari Plat / Dok / Supplier / Kav..." style="min-width: 240px;" />
        <select id="filter-species" class="select-control">
          <option value="">Semua Spesies (所有材种)</option>
          ${speciesOptions}
        </select>
        <button id="btn-export-csv" class="btn btn-secondary">📥 Export CSV</button>
      </div>
      <div class="filter-group">
        <button id="btn-reset-demo" class="btn btn-secondary" title="Muat ulang data demo">🔄 Reset Demo</button>
      </div>
    </div>
  `;

  const searchInput = container.querySelector<HTMLInputElement>('#filter-search');
  const speciesSelect = container.querySelector<HTMLSelectElement>('#filter-species');

  const trigger = () => {
    if (!searchInput || !speciesSelect) return;
    onFilterChange({
      searchQuery: searchInput.value,
      species: speciesSelect.value || undefined,
    });
  };

  searchInput?.addEventListener('input', trigger);
  speciesSelect?.addEventListener('change', trigger);
  container.querySelector('#btn-reset-demo')?.addEventListener('click', onResetDemo);
  container.querySelector('#btn-export-csv')?.addEventListener('click', onExportCsv);
}

export function renderRecordTable(
  container: HTMLElement,
  records: WoodReceivingRecord[],
  onEdit: (record: WoodReceivingRecord) => void,
  onDelete: (id: string) => void
): void {
  if (records.length === 0) {
    container.innerHTML = `
      <div class="table-wrapper" style="padding: 2.5rem; text-align: center; color: var(--wood-text-muted);">
        <p>Tidak ada data penerimaan yang cocok dengan filter pencarian.</p>
      </div>
    `;
    return;
  }

  const rows = records.map((r) => {
    const volDiff = Number((r.tallyVolumeM3 - r.deliveredVolumeM3).toFixed(2));
    const volText = Math.abs(volDiff) < 0.001
      ? '0.00'
      : (volDiff > 0 ? `+${volDiff.toFixed(2)}` : volDiff.toFixed(2));
    const volBadge = volDiff >= 0
      ? `<span class="badge badge-match">${volText}</span>`
      : `<span class="badge badge-alert">${volText}</span>`;

    return `
      <tr>
        <td><strong>${escapeHtml(r.receiptDate)}</strong></td>
        <td>${escapeHtml(r.truckPlateNumber)}</td>
        <td><code>${escapeHtml(r.forestryDocNumber)}</code></td>
        <td>${escapeHtml(r.contractNumber)}</td>
        <td>${escapeHtml(r.supplierName)}</td>
        <td><strong>${escapeHtml(r.woodSpecies)}</strong></td>
        <td><span style="font-weight:600; color:var(--wood-primary);">${escapeHtml(r.kavlingNumber)}</span></td>
        <td>${r.deliveredPieces} / <strong>${r.tallyPieces}</strong></td>
        <td>${r.deliveredVolumeM3.toFixed(2)} / <strong>${r.tallyVolumeM3.toFixed(2)}</strong></td>
        <td>${volBadge}</td>
        <td>${formatRupiah(r.timberNetPayable)}</td>
        <td>${formatRupiah(r.freightNetPayable)}</td>
        <td style="font-weight:700; color:var(--wood-primary);">${formatRupiah(r.grandNetPayable)}</td>
        <td>
          <button class="btn btn-secondary btn-edit" data-id="${escapeHtml(r.id)}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Edit</button>
          <button class="btn btn-danger btn-delete" data-id="${escapeHtml(r.id)}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Hapus</button>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Penerimaan<span class="col-header-subtitle">到货日期</span></th>
            <th>No. Polisi<span class="col-header-subtitle">车牌号</span></th>
            <th>SKSHHK / DKP<span class="col-header-subtitle">送货单号</span></th>
            <th>No. Kontrak<span class="col-header-subtitle">合同编号</span></th>
            <th>Supplier<span class="col-header-subtitle">供应商</span></th>
            <th>Jenis Kayu<span class="col-header-subtitle">树种</span></th>
            <th>No. Kav<span class="col-header-subtitle">进厂批号</span></th>
            <th>Batang (Del/Tally)<span class="col-header-subtitle">送货/检尺根数</span></th>
            <th>Vol m³ (Del/Tally)<span class="col-header-subtitle">送货/检尺立方</span></th>
            <th>Selisih Vol<span class="col-header-subtitle">误差立方</span></th>
            <th>Net Kayu<span class="col-header-subtitle">木材应付</span></th>
            <th>Net Ongkir<span class="col-header-subtitle">运费应付</span></th>
            <th>Total Bayar<span class="col-header-subtitle">应付金额</span></th>
            <th>Aksi<span class="col-header-subtitle">操作</span></th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;

  container.querySelectorAll<HTMLButtonElement>('.btn-edit').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const rec = records.find((r) => r.id === id);
      if (rec) onEdit(rec);
    });
  });

  container.querySelectorAll<HTMLButtonElement>('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (id && confirm('Apakah Anda yakin ingin menghapus data penerimaan ini?')) {
        onDelete(id);
      }
    });
  });
}
