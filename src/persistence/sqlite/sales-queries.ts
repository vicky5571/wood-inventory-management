/**
 * src/persistence/sqlite/sales-queries.ts
 *
 * SQLite relational queries and DDL for outbound wood sales records.
 * Provides parameterized queries, type mapping, and index optimizations.
 */

import type { DatabaseSync } from 'node:sqlite';
import type { WoodSalesRecord, PaymentStatus } from '../../types/index.ts';
import { SEED_WOOD_SALES } from '../seed/fixtures.ts';

export function ensureSalesTable(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wood_species (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      common_name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS storage_lots (
      id TEXT PRIMARY KEY,
      lot_code TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sales_records (
      id TEXT PRIMARY KEY,
      sale_date TEXT NOT NULL,
      delivery_order_number TEXT NOT NULL UNIQUE,
      truck_plate_number TEXT NOT NULL,
      driver_name TEXT,
      customer_name TEXT NOT NULL,
      storage_yard TEXT NOT NULL,
      kavling_number TEXT NOT NULL,
      lot_id TEXT REFERENCES storage_lots(id) ON DELETE SET NULL,
      wood_species TEXT NOT NULL,
      species_id TEXT REFERENCES wood_species(id) ON DELETE SET NULL,
      pieces INTEGER NOT NULL CHECK (pieces > 0),
      volume_m3 REAL NOT NULL CHECK (volume_m3 > 0),
      price_per_m3 REAL NOT NULL DEFAULT 0.0 CHECK (price_per_m3 >= 0),
      total_price REAL NOT NULL DEFAULT 0.0 CHECK (total_price >= 0),
      payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PARTIAL', 'PAID')),
      invoice_number TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales_records(sale_date);
    CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales_records(customer_name);
    CREATE INDEX IF NOT EXISTS idx_sales_lot ON sales_records(storage_yard, kavling_number);
  `);
}

function mapRowToSalesRecord(row: Record<string, unknown>): WoodSalesRecord {
  return {
    id: String(row.id),
    saleDate: String(row.sale_date),
    deliveryOrderNumber: String(row.delivery_order_number),
    truckPlateNumber: String(row.truck_plate_number),
    driverName: row.driver_name ? String(row.driver_name) : undefined,
    customerName: String(row.customer_name),
    storageYard: String(row.storage_yard),
    kavlingNumber: String(row.kavling_number),
    lotId: row.lot_id ? String(row.lot_id) : undefined,
    woodSpecies: String(row.wood_species),
    speciesId: row.species_id ? String(row.species_id) : undefined,
    pieces: Number(row.pieces),
    volumeM3: Number(row.volume_m3),
    pricePerM3: Number(row.price_per_m3),
    totalPrice: Number(row.total_price),
    paymentStatus: (row.payment_status as PaymentStatus) || 'UNPAID',
    invoiceNumber: row.invoice_number ? String(row.invoice_number) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
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

function resolveLotId(db: DatabaseSync, kavlingNumber?: string): string | null {
  if (!kavlingNumber) return null;
  try {
    const row = db.prepare('SELECT id FROM storage_lots WHERE LOWER(lot_code) = LOWER(?) LIMIT 1').get(kavlingNumber.trim()) as { id: string } | undefined;
    return row?.id ?? null;
  } catch {
    return null;
  }
}

export class SalesQueries {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
    ensureSalesTable(this.db);
  }

  public getAll(): WoodSalesRecord[] {
    const stmt = this.db.prepare(
      'SELECT * FROM sales_records ORDER BY sale_date DESC, created_at DESC'
    );
    const rows = stmt.all() as Record<string, unknown>[];
    return rows.map(mapRowToSalesRecord);
  }

  public getById(id: string): WoodSalesRecord | null {
    const stmt = this.db.prepare('SELECT * FROM sales_records WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    return row ? mapRowToSalesRecord(row) : null;
  }

  public insert(record: Omit<WoodSalesRecord, 'createdAt' | 'updatedAt'>): WoodSalesRecord {
    const now = new Date().toISOString();
    const speciesId = record.speciesId || resolveSpeciesId(this.db, record.woodSpecies);
    const lotId = record.lotId || resolveLotId(this.db, record.kavlingNumber);
    const stmt = this.db.prepare(`
      INSERT INTO sales_records (
        id, sale_date, delivery_order_number, truck_plate_number, driver_name,
        customer_name, storage_yard, kavling_number, lot_id, wood_species, species_id,
        pieces, volume_m3, price_per_m3, total_price, payment_status,
        invoice_number, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      record.id, record.saleDate, record.deliveryOrderNumber, record.truckPlateNumber,
      record.driverName || null, record.customerName, record.storageYard, record.kavlingNumber, lotId,
      record.woodSpecies, speciesId, record.pieces, record.volumeM3, record.pricePerM3,
      record.totalPrice, record.paymentStatus || 'UNPAID', record.invoiceNumber || null,
      record.notes || null, now, now
    );

    return this.getById(record.id)!;
  }

  public update(record: Partial<WoodSalesRecord> & { id: string }): WoodSalesRecord {
    const existing = this.getById(record.id);
    if (!existing) throw new Error(`Sales record ${record.id} not found`);

    const now = new Date().toISOString();
    const merged: WoodSalesRecord = {
      ...existing,
      ...record,
      updatedAt: now,
    };
    const speciesId = record.speciesId !== undefined ? (record.speciesId || null) : (record.woodSpecies ? resolveSpeciesId(this.db, merged.woodSpecies) : (existing.speciesId || null));
    const lotId = record.lotId !== undefined ? (record.lotId || null) : (record.kavlingNumber ? resolveLotId(this.db, merged.kavlingNumber) : (existing.lotId || null));

    const stmt = this.db.prepare(`
      UPDATE sales_records SET
        sale_date = ?, delivery_order_number = ?, truck_plate_number = ?, driver_name = ?,
        customer_name = ?, storage_yard = ?, kavling_number = ?, lot_id = ?, wood_species = ?, species_id = ?,
        pieces = ?, volume_m3 = ?, price_per_m3 = ?, total_price = ?, payment_status = ?,
        invoice_number = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      merged.saleDate, merged.deliveryOrderNumber, merged.truckPlateNumber, merged.driverName || null,
      merged.customerName, merged.storageYard, merged.kavlingNumber, lotId, merged.woodSpecies, speciesId,
      merged.pieces, merged.volumeM3, merged.pricePerM3, merged.totalPrice, merged.paymentStatus,
      merged.invoiceNumber || null, merged.notes || null, now, merged.id
    );

    return this.getById(record.id)!;
  }

  public delete(id: string): void {
    const stmt = this.db.prepare('DELETE FROM sales_records WHERE id = ?');
    stmt.run(id);
  }

  public deleteAll(): void {
    this.db.exec('DELETE FROM sales_records;');
  }
}

export function seedSalesIfEmpty(db: DatabaseSync, seedData: readonly WoodSalesRecord[] = SEED_WOOD_SALES): void {
  ensureSalesTable(db);
  const row = db.prepare('SELECT COUNT(*) AS c FROM sales_records;').get() as { c: number } | undefined;
  if (row && row.c > 0) return;

  const stmt = db.prepare(`
    INSERT INTO sales_records (
      id, sale_date, delivery_order_number, truck_plate_number, driver_name,
      customer_name, storage_yard, kavling_number, wood_species, species_id,
      pieces, volume_m3, price_per_m3, total_price, payment_status,
      invoice_number, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const s of seedData) {
    const speciesId = s.speciesId || resolveSpeciesId(db, s.woodSpecies);
    stmt.run(
      s.id, s.saleDate, s.deliveryOrderNumber, s.truckPlateNumber, s.driverName || null,
      s.customerName, s.storageYard, s.kavlingNumber, s.woodSpecies, speciesId,
      s.pieces, s.volumeM3, s.pricePerM3, s.totalPrice, s.paymentStatus || 'UNPAID',
      s.invoiceNumber || null, s.notes || null, s.createdAt || new Date().toISOString(),
      s.updatedAt || new Date().toISOString()
    );
  }
}
