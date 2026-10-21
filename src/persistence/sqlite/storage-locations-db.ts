/**
 * src/persistence/sqlite/storage-locations-db.ts
 *
 * Dedicated SQLite persistence helpers for storage yards (TPK) and lots (Kavling).
 * Handles relational queries, joins, upserts, and initial seeding.
 */

import type { DatabaseSync } from 'node:sqlite';
import type { StorageYard, StorageLot, StorageLotStatus, StorageLotWithYard } from '../../types/index.ts';
import { SEED_STORAGE_YARDS, SEED_STORAGE_LOTS } from '../../utils/storage-locations.ts';
import { toCode } from './migrate-json.ts';

export function seedStorageLocationsIfEmpty(db: DatabaseSync): void {
  const yardCount = db.prepare('SELECT COUNT(*) AS c FROM storage_yards;').get() as { c: number } | undefined;
  if (yardCount && yardCount.c > 0) return;

  // Ensure default tenant exists for FK integrity
  db.prepare(`
    INSERT INTO tenants (id, name, slug) VALUES (?, ?, ?)
    ON CONFLICT(id) DO NOTHING;
  `).run('default-tenant', 'Factory Workspace Tenant', 'default');

  for (const y of SEED_STORAGE_YARDS) {
    db.prepare(`
      INSERT INTO storage_yards (id, tenant_id, yard_code, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING;
    `).run(y.id, y.tenantId || 'default-tenant', y.yardCode, y.name, y.description || null, y.createdAt, y.updatedAt);
  }

  for (const l of SEED_STORAGE_LOTS) {
    db.prepare(`
      INSERT INTO storage_lots (id, tenant_id, yard_id, lot_code, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING;
    `).run(l.id, l.tenantId || 'default-tenant', l.yardId, l.lotCode, l.status, l.createdAt, l.updatedAt);
  }
}

