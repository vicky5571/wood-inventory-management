-- 20261022000001_add_users_table.sql
-- User Storage Migration (PRESET_USERS -> DB Table)
-- Spec: docs/superpowers/specs/2026-10-22-user-storage-migration-design.md
-- ADR: docs/adr/0013-user-management-architecture.md

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL,
  name           TEXT NOT NULL,
  role_level     SMALLINT NOT NULL CHECK (role_level IN (1, 2, 3)),
  title          TEXT NOT NULL,
  permissions    JSONB,
  password_hash  TEXT NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_active
  ON users(LOWER(email)) WHERE is_active = TRUE;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read and write access on users"
  ON users FOR ALL USING (true) WITH CHECK (true);
