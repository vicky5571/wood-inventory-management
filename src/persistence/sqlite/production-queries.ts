/**
 * src/persistence/sqlite/production-queries.ts
 *
 * SQLite relational queries and DDL for sawmill production records.
 */

import type { DatabaseSync } from 'node:sqlite';
import type { SawmillProductionRecord, ProductionShift } from '../../types/index.ts';
import { computeProductionYield } from '../../utils/production-calc.ts';

export function ensureProductionTables(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sawmill_production_records (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT 'default-tenant' REFERENCES tenants(id) ON DELETE CASCADE,
      production_date TEXT NOT NULL,
      shift TEXT CHECK (shift IS NULL OR shift IN ('PAGI','SIANG','MALAM')),
      source_storage_yard TEXT NOT NULL,
      source_kavling_number TEXT NOT NULL,
      input_species TEXT NOT NULL,
      input_volume_m3 REAL NOT NULL CHECK (input_volume_m3 > 0),
      input_pieces INTEGER NOT NULL CHECK (input_pieces > 0),
      output_product TEXT NOT NULL,
      output_volume_m3 REAL NOT NULL CHECK (output_volume_m3 >= 0),
      output_pieces INTEGER NOT NULL CHECK (output_pieces >= 0),
      operator_name TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_production_tenant_date ON sawmill_production_records(tenant_id, production_date);
    CREATE INDEX IF NOT EXISTS idx_production_source_lot ON sawmill_production_records(tenant_id, source_storage_yard, source_kavling_number);
  `);
}

interface SqliteProductionRow {
  id: string;
  tenant_id: string;
  production_date: string;
  shift: string | null;
  source_storage_yard: string;
  source_kavling_number: string;
  input_species: string;
  input_volume_m3: number;
  input_pieces: number;
  output_product: string;
  output_volume_m3: number;
  output_pieces: number;
  operator_name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToProductionRecord(row: SqliteProductionRow): SawmillProductionRecord {
  const { yieldPercent, wasteVolumeM3 } = computeProductionYield(
    Number(row.input_volume_m3),
    Number(row.output_volume_m3)
  );

  return {
    id: row.id,
    tenantId: row.tenant_id,
    productionDate: row.production_date,
    shift: (row.shift as ProductionShift) || undefined,
    sourceStorageYard: row.source_storage_yard,
    sourceKavlingNumber: row.source_kavling_number,
    inputSpecies: row.input_species,
    inputVolumeM3: Number(row.input_volume_m3),
    inputPieces: Number(row.input_pieces),
    outputProduct: row.output_product,
    outputVolumeM3: Number(row.output_volume_m3),
    outputPieces: Number(row.output_pieces),
    yieldPercent,
    wasteVolumeM3,
    operatorName: row.operator_name,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ProductionQueries {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
    ensureProductionTables(this.db);
  }

  public getAll(tenantId = 'default-tenant'): SawmillProductionRecord[] {
    const stmt = this.db.prepare(
      'SELECT * FROM sawmill_production_records WHERE tenant_id = ? ORDER BY production_date DESC, created_at DESC'
    );
    const rows = stmt.all(tenantId) as unknown as SqliteProductionRow[];
    return rows.map(mapRowToProductionRecord);
  }

  public getById(id: string, tenantId = 'default-tenant'): SawmillProductionRecord | null {
    const stmt = this.db.prepare(
      'SELECT * FROM sawmill_production_records WHERE id = ? AND tenant_id = ?'
    );
    const row = stmt.get(id, tenantId) as unknown as SqliteProductionRow | undefined;
    return row ? mapRowToProductionRecord(row) : null;
  }

  public insert(
    record: Omit<SawmillProductionRecord, 'yieldPercent' | 'wasteVolumeM3' | 'createdAt' | 'updatedAt'>
  ): SawmillProductionRecord {
    const now = new Date().toISOString();
    const tenantId = record.tenantId || 'default-tenant';
    const stmt = this.db.prepare(`
      INSERT INTO sawmill_production_records (
        id, tenant_id, production_date, shift,
        source_storage_yard, source_kavling_number,
        input_species, input_volume_m3, input_pieces,
        output_product, output_volume_m3, output_pieces,
        operator_name, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      record.id,
      tenantId,
      record.productionDate,
      record.shift || null,
      record.sourceStorageYard,
      record.sourceKavlingNumber,
      record.inputSpecies,
      record.inputVolumeM3,
      record.inputPieces,
      record.outputProduct,
      record.outputVolumeM3,
      record.outputPieces,
      record.operatorName,
      record.notes || null,
      now,
      now
    );

    return this.getById(record.id, tenantId)!;
  }

  public update(
    record: Partial<SawmillProductionRecord> & { id: string },
    tenantId = 'default-tenant'
  ): SawmillProductionRecord {
    const existing = this.getById(record.id, tenantId);
    if (!existing) throw new Error(`Production record ${record.id} not found`);

    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE sawmill_production_records SET
        production_date = ?,
        shift = ?,
        source_storage_yard = ?,
        source_kavling_number = ?,
        input_species = ?,
        input_volume_m3 = ?,
        input_pieces = ?,
        output_product = ?,
        output_volume_m3 = ?,
        output_pieces = ?,
        operator_name = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ? AND tenant_id = ?
    `);

    stmt.run(
      record.productionDate ?? existing.productionDate,
      record.shift !== undefined ? (record.shift || null) : (existing.shift || null),
      record.sourceStorageYard ?? existing.sourceStorageYard,
      record.sourceKavlingNumber ?? existing.sourceKavlingNumber,
      record.inputSpecies ?? existing.inputSpecies,
      record.inputVolumeM3 ?? existing.inputVolumeM3,
      record.inputPieces ?? existing.inputPieces,
      record.outputProduct ?? existing.outputProduct,
      record.outputVolumeM3 ?? existing.outputVolumeM3,
      record.outputPieces ?? existing.outputPieces,
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
      'DELETE FROM sawmill_production_records WHERE id = ? AND tenant_id = ?'
    );
    stmt.run(id, tenantId);
  }
}
