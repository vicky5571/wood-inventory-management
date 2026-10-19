import type { DatabaseSync } from 'node:sqlite';
import type { ActivityLogEntry, ActivityActionType, AppSettings } from '../../types/index.ts';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultTimberPphRate: 0.5,
  defaultFreightPphRate: 2.0,
  defaultBrokerFee: 250000,
  acceptableDiscrepancyThresholdPct: 2.0,
  yardName: 'TPK-01 Utama (Central Yard)',
  yardCode: 'TPK-01',
};

interface SqliteActivityLogRow {
  id: string;
  tenant_id: string;
  action: string;
  entity_id: string | null;
  entity_summary: string;
  operator_name: string;
  operator_role: string;
  metadata_json: string | null;
  timestamp: string;
}

interface SqliteAppSettingsRow {
  tenant_id: string;
  default_timber_pph_rate: number;
  default_freight_pph_rate: number;
  default_broker_fee: number;
  acceptable_discrepancy_threshold_pct: number;
  yard_name: string;
  yard_code: string;
  updated_at: string;
}

function mapActivityRow(row: SqliteActivityLogRow): ActivityLogEntry {
  let metadata: Record<string, unknown> | undefined;
  if (row.metadata_json) {
    try {
      metadata = JSON.parse(row.metadata_json);
    } catch {
      metadata = undefined;
    }
  }

  return {
    id: row.id,
    action: row.action as ActivityActionType,
    entityId: row.entity_id ?? undefined,
    entitySummary: row.entity_summary,
    operatorName: row.operator_name,
    operatorRole: row.operator_role,
    timestamp: row.timestamp,
    metadata,
  };
}

export function listActivityLogsFromDb(
  db: DatabaseSync,
  actionFilter?: string,
  limit: number = 100
): ActivityLogEntry[] {
  const safeLimit = Math.max(1, Math.min(limit, 500));
  if (actionFilter && actionFilter.trim() !== '') {
    const rows = db.prepare(`
      SELECT * FROM activity_logs
      WHERE tenant_id = 'default-tenant' AND action = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(actionFilter.trim(), safeLimit) as unknown as SqliteActivityLogRow[];
    return rows.map(mapActivityRow);
  }

  const rows = db.prepare(`
    SELECT * FROM activity_logs
    WHERE tenant_id = 'default-tenant'
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(safeLimit) as unknown as SqliteActivityLogRow[];
  return rows.map(mapActivityRow);
}

export function appendActivityLogToDb(
  db: DatabaseSync,
  entry: Omit<ActivityLogEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
): ActivityLogEntry {
  const id = entry.id ?? `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const timestamp = entry.timestamp ?? new Date().toISOString();
  const metadataJson = entry.metadata ? JSON.stringify(entry.metadata) : null;

  db.prepare(`
    INSERT INTO activity_logs (
      id, tenant_id, action, entity_id, entity_summary,
      operator_name, operator_role, metadata_json, timestamp
    ) VALUES (?, 'default-tenant', ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    entry.action,
    entry.entityId ?? null,
    entry.entitySummary,
    entry.operatorName,
    entry.operatorRole,
    metadataJson,
    timestamp
  );

  return {
    id,
    action: entry.action,
    entityId: entry.entityId,
    entitySummary: entry.entitySummary,
    operatorName: entry.operatorName,
    operatorRole: entry.operatorRole,
    timestamp,
    metadata: entry.metadata,
  };
}

function ensureDefaultTenant(db: DatabaseSync): void {
  db.prepare(`
    INSERT OR IGNORE INTO tenants (id, name, slug)
    VALUES ('default-tenant', 'Factory Workspace Tenant', 'default-tenant')
  `).run();
}

export function getSettingsFromDb(db: DatabaseSync): AppSettings {
  ensureDefaultTenant(db);
  const row = db.prepare(`
    SELECT * FROM app_settings WHERE tenant_id = 'default-tenant' LIMIT 1
  `).get() as unknown as SqliteAppSettingsRow | undefined;

  if (!row) {
    db.prepare(`
      INSERT OR IGNORE INTO app_settings (tenant_id) VALUES ('default-tenant')
    `).run();
    return { ...DEFAULT_APP_SETTINGS };
  }

  return {
    defaultTimberPphRate: Number(row.default_timber_pph_rate),
    defaultFreightPphRate: Number(row.default_freight_pph_rate),
    defaultBrokerFee: Number(row.default_broker_fee),
    acceptableDiscrepancyThresholdPct: Number(row.acceptable_discrepancy_threshold_pct),
    yardName: String(row.yard_name),
    yardCode: String(row.yard_code),
  };
}

export function saveSettingsToDb(db: DatabaseSync, patch: Partial<AppSettings>): AppSettings {
  const current = getSettingsFromDb(db);
  const updated: AppSettings = {
    defaultTimberPphRate: patch.defaultTimberPphRate ?? current.defaultTimberPphRate,
    defaultFreightPphRate: patch.defaultFreightPphRate ?? current.defaultFreightPphRate,
    defaultBrokerFee: patch.defaultBrokerFee ?? current.defaultBrokerFee,
    acceptableDiscrepancyThresholdPct: patch.acceptableDiscrepancyThresholdPct ?? current.acceptableDiscrepancyThresholdPct,
    yardName: patch.yardName ?? current.yardName,
    yardCode: patch.yardCode ?? current.yardCode,
  };

  db.prepare(`
    UPDATE app_settings SET
      default_timber_pph_rate = ?,
      default_freight_pph_rate = ?,
      default_broker_fee = ?,
      acceptable_discrepancy_threshold_pct = ?,
      yard_name = ?,
      yard_code = ?,
      updated_at = datetime('now')
    WHERE tenant_id = 'default-tenant'
  `).run(
    updated.defaultTimberPphRate,
    updated.defaultFreightPphRate,
    updated.defaultBrokerFee,
    updated.acceptableDiscrepancyThresholdPct,
    updated.yardName,
    updated.yardCode
  );

  return updated;
}
