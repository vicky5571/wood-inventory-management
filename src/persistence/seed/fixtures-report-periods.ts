/**
 * src/persistence/seed/fixtures-report-periods.ts
 *
 * Report period seed fixtures for the Periode Laporan page (/report-periods).
 * Covers the complete reporting lifecycle:
 * 1. CLOSED: Historical finalized period (Agustus 2026) with locked records & frozen totals
 * 2. REOPENED: Audited correction period (September 2026) with reopenReason and actor
 * 3. OPEN: Active current operational period (Oktober 2026) ready for close preview
 */

import type { ReportPeriod } from '../../types/index.ts';

export const SEED_REPORT_PERIODS: readonly ReportPeriod[] = [
  // 1. Finalized / Closed Historical Period: Agustus 2026 (W31 - W34)
  {
    id: 'RP-2026-08',
    tenantId: 'default-tenant',
    name: 'Laporan Periode Agustus 2026 (W31 - W34)',
    status: 'CLOSED',
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    closedAt: '2026-09-01T17:00:00.000Z',
    closedBy: 'Budi Santoso',
    totalRecords: 4,
    totalVolumeM3: 94.75,
    totalNetPayableIDR: 412500000,
    priceSnapshotIds: [
      'TPE-JATI-STD-2026',
      'TPE-JATI-RBL-2026',
      'TPE-MRB-STD-2026',
      'TPE-MHN-STD-2026',
    ],
    notes: 'Penutupan buku dan penguncian patokan harga kayu log Agustus 2026 selesai.',
    createdBy: 'Budi Santoso',
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: '2026-09-01T17:00:00.000Z',
  },

  // 2. Reopened Period: September 2026 (Reopened for audit / volume dispute reconciliation)
  {
    id: 'RP-2026-09',
    tenantId: 'default-tenant',
    name: 'Laporan Periode September 2026 (W36 - W39)',
    status: 'REOPENED',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    reopenedAt: '2026-10-05T09:30:00.000Z',
    reopenedBy: 'Budi Santoso',
    reopenReason: 'Koreksi selisih volume SKSHHK pada rit MFT-2026-W38-007',
    notes: 'Dibuka kembali untuk penyesuaian evaluasi afkir dan rekonsiliasi faktur.',
    createdBy: 'Budi Santoso',
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-10-05T09:30:00.000Z',
  },

  // 3. Active Open Period: Oktober 2026 (Current active cycle ready for close preview)
  {
    id: 'RP-2026-10',
    tenantId: 'default-tenant',
    name: 'Laporan Berjalan Oktober 2026 (W40 - W44)',
    status: 'OPEN',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    notes: 'Periode aktif penerimaan kayu log TPK-01 Q4 2026.',
    createdBy: 'Budi Santoso',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
] as const;
