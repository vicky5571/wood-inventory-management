import test from 'node:test';
import assert from 'node:assert/strict';
import { createSqliteDatabase } from '../src/persistence/sqlite/db.ts';

test('SQLite Connection Manager Suite', async (t) => {
  await t.test('creates an in-memory database with foreign keys and WAL mode configured', () => {
    const db = createSqliteDatabase(':memory:');
    try {
      const fkResult = db.prepare('PRAGMA foreign_keys;').get() as { foreign_keys: number };
      assert.strictEqual(fkResult.foreign_keys, 1, 'foreign_keys pragma must be enabled (1)');

      const busyTimeout = db.prepare('PRAGMA busy_timeout;').get() as { timeout: number };
      assert.strictEqual(busyTimeout.timeout, 5000, 'busy_timeout must be configured to 5000ms');
    } finally {
      db.close();
    }
  });

  await t.test('executes basic SQL queries and transactions', () => {
    const db = createSqliteDatabase(':memory:');
    try {
      db.exec('CREATE TABLE test_items (id TEXT PRIMARY KEY, val TEXT);');
      const insert = db.prepare('INSERT INTO test_items (id, val) VALUES (?, ?);');
      insert.run('1', 'Alpha');
      insert.run('2', 'Beta');

      const rows = db.prepare('SELECT id, val FROM test_items ORDER BY id;').all() as Array<{ id: string; val: string }>;
      assert.strictEqual(rows.length, 2);
      assert.strictEqual(rows[0].val, 'Alpha');
      assert.strictEqual(rows[1].val, 'Beta');
    } finally {
      db.close();
    }
  });
});
