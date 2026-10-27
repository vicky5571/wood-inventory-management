/**
 * src/persistence/sqlite/migrations-phase2.ts
 *
 * Phase 2 Architectural & Relational Schema Migrations (DB Fix 01-07).
 * Keeps migrations.ts strictly under the 250 LOC threshold.
 */
import type { DatabaseSync } from 'node:sqlite';
import { SQLITE_VIEWS_DDL } from './views-ddl.ts';

export function runPhase2Migrations(db: DatabaseSync): void {
  migrateTimberPriceEntries(db);
  migrateReceivingManifestsContractFk(db);
  migrateSpeciesFkToTables(db);
  migrateLotFkToTables(db);
  rebuildViewsIfOutdated(db);
}

function migrateTimberPriceEntries(db: DatabaseSync): void {
  const tableCheck = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='timber_price_entries';`).get() as { name: string } | undefined;
  if (!tableCheck) return;

  const tpeColumns = (db.prepare(`PRAGMA table_info(timber_price_entries);`).all() as { name: string }[]).map((c) => c.name);

  if (!tpeColumns.includes('species_id')) {
    db.exec(`ALTER TABLE timber_price_entries RENAME TO timber_price_entries_old;`);

    db.exec(`
      CREATE TABLE timber_price_entries (
        id                TEXT PRIMARY KEY,
        tenant_id         TEXT NOT NULL DEFAULT 'default-tenant'
                            REFERENCES tenants(id) ON DELETE CASCADE,
        species_id        TEXT NOT NULL REFERENCES wood_species(id) ON DELETE RESTRICT,
        wood_species_name TEXT NOT NULL,
        supplier_id       TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
        supplier_name     TEXT,
        effective_from    TEXT NOT NULL,
        effective_to      TEXT,
        price_per_m3      REAL NOT NULL CHECK (price_per_m3 >= 0),
        timber_pph_rate   REAL NOT NULL DEFAULT 0.5,
        notes             TEXT,
        created_by        TEXT,
        created_at        TEXT NOT NULL,
        updated_at        TEXT NOT NULL
      );
    `);

    db.exec(`
      INSERT INTO timber_price_entries (
        id, tenant_id, species_id, wood_species_name, supplier_id, supplier_name,
        effective_from, effective_to, price_per_m3, timber_pph_rate, notes,
        created_by, created_at, updated_at
      )
      SELECT
        o.id,
        o.tenant_id,
        COALESCE(
          (SELECT s.id FROM wood_species s WHERE LOWER(s.common_name) = LOWER(o.wood_species) LIMIT 1),
          (SELECT s.id FROM wood_species s WHERE LOWER(o.wood_species) LIKE '%' || LOWER(s.code) || '%' LIMIT 1),
          (SELECT s.id FROM wood_species s WHERE LOWER(s.common_name) LIKE '%' || LOWER(o.wood_species) || '%' LIMIT 1),
          'UNKNOWN'
        ) AS species_id,
        o.wood_species AS wood_species_name,
        o.supplier_id,
        o.supplier_name,
        o.effective_from,
        o.effective_to,
        o.price_per_m3,
        o.timber_pph_rate,
        o.notes,
        o.created_by,
        o.created_at,
        o.updated_at
      FROM timber_price_entries_old o;
    `);

    db.exec(`DROP TABLE timber_price_entries_old;`);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tpe_species_date ON timber_price_entries(species_id, effective_from);
      CREATE INDEX IF NOT EXISTS idx_tpe_supplier ON timber_price_entries(supplier_id);
    `);
  }
}

function migrateReceivingManifestsContractFk(db: DatabaseSync): void {
  const tableCheck = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='receiving_manifests';`).get() as { name: string } | undefined;
  if (!tableCheck) return;

  const rmCols = (db.prepare(`PRAGMA table_info(receiving_manifests);`).all() as { name: string }[]).map((c) => c.name);
  if (!rmCols.includes('contract_id')) {
    db.exec(`
      ALTER TABLE receiving_manifests
      ADD COLUMN contract_id TEXT REFERENCES perhutani_contracts(id) ON DELETE SET NULL;
    `);

    db.prepare(`
      UPDATE receiving_manifests
      SET contract_id = (
        SELECT id FROM perhutani_contracts
        WHERE LOWER(contract_number) = LOWER(receiving_manifests.contract_number)
        LIMIT 1
      )
      WHERE contract_number IS NOT NULL AND contract_number != '' AND contract_number != '-';
    `).run();

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_rm_contract_id
      ON receiving_manifests(contract_id);
    `);
  }
}

