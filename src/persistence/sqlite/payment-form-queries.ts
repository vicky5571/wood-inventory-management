/**
 * src/persistence/sqlite/payment-form-queries.ts
 *
 * SQLite relational queries and DDL for Weekly Payment Forms (Sabtu-Jumat AP batches).
 */

import type { DatabaseSync } from 'node:sqlite';
import type {
  PaymentForm,
  PaymentFormWithLines,
  PaymentFormLineItem,
  PaymentFormStatus,
  PaymentFormFilterCriteria,
} from '../../types/index.ts';

export function ensurePaymentFormTables(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_forms (
      id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      form_number TEXT NOT NULL, week_start_date TEXT NOT NULL, week_end_date TEXT NOT NULL,
      supplier_name TEXT NOT NULL, supplier_id TEXT, wood_species TEXT NOT NULL,
      contract_number TEXT NOT NULL DEFAULT '', record_ids TEXT NOT NULL, item_ids TEXT NOT NULL DEFAULT '[]',
      total_tally_volume_m3 REAL NOT NULL DEFAULT 0.0, total_tally_pieces INTEGER NOT NULL DEFAULT 0,
      total_timber_gross_idr REAL NOT NULL DEFAULT 0.0, total_timber_pph_idr REAL NOT NULL DEFAULT 0.0,
      total_timber_net_idr REAL NOT NULL DEFAULT 0.0,
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ISSUED','PAID','VOID')),
      issued_at TEXT, paid_at TEXT, invoice_number TEXT, payment_date TEXT, payment_method TEXT,
      notes TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, form_number)
    );
    CREATE INDEX IF NOT EXISTS idx_payment_forms_week ON payment_forms(tenant_id, week_start_date);
    CREATE INDEX IF NOT EXISTS idx_payment_forms_status ON payment_forms(tenant_id, status);
  `);

  try {
    const manifestCols = db.prepare(`PRAGMA table_info(receiving_manifests);`).all() as { name: string }[];
    if (!manifestCols.some((c) => c.name === 'payment_form_id')) {
      db.exec(`ALTER TABLE receiving_manifests ADD COLUMN payment_form_id TEXT REFERENCES payment_forms(id) ON DELETE SET NULL;`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_manifests_payment_form ON receiving_manifests(payment_form_id);`);
    }

    const itemCols = db.prepare(`PRAGMA table_info(receiving_items);`).all() as { name: string }[];
    if (!itemCols.some((c) => c.name === 'payment_form_id')) {
      db.exec(`ALTER TABLE receiving_items ADD COLUMN payment_form_id TEXT REFERENCES payment_forms(id) ON DELETE SET NULL;`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_items_payment_form ON receiving_items(payment_form_id);`);
    }
  } catch (err) {
    console.warn('Payment form column migrations notice:', err);
  }
}

function mapRowToPaymentForm(row: any): PaymentForm {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    formNumber: row.form_number,
    weekStartDate: row.week_start_date,
    weekEndDate: row.week_end_date,
    supplierName: row.supplier_name,
    supplierId: row.supplier_id || undefined,
    woodSpecies: row.wood_species,
    contractNumber: row.contract_number || '',
    recordIds: JSON.parse(row.record_ids || '[]'),
    itemIds: JSON.parse(row.item_ids || '[]'),
    totalTallyVolumeM3: Number(row.total_tally_volume_m3) || 0,
    totalTallyPieces: Number(row.total_tally_pieces) || 0,
    totalTimberGrossIDR: Number(row.total_timber_gross_idr) || 0,
    totalTimberPphIDR: Number(row.total_timber_pph_idr) || 0,
    totalTimberNetIDR: Number(row.total_timber_net_idr) || 0,
    status: row.status as PaymentFormStatus,
    issuedAt: row.issued_at || undefined,
    paidAt: row.paid_at || undefined,
    invoiceNumber: row.invoice_number || undefined,
    paymentDate: row.payment_date || undefined,
    paymentMethod: row.payment_method || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listPaymentForms(
  db: DatabaseSync,
  tenantId: string = 'default-tenant',
  filter?: PaymentFormFilterCriteria
): PaymentForm[] {
  let sql = `SELECT * FROM payment_forms WHERE tenant_id = ?`;
  const params: any[] = [tenantId];

  if (filter?.weekStartDate) {
    sql += ` AND week_start_date = ?`;
    params.push(filter.weekStartDate);
  }
  if (filter?.status && filter.status !== 'ALL') {
    sql += ` AND status = ?`;
    params.push(filter.status);
  }
  if (filter?.supplierName) {
    sql += ` AND LOWER(supplier_name) LIKE ?`;
    params.push(`%${filter.supplierName.trim().toLowerCase()}%`);
  }
  if (filter?.searchQuery) {
    sql += ` AND (LOWER(form_number) LIKE ? OR LOWER(supplier_name) LIKE ? OR LOWER(wood_species) LIKE ? OR LOWER(contract_number) LIKE ?)`;
    const q = `%${filter.searchQuery.trim().toLowerCase()}%`;
    params.push(q, q, q, q);
  }

  sql += ` ORDER BY week_start_date DESC, form_number ASC`;
  const rows = db.prepare(sql).all(...params);
  return rows.map(mapRowToPaymentForm);
}

export function getPaymentFormById(
  db: DatabaseSync,
  id: string,
  tenantId: string = 'default-tenant'
): PaymentFormWithLines | null {
  const row = db.prepare(`SELECT * FROM payment_forms WHERE id = ? AND tenant_id = ?`).get(id, tenantId) as any;
  if (!row) return null;
  const form = mapRowToPaymentForm(row);

  const lines: PaymentFormLineItem[] = [];
  if (form.recordIds.length > 0) {
    const placeholders = form.recordIds.map(() => '?').join(',');
    const flatRows = db.prepare(
      `SELECT * FROM v_buku_besar_flat WHERE id IN (${placeholders}) OR manifest_id IN (${placeholders})`
    ).all(...form.recordIds, ...form.recordIds) as any[];

    const seenIds = new Set<string>();
    for (const r of flatRows) {
      if (seenIds.has(r.id)) continue;
      seenIds.add(r.id);
      lines.push({
        recordId: r.id,
        itemId: r.item_id || undefined,
        receiptDate: r.receiptDate,
        truckPlateNumber: r.truckPlateNumber,
        forestryDocNumber: r.forestryDocNumber,
        receiptNumber: r.receiptNumber,
        kavlingNumber: r.kavlingNumber,
        tallyVolumeM3: r.tallyVolumeM3,
        tallyPieces: r.tallyPieces,
        timberPricePerM3: r.timberPricePerM3 ?? 0,
        timberGrossIDR: r.timberGrossTotal ?? 0,
        timberPphIDR: r.timberPphAmount ?? 0,
        timberNetIDR: r.timberNetPayable ?? 0,
      });
    }
  }

  return { ...form, lines };
}

export function createPaymentForm(db: DatabaseSync, form: PaymentForm): PaymentForm {
  db.prepare(`
    INSERT INTO payment_forms (
      id, tenant_id, form_number, week_start_date, week_end_date, supplier_name, supplier_id, wood_species,
      contract_number, record_ids, item_ids, total_tally_volume_m3, total_tally_pieces, total_timber_gross_idr,
      total_timber_pph_idr, total_timber_net_idr, status, issued_at, paid_at, invoice_number, payment_date,
      payment_method, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    form.id, form.tenantId, form.formNumber, form.weekStartDate, form.weekEndDate,
    form.supplierName, form.supplierId || null, form.woodSpecies, form.contractNumber || '',
    JSON.stringify(form.recordIds), JSON.stringify(form.itemIds),
    form.totalTallyVolumeM3, form.totalTallyPieces, form.totalTimberGrossIDR,
    form.totalTimberPphIDR, form.totalTimberNetIDR, form.status,
    form.issuedAt || null, form.paidAt || null, form.invoiceNumber || null,
    form.paymentDate || null, form.paymentMethod || null, form.notes || null,
    form.createdAt, form.updatedAt
  );

  linkRecordsToForm(db, form.id, form.recordIds, form.itemIds);
  return form;
}

export function linkRecordsToForm(db: DatabaseSync, formId: string, recordIds: string[], itemIds: string[] = []): void {
  for (const id of recordIds) {
    db.prepare(`UPDATE receiving_manifests SET payment_form_id = ? WHERE id = ?`).run(formId, id);
    db.prepare(`UPDATE receiving_items SET payment_form_id = ? WHERE id = ? OR manifest_id = ?`).run(formId, id, id);
  }
  for (const id of itemIds) {
    db.prepare(`UPDATE receiving_items SET payment_form_id = ? WHERE id = ?`).run(formId, id);
  }
}

export function unlinkRecordsFromForm(db: DatabaseSync, formId: string): void {
  db.prepare(`UPDATE receiving_manifests SET payment_form_id = NULL WHERE payment_form_id = ?`).run(formId);
  db.prepare(`UPDATE receiving_items SET payment_form_id = NULL WHERE payment_form_id = ?`).run(formId);
}

export function updatePaymentFormStatus(
  db: DatabaseSync,
  id: string,
  targetStatus: PaymentFormStatus,
  data?: { invoiceNumber?: string; paymentDate?: string; paymentMethod?: string; notes?: string },
  tenantId: string = 'default-tenant'
): PaymentFormWithLines {
  const existing = getPaymentFormById(db, id, tenantId);
  if (!existing) throw new Error(`Payment form ${id} not found`);

  // Valid transitions: DRAFT -> ISSUED | VOID; ISSUED -> PAID | VOID; PAID -> VOID
  const current = existing.status;
  const valid =
    (current === 'DRAFT' && (targetStatus === 'ISSUED' || targetStatus === 'VOID')) ||
    (current === 'ISSUED' && (targetStatus === 'PAID' || targetStatus === 'VOID')) ||
    (current === 'PAID' && targetStatus === 'VOID');

  if (!valid) {
    throw new Error(`Invalid status transition from ${current} to ${targetStatus}`);
  }

  const now = new Date().toISOString();
  let issuedAt = existing.issuedAt;
  let paidAt = existing.paidAt;
  let invNum = data?.invoiceNumber ?? existing.invoiceNumber;
  let pDate = data?.paymentDate ?? existing.paymentDate;
  let pMethod = data?.paymentMethod ?? existing.paymentMethod;

  if (targetStatus === 'ISSUED' && !issuedAt) issuedAt = now;
  if (targetStatus === 'PAID') {
    paidAt = now;
    for (const recId of existing.recordIds) {
      db.prepare(`
        UPDATE receiving_manifests
        SET payment_status = 'PAID', invoice_number = COALESCE(?, invoice_number), payment_date = COALESCE(?, payment_date)
        WHERE id = ?
      `).run(invNum || null, pDate || null, recId);
    }
  }

  if (targetStatus === 'VOID') {
    unlinkRecordsFromForm(db, id);
    for (const recId of existing.recordIds) {
      db.prepare(`UPDATE receiving_manifests SET payment_status = 'UNPAID' WHERE id = ?`).run(recId);
    }
  }

  db.prepare(`
    UPDATE payment_forms SET
      status = ?, issued_at = ?, paid_at = ?, invoice_number = ?, payment_date = ?,
      payment_method = ?, notes = COALESCE(?, notes), updated_at = ?
    WHERE id = ? AND tenant_id = ?
  `).run(targetStatus, issuedAt || null, paidAt || null, invNum || null, pDate || null, pMethod || null, data?.notes || null, now, id, tenantId);

  return getPaymentFormById(db, id, tenantId)!;
}
