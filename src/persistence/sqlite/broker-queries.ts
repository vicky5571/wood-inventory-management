import type { DatabaseSync } from 'node:sqlite';
import type { Broker } from '../../types/index.ts';
import { SEED_BROKERS } from '../seed-data.ts';

interface SqliteBrokerRow {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  address: string | null;
  tax_id: string | null;
  default_commission_per_m3: number | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function mapBrokerRow(row: SqliteBrokerRow): Broker {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    code: row.code,
    name: row.name,
    contactPerson: row.contact_person ?? undefined,
    phone: row.phone ?? undefined,
    address: row.address ?? undefined,
    taxId: row.tax_id ?? undefined,
    defaultCommissionPerM3: row.default_commission_per_m3 !== null ? Number(row.default_commission_per_m3) : undefined,
    notes: row.notes ?? undefined,
    status: row.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function seedBrokersIfEmpty(db: DatabaseSync): void {
  try {
    db.prepare(`
      INSERT OR IGNORE INTO tenants (id, name, slug) VALUES ('default-tenant', 'Default Tenant', 'default-tenant');
    `).run();
  } catch {}

  const countRow = db.prepare('SELECT COUNT(*) AS c FROM brokers;').get() as { c: number } | undefined;
  if (!countRow || countRow.c === 0) {
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO brokers (
        id, tenant_id, code, name, contact_person, phone, address, tax_id,
        default_commission_per_m3, notes, status, created_at, updated_at
      ) VALUES (?, 'default-tenant', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);
    for (const b of SEED_BROKERS) {
      insertStmt.run(
        b.id,
        b.code,
        b.name,
        b.contactPerson ?? null,
        b.phone ?? null,
        b.address ?? null,
        b.taxId ?? null,
        b.defaultCommissionPerM3 ?? null,
        b.notes ?? null,
        b.status || 'ACTIVE',
        b.createdAt || new Date().toISOString(),
        b.updatedAt || new Date().toISOString()
      );
    }
  }
}

export function getBrokersFromDb(db: DatabaseSync): Broker[] {
  seedBrokersIfEmpty(db);
  const rows = db.prepare(`
    SELECT * FROM brokers WHERE tenant_id = 'default-tenant' ORDER BY name ASC;
  `).all() as unknown as SqliteBrokerRow[];
  return rows.map(mapBrokerRow);
}

export function saveBrokerToDb(
  db: DatabaseSync,
  data: Partial<Broker> & { name: string }
): Broker {
  seedBrokersIfEmpty(db);
  const now = new Date().toISOString();

  if (data.id) {
    const existing = db.prepare(`
      SELECT * FROM brokers WHERE id = ? AND tenant_id = 'default-tenant'
    `).get(data.id) as unknown as SqliteBrokerRow | undefined;

    if (existing) {
      const code = data.code ?? existing.code;
      const status = data.status ?? existing.status;
      db.prepare(`
        UPDATE brokers SET
          code = ?,
          name = ?,
          contact_person = ?,
          phone = ?,
          address = ?,
          tax_id = ?,
          default_commission_per_m3 = ?,
          notes = ?,
          status = ?,
          updated_at = ?
        WHERE id = ? AND tenant_id = 'default-tenant'
      `).run(
        code,
        data.name.trim(),
        data.contactPerson !== undefined ? (data.contactPerson || null) : existing.contact_person,
        data.phone !== undefined ? (data.phone || null) : existing.phone,
        data.address !== undefined ? (data.address || null) : existing.address,
        data.taxId !== undefined ? (data.taxId || null) : existing.tax_id,
        data.defaultCommissionPerM3 !== undefined ? data.defaultCommissionPerM3 : existing.default_commission_per_m3,
        data.notes !== undefined ? (data.notes || null) : existing.notes,
        status,
        now,
        data.id
      );
      return getBrokersFromDb(db).find((b) => b.id === data.id)!;
    }
  }

  const id = data.id || `brk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  let code = data.code;
  if (!code) {
    const countRow = db.prepare('SELECT COUNT(*) AS c FROM brokers;').get() as { c: number } | undefined;
    const nextNum = (countRow ? countRow.c : 0) + 1;
    code = `BRK-${String(nextNum).padStart(3, '0')}`;
  }
  const status = data.status || 'ACTIVE';

  db.prepare(`
    INSERT INTO brokers (
      id, tenant_id, code, name, contact_person, phone, address, tax_id,
      default_commission_per_m3, notes, status, created_at, updated_at
    ) VALUES (?, 'default-tenant', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    code,
    data.name.trim(),
    data.contactPerson ?? null,
    data.phone ?? null,
    data.address ?? null,
    data.taxId ?? null,
    data.defaultCommissionPerM3 ?? null,
    data.notes ?? null,
    status,
    data.createdAt || now,
    now
  );

  return getBrokersFromDb(db).find((b) => b.id === id)!;
}

export function deleteBrokerFromDb(db: DatabaseSync, id: string): boolean {
  seedBrokersIfEmpty(db);
  // Soft-delete per specification
  const result = db.prepare(`
    UPDATE brokers SET status = 'INACTIVE', updated_at = datetime('now')
    WHERE id = ? AND tenant_id = 'default-tenant';
  `).run(id);
  return Number(result.changes) > 0;
}
