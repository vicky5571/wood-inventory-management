/**
 * src/persistence/user-repository-sqlite.ts
 *
 * SQLite implementation of UserRepository DAO.
 */

import type { DatabaseSync } from 'node:sqlite';
import type { UserRoleLevel, UserPermissions } from '../types/index.ts';
import {
  UserRepository,
  type UserRecordRow,
  UserNotFoundError,
  DuplicateEmailError,
} from './user-repository.ts';

interface SqliteUserRow {
  id: string;
  email: string;
  name: string;
  role_level: number;
  title: string;
  permissions: string | null;
  password_hash: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

function parsePermissions(raw: string | null): UserPermissions | undefined {
  if (raw === null || raw === undefined) return undefined;
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[SqliteUserRepository] Malformed permissions JSON in DB:', err);
    return {};
  }
}

function mapRowToUserRecord(row: SqliteUserRow): UserRecordRow {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    roleLevel: row.role_level as UserRoleLevel,
    title: row.title,
    permissions: parsePermissions(row.permissions),
    passwordHash: row.password_hash,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqliteUserRepository implements UserRepository {
  private readonly db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  async findByEmail(email: string): Promise<UserRecordRow | null> {
    const normalized = email.trim().toLowerCase();
    const row = this.db.prepare(`
      SELECT * FROM users WHERE LOWER(email) = ? AND is_active = 1
    `).get(normalized) as unknown as SqliteUserRow | undefined;
    return row ? mapRowToUserRecord(row) : null;
  }

  async findById(id: string): Promise<UserRecordRow | null> {
    const row = this.db.prepare(`
      SELECT * FROM users WHERE id = ? AND is_active = 1
    `).get(id) as unknown as SqliteUserRow | undefined;
    return row ? mapRowToUserRecord(row) : null;
  }

  async listAll(opts?: { includeInactive?: boolean }): Promise<UserRecordRow[]> {
    const sql = opts?.includeInactive
      ? `SELECT * FROM users ORDER BY created_at ASC`
      : `SELECT * FROM users WHERE is_active = 1 ORDER BY created_at ASC`;
    const rows = this.db.prepare(sql).all() as unknown as SqliteUserRow[];
    return rows.map(mapRowToUserRecord);
  }

  async create(input: Omit<UserRecordRow, 'createdAt' | 'updatedAt'>): Promise<UserRecordRow> {
    const normalized = input.email.trim().toLowerCase();
    const existing = this.db.prepare(`
      SELECT id FROM users WHERE LOWER(email) = ? AND is_active = 1
    `).get(normalized);
    if (existing) {
      throw new DuplicateEmailError(input.email);
    }

    const now = new Date().toISOString();
    const permissionsJson = input.permissions ? JSON.stringify(input.permissions) : null;
    const isActive = input.isActive !== undefined ? (input.isActive ? 1 : 0) : 1;

    try {
      this.db.prepare(`
        INSERT INTO users (id, email, name, role_level, title, permissions, password_hash, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        input.id,
        input.email,
        input.name,
        input.roleLevel,
        input.title,
        permissionsJson,
        input.passwordHash,
        isActive,
        now,
        now
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
        throw new DuplicateEmailError(input.email);
      }
      throw err;
    }

    return {
      ...input,
      isActive: Boolean(isActive),
      createdAt: now,
      updatedAt: now,
    };
  }

  async update(id: string, patch: Partial<Omit<UserRecordRow, 'id' | 'createdAt'>>): Promise<UserRecordRow> {
    const existing = this.db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as unknown as SqliteUserRow | undefined;
    if (!existing) {
      throw new UserNotFoundError(id);
    }

    if (patch.email && patch.email.toLowerCase() !== existing.email.toLowerCase()) {
      const normEmail = patch.email.trim().toLowerCase();
      const dup = this.db.prepare(`
        SELECT id FROM users WHERE LOWER(email) = ? AND is_active = 1 AND id != ?
      `).get(normEmail, id);
      if (dup) {
        throw new DuplicateEmailError(patch.email);
      }
    }

    const now = new Date().toISOString();
    const updatedName = patch.name ?? existing.name;
    const updatedEmail = patch.email ?? existing.email;
    const updatedRole = patch.roleLevel ?? existing.role_level;
    const updatedTitle = patch.title ?? existing.title;
    const updatedHash = patch.passwordHash ?? existing.password_hash;
    const updatedActive = patch.isActive !== undefined ? (patch.isActive ? 1 : 0) : existing.is_active;
    const updatedPermissions = patch.permissions !== undefined
      ? (patch.permissions ? JSON.stringify(patch.permissions) : null)
      : existing.permissions;

    this.db.prepare(`
      UPDATE users
      SET name = ?, email = ?, role_level = ?, title = ?, permissions = ?, password_hash = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `).run(
      updatedName,
      updatedEmail,
      updatedRole,
      updatedTitle,
      updatedPermissions,
      updatedHash,
      updatedActive,
      now,
      id
    );

    const updatedRow = this.db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as unknown as SqliteUserRow;
    return mapRowToUserRecord(updatedRow);
  }

  async deactivate(id: string): Promise<void> {
    const now = new Date().toISOString();
    this.db.prepare(`UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?`).run(now, id);
  }

  async upsertSeed(input: Omit<UserRecordRow, 'createdAt' | 'updatedAt'>): Promise<void> {
    const now = new Date().toISOString();
    const permissionsJson = input.permissions ? JSON.stringify(input.permissions) : null;
    const isActive = input.isActive ? 1 : 0;

    this.db.prepare(`
      INSERT INTO users (id, email, name, role_level, title, permissions, password_hash, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        email = excluded.email,
        name = excluded.name,
        role_level = excluded.role_level,
        title = excluded.title,
        permissions = excluded.permissions,
        password_hash = excluded.password_hash,
        is_active = excluded.is_active,
        updated_at = excluded.updated_at
    `).run(
      input.id,
      input.email,
      input.name,
      input.roleLevel,
      input.title,
      permissionsJson,
      input.passwordHash,
      isActive,
      now,
      now
    );
  }
}
