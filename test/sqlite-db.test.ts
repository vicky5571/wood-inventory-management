import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import {
  createSqliteDatabase,
  getDatabaseConnection,
  closeDatabaseConnection,
} from '../src/persistence/sqlite/db.ts';

test('SQLite Connection Manager Suite', async (t) => {
  await t.test('creates an in-memory database with foreign keys and busy timeout configured', () => {
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

  await t.test('configures WAL journal mode and normal synchronous on disk-backed databases', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wood-test-'));
    const tempDbPath = path.join(tempDir, 'test.db');
    try {
      const db = createSqliteDatabase(tempDbPath);
      try {
        const journalMode = db.prepare('PRAGMA journal_mode;').get() as { journal_mode: string };
        assert.strictEqual(journalMode.journal_mode.toLowerCase(), 'wal', 'journal_mode must be wal for disk databases');

        const syncResult = db.prepare('PRAGMA synchronous;').get() as { synchronous: number };
        assert.strictEqual(syncResult.synchronous, 1, 'synchronous pragma must be NORMAL (1)');
      } finally {
        db.close();
      }
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  await t.test('manages singleton connection lifecycle with getDatabaseConnection and closeDatabaseConnection', () => {
    const origDbPath = process.env.WOOD_DB_PATH;
    try {
      process.env.WOOD_DB_PATH = ':memory:';
      closeDatabaseConnection();

      const conn1 = getDatabaseConnection();
      const conn2 = getDatabaseConnection();
      assert.strictEqual(conn1, conn2, 'getDatabaseConnection must return the same singleton instance');

      closeDatabaseConnection();
      const conn3 = getDatabaseConnection();
      assert.notStrictEqual(conn1, conn3, 'closeDatabaseConnection must cleanly reset the singleton instance');
    } finally {
      closeDatabaseConnection();
      if (origDbPath !== undefined) {
        process.env.WOOD_DB_PATH = origDbPath;
      } else {
        delete process.env.WOOD_DB_PATH;
      }
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
