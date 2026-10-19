import type { DatabaseSync } from 'node:sqlite';
import type { Supplier } from '../../types/index.ts';
import { SEED_SUPPLIERS } from '../seed-data.ts';
import {
  getSpeciesFromDb,
  saveSpeciesToDb,
  seedSpeciesIfEmpty,
} from './species-queries.ts';

export { getSpeciesFromDb, saveSpeciesToDb, seedSpeciesIfEmpty };

interface SqliteSupplierRow {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tax_id_npwp: string | null;
  is_active: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapSupplierRow(row: SqliteSupplierRow): Supplier {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    contactPerson: row.contact_person ?? undefined,
    phone: row.phone ?? undefined,
    address: row.address ?? undefined,
    taxId: row.tax_id_npwp ?? undefined,
    notes: row.notes ?? undefined,
    status: row.is_active === 1 ? 'ACTIVE' : 'INACTIVE',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function seedMasterDataIfEmpty(db: DatabaseSync): void {
  const supCount = db.prepare('SELECT COUNT(*) AS c FROM suppliers;').get() as { c: number } | undefined;
  if (!supCount || supCount.c === 0) {
    const insertSup = db.prepare(`
      INSERT OR IGNORE INTO suppliers (
        id, tenant_id, code, name, contact_person, phone, address, tax_id_npwp, is_active, notes, created_at, updated_at
      ) VALUES (?, 'default-tenant', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const sup of SEED_SUPPLIERS) {
      insertSup.run(
        sup.id,
        sup.code,
        sup.name,
        sup.contactPerson ?? null,
        sup.phone ?? null,
        sup.address ?? null,
        sup.taxId ?? null,
        sup.status === 'ACTIVE' ? 1 : 0,
        sup.notes ?? null,
        sup.createdAt || new Date().toISOString(),
        sup.updatedAt || new Date().toISOString()
      );
    }
  }

  seedSpeciesIfEmpty(db);
}

export function getSuppliersFromDb(db: DatabaseSync): Supplier[] {
  seedMasterDataIfEmpty(db);
  const rows = db.prepare(`
    SELECT * FROM suppliers WHERE tenant_id = 'default-tenant' ORDER BY name ASC;
  `).all() as unknown as SqliteSupplierRow[];
  return rows.map(mapSupplierRow);
}

export function saveSupplierToDb(
  db: DatabaseSync,
  data: Partial<Supplier> & { name: string }
): Supplier {
  seedMasterDataIfEmpty(db);
  const now = new Date().toISOString();

  if (data.id) {
    const existing = db.prepare(`
      SELECT * FROM suppliers WHERE id = ? AND tenant_id = 'default-tenant'
    `).get(data.id) as unknown as SqliteSupplierRow | undefined;

    if (existing) {
      const code = data.code ?? existing.code;
      const status = data.status ? (data.status === 'ACTIVE' ? 1 : 0) : existing.is_active;
      db.prepare(`
        UPDATE suppliers SET
          code = ?,
          name = ?,
          contact_person = ?,
          phone = ?,
          address = ?,
          tax_id_npwp = ?,
          is_active = ?,
          notes = ?,
          updated_at = ?
        WHERE id = ? AND tenant_id = 'default-tenant'
      `).run(
        code,
        data.name.trim(),
        data.contactPerson ?? existing.contact_person,
        data.phone ?? existing.phone,
        data.address ?? existing.address,
        data.taxId ?? existing.tax_id_npwp,
        status,
        data.notes ?? existing.notes,
        now,
        data.id
      );
      return getSuppliersFromDb(db).find((s) => s.id === data.id)!;
    }
  }

  const id = data.id || `sup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  let code = data.code;
  if (!code) {
    const countRow = db.prepare('SELECT COUNT(*) AS c FROM suppliers;').get() as { c: number } | undefined;
    const nextNum = (countRow ? countRow.c : 0) + 1;
    code = `SPL-${String(nextNum).padStart(3, '0')}`;
  }
  const isActive = data.status === 'INACTIVE' ? 0 : 1;

  db.prepare(`
    INSERT INTO suppliers (
      id, tenant_id, code, name, contact_person, phone, address, tax_id_npwp, is_active, notes, created_at, updated_at
    ) VALUES (?, 'default-tenant', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    code,
    data.name.trim(),
    data.contactPerson ?? null,
    data.phone ?? null,
    data.address ?? null,
    data.taxId ?? null,
    isActive,
    data.notes ?? null,
    data.createdAt || now,
    now
  );

  return {
    id,
    code,
    name: data.name.trim(),
    contactPerson: data.contactPerson,
    phone: data.phone,
    address: data.address,
    taxId: data.taxId,
    notes: data.notes,
    status: isActive === 1 ? 'ACTIVE' : 'INACTIVE',
    createdAt: data.createdAt || now,
    updatedAt: now,
  };
}

export function deleteSupplierFromDb(db: DatabaseSync, id: string): boolean {
  seedMasterDataIfEmpty(db);
  const refRow = db.prepare(`
    SELECT COUNT(*) AS c FROM receiving_manifests WHERE supplier_id = ?;
  `).get(id) as { c: number } | undefined;

  if (refRow && refRow.c > 0) {
    throw new Error('Supplier is referenced by existing receiving manifests and cannot be deleted.');
  }

  const result = db.prepare(`
    DELETE FROM suppliers WHERE id = ? AND tenant_id = 'default-tenant';
  `).run(id);

  return Number(result.changes) > 0;
}


