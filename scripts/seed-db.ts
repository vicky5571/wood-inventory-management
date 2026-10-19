/**
 * scripts/seed-db.ts
 *
 * Database Seeding Engine for Wood Inventory & Outbound Sales Management System.
 * Re-hydrates SQLite relational database (data/wood_inventory.db) and fallback JSON
 * with canonical master data, suppliers, inbound receiving manifests, and sales records.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSqliteDatabase } from '../src/persistence/sqlite/db.ts';
import { runMigrations } from '../src/persistence/sqlite/migrations.ts';
import { migrateJsonToSqlite } from '../src/persistence/sqlite/migrate-json.ts';
import { seedStorageLocationsIfEmpty } from '../src/persistence/sqlite/storage-locations-db.ts';
import { seedSalesIfEmpty, ensureSalesTable } from '../src/persistence/sqlite/sales-queries.ts';
import { SEED_WOOD_RECORDS, SEED_SUPPLIERS, SEED_WOOD_SALES } from '../src/persistence/seed-data.ts';

export function seedDatabase(customDbPath?: string): {
  tenants: number;
  yards: number;
  lots: number;
  species: number;
  suppliers: number;
  manifests: number;
  items: number;
  sales: number;
} {
  const db = createSqliteDatabase(customDbPath);

  // 1. Ensure migrations and schemas are applied
  runMigrations(db);
  ensureSalesTable(db);

  // 2. Clear existing operational and relational data
  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec('DELETE FROM sales_records;');
  db.exec('DELETE FROM receiving_items;');
  db.exec('DELETE FROM receiving_manifests;');
  db.exec('DELETE FROM storage_lots;');
  db.exec('DELETE FROM storage_yards;');
  db.exec('DELETE FROM suppliers;');
  db.exec('DELETE FROM wood_species;');
  db.exec('DELETE FROM tenants;');
  db.exec('PRAGMA foreign_keys = ON;');

  // 3. Seed canonical master tenant
  db.prepare(`
    INSERT INTO tenants (id, name, slug)
    VALUES ('default-tenant', 'Factory Workspace Tenant', 'default');
  `).run();

  // 4. Seed canonical storage yards and lots
  seedStorageLocationsIfEmpty(db);

  // 5. Seed registered suppliers
  const insertSupStmt = db.prepare(`
    INSERT INTO suppliers (
      id, tenant_id, code, name, contact_person, phone, address, tax_id_npwp, is_active, notes
    ) VALUES (?, 'default-tenant', ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  for (const sup of SEED_SUPPLIERS) {
    insertSupStmt.run(
      sup.id,
      sup.code,
      sup.name,
      sup.contactPerson || null,
      sup.phone || null,
      sup.address || null,
      sup.taxId || null,
      sup.notes || null
    );
  }

  // 6. Seed inbound receiving manifests & items
  migrateJsonToSqlite(db, SEED_WOOD_RECORDS);

  // 7. Seed outbound wood sales records
  seedSalesIfEmpty(db, SEED_WOOD_SALES);

  // 8. Update fallback JSON file
  const jsonPath = path.resolve(process.cwd(), 'data/wood_records.json');
  try {
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify(SEED_WOOD_RECORDS, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Notice: Could not write fallback JSON:', err);
  }

  // 9. Query counts
  const count = (tbl: string) =>
    (db.prepare(`SELECT COUNT(*) AS c FROM ${tbl};`).get() as { c: number }).c;

  return {
    tenants: count('tenants'),
    yards: count('storage_yards'),
    lots: count('storage_lots'),
    species: count('wood_species'),
    suppliers: count('suppliers'),
    manifests: count('receiving_manifests'),
    items: count('receiving_items'),
    sales: count('sales_records'),
  };
}

// Direct CLI invocation
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log('Seeding Wood Inventory Database...');
  const stats = seedDatabase();
  console.log('Database seeded successfully:');
  console.log(`   - Tenants:            ${stats.tenants}`);
  console.log(`   - Storage Yards:      ${stats.yards}`);
  console.log(`   - Storage Lots:       ${stats.lots}`);
  console.log(`   - Wood Species:       ${stats.species}`);
  console.log(`   - Suppliers:          ${stats.suppliers}`);
  console.log(`   - Inbound Manifests:  ${stats.manifests}`);
  console.log(`   - Tally Line Items:   ${stats.items}`);
  console.log(`   - Outbound Sales:     ${stats.sales}`);
}
