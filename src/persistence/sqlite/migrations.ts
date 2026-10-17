import type { DatabaseSync } from 'node:sqlite';

export function runMigrations(db: DatabaseSync): void {
  db.exec('PRAGMA foreign_keys = ON;');

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

    CREATE VIEW IF NOT EXISTS v_receiving_item_financials AS
    SELECT
      i.id AS item_id,
      i.manifest_id,
      i.tenant_id,
      i.item_sequence,
      i.species_id,
      s.common_name AS species_name,
      i.lot_id,
      l.lot_code AS kavling_number,
      y.name AS storage_yard,
      i.wood_length_m,
      i.delivered_pieces,
      i.delivered_volume_m3,
      i.tally_pieces,
      i.tally_volume_m3,
      (i.tally_pieces - i.delivered_pieces) AS piece_discrepancy,
      ROUND(i.tally_volume_m3 - i.delivered_volume_m3, 4) AS volume_discrepancy_m3,
      i.timber_price_per_m3,
      ROUND(i.tally_volume_m3 * i.timber_price_per_m3, 2) AS timber_gross_total,
      i.timber_pph_rate,
      ROUND((i.tally_volume_m3 * i.timber_price_per_m3) * (i.timber_pph_rate / 100.0), 2) AS timber_pph_amount,
      ROUND((i.tally_volume_m3 * i.timber_price_per_m3) - ((i.tally_volume_m3 * i.timber_price_per_m3) * (i.timber_pph_rate / 100.0)), 2) AS timber_net_payable
    FROM receiving_items i
    JOIN wood_species s ON i.species_id = s.id
    LEFT JOIN storage_lots l ON i.lot_id = l.id
    LEFT JOIN storage_yards y ON l.yard_id = y.id;

    CREATE VIEW IF NOT EXISTS v_receiving_manifest_summaries AS
    SELECT
      m.id AS manifest_id,
      m.tenant_id,
      m.manifest_number,
      m.receipt_date,
      m.doc_date,
      m.truck_plate_number,
      m.forestry_doc_number,
      m.receipt_number,
      m.contract_number,
      m.supplier_id,
      sup.name AS supplier_name,
      COUNT(i.id) AS total_line_items,
      COALESCE(SUM(i.delivered_pieces), 0) AS total_delivered_pieces,
      COALESCE(ROUND(SUM(i.delivered_volume_m3), 4), 0.0) AS total_delivered_volume_m3,
      COALESCE(SUM(i.tally_pieces), 0) AS total_tally_pieces,
      COALESCE(ROUND(SUM(i.tally_volume_m3), 4), 0.0) AS total_tally_volume_m3,
      COALESCE(SUM(f.timber_gross_total), 0.0) AS total_timber_gross,
      COALESCE(SUM(f.timber_pph_amount), 0.0) AS total_timber_pph,
      COALESCE(SUM(f.timber_net_payable), 0.0) AS total_timber_net,
      m.freight_rate_per_m3,
      ROUND(COALESCE(SUM(i.tally_volume_m3), 0.0) * m.freight_rate_per_m3, 2) AS freight_gross_total,
      m.freight_pph_rate,
      ROUND((COALESCE(SUM(i.tally_volume_m3), 0.0) * m.freight_rate_per_m3) * (m.freight_pph_rate / 100.0), 2) AS freight_pph_amount,
      ROUND((COALESCE(SUM(i.tally_volume_m3), 0.0) * m.freight_rate_per_m3) - ((COALESCE(SUM(i.tally_volume_m3), 0.0) * m.freight_rate_per_m3) * (m.freight_pph_rate / 100.0)), 2) AS freight_net_payable,
      m.broker_fee,
      ROUND(COALESCE(SUM(f.timber_net_payable), 0.0) + ((COALESCE(SUM(i.tally_volume_m3), 0.0) * m.freight_rate_per_m3) - ((COALESCE(SUM(i.tally_volume_m3), 0.0) * m.freight_rate_per_m3) * (m.freight_pph_rate / 100.0))) + m.broker_fee, 2) AS grand_net_payable,
      m.payment_status,
      m.invoice_number,
      m.payment_date,
      m.payment_notes,
      m.created_at,
      m.updated_at
    FROM receiving_manifests m
    JOIN suppliers sup ON m.supplier_id = sup.id
    LEFT JOIN receiving_items i ON m.id = i.manifest_id
    LEFT JOIN v_receiving_item_financials f ON i.id = f.item_id
    GROUP BY m.id;

    CREATE VIEW IF NOT EXISTS v_buku_besar_flat AS
    SELECT
      CASE 
        WHEN (SELECT COUNT(*) FROM receiving_items ri WHERE ri.manifest_id = m.id) = 1 
        THEN m.id 
        ELSE m.id || '_' || i.id 
      END AS id,
      m.id AS manifest_id,
      i.id AS item_id,
      m.tenant_id,
      m.receipt_date AS receiptDate,
      m.doc_date AS docDate,
      m.truck_plate_number AS truckPlateNumber,
      m.forestry_doc_number AS forestryDocNumber,
      m.receipt_number AS receiptNumber,
      m.contract_number AS contractNumber,
      sup.name AS supplierName,
      f.species_name AS woodSpecies,
      i.wood_length_m AS woodLengthM,
      COALESCE(f.kavling_number, '') AS kavlingNumber,
      COALESCE(f.storage_yard, '') AS storageYard,
      i.delivered_pieces AS deliveredPieces,
      i.delivered_volume_m3 AS deliveredVolumeM3,
      i.tally_pieces AS tallyPieces,
      i.tally_volume_m3 AS tallyVolumeM3,
      i.timber_price_per_m3 AS timberPricePerM3,
      f.timber_gross_total AS timberGrossTotal,
      i.timber_pph_rate AS timberPphRate,
      f.timber_pph_amount AS timberPphAmount,
      f.timber_net_payable AS timberNetPayable,
      m.freight_rate_per_m3 AS freightRatePerM3,
      ROUND(i.tally_volume_m3 * m.freight_rate_per_m3, 2) AS freightGrossTotal,
      ROUND((i.tally_volume_m3 * m.freight_rate_per_m3) * (m.freight_pph_rate / 100.0), 2) AS freightPphAmount,
      ROUND((i.tally_volume_m3 * m.freight_rate_per_m3) - ((i.tally_volume_m3 * m.freight_rate_per_m3) * (m.freight_pph_rate / 100.0)), 2) AS freightNetPayable,
      m.broker_fee AS brokerFee,
      ROUND(f.timber_net_payable + ((i.tally_volume_m3 * m.freight_rate_per_m3) - ((i.tally_volume_m3 * m.freight_rate_per_m3) * (m.freight_pph_rate / 100.0))) + m.broker_fee, 2) AS grandNetPayable,
      m.payment_status AS paymentStatus,
      m.invoice_number AS invoiceNumber,
      m.payment_date AS paymentDate,
      m.payment_notes AS paymentNotes,
      m.created_at AS createdAt,
      m.updated_at AS updatedAt
    FROM receiving_manifests m
    JOIN suppliers sup ON m.supplier_id = sup.id
    JOIN receiving_items i ON m.id = i.manifest_id
    JOIN v_receiving_item_financials f ON i.id = f.item_id;
  `);
}
