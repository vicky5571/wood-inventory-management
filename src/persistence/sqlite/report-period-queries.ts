/**
 * src/persistence/sqlite/report-period-queries.ts
 * SQLite CRUD for ReportPeriod and receiving_items linkage
 */
import type { DatabaseSync } from 'node:sqlite';
import type { ReportPeriod, ReportPeriodStatus } from '../../types/index.ts';

interface SqliteReportPeriodRow {
  id: string;
  tenant_id: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
  closed_at: string | null;
  closed_by: string | null;
  total_records: number | null;
  total_volume_m3: number | null;
  total_net_payable_idr: number | null;
  price_snapshot_ids: string | null;
  reopened_at: string | null;
  reopened_by: string | null;
  reopen_reason: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: SqliteReportPeriodRow): ReportPeriod {
  let priceSnapshotIds: string[] | undefined;
  if (row.price_snapshot_ids) {
    try {
      priceSnapshotIds = JSON.parse(row.price_snapshot_ids) as string[];
    } catch {
      priceSnapshotIds = undefined;
    }
  }

  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    status: row.status as ReportPeriodStatus,
    startDate: row.start_date,
    endDate: row.end_date,
    closedAt: row.closed_at || undefined,
    closedBy: row.closed_by || undefined,
    totalRecords: row.total_records !== null ? Number(row.total_records) : undefined,
    totalVolumeM3: row.total_volume_m3 !== null ? Number(row.total_volume_m3) : undefined,
    totalNetPayableIDR: row.total_net_payable_idr !== null ? Number(row.total_net_payable_idr) : undefined,
    priceSnapshotIds,
    reopenedAt: row.reopened_at || undefined,
    reopenedBy: row.reopened_by || undefined,
    reopenReason: row.reopen_reason || undefined,
    notes: row.notes || undefined,
    createdBy: row.created_by || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function ensureReportPeriodTables(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS report_periods (
      id                    TEXT PRIMARY KEY,
      tenant_id             TEXT NOT NULL DEFAULT 'default-tenant',
      name                  TEXT NOT NULL,
      status                TEXT NOT NULL DEFAULT 'OPEN'
                              CHECK (status IN ('OPEN','CLOSED','REOPENED')),
      start_date            TEXT NOT NULL,
      end_date              TEXT NOT NULL,
      closed_at             TEXT,
      closed_by             TEXT,
      total_records         INTEGER,
      total_volume_m3       REAL,
      total_net_payable_idr REAL,
      price_snapshot_ids    TEXT,
      reopened_at           TEXT,
      reopened_by           TEXT,
      reopen_reason         TEXT,
      notes                 TEXT,
      created_by            TEXT,
      created_at            TEXT NOT NULL,
      updated_at            TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_rp_dates ON report_periods(start_date, end_date);
    CREATE INDEX IF NOT EXISTS idx_rp_status ON report_periods(status);
  `);

  try {
    const tableInfo = db.prepare(`PRAGMA table_info(receiving_items);`).all() as { name: string }[];
    const colNames = new Set(tableInfo.map((c) => c.name));

    if (!colNames.has('report_period_id')) {
      db.exec(`ALTER TABLE receiving_items ADD COLUMN report_period_id TEXT;`);
    }
    if (!colNames.has('price_entry_id')) {
      db.exec(`ALTER TABLE receiving_items ADD COLUMN price_entry_id TEXT;`);
    }
    if (!colNames.has('is_locked')) {
      db.exec(`ALTER TABLE receiving_items ADD COLUMN is_locked INTEGER NOT NULL DEFAULT 0;`);
    }
  } catch (err) {
    console.error('Failed to ensure report period columns on receiving_items:', err);
  }
}

export function getAllReportPeriodsFromDb(db: DatabaseSync): ReportPeriod[] {
  ensureReportPeriodTables(db);
  const rows = db.prepare(
    `SELECT * FROM report_periods ORDER BY start_date DESC, created_at DESC;`
  ).all() as unknown as SqliteReportPeriodRow[];
  return rows.map(mapRow);
}

export function getReportPeriodByIdFromDb(db: DatabaseSync, id: string): ReportPeriod | null {
  ensureReportPeriodTables(db);
  const row = db.prepare(`SELECT * FROM report_periods WHERE id = ?;`).get(id) as unknown as SqliteReportPeriodRow | undefined;
  return row ? mapRow(row) : null;
}

export function saveReportPeriodToDb(
  db: DatabaseSync,
  period: Omit<ReportPeriod, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): ReportPeriod {
  ensureReportPeriodTables(db);
  const now = new Date().toISOString();
  const id = period.id ?? `rp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  db.prepare(`
    INSERT INTO report_periods
      (id, tenant_id, name, status, start_date, end_date,
       closed_at, closed_by, total_records, total_volume_m3,
       total_net_payable_idr, price_snapshot_ids,
       reopened_at, reopened_by, reopen_reason,
       notes, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name                  = excluded.name,
      status                = excluded.status,
      start_date            = excluded.start_date,
      end_date              = excluded.end_date,
      closed_at             = excluded.closed_at,
      closed_by             = excluded.closed_by,
      total_records         = excluded.total_records,
      total_volume_m3       = excluded.total_volume_m3,
      total_net_payable_idr = excluded.total_net_payable_idr,
      price_snapshot_ids    = excluded.price_snapshot_ids,
      reopened_at           = excluded.reopened_at,
      reopened_by           = excluded.reopened_by,
      reopen_reason         = excluded.reopen_reason,
      notes                 = excluded.notes,
      updated_at            = excluded.updated_at;
  `).run(
    id,
    period.tenantId ?? 'default-tenant',
    period.name.trim(),
    period.status,
    period.startDate,
    period.endDate,
    period.closedAt ?? null,
    period.closedBy ? period.closedBy.trim() : null,
    period.totalRecords !== undefined ? period.totalRecords : null,
    period.totalVolumeM3 !== undefined ? period.totalVolumeM3 : null,
    period.totalNetPayableIDR !== undefined ? period.totalNetPayableIDR : null,
    period.priceSnapshotIds ? JSON.stringify(period.priceSnapshotIds) : null,
    period.reopenedAt ?? null,
    period.reopenedBy ? period.reopenedBy.trim() : null,
    period.reopenReason ? period.reopenReason.trim() : null,
    period.notes ? period.notes.trim() : null,
    period.createdBy ? period.createdBy.trim() : null,
    now,
    now
  );
  return { ...period, id, createdAt: now, updatedAt: now } as ReportPeriod;
}
