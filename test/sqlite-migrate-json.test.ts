import test from 'node:test';
import assert from 'node:assert/strict';
import { createSqliteDatabase } from '../src/persistence/sqlite/db.ts';
import { runMigrations } from '../src/persistence/sqlite/migrations.ts';
import { migrateJsonToSqlite, toCode } from '../src/persistence/sqlite/migrate-json.ts';
import { SEED_WOOD_RECORDS } from '../src/persistence/seed/fixtures.ts';
import type { WoodReceivingRecord } from '../src/types/index.ts';

test('JSON to SQLite Migration Utility Suite', async (t) => {
  await t.test('migrates SEED_WOOD_RECORDS and populates master data and flat view accurately', () => {
    const db = createSqliteDatabase(':memory:');
    try {
      runMigrations(db);

      const result = migrateJsonToSqlite(db, SEED_WOOD_RECORDS);
      assert.strictEqual(result.manifestsCount, SEED_WOOD_RECORDS.length);
      assert.strictEqual(result.itemsCount, SEED_WOOD_RECORDS.length);

      // Verify v_buku_besar_flat contains exactly the expected records
      const flatRows = db.prepare('SELECT * FROM v_buku_besar_flat ORDER BY receiptDate DESC, id ASC;').all() as any[];
      assert.strictEqual(flatRows.length, SEED_WOOD_RECORDS.length);

      for (const seed of SEED_WOOD_RECORDS) {
        const matched = flatRows.find((r) => r.id === seed.id);
        assert.ok(matched, `seed record ${seed.id} must exist in v_buku_besar_flat by id`);
        assert.strictEqual(matched.truckPlateNumber, seed.truckPlateNumber);
        assert.strictEqual(matched.supplierName, seed.supplierName);
        assert.strictEqual(matched.woodSpecies, seed.woodSpecies);
        assert.strictEqual(matched.kavlingNumber, seed.kavlingNumber);
        assert.strictEqual(matched.storageYard, seed.storageYard);
        assert.strictEqual(matched.tallyPieces, seed.tallyPieces);
        assert.strictEqual(matched.tallyVolumeM3, seed.tallyVolumeM3);
        assert.strictEqual(matched.timberPricePerM3, seed.timberPricePerM3);
        assert.strictEqual(matched.freightRatePerM3, seed.freightRatePerM3);
        assert.strictEqual(matched.brokerFee, seed.brokerFee);
        assert.strictEqual(matched.grandNetPayable, seed.grandNetPayable);
      }
    } finally {
      db.close();
    }
  });

  await t.test('is idempotent and handles re-migration without duplicating or failing FK constraints', () => {
    const db = createSqliteDatabase(':memory:');
    try {
      runMigrations(db);

      // First run
      const res1 = migrateJsonToSqlite(db, SEED_WOOD_RECORDS);
      assert.strictEqual(res1.manifestsCount, SEED_WOOD_RECORDS.length);

      // Second run (re-migrating identical data)
      const res2 = migrateJsonToSqlite(db, SEED_WOOD_RECORDS);
      assert.strictEqual(res2.manifestsCount, SEED_WOOD_RECORDS.length);

      const flatRows = db.prepare('SELECT * FROM v_buku_besar_flat;').all() as any[];
      assert.strictEqual(flatRows.length, SEED_WOOD_RECORDS.length, 're-migration should not duplicate rows');

      // Check master tables row counts
      const supplierRows = db.prepare('SELECT * FROM suppliers;').all() as any[];
      assert.ok(supplierRows.length > 0 && supplierRows.length <= SEED_WOOD_RECORDS.length);
    } finally {
      db.close();
    }
  });

  await t.test('handles empty records array gracefully', () => {
    const db = createSqliteDatabase(':memory:');
    try {
      runMigrations(db);

      const result = migrateJsonToSqlite(db, []);
      assert.strictEqual(result.manifestsCount, 0);
      assert.strictEqual(result.itemsCount, 0);

      const flatRows = db.prepare('SELECT * FROM v_buku_besar_flat;').all() as any[];
      assert.strictEqual(flatRows.length, 0);
    } finally {
      db.close();
    }
  });

  await t.test('supports custom tenantId and scopes tenant infrastructure', () => {
    const db = createSqliteDatabase(':memory:');
    try {
      runMigrations(db);

      const customTenant = 'tenant-branch-surabaya';
      const result = migrateJsonToSqlite(db, SEED_WOOD_RECORDS, customTenant);
      assert.strictEqual(result.manifestsCount, SEED_WOOD_RECORDS.length);

      const tenantRow = db.prepare('SELECT * FROM tenants WHERE id = ?;').get(customTenant) as any;
      assert.ok(tenantRow, 'custom tenant record must exist');
      assert.strictEqual(tenantRow.id, customTenant);

      const manifests = db.prepare('SELECT DISTINCT tenant_id FROM receiving_manifests;').all() as any[];
      assert.strictEqual(manifests.length, 1);
      assert.strictEqual(manifests[0].tenant_id, customTenant);
    } finally {
      db.close();
    }
  });

  await t.test('rolls back entire transaction if a record fails constraint validation', () => {
    const db = createSqliteDatabase(':memory:');
    try {
      runMigrations(db);

      const validRecord = SEED_WOOD_RECORDS[0];
      const corruptRecord: WoodReceivingRecord = {
        ...SEED_WOOD_RECORDS[1],
        id: 'rec-corrupt-bad-length',
        woodLengthM: -5.0, // Fails CHECK (wood_length_m > 0)
      };

      assert.throws(() => {
        migrateJsonToSqlite(db, [validRecord, corruptRecord]);
      }, /CHECK constraint failed/);

      // Verify transaction rollback: even validRecord should not be persisted
      const manifests = db.prepare('SELECT * FROM receiving_manifests;').all() as any[];
      assert.strictEqual(manifests.length, 0, 'all manifests must be rolled back on error');

      const items = db.prepare('SELECT * FROM receiving_items;').all() as any[];
      assert.strictEqual(items.length, 0, 'all items must be rolled back on error');
    } finally {
      db.close();
    }
  });

  await t.test('toCode generates collision-resilient codes with deterministic 4-character checksum for strings > 20 chars', () => {
    // Strings with identical 20-character prefix
    const nameA = 'PT Kayu Nusantara Indonesia Wilayah Barat';
    const nameB = 'PT Kayu Nusantara Indonesia Wilayah Timur';
    const codeA = toCode(nameA, 'SUP');
    const codeB = toCode(nameB, 'SUP');

    assert.notStrictEqual(codeA, codeB, 'codes must not collide despite identical prefixes');
    assert.strictEqual(codeA, toCode(nameA, 'SUP'), 'codes must be strictly deterministic');
    assert.ok(codeA.startsWith('SUP-PTKAYUNUSANTARAI'));
    assert.ok(codeB.startsWith('SUP-PTKAYUNUSANTARAI'));
    // Ensure overall code payload length is max 20 chars (prefix + '-' + 20 chars = 24 chars)
    assert.strictEqual(codeA.length, 4 + 20);

    // Short strings
    assert.strictEqual(toCode('Merbau', 'SP'), 'SP-MERBAU');
    assert.strictEqual(toCode('', 'GEN'), 'GEN-GEN');
  });

  await t.test('decouples manifest_number from receiptNumber allowing multiple deliveries sharing receiptNumber', () => {
    const db = createSqliteDatabase(':memory:');
    try {
      runMigrations(db);

      const sharedReceipt = 'KW-SHARED-2026-001';
      const record1: WoodReceivingRecord = {
        ...SEED_WOOD_RECORDS[0],
        id: 'rec-shared-deliv-1',
        receiptNumber: sharedReceipt,
        tallyPieces: 10,
        tallyVolumeM3: 2.0,
      };
      const record2: WoodReceivingRecord = {
        ...SEED_WOOD_RECORDS[1],
        id: 'rec-shared-deliv-2',
        receiptNumber: sharedReceipt,
        tallyPieces: 15,
        tallyVolumeM3: 3.0,
      };

      const result = migrateJsonToSqlite(db, [record1, record2]);
      assert.strictEqual(result.manifestsCount, 2);
      assert.strictEqual(result.itemsCount, 2);

      const manifests = db.prepare('SELECT id, manifest_number, receipt_number FROM receiving_manifests ORDER BY id ASC;').all() as Array<{
        id: string;
        manifest_number: string;
        receipt_number: string;
      }>;

      assert.strictEqual(manifests.length, 2);
      assert.strictEqual(manifests[0].receipt_number, sharedReceipt);
      assert.strictEqual(manifests[1].receipt_number, sharedReceipt);
      assert.strictEqual(manifests[0].manifest_number, 'MAN-rec-shared-deliv-1');
      assert.strictEqual(manifests[1].manifest_number, 'MAN-rec-shared-deliv-2');
      assert.notStrictEqual(manifests[0].manifest_number, manifests[1].manifest_number);
    } finally {
      db.close();
    }
  });
});
