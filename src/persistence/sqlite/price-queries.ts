/**
 * src/persistence/sqlite/price-queries.ts
 * SQLite CRUD for TimberPriceEntry
 */
import type { DatabaseSync } from 'node:sqlite';
import type { TimberPriceEntry } from '../../types/index.ts';

interface SqlitePriceRow {
  id: string;
  tenant_id: string;
  wood_species: string;
  supplier_id: string | null;
  supplier_name: string | null;
  effective_from: string;
  effective_to: string | null;
  price_per_m3: number;
  timber_pph_rate: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: SqlitePriceRow): TimberPriceEntry {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    woodSpecies: row.wood_species,
    supplierId: row.supplier_id || undefined,
    supplierName: row.supplier_name || undefined,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to || undefined,
    pricePerM3: row.price_per_m3,
    timberPphRate: row.timber_pph_rate,
    notes: row.notes || undefined,
    createdBy: row.created_by || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function ensurePriceTables(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS timber_price_entries (
      id               TEXT PRIMARY KEY,
      tenant_id        TEXT NOT NULL DEFAULT 'default-tenant',
      wood_species     TEXT NOT NULL,
      supplier_id      TEXT,
      supplier_name    TEXT,
      effective_from   TEXT NOT NULL,
      effective_to     TEXT,
      price_per_m3     REAL NOT NULL CHECK (price_per_m3 >= 0),
      timber_pph_rate  REAL NOT NULL DEFAULT 0.5,
      notes            TEXT,
      created_by       TEXT,
      created_at       TEXT NOT NULL,
      updated_at       TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tpe_species_date ON timber_price_entries(wood_species, effective_from);
    CREATE INDEX IF NOT EXISTS idx_tpe_supplier ON timber_price_entries(supplier_id);
  `);
}

export function getAllPriceEntriesFromDb(db: DatabaseSync): TimberPriceEntry[] {
  ensurePriceTables(db);
  const rows = db.prepare(
    `SELECT * FROM timber_price_entries ORDER BY wood_species ASC, effective_from DESC;`
  ).all() as unknown as SqlitePriceRow[];
  return rows.map(mapRow);
}

export function savePriceEntryToDb(
  db: DatabaseSync,
  entry: Omit<TimberPriceEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): TimberPriceEntry {
  ensurePriceTables(db);
  const now = new Date().toISOString();
  const id = entry.id ?? `tpe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  db.prepare(`
    INSERT INTO timber_price_entries
      (id, tenant_id, wood_species, supplier_id, supplier_name,
       effective_from, effective_to, price_per_m3, timber_pph_rate,
       notes, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      wood_species    = excluded.wood_species,
      supplier_id     = excluded.supplier_id,
      supplier_name   = excluded.supplier_name,
      effective_from  = excluded.effective_from,
      effective_to    = excluded.effective_to,
      price_per_m3    = excluded.price_per_m3,
      timber_pph_rate = excluded.timber_pph_rate,
      notes           = excluded.notes,
      updated_at      = excluded.updated_at;
  `).run(
    id,
    entry.tenantId ?? 'default-tenant',
    entry.woodSpecies.trim(),
    entry.supplierId ? entry.supplierId.trim() : null,
    entry.supplierName ? entry.supplierName.trim() : null,
    entry.effectiveFrom,
    entry.effectiveTo ? entry.effectiveTo.trim() : null,
    entry.pricePerM3,
    entry.timberPphRate ?? 0.5,
    entry.notes ? entry.notes.trim() : null,
    entry.createdBy ? entry.createdBy.trim() : null,
    now,
    now
  );
  return { ...entry, id, createdAt: now, updatedAt: now } as TimberPriceEntry;
}

export function deletePriceEntryFromDb(db: DatabaseSync, id: string): void {
  ensurePriceTables(db);
  // Guard: check if any receiving items or locked records reference this price
  const row = db.prepare(`SELECT COUNT(*) AS cnt FROM receiving_items WHERE price_entry_id = ?;`).get(id) as { cnt: number } | undefined;
  if (row && row.cnt > 0) {
    throw new Error('Harga ini sudah digunakan dalam penerimaan kayu dan tidak dapat dihapus');
  }
  db.prepare(`DELETE FROM timber_price_entries WHERE id = ?;`).run(id);
}

export function lookupPriceEntryFromDb(
  db: DatabaseSync,
  woodSpecies: string,
  supplierId: string | undefined,
  receiptDate: string
): TimberPriceEntry | null {
  ensurePriceTables(db);
  const base = `
    FROM timber_price_entries
    WHERE LOWER(wood_species) = LOWER(?)
      AND effective_from <= ?
      AND (effective_to IS NULL OR effective_to >= ?)
  `;
  if (supplierId) {
    const row = db.prepare(
      `SELECT * ${base} AND supplier_id = ? ORDER BY effective_from DESC LIMIT 1;`
    ).get(woodSpecies, receiptDate, receiptDate, supplierId) as unknown as SqlitePriceRow | undefined;
    if (row) return mapRow(row);
  }
  const row = db.prepare(
    `SELECT * ${base} AND supplier_id IS NULL ORDER BY effective_from DESC LIMIT 1;`
  ).get(woodSpecies, receiptDate, receiptDate) as unknown as SqlitePriceRow | undefined;
  return row ? mapRow(row) : null;
}
