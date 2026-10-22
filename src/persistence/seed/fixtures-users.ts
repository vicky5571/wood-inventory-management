/**
 * src/persistence/seed/fixtures-users.ts
 *
 * User seed fixtures extracted from PRESET_USERS.
 * Spec: docs/superpowers/specs/2026-10-22-user-storage-migration-design.md
 * ADR: docs/adr/0013-user-management-architecture.md
 */

import type { AuthUser } from '../../types/index.ts';
import { hashPassword } from '../../auth/password.ts';

interface PresetUserItem extends AuthUser {
  passwordHash: string;
}

export interface UserSeedRow extends AuthUser {
  passwordHash: string;
  isActive: boolean;
}

/**
 * SEED SOURCE ONLY — do not read at runtime for authentication.
 * Used by seeders and tests to bootstrap the users table.
 * Runtime user lookups MUST go through UserRepository.
 */
export const PRESET_USERS: PresetUserItem[] = [
  {
    id: 'usr-manager-01',
    email: 'manager@timber.id',
    name: 'Budi Santoso',
    roleLevel: 1,
    title: 'Level 1',
    passwordHash: hashPassword('password123'),
  },
  {
    id: 'usr-admin-02',
    email: 'admin@timber.id',
    name: 'Siti Rahmawati',
    roleLevel: 2,
    title: 'Level 2',
    passwordHash: hashPassword('password123'),
  },
  {
    id: 'usr-viewer-03',
    email: 'viewer@timber.id',
    name: 'Robert Tan',
    roleLevel: 3,
    title: 'Level 3',
    passwordHash: hashPassword('password123'),
  },
  {
    id: 'usr-warehouse-04',
    email: 'gudang@timber.id',
    name: 'Operator Gudang',
    roleLevel: 2,
    title: 'Level 2 — Operator Gudang',
    permissions: { tallyCreate: true },
    passwordHash: hashPassword('password123'),
  },
];

export const SEED_USERS: UserSeedRow[] = PRESET_USERS.map((user) => ({
  ...user,
  isActive: true,
}));