interface SqliteStorageYardRow {
  id: string;
  tenant_id: string;
  yard_code: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

interface SqliteStorageLotRow {
  id: string;
  tenant_id: string;
  yard_id: string;
  lot_code: string;
  status: string;
  created_at: string;
  updated_at: string;
  yardCode?: string;
  yardName?: string;
}

export function getStorageLocationsFromDb(db: DatabaseSync): { yards: StorageYard[]; lots: StorageLotWithYard[] } {
  const yardRows = db.prepare('SELECT * FROM storage_yards ORDER BY name ASC;').all() as unknown as SqliteStorageYardRow[];
  const yards: StorageYard[] = yardRows.map((r) => ({
    id: r.id,
    tenantId: r.tenant_id,
    yardCode: r.yard_code,
    name: r.name,
    description: r.description ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  const lotRows = db.prepare(`
    SELECT l.*, y.yard_code AS yardCode, y.name AS yardName
    FROM storage_lots l
    JOIN storage_yards y ON l.yard_id = y.id
    ORDER BY l.lot_code ASC;
  `).all() as unknown as SqliteStorageLotRow[];

  const lots: StorageLotWithYard[] = lotRows.map((r) => ({
    id: r.id,
    tenantId: r.tenant_id,
    yardId: r.yard_id,
    lotCode: r.lot_code,
    status: r.status as StorageLotStatus,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    yardCode: r.yardCode || '',
    yardName: r.yardName || '',
  }));

  return { yards, lots };
}

export function saveStorageYardToDb(
  db: DatabaseSync,
  yard: { id?: string; tenantId?: string; name: string; yardCode?: string; description?: string }
): StorageYard {
  const tenantId = yard.tenantId || 'default-tenant';
  const trimmedName = (yard.name || '').trim();
  if (!trimmedName) {
    throw new Error('Yard name cannot be empty');
  }
  const now = new Date().toISOString();

  let existing = yard.id
    ? (db.prepare('SELECT * FROM storage_yards WHERE id = ?;').get(yard.id) as unknown as SqliteStorageYardRow | undefined)
    : undefined;

  if (!existing && yard.yardCode) {
    existing = db
      .prepare('SELECT * FROM storage_yards WHERE tenant_id = ? AND yard_code = ?;')
      .get(tenantId, yard.yardCode.trim()) as unknown as SqliteStorageYardRow | undefined;
  }

  if (!existing && yard.name) {
    existing = db
      .prepare('SELECT * FROM storage_yards WHERE tenant_id = ? AND name = ?;')
      .get(tenantId, trimmedName) as unknown as SqliteStorageYardRow | undefined;
  }

  if (existing) {
    const yardCode = yard.yardCode ? yard.yardCode.trim() : existing.yard_code;
    const description = yard.description !== undefined ? yard.description?.trim() : existing.description;
    db.prepare(`
      UPDATE storage_yards
      SET name = ?, yard_code = ?, description = ?, updated_at = ?
      WHERE id = ?;
    `).run(trimmedName, yardCode, description || null, now, existing.id);

    return {
      id: existing.id,
      tenantId: existing.tenant_id,
      yardCode,
      name: trimmedName,
      description: description || undefined,
      createdAt: existing.created_at,
      updatedAt: now,
    };
  }

  const id = yard.id || `yard-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const yardCode = yard.yardCode ? yard.yardCode.trim() : toCode(trimmedName, 'YD');
  const description = yard.description ? yard.description.trim() : null;

  db.prepare(`
    INSERT INTO storage_yards (id, tenant_id, yard_code, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?);
  `).run(id, tenantId, yardCode, trimmedName, description, now, now);

  return {
    id,
    tenantId,
    yardCode,
    name: trimmedName,
    description: description || undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export function saveStorageLotToDb(
  db: DatabaseSync,
  lot: { id?: string; tenantId?: string; yardId: string; lotCode: string; status?: StorageLotStatus }
): StorageLot {
  const tenantId = lot.tenantId || 'default-tenant';
  const trimmedLotCode = (lot.lotCode || '').trim();
  if (!trimmedLotCode || !lot.yardId) {
    throw new Error('Lot code and yard identifier cannot be empty');
  }
  const allowedStatuses: StorageLotStatus[] = ['ACTIVE', 'FULL', 'MAINTENANCE'];
  if (lot.status && !allowedStatuses.includes(lot.status)) {
    throw new Error('Invalid lot status: expected "ACTIVE", "FULL", or "MAINTENANCE"');
  }
  const status: StorageLotStatus = lot.status || 'ACTIVE';
  const now = new Date().toISOString();

  let yardRow = db
    .prepare(
      'SELECT id FROM storage_yards WHERE LOWER(id) = LOWER(?) OR LOWER(name) = LOWER(?) OR LOWER(yard_code) = LOWER(?);'
    )
    .get(lot.yardId, lot.yardId, lot.yardId) as { id: string } | undefined;

  let yardId = yardRow?.id;
  if (!yardId) {
    const provisioned = saveStorageYardToDb(db, { name: lot.yardId, tenantId });
    yardId = provisioned.id;
  }

  let existing = lot.id
    ? (db.prepare('SELECT * FROM storage_lots WHERE id = ?;').get(lot.id) as unknown as SqliteStorageLotRow | undefined)
    : undefined;

  if (!existing) {
    existing = db
      .prepare('SELECT * FROM storage_lots WHERE tenant_id = ? AND yard_id = ? AND lot_code = ?;')
      .get(tenantId, yardId, trimmedLotCode) as unknown as SqliteStorageLotRow | undefined;
  }

  if (existing) {
    db.prepare(`
      UPDATE storage_lots
      SET status = ?, updated_at = ?
      WHERE id = ?;
    `).run(status, now, existing.id);

    return {
      id: existing.id,
      tenantId: existing.tenant_id,
      yardId: existing.yard_id,
      lotCode: existing.lot_code,
      status,
      createdAt: existing.created_at,
      updatedAt: now,
    };
  }

  const id = lot.id || `lot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  db.prepare(`
    INSERT INTO storage_lots (id, tenant_id, yard_id, lot_code, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?);
  `).run(id, tenantId, yardId, trimmedLotCode, status, now, now);

  return {
    id,
    tenantId,
    yardId,
    lotCode: trimmedLotCode,
    status,
    createdAt: now,
    updatedAt: now,
  };
}

