import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createSqliteDatabase } from '../src/persistence/sqlite/db.ts';
import { SqliteRecordStore } from '../src/persistence/sqlite-record-store.ts';

test('SQLite Serverless Resilience Suite (Vercel & Read-Only Environments)', async (t) => {
  const originalVercel = process.env.VERCEL;
  const originalDbPath = process.env.WOOD_DB_PATH;

  t.after(() => {
    if (originalVercel === undefined) {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = originalVercel;
    }

    if (originalDbPath === undefined) {
      delete process.env.WOOD_DB_PATH;
    } else {
      process.env.WOOD_DB_PATH = originalDbPath;
    }

    try {
      fs.rmSync('/tmp/wood_inventory.db', { force: true });
      fs.rmSync('/tmp/wood_inventory.db-wal', { force: true });
      fs.rmSync('/tmp/wood_inventory.db-shm', { force: true });
    } catch {
      // Ignore
    }
  });

  await t.test('detects VERCEL environment and writes to /tmp/wood_inventory.db', () => {
    delete process.env.WOOD_DB_PATH;
    process.env.VERCEL = '1';

    const db = createSqliteDatabase();
    assert.ok(db, 'Database instance should be created');

    // Run a verification query
    db.exec('CREATE TABLE IF NOT EXISTS test_serverless (id INTEGER PRIMARY KEY, name TEXT);');
    db.prepare('INSERT INTO test_serverless (name) VALUES (?);').run('vercel_test');
    const row = db.prepare('SELECT name FROM test_serverless WHERE name = ?;').get('vercel_test') as { name: string } | undefined;

    assert.equal(row?.name, 'vercel_test');
    db.close();

    assert.ok(fs.existsSync('/tmp/wood_inventory.db'), 'Database should be created in /tmp on Vercel');
  });

  await t.test('SqliteRecordStore initializes and queries successfully under VERCEL=1', async () => {
    delete process.env.WOOD_DB_PATH;
    process.env.VERCEL = '1';

    const store = new SqliteRecordStore();
    const records = await store.getAll();

    assert.ok(Array.isArray(records), 'Records should be an array');
    assert.ok(records.length > 0, 'Should load seed records into serverless database');
    store.close();
  });

  await t.test('gracefully falls back to :memory: if un-writable non-existent path is requested', () => {
    delete process.env.VERCEL;
    // An invalid path on root or non-creatable path
    const unWritablePath = '/sys/non_existent_dir_cannot_create/db.sqlite';
    const db = createSqliteDatabase(unWritablePath);

    assert.ok(db, 'Should safely fall back without throwing ERR_SQLITE_ERROR code 14');
    db.exec('CREATE TABLE IF NOT EXISTS fallback_test (id INTEGER PRIMARY KEY);');
    db.close();
  });
});
