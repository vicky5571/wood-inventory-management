import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SEED_WOOD_RECORDS, SEED_SUPPLIERS, SEED_WOOD_SALES } from '../src/persistence/seed-data.ts';
import { SEED_STORAGE_YARDS, SEED_STORAGE_LOTS } from '../src/utils/storage-locations.ts';

describe('Supabase Migration & Seed SQL Invariants Suite', () => {
  const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20261019000000_init_wood_inventory.sql');
  const seedPath = path.resolve(process.cwd(), 'supabase/seed.sql');

  it('migration file exists and contains all required PostgreSQL table definitions', () => {
    assert.ok(fs.existsSync(migrationPath), `Migration file must exist at ${migrationPath}`);
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

    const expectedTables = [
      'tenants',
      'wood_species',
      'storage_yards',
      'storage_lots',
      'suppliers',
      'receiving_manifests',
      'receiving_items',
      'sales_records',
    ];

    for (const table of expectedTables) {
      const tableRegex = new RegExp(`CREATE TABLE (IF NOT EXISTS )?${table}\\b`, 'i');
      assert.ok(
        tableRegex.test(migrationSql),
        `Migration must create table "${table}"`
      );
    }
  });

  it('migration file defines required analytical views matching SSOT financial calculations', () => {
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

    const expectedViews = [
      'v_receiving_item_financials',
      'v_receiving_manifest_summaries',
      'v_buku_besar_flat',
    ];

    for (const view of expectedViews) {
      const viewRegex = new RegExp(`CREATE (OR REPLACE )?VIEW ${view}\\b`, 'i');
      assert.ok(
        viewRegex.test(migrationSql),
        `Migration must define view "${view}"`
      );
    }
  });

  it('migration file configures Row Level Security (RLS) and permissive access policies', () => {
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

    const expectedTables = [
      'tenants',
      'wood_species',
      'storage_yards',
      'storage_lots',
      'suppliers',
      'receiving_manifests',
      'receiving_items',
      'sales_records',
    ];

    for (const table of expectedTables) {
      const rlsRegex = new RegExp(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`, 'i');
      assert.ok(rlsRegex.test(migrationSql), `RLS must be enabled on "${table}"`);
      const policyRegex = new RegExp(`CREATE POLICY [^;]+ ON ${table}\\b`, 'i');
      assert.ok(policyRegex.test(migrationSql), `Security policy must exist for "${table}"`);
    }
  });

  it('seed file exists and contains canonical tenant and master data', () => {
    assert.ok(fs.existsSync(seedPath), `Seed file must exist at ${seedPath}`);
    const seedSql = fs.readFileSync(seedPath, 'utf-8');

    // Tenant check
    assert.ok(seedSql.includes("'default-tenant'"), 'Seed SQL must contain default-tenant');
    assert.ok(seedSql.includes('Factory Workspace Tenant'), 'Seed SQL must reference Factory Workspace Tenant');

    // Suppliers check
    for (const sup of SEED_SUPPLIERS) {
      assert.ok(seedSql.includes(sup.id), `Seed SQL must include supplier ${sup.id}`);
      assert.ok(seedSql.includes(sup.name), `Seed SQL must include supplier name ${sup.name}`);
    }

    // Storage yards & lots check
    for (const yard of SEED_STORAGE_YARDS) {
      assert.ok(seedSql.includes(yard.id), `Seed SQL must include storage yard ${yard.id}`);
    }
    for (const lot of SEED_STORAGE_LOTS) {
      assert.ok(seedSql.includes(lot.id), `Seed SQL must include storage lot ${lot.id}`);
    }
  });

  it('seed file seeds all canonical receiving manifests, items, and sales records idempotently', () => {
    const seedSql = fs.readFileSync(seedPath, 'utf-8');

    // Inbound manifests
    for (const rec of SEED_WOOD_RECORDS) {
      assert.ok(seedSql.includes(rec.id), `Seed SQL must include manifest id ${rec.id}`);
      assert.ok(seedSql.includes(rec.truckPlateNumber), `Seed SQL must include plate ${rec.truckPlateNumber}`);
      assert.ok(seedSql.includes(rec.forestryDocNumber), `Seed SQL must include forestry doc ${rec.forestryDocNumber}`);
    }

    // Outbound sales
    for (const sale of SEED_WOOD_SALES) {
      assert.ok(seedSql.includes(sale.id), `Seed SQL must include sales record id ${sale.id}`);
      assert.ok(seedSql.includes(sale.deliveryOrderNumber), `Seed SQL must include DO ${sale.deliveryOrderNumber}`);
    }

    // Idempotency check: must contain ON CONFLICT
    assert.ok(seedSql.includes('ON CONFLICT'), 'Seed SQL must use ON CONFLICT for idempotent execution');
  });
});
