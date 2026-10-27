/**
 * src/persistence/sqlite/sorting-queries.ts
 *
 * SQLite relational queries and DDL for stock sorting records.
 */

import type { DatabaseSync } from 'node:sqlite';
import type { StockSortingRecord } from '../../types/index.ts';

export function ensureSortingTables(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wood_species (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      common_name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS stock_sorting_records (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT 'default-tenant' REFERENCES tenants(id) ON DELETE CASCADE,
      sorting_date TEXT NOT NULL,
      species TEXT NOT NULL,
      species_id TEXT REFERENCES wood_species(id) ON DELETE SET NULL,
      source_storage_yard TEXT NOT NULL,
      source_kavling_number TEXT NOT NULL,
      target_storage_yard TEXT NOT NULL,
      target_kavling_number TEXT NOT NULL,
      volume_m3 REAL NOT NULL CHECK (volume_m3 > 0),
      pieces INTEGER NOT NULL CHECK (pieces > 0),
      reason TEXT NOT NULL,
      operator_name TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      CHECK (NOT (source_storage_yard = target_storage_yard AND source_kavling_number = target_kavling_number))
    );
    CREATE INDEX IF NOT EXISTS idx_sorting_tenant_date ON stock_sorting_records(tenant_id, sorting_date);
    CREATE INDEX IF NOT EXISTS idx_sorting_source_lot ON stock_sorting_records(tenant_id, source_storage_yard, source_kavling_number);
    CREATE INDEX IF NOT EXISTS idx_sorting_target_lot ON stock_sorting_records(tenant_id, target_storage_yard, target_kavling_number);
  `);
}

interface SqliteSortingRow {
  id: string;
  tenant_id: string;
  sorting_date: string;
  species: string;
  species_id?: string | null;
  source_storage_yard: string;
  source_kavling_number: string;
  target_storage_yard: string;
  target_kavling_number: string;
  volume_m3: number;
  pieces: number;
  reason: string;
  operator_name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function resolveSpeciesId(db: DatabaseSync, woodSpeciesName?: string): string | null {
  if (!woodSpeciesName) return null;
  try {
    const row = db.prepare('SELECT id FROM wood_species WHERE LOWER(common_name) = LOWER(?) LIMIT 1').get(woodSpeciesName.trim()) as { id: string } | undefined;
    return row?.id ?? null;
  } catch {
    return null;
  }
}

function mapRowToSortingRecord(row: SqliteSortingRow): StockSortingRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    sortingDate: row.sorting_date,
    species: row.species,
    speciesId: row.species_id || undefined,
    sourceStorageYard: row.source_storage_yard,
    sourceKavlingNumber: row.source_kavling_number,
    targetStorageYard: row.target_storage_yard,
    targetKavlingNumber: row.target_kavling_number,
    volumeM3: Number(row.volume_m3),
    pieces: Number(row.pieces),
    reason: row.reason,
    operatorName: row.operator_name,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SortingQueries {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
    ensureSortingTables(this.db);
  }

  public getAll(tenantId = 'default-tenant'): StockSortingRecord[] {
    const stmt = this.db.prepare(
      'SELECT * FROM stock_sorting_records WHERE tenant_id = ? ORDER BY sorting_date DESC, created_at DESC'
    );
    const rows = stmt.all(tenantId) as unknown as SqliteSortingRow[];
    return rows.map(mapRowToSortingRecord);
  }

  public getById(id: string, tenantId = 'default-tenant'): StockSortingRecord | null {
    const stmt = this.db.prepare(
      'SELECT * FROM stock_sorting_records WHERE id = ? AND tenant_id = ?'
    );
    const row = stmt.get(id, tenantId) as unknown as SqliteSortingRow | undefined;
    return row ? mapRowToSortingRecord(row) : null;
  }

  public insert(
    record: Omit<StockSortingRecord, 'createdAt' | 'updatedAt'>
  ): StockSortingRecord {
    const now = new Date().toISOString();
    const tenantId = record.tenantId || 'default-tenant';
    const speciesId = record.speciesId || resolveSpeciesId(this.db, record.species);
    const stmt = this.db.prepare(`
      INSERT INTO stock_sorting_records (
        id, tenant_id, sorting_date, species, species_id,
        source_storage_yard, source_kavling_number,
        target_storage_yard, target_kavling_number,
        volume_m3, pieces, reason,
        operator_name, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      record.id,
      tenantId,
      record.sortingDate,
      record.species,
      speciesId,
      record.sourceStorageYard,
      record.sourceKavlingNumber,
      record.targetStorageYard,
      record.targetKavlingNumber,
      record.volumeM3,
      record.pieces,
      record.reason,
      record.operatorName,
      record.notes || null,
      now,
      now
    );

    return this.getById(record.id, tenantId)!;
  }

  public update(
    record: Partial<StockSortingRecord> & { id: string },
    tenantId = 'default-tenant'
  ): StockSortingRecord {
    const existing = this.getById(record.id, tenantId);
    if (!existing) throw new Error(`Sorting record ${record.id} not found`);

    const now = new Date().toISOString();
    const speciesId = record.speciesId !== undefined
      ? (record.speciesId || null)
      : (record.species ? resolveSpeciesId(this.db, record.species) : (existing.speciesId || null));

    const stmt = this.db.prepare(`
      UPDATE stock_sorting_records SET
        sorting_date = ?,
        species = ?,
        species_id = ?,
        source_storage_yard = ?,
        source_kavling_number = ?,
        target_storage_yard = ?,
        target_kavling_number = ?,
        volume_m3 = ?,
        pieces = ?,
        reason = ?,
        operator_name = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ? AND tenant_id = ?
    `);

    stmt.run(
      record.sortingDate ?? existing.sortingDate,
      record.species ?? existing.species,
      speciesId,
      record.sourceStorageYard ?? existing.sourceStorageYard,
      record.sourceKavlingNumber ?? existing.sourceKavlingNumber,
      record.targetStorageYard ?? existing.targetStorageYard,
      record.targetKavlingNumber ?? existing.targetKavlingNumber,
      record.volumeM3 ?? existing.volumeM3,
      record.pieces ?? existing.pieces,
      record.reason ?? existing.reason,
      record.operatorName ?? existing.operatorName,
      record.notes !== undefined ? (record.notes || null) : (existing.notes || null),
      now,
      record.id,
      tenantId
    );

    return this.getById(record.id, tenantId)!;
  }

  public delete(id: string, tenantId = 'default-tenant'): void {
    const stmt = this.db.prepare(
      'DELETE FROM stock_sorting_records WHERE id = ? AND tenant_id = ?'
    );
    stmt.run(id, tenantId);
  }
}
