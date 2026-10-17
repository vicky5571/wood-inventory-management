import test from 'node:test';
import assert from 'node:assert/strict';
import { createSqliteDatabase } from '../src/persistence/sqlite/db.ts';
import { runMigrations } from '../src/persistence/sqlite/migrations.ts';

test('SQLite Migrations Suite', async (t) => {
  await t.test('creates all master tables, operational tables, and views idempotently', () => {
    const db = createSqliteDatabase(':memory:');
    try {
      // Run once
      runMigrations(db);
      // Run twice (idempotence verification)
      runMigrations(db);

      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
      ).all() as Array<{ name: string }>;
      const tableNames = tables.map((t) => t.name);

      assert.ok(tableNames.includes('tenants'), 'must create tenants table');
      assert.ok(tableNames.includes('wood_species'), 'must create wood_species table');
      assert.ok(tableNames.includes('storage_yards'), 'must create storage_yards table');
      assert.ok(tableNames.includes('storage_lots'), 'must create storage_lots table');
      assert.ok(tableNames.includes('suppliers'), 'must create suppliers table');
      assert.ok(tableNames.includes('receiving_manifests'), 'must create receiving_manifests table');
      assert.ok(tableNames.includes('receiving_items'), 'must create receiving_items table');

      const views = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='view' ORDER BY name;"
      ).all() as Array<{ name: string }>;
      const viewNames = views.map((v) => v.name);

      assert.ok(viewNames.includes('v_receiving_item_financials'), 'must create v_receiving_item_financials view');
      assert.ok(viewNames.includes('v_receiving_manifest_summaries'), 'must create v_receiving_manifest_summaries view');
      assert.ok(viewNames.includes('v_buku_besar_flat'), 'must create v_buku_besar_flat view');
    } finally {
      db.close();
    }
  });

  await t.test('enforces foreign key constraints strictly', () => {
    const db = createSqliteDatabase(':memory:');
    try {
      runMigrations(db);

      // Attempting to insert a receiving manifest with nonexistent supplier must throw FK constraint error
      assert.throws(() => {
        db.prepare(`
          INSERT INTO receiving_manifests (
            id, tenant_id, manifest_number, receipt_date, truck_plate_number,
            forestry_doc_number, receipt_number, contract_number, supplier_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          'm-1', 'tenant-1', 'MAN-01', '2026-10-18', 'B 1234 CD',
          'DOC-01', 'KW-01', 'CTR-01', 'nonexistent-supplier'
        );
      }, /FOREIGN KEY constraint failed/);
    } finally {
      db.close();
    }
  });

  await t.test('enforces CHECK constraints on operational fields', () => {
    const db = createSqliteDatabase(':memory:');
    try {
      runMigrations(db);

      db.prepare("INSERT INTO tenants (id, name, slug) VALUES ('t1', 'Tenant 1', 't1')").run();
      db.prepare("INSERT INTO wood_species (id, tenant_id, code, common_name) VALUES ('sp1', 't1', 'JTI', 'Jati')").run();
      db.prepare("INSERT INTO suppliers (id, tenant_id, code, name) VALUES ('s1', 't1', 'SUP-1', 'Supplier 1')").run();
      db.prepare(`
        INSERT INTO receiving_manifests (
          id, tenant_id, manifest_number, receipt_date, truck_plate_number,
          forestry_doc_number, receipt_number, contract_number, supplier_id
        ) VALUES ('m1', 't1', 'MAN-1', '2026-10-18', 'B 1234 CD', 'DOC-1', 'KW-1', 'CTR-1', 's1')
      `).run();

      // Negative pieces check failure
      assert.throws(() => {
        db.prepare(`
          INSERT INTO receiving_items (
            id, manifest_id, tenant_id, species_id, wood_length_m,
            delivered_pieces, delivered_volume_m3, tally_pieces, tally_volume_m3
          ) VALUES ('item-bad', 'm1', 't1', 'sp1', 4.0, -1, 1.5, 10, 1.5)
        `).run();
      }, /CHECK constraint failed/);

      // Zero or negative length check failure
      assert.throws(() => {
        db.prepare(`
          INSERT INTO receiving_items (
            id, manifest_id, tenant_id, species_id, wood_length_m,
            delivered_pieces, delivered_volume_m3, tally_pieces, tally_volume_m3
          ) VALUES ('item-bad2', 'm1', 't1', 'sp1', 0.0, 10, 1.5, 10, 1.5)
        `).run();
      }, /CHECK constraint failed/);
    } finally {
      db.close();
    }
  });

  await t.test('calculates accurate financials across dynamic views', () => {
    const db = createSqliteDatabase(':memory:');
    try {
      runMigrations(db);

      // Seed tenant, yard, lot, supplier, species
      db.prepare("INSERT INTO tenants (id, name, slug) VALUES ('t1', 'Main Tenant', 'main')").run();
      db.prepare("INSERT INTO storage_yards (id, tenant_id, yard_code, name) VALUES ('y1', 't1', 'Y-NORTH', 'North Yard')").run();
      db.prepare("INSERT INTO storage_lots (id, tenant_id, yard_id, lot_code) VALUES ('l1', 't1', 'y1', 'KV-01')").run();
      db.prepare("INSERT INTO suppliers (id, tenant_id, code, name) VALUES ('sup1', 't1', 'SUP-ABC', 'PT Kayu Abadi')").run();
      db.prepare("INSERT INTO wood_species (id, tenant_id, code, common_name) VALUES ('sp1', 't1', 'MRB', 'Merbau')").run();

      // Manifest: freight rate 150,000 / m3, freight pph 2%, broker fee 50,000
      db.prepare(`
        INSERT INTO receiving_manifests (
          id, tenant_id, manifest_number, receipt_date, doc_date, truck_plate_number,
          forestry_doc_number, receipt_number, contract_number, supplier_id,
          freight_rate_per_m3, freight_pph_rate, broker_fee, payment_status
        ) VALUES (
          'man-1', 't1', 'MAN-2026-001', '2026-10-18', '2026-10-17', 'B 9999 XYZ',
          'DOC-99', 'RCV-001', 'CTR-999', 'sup1',
          150000.0, 2.0, 50000.0, 'UNPAID'
        )
      `).run();

      // Item 1: tally volume 2.0 m3, price 1,000,000 / m3, pph 0.5%
      // Timber gross = 2.0 * 1,000,000 = 2,000,000
      // Timber pph = 2,000,000 * 0.005 = 10,000
      // Timber net = 1,990,000
      db.prepare(`
        INSERT INTO receiving_items (
          id, manifest_id, tenant_id, item_sequence, species_id, lot_id,
          wood_length_m, delivered_pieces, delivered_volume_m3, tally_pieces, tally_volume_m3,
          timber_price_per_m3, timber_pph_rate
        ) VALUES (
          'item-1', 'man-1', 't1', 1, 'sp1', 'l1',
          4.0, 10, 1.95, 12, 2.0,
          1000000.0, 0.5
        )
      `).run();

      // Verify v_receiving_item_financials
      const itemFin = db.prepare('SELECT * FROM v_receiving_item_financials WHERE item_id = ?').get('item-1') as {
        piece_discrepancy: number;
        volume_discrepancy_m3: number;
        timber_gross_total: number;
        timber_pph_amount: number;
        timber_net_payable: number;
        species_name: string;
        kavling_number: string;
        storage_yard: string;
      };

      assert.strictEqual(itemFin.piece_discrepancy, 2);
      assert.strictEqual(itemFin.volume_discrepancy_m3, 0.05);
      assert.strictEqual(itemFin.timber_gross_total, 2000000.0);
      assert.strictEqual(itemFin.timber_pph_amount, 10000.0);
      assert.strictEqual(itemFin.timber_net_payable, 1990000.0);
      assert.strictEqual(itemFin.species_name, 'Merbau');
      assert.strictEqual(itemFin.kavling_number, 'KV-01');
      assert.strictEqual(itemFin.storage_yard, 'North Yard');

      // Verify v_receiving_manifest_summaries
      // Total tally volume = 2.0 m3
      // Freight gross = 2.0 * 150,000 = 300,000
      // Freight pph = 300,000 * 0.02 = 6,000
      // Freight net = 294,000
      // Grand net payable = 1,990,000 (timber) + 294,000 (freight) + 50,000 (broker) = 2,334,000
      const manSummary = db.prepare('SELECT * FROM v_receiving_manifest_summaries WHERE manifest_id = ?').get('man-1') as {
        total_line_items: number;
        total_delivered_pieces: number;
        total_tally_pieces: number;
        total_tally_volume_m3: number;
        total_timber_gross: number;
        total_timber_pph: number;
        total_timber_net: number;
        freight_gross_total: number;
        freight_pph_amount: number;
        freight_net_payable: number;
        grand_net_payable: number;
        supplier_name: string;
      };

      assert.strictEqual(manSummary.total_line_items, 1);
      assert.strictEqual(manSummary.total_delivered_pieces, 10);
      assert.strictEqual(manSummary.total_tally_pieces, 12);
      assert.strictEqual(manSummary.total_tally_volume_m3, 2.0);
      assert.strictEqual(manSummary.total_timber_gross, 2000000.0);
      assert.strictEqual(manSummary.total_timber_pph, 10000.0);
      assert.strictEqual(manSummary.total_timber_net, 1990000.0);
      assert.strictEqual(manSummary.freight_gross_total, 300000.0);
      assert.strictEqual(manSummary.freight_pph_amount, 6000.0);
      assert.strictEqual(manSummary.freight_net_payable, 294000.0);
      assert.strictEqual(manSummary.grand_net_payable, 2334000.0);
      assert.strictEqual(manSummary.supplier_name, 'PT Kayu Abadi');

      // Verify v_buku_besar_flat
      const flatRow = db.prepare('SELECT * FROM v_buku_besar_flat WHERE manifest_id = ?').get('man-1') as {
        manifest_id: string;
        item_id: string;
        supplierName: string;
        woodSpecies: string;
        kavlingNumber: string;
        storageYard: string;
        timberNetPayable: number;
        freightNetPayable: number;
        grandNetPayable: number;
      };

      assert.strictEqual(flatRow.manifest_id, 'man-1');
      assert.strictEqual(flatRow.item_id, 'item-1');
      assert.strictEqual(flatRow.supplierName, 'PT Kayu Abadi');
      assert.strictEqual(flatRow.woodSpecies, 'Merbau');
      assert.strictEqual(flatRow.kavlingNumber, 'KV-01');
      assert.strictEqual(flatRow.storageYard, 'North Yard');
      assert.strictEqual(flatRow.timberNetPayable, 1990000.0);
      assert.strictEqual(flatRow.freightNetPayable, 294000.0);
      assert.strictEqual(flatRow.grandNetPayable, 2334000.0);
    } finally {
      db.close();
    }
  });
});
