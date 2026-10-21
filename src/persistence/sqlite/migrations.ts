import type { DatabaseSync } from 'node:sqlite';
import { SQLITE_VIEWS_DDL } from './views-ddl.ts';
import { ensureContractTables } from './contract-queries.ts';

export function runMigrations(db: DatabaseSync): void {
  db.exec('PRAGMA foreign_keys = ON;');
  ensureContractTables(db);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wood_species (
      id TEXT PRIMARY KEY,
      tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
      code TEXT NOT NULL UNIQUE,
      common_name TEXT NOT NULL,
      botanical_name TEXT,
      density_kg_m3 REAL NOT NULL DEFAULT 650.0,
      is_hardwood INTEGER NOT NULL DEFAULT 1 CHECK (is_hardwood IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_species_name ON wood_species(common_name);

    CREATE TABLE IF NOT EXISTS storage_yards (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      yard_code TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, yard_code)
    );

    CREATE TABLE IF NOT EXISTS storage_lots (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      yard_id TEXT NOT NULL REFERENCES storage_yards(id) ON DELETE CASCADE,
      lot_code TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FULL', 'MAINTENANCE')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, yard_id, lot_code)
    );
    CREATE INDEX IF NOT EXISTS idx_storage_lots_code ON storage_lots(tenant_id, lot_code);

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      tax_id_npwp TEXT,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, code)
    );
    CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(tenant_id, name);

    CREATE TABLE IF NOT EXISTS receiving_manifests (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      manifest_number TEXT NOT NULL,
      receipt_date TEXT NOT NULL,
      doc_date TEXT,
      truck_plate_number TEXT NOT NULL,
      forestry_doc_number TEXT NOT NULL,
      receipt_number TEXT NOT NULL,
      contract_number TEXT NOT NULL,
      supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
      freight_rate_per_m3 REAL NOT NULL DEFAULT 0.0 CHECK (freight_rate_per_m3 >= 0),
      freight_pph_rate REAL NOT NULL DEFAULT 2.0 CHECK (freight_pph_rate >= 0),
      broker_fee REAL NOT NULL DEFAULT 0.0 CHECK (broker_fee >= 0),
      payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PARTIAL', 'PAID')),
      invoice_number TEXT,
      payment_date TEXT,
      payment_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, manifest_number)
    );
    CREATE INDEX IF NOT EXISTS idx_manifests_date ON receiving_manifests(tenant_id, receipt_date);
    CREATE INDEX IF NOT EXISTS idx_manifests_truck ON receiving_manifests(tenant_id, truck_plate_number);
    CREATE INDEX IF NOT EXISTS idx_manifests_invoice ON receiving_manifests(tenant_id, invoice_number);
    CREATE INDEX IF NOT EXISTS idx_manifests_supplier ON receiving_manifests(supplier_id);

    CREATE TABLE IF NOT EXISTS receiving_items (
      id TEXT PRIMARY KEY,
      manifest_id TEXT NOT NULL REFERENCES receiving_manifests(id) ON DELETE CASCADE,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      item_sequence INTEGER NOT NULL DEFAULT 1,
      species_id TEXT NOT NULL REFERENCES wood_species(id) ON DELETE RESTRICT,
      lot_id TEXT REFERENCES storage_lots(id) ON DELETE SET NULL,
      wood_length_m REAL NOT NULL CHECK (wood_length_m > 0),
      delivered_pieces INTEGER NOT NULL CHECK (delivered_pieces >= 0),
      delivered_volume_m3 REAL NOT NULL CHECK (delivered_volume_m3 >= 0),
      tally_pieces INTEGER NOT NULL CHECK (tally_pieces >= 0),
      tally_volume_m3 REAL NOT NULL CHECK (tally_volume_m3 >= 0),
      timber_price_per_m3 REAL NOT NULL DEFAULT 0.0 CHECK (timber_price_per_m3 >= 0),
      timber_pph_rate REAL NOT NULL DEFAULT 0.5 CHECK (timber_pph_rate >= 0),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_items_manifest ON receiving_items(manifest_id);
    CREATE INDEX IF NOT EXISTS idx_items_species ON receiving_items(species_id);
    CREATE INDEX IF NOT EXISTS idx_items_lot ON receiving_items(lot_id);

    CREATE TABLE IF NOT EXISTS app_settings (
      tenant_id TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
      default_timber_pph_rate REAL NOT NULL DEFAULT 0.5 CHECK (default_timber_pph_rate >= 0),
      default_freight_pph_rate REAL NOT NULL DEFAULT 2.0 CHECK (default_freight_pph_rate >= 0),
      default_broker_fee REAL NOT NULL DEFAULT 250000 CHECK (default_broker_fee >= 0),
      acceptable_discrepancy_threshold_pct REAL NOT NULL DEFAULT 2.0 CHECK (acceptable_discrepancy_threshold_pct >= 0),
      yard_name TEXT NOT NULL DEFAULT 'TPK-01 Utama (Central Yard)',
      yard_code TEXT NOT NULL DEFAULT 'TPK-01',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
      action TEXT NOT NULL,
      entity_id TEXT,
      entity_summary TEXT NOT NULL,
      operator_name TEXT NOT NULL,
      operator_role TEXT NOT NULL,
      metadata_json TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(tenant_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(tenant_id, action);
  `);

  db.exec(SQLITE_VIEWS_DDL);
}
