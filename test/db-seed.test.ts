/**
 * test/db-seed.test.ts
 *
 * Test suite for database seeding:
 * Verifying schema migration, master data, supplier seeding, inbound logs,
 * outbound sales records, and stock balance integrity.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { seedDatabase } from '../scripts/seed-db.ts';
import { createSqliteDatabase } from '../src/persistence/sqlite/db.ts';
import { salesStore } from '../src/persistence/sales-store.ts';
import { sqliteRecordStore } from '../src/persistence/sqlite-record-store.ts';
import { calculateLotStockBalance } from '../src/utils/stock-balance.ts';

test('Database Seeding Suite', async (t) => {
  const tempDbPath = path.resolve(process.cwd(), 'data/test_seed.db');

  t.after(() => {
    try {
      if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
    } catch {}
  });

  await t.test('seedDatabase re-hydrates all relational entities accurately', () => {
    const stats = seedDatabase(tempDbPath);

    assert.strictEqual(stats.tenants, 1);
    assert.strictEqual(stats.species, 8);
    assert.strictEqual(stats.yards, 3);
    assert.strictEqual(stats.suppliers, 7);
    assert.strictEqual(stats.prices, 11);
    assert.strictEqual(stats.reportPeriods, 3);
    assert.strictEqual(stats.manifests, 10);
    assert.strictEqual(stats.items, 18);
    assert.strictEqual(stats.sales, 10);
  });

  await t.test('seeded database preserves stock balance invariants without negative inventory', async () => {
    const inbounds = await sqliteRecordStore.getAll();
    const sales = salesStore.getAll();

    assert.ok(inbounds.length >= 4, 'Must have at least 4 inbound records');
    assert.ok(sales.length >= 5, 'Must have at least 5 outbound sales records');

    // Verify KAV-01 stock
    const balanceKav1 = calculateLotStockBalance(inbounds, sales, 'TPK-Timur', 'KAV-01');
    assert.ok(balanceKav1.inboundVolumeM3 > balanceKav1.outboundVolumeM3);
    assert.ok(balanceKav1.remainingVolumeM3 > 0);

    // Verify KAV-06 stock
    const balanceKav6 = calculateLotStockBalance(inbounds, sales, 'TPK-Utara', 'KAV-06');
    assert.ok(balanceKav6.inboundVolumeM3 > balanceKav6.outboundVolumeM3);
    assert.ok(balanceKav6.remainingVolumeM3 > 0);

    // Verify all remaining volumes are non-negative
    for (const s of sales) {
      const bal = calculateLotStockBalance(inbounds, sales, s.storageYard, s.kavlingNumber);
      assert.ok(bal.remainingPieces >= 0);
      assert.ok(bal.remainingVolumeM3 >= 0);
    }
  });

  await t.test('salesStore.seed ensures records are populated in database', () => {
    const records = salesStore.getAll();
    assert.strictEqual(records.length, 10);

    const customers = new Set(records.map((r) => r.customerName));
    assert.ok(customers.has('PT Mebel Antik Solo'));
    assert.ok(customers.has('CV Jepara Indah Furniture'));
  });
});

