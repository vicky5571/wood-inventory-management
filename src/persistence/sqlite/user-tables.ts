/**
 * src/persistence/sqlite/user-tables.ts
 *
 * SQLite DDL and table initialization for users.
 */

import type { DatabaseSync } from 'node:sqlite';

export function createUsersTable(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id             TEXT PRIMARY KEY,
      email          TEXT NOT NULL,
      name           TEXT NOT NULL,
      role_level     INTEGER NOT NULL CHECK (role_level IN (1, 2, 3)),
      title          TEXT NOT NULL,
      permissions    TEXT,
      password_hash  TEXT NOT NULL,
      is_active      INTEGER NOT NULL DEFAULT 1,
      created_at     TEXT NOT NULL,
      updated_at     TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_active
      ON users(LOWER(email)) WHERE is_active = 1;
  `);
}

export const ensureUserTables = createUsersTable;
