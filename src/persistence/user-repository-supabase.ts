/**
 * src/persistence/user-repository-supabase.ts
 *
 * Supabase implementation of UserRepository DAO via PostgREST.
 */

import type { UserRoleLevel, UserPermissions } from '../types/index.ts';
import { supabaseFetch } from './supabase/supabase-client.ts';
import {
  UserRepository,
  type UserRecordRow,
  UserNotFoundError,
  DuplicateEmailError,
} from './user-repository.ts';

interface SupabaseUserRow {
  id: string;
  email: string;
  name: string;
  role_level: number;
  title: string;
  permissions: UserPermissions | null;
  password_hash: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function mapRowToUserRecord(row: SupabaseUserRow): UserRecordRow {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    roleLevel: row.role_level as UserRoleLevel,
    title: row.title,
    permissions: row.permissions || undefined,
    passwordHash: row.password_hash,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<UserRecordRow | null> {
    const encoded = encodeURIComponent(email.trim());
    const rows = await supabaseFetch<SupabaseUserRow[]>(
      `users?email=ilike.${encoded}&is_active=is.true&limit=1`
    );
    return rows.length > 0 ? mapRowToUserRecord(rows[0]) : null;
  }

  async findById(id: string): Promise<UserRecordRow | null> {
    const encoded = encodeURIComponent(id);
    const rows = await supabaseFetch<SupabaseUserRow[]>(
      `users?id=eq.${encoded}&is_active=is.true&limit=1`
    );
    return rows.length > 0 ? mapRowToUserRecord(rows[0]) : null;
  }

  async listAll(opts?: { includeInactive?: boolean }): Promise<UserRecordRow[]> {
    const query = opts?.includeInactive
      ? `users?order=created_at.asc`
      : `users?is_active=is.true&order=created_at.asc`;
    const rows = await supabaseFetch<SupabaseUserRow[]>(query);
    return rows.map(mapRowToUserRecord);
  }

  async create(input: Omit<UserRecordRow, 'createdAt' | 'updatedAt'>): Promise<UserRecordRow> {
    const existing = await this.findByEmail(input.email);
    if (existing) {
      throw new DuplicateEmailError(input.email);
    }

    const payload = {
      id: input.id,
      email: input.email,
      name: input.name,
      role_level: input.roleLevel,
      title: input.title,
      permissions: input.permissions ?? null,
      password_hash: input.passwordHash,
      is_active: input.isActive ?? true,
    };

    try {
      const rows = await supabaseFetch<SupabaseUserRow[]>('users', {
        method: 'POST',
        prefer: 'return=representation',
        body: JSON.stringify(payload),
      });
      return mapRowToUserRecord(rows[0]);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.toLowerCase().includes('duplicate key')) {
        throw new DuplicateEmailError(input.email);
      }
      throw err;
    }
  }

  async update(id: string, patch: Partial<Omit<UserRecordRow, 'id' | 'createdAt'>>): Promise<UserRecordRow> {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (patch.email !== undefined) payload.email = patch.email;
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.roleLevel !== undefined) payload.role_level = patch.roleLevel;
    if (patch.title !== undefined) payload.title = patch.title;
    if (patch.passwordHash !== undefined) payload.password_hash = patch.passwordHash;
    if (patch.isActive !== undefined) payload.is_active = patch.isActive;
    if (patch.permissions !== undefined) payload.permissions = patch.permissions ?? null;

    const rows = await supabaseFetch<SupabaseUserRow[]>(`users?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: JSON.stringify(payload),
    });

    if (!rows || rows.length === 0) {
      throw new UserNotFoundError(id);
    }
    return mapRowToUserRecord(rows[0]);
  }

  async deactivate(id: string): Promise<void> {
    await supabaseFetch<void>(`users?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        is_active: false,
        updated_at: new Date().toISOString(),
      }),
    });
  }

  async upsertSeed(input: Omit<UserRecordRow, 'createdAt' | 'updatedAt'>): Promise<void> {
    const payload = {
      id: input.id,
      email: input.email,
      name: input.name,
      role_level: input.roleLevel,
      title: input.title,
      permissions: input.permissions ?? null,
      password_hash: input.passwordHash,
      is_active: input.isActive ?? true,
      updated_at: new Date().toISOString(),
    };

    await supabaseFetch<void>('users', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates',
      body: JSON.stringify(payload),
    });
  }
}
