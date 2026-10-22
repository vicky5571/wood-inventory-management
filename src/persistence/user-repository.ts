/**
 * src/persistence/user-repository.ts
 *
 * User repository DAO contract, error definitions, and factory.
 * Spec: docs/superpowers/specs/2026-10-22-user-storage-migration-design.md
 * ADR: docs/adr/0013-user-management-architecture.md
 */

import type { DatabaseSync } from 'node:sqlite';
import type { AuthUser } from '../types/index.ts';
import { getDatabaseConnection } from './sqlite/db.ts';
import { runMigrations } from './sqlite/migrations.ts';
import { isSupabaseConfigured } from './supabase/supabase-client.ts';
import { SqliteUserRepository } from './user-repository-sqlite.ts';
import { SupabaseUserRepository } from './user-repository-supabase.ts';
import { SEED_USERS } from './seed/fixtures-users.ts';

export interface UserRecordRow extends AuthUser {
  passwordHash: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export abstract class UserRepository {
  abstract findByEmail(email: string): Promise<UserRecordRow | null>;
  abstract findById(id: string): Promise<UserRecordRow | null>;
  abstract listAll(opts?: { includeInactive?: boolean }): Promise<UserRecordRow[]>;
  abstract create(input: Omit<UserRecordRow, 'createdAt' | 'updatedAt'>): Promise<UserRecordRow>;
  /**
   * Applies shallow patch to user fields.
   * `undefined` = no-op (preserves existing value).
   * `null` (or `{}` for permissions) = explicitly clear.
   */
  abstract update(id: string, patch: Partial<Omit<UserRecordRow, 'id' | 'createdAt'>>): Promise<UserRecordRow>;
  abstract deactivate(id: string): Promise<void>;
  abstract upsertSeed(input: Omit<UserRecordRow, 'createdAt' | 'updatedAt'>): Promise<void>;
}

export class UserNotFoundError extends Error {
  constructor(id: string) {
    super(`User with id "${id}" not found.`);
    this.name = 'UserNotFoundError';
  }
}

export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`Active user with email "${email}" already exists.`);
    this.name = 'DuplicateEmailError';
  }
}

export function createUserRepository(
  mode: 'sqlite' | 'supabase' = isSupabaseConfigured() ? 'supabase' : 'sqlite',
  customDb?: DatabaseSync
): UserRepository {
  if (mode === 'supabase') {
    return new SupabaseUserRepository();
  }
  const db = customDb || getDatabaseConnection();
  runMigrations(db);
  return new SqliteUserRepository(db);
}

export async function ensureSeedUsers(repo: UserRepository): Promise<void> {
  const existing = await repo.listAll({ includeInactive: true });
  if (existing.length === 0) {
    for (const user of SEED_USERS) {
      await repo.upsertSeed({ ...user, isActive: true });
    }
  }
}

let globalUserRepository: UserRepository | null = null;
let seedInitialized = false;

/**
 * Returns raw UserRepository singleton.
 *
 * For auth lookup only (login, session verification).
 * Admin mutations MUST wrap this via createAuditedUserRepository(actor)
 * from user-repository-audited.ts to ensure audit trail.
 * Seeder (ensureSeedUsers) uses raw repo intentionally — bootstrap is
 * not an admin action.
 */
export function getUserRepository(): UserRepository {
  if (!globalUserRepository) {
    globalUserRepository = createUserRepository();
  }
  if (!seedInitialized) {
    seedInitialized = true;
    ensureSeedUsers(globalUserRepository).catch((err) => {
      console.warn('[UserRepository] ensureSeedUsers failed on boot:', err);
    });
  }
  return globalUserRepository;
}

export function resetUserRepositoryInstance(): void {
  globalUserRepository = null;
  seedInitialized = false;
}

