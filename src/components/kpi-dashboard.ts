import type { DashboardMetrics } from '../types/index.ts';

const PALETTE = ['#b45309', '#0284c7', '#10b981', '#6366f1', '#ec4899', '#f59e0b'];

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function renderKpiDashboard(container: HTMLElement, metrics: DashboardMetrics): void {
  const discrepancyBadge = metrics.volumeDiscrepancyM3 >= 0
    ? `<span class="badge badge-match">+${metrics.volumeDiscrepancyM3.toFixed(2)} m³ (Surplus/Match)</span>`
    : `<span class="badge badge-alert">${metrics.volumeDiscrepancyM3.toFixed(2)} m³ (Shortage)</span>`;

  container.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-title">Total Volume Tally (检尺立方)</span>
        <span class="kpi-value">${metrics.totalTallyVolumeM3.toFixed(2)} <span style="font-size:1rem;font-weight:400;">m³</span></span>
        <div class="kpi-subtext">
          <span>Delivery: ${metrics.totalDeliveredVolumeM3.toFixed(2)} m³</span>
          ${discrepancyBadge}
        </div>
      </div>

      <div class="kpi-card">
        <span class="kpi-title">Total Batang Tally (检尺根数)</span>
        <span class="kpi-value">${metrics.totalTallyPieces.toLocaleString('id-ID')} <span style="font-size:1rem;font-weight:400;">Btg</span></span>
        <div class="kpi-subtext">
          <span>Delivered: ${metrics.totalDeliveredPieces.toLocaleString('id-ID')} Btg</span>
          <span>(Selisih: ${metrics.pieceDiscrepancy >= 0 ? '+' : ''}${metrics.pieceDiscrepancy})</span>
        </div>
      </div>

      <div class="kpi-card">
        <span class="kpi-title">Total Pengeluaran (总应付金额)</span>
        <span class="kpi-value" style="font-size: 1.4rem;">${formatRupiah(metrics.totalGrandExpenditure)}</span>
        <div class="kpi-subtext">
          <span>Kayu: ${formatRupiah(metrics.totalNetTimberPayable)}</span>
          <span>Ongkir: ${formatRupiah(metrics.totalNetFreightPayable)}</span>
        </div>
      </div>

      <div class="kpi-card">
        <span class="kpi-title">Kavling & Total Batch (批号统计)</span>
        <span class="kpi-value">${metrics.activeKavlingCount} <span style="font-size:1rem;font-weight:400;">Kavling Aktif</span></span>
        <div class="kpi-subtext">
          <span>${metrics.totalRecordsCount} Pengiriman Tercatat</span>
        </div>
      </div>
    </div>
  `;
}

export function renderSpeciesBar(
  container: HTMLElement,
  breakdown: Record<string, number>,
  totalVolume: number
): void {
  const entries = Object.entries(breakdown).filter(([_, vol]) => vol > 0);
  if (entries.length === 0 || totalVolume <= 0) {
    container.innerHTML = '';
    return;
  }

  const segments = entries.map(([species, vol], index) => {
    const pct = ((vol / totalVolume) * 100).toFixed(1);
    const color = PALETTE[index % PALETTE.length];
    return `<div style="width: ${pct}%; background-color: ${color};" title="${species}: ${vol.toFixed(2)} m³ (${pct}%)"></div>`;
  }).join('');

  const legends = entries.map(([species, vol], index) => {
    const pct = ((vol / totalVolume) * 100).toFixed(1);
    const color = PALETTE[index % PALETTE.length];
    return `
      <div class="legend-item">
        <div class="legend-dot" style="background-color: ${color};"></div>
        <span><strong>${species}</strong>: ${vol.toFixed(2)} m³ (${pct}%)</span>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="species-chart-card">
      <div style="font-size: 0.8125rem; font-weight: 600; color: var(--wood-text-muted);">
        DISTRIBUSI SPESIES KAYU (树种立方占比分布)
      </div>
      <div class="species-bar-container">${segments}</div>
      <div class="species-legend">${legends}</div>
    </div>
  `;
}