function migrateSpeciesFkToTables(db: DatabaseSync): void {
  const tablesToMigrate = [
    { table: 'sales_records', col: 'wood_species' },
    { table: 'contract_sortiment_items', col: 'wood_species' },
    { table: 'sawmill_production_records', col: 'input_species' },
    { table: 'stock_sorting_records', col: 'species' },
    { table: 'payment_forms', col: 'wood_species' },
  ];

  for (const { table, col } of tablesToMigrate) {
    const tableCheck = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?;`).get(table) as { name: string } | undefined;
    if (!tableCheck) continue;

    const cols = (db.prepare(`PRAGMA table_info(${table});`).all() as { name: string }[]).map((c) => c.name);
    if (!cols.includes('species_id')) {
      db.exec(`
        ALTER TABLE ${table}
        ADD COLUMN species_id TEXT REFERENCES wood_species(id) ON DELETE SET NULL;
      `);

      db.prepare(`
        UPDATE ${table}
        SET species_id = (
          SELECT id FROM wood_species
          WHERE LOWER(common_name) = LOWER(${table}.${col})
             OR LOWER(${col}) LIKE '%' || LOWER(code) || '%'
             OR LOWER(common_name) LIKE '%' || LOWER(${table}.${col}) || '%'
          LIMIT 1
        )
        WHERE species_id IS NULL AND ${col} IS NOT NULL AND ${col} != '';
      `).run();

      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_${table}_species
        ON ${table}(species_id);
      `);
    }
  }
}

function migrateLotFkToTables(db: DatabaseSync): void {
  const lotMigrations = [
    { table: 'sales_records', newCol: 'lot_id', srcCol: 'kavling_number' },
    { table: 'sawmill_production_records', newCol: 'source_lot_id', srcCol: 'source_kavling_number' },
    { table: 'stock_sorting_records', newCol: 'source_lot_id', srcCol: 'source_kavling_number' },
    { table: 'stock_sorting_records', newCol: 'target_lot_id', srcCol: 'target_kavling_number' },
  ];

  for (const { table, newCol, srcCol } of lotMigrations) {
    const tableCheck = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?;`).get(table) as { name: string } | undefined;
    if (!tableCheck) continue;

    const cols = (db.prepare(`PRAGMA table_info(${table});`).all() as { name: string }[]).map((c) => c.name);
    if (!cols.includes(newCol)) {
      db.exec(`
        ALTER TABLE ${table}
        ADD COLUMN ${newCol} TEXT REFERENCES storage_lots(id) ON DELETE SET NULL;
      `);

      db.prepare(`
        UPDATE ${table}
        SET ${newCol} = (
          SELECT id FROM storage_lots
          WHERE LOWER(lot_code) = LOWER(${table}.${srcCol})
          LIMIT 1
        )
        WHERE ${newCol} IS NULL AND ${srcCol} IS NOT NULL AND ${srcCol} != '';
      `).run();

      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_${table}_${newCol}
        ON ${table}(${newCol});
      `);
    }
  }
}

function rebuildViewsIfOutdated(db: DatabaseSync): void {
  const viewCheck = db.prepare(`SELECT name FROM sqlite_master WHERE type='view' AND name='v_buku_besar_flat';`).get() as { name: string } | undefined;
  if (!viewCheck) {
    db.exec(SQLITE_VIEWS_DDL);
    return;
  }
  const vCols = (db.prepare(`PRAGMA table_info(v_buku_besar_flat);`).all() as { name: string }[]).map((c) => c.name);
  if (!vCols.includes('speciesId') || !vCols.includes('contractId') || !vCols.includes('brokerName')) {
    db.exec(SQLITE_VIEWS_DDL);
  }
}
