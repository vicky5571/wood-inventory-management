/**
 * src/persistence/sqlite/payment-form-queries.ts
 *
 * SQLite relational queries and DDL for Weekly Payment Forms (Lembar Tagihan).
 */

import type { DatabaseSync } from 'node:sqlite';
import type {
  PaymentForm,
  PaymentFormWithLines,
  PaymentFormLineItem,
  PaymentFormStatus,
  PaymentFormFilterCriteria,
  LineItemUnit,
} from '../../types/index.ts';

interface PaymentFormRow {
  id: string;
  tenant_id: string;
  preprinted_number?: string;
  form_number?: string;
  issue_date?: string;
  week_start_date: string;
  week_end_date: string;
  supplier_name: string;
  supplier_id?: string | null;
  wood_species: string;
  species_id?: string | null;
  contract_number?: string | null;
  record_ids?: string;
  item_ids?: string;
  total_amount_idr?: number | null;
  terbilang?: string | null;
  total_tally_volume_m3?: number | null;
  total_tally_pieces?: number | null;
  total_timber_gross_idr?: number | null;
  total_timber_pph_idr?: number | null;
  total_timber_net_idr?: number | null;
  status: string;
  issued_at?: string | null;
  paid_at?: string | null;
  invoice_number?: string | null;
  payment_date?: string | null;
  payment_method?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

interface PaymentFormLineRow {
  id: string;
  payment_form_id: string;
  tenant_id: string;
  item_sequence: number;
  kategori: string;
  konten: string;
  tujuan: string;
  harga_satuan_idr: number;
  jumlah: number;
  unit: string;
  total_idr: number;
  source_record_id?: string | null;
  source_item_id?: string | null;
  notes?: string | null;
}

interface FlatBukuBesarRow {
  id: string;
  item_id?: string | null;
  manifest_id?: string | null;
  receiptDate?: string | null;
  truckPlateNumber?: string | null;
  forestryDocNumber?: string | null;
  receiptNumber?: string | null;
  kavlingNumber?: string | null;
  woodSpecies?: string | null;
  tallyVolumeM3?: number | null;
  tallyPieces?: number | null;
  timberPricePerM3?: number | null;
  timberGrossTotal?: number | null;
  timberPphAmount?: number | null;
  timberNetPayable?: number | null;
  notes?: string | null;
}

export function ensurePaymentFormTables(db: DatabaseSync): void {
  const tableCheck = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='payment_forms';`).get() as { sql: string } | undefined;
  if (tableCheck && tableCheck.sql) {
    if (tableCheck.sql.includes('UNIQUE(tenant_id, form_number)') || tableCheck.sql.includes('UNIQUE(tenant_id, preprinted_number)') || tableCheck.sql.includes('form_number')) {
      try {
        db.exec(`
          PRAGMA foreign_keys = OFF;
          CREATE TABLE payment_forms_dg_tmp (
            id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            preprinted_number TEXT NOT NULL DEFAULT '', issue_date TEXT NOT NULL DEFAULT '',
            week_start_date TEXT NOT NULL, week_end_date TEXT NOT NULL,
            supplier_name TEXT NOT NULL, supplier_id TEXT, wood_species TEXT NOT NULL,
            contract_number TEXT NOT NULL DEFAULT '', record_ids TEXT NOT NULL, item_ids TEXT NOT NULL DEFAULT '[]',
            total_amount_idr REAL NOT NULL DEFAULT 0.0, terbilang TEXT NOT NULL DEFAULT '',
            total_tally_volume_m3 REAL NOT NULL DEFAULT 0.0, total_tally_pieces INTEGER NOT NULL DEFAULT 0,
            total_timber_gross_idr REAL NOT NULL DEFAULT 0.0, total_timber_pph_idr REAL NOT NULL DEFAULT 0.0,
            total_timber_net_idr REAL NOT NULL DEFAULT 0.0,
            status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ISSUED','PAID','VOID')),
            issued_at TEXT, paid_at TEXT, invoice_number TEXT, payment_date TEXT, payment_method TEXT,
            notes TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
        `);

        const cols = db.prepare(`PRAGMA table_info(payment_forms);`).all() as { name: string }[];
        const colNames = new Set(cols.map((c) => c.name));
        const numCol = colNames.has('preprinted_number') ? 'preprinted_number' : 'form_number';
        const dateCol = colNames.has('issue_date') ? 'issue_date' : "''";
        const terbilangCol = colNames.has('terbilang') ? 'terbilang' : "''";
        const totCol = colNames.has('total_amount_idr') ? 'total_amount_idr' : 'total_timber_net_idr';

        db.exec(`
          INSERT INTO payment_forms_dg_tmp (
            id, tenant_id, preprinted_number, issue_date, week_start_date, week_end_date,
            supplier_name, supplier_id, wood_species, contract_number, record_ids, item_ids,
            total_amount_idr, terbilang, total_tally_volume_m3, total_tally_pieces,
            total_timber_gross_idr, total_timber_pph_idr, total_timber_net_idr, status,
            issued_at, paid_at, invoice_number, payment_date, payment_method, notes,
            created_at, updated_at
          ) SELECT
            id, tenant_id, ${numCol}, ${dateCol}, week_start_date, week_end_date,
            supplier_name, supplier_id, wood_species, contract_number, record_ids, item_ids,
            ${totCol}, ${terbilangCol}, total_tally_volume_m3, total_tally_pieces,
            total_timber_gross_idr, total_timber_pph_idr, total_timber_net_idr, status,
            issued_at, paid_at, invoice_number, payment_date, payment_method, notes,
            created_at, updated_at
          FROM payment_forms;

          DROP TABLE payment_forms;
          ALTER TABLE payment_forms_dg_tmp RENAME TO payment_forms;
          CREATE INDEX IF NOT EXISTS idx_payment_forms_week ON payment_forms(tenant_id, week_start_date);
          CREATE INDEX IF NOT EXISTS idx_payment_forms_status ON payment_forms(tenant_id, status);
          PRAGMA foreign_keys = ON;
        `);
      } catch (e) {
        console.error('Failed to rebuild payment_forms table:', e);
      }
    }
  } else {
    db.exec(`
      CREATE TABLE IF NOT EXISTS payment_forms (
        id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        preprinted_number TEXT NOT NULL DEFAULT '', issue_date TEXT NOT NULL DEFAULT '',
        week_start_date TEXT NOT NULL, week_end_date TEXT NOT NULL,
        supplier_name TEXT NOT NULL, supplier_id TEXT, wood_species TEXT NOT NULL,
        contract_number TEXT NOT NULL DEFAULT '', record_ids TEXT NOT NULL, item_ids TEXT NOT NULL DEFAULT '[]',
        total_amount_idr REAL NOT NULL DEFAULT 0.0, terbilang TEXT NOT NULL DEFAULT '',
        total_tally_volume_m3 REAL NOT NULL DEFAULT 0.0, total_tally_pieces INTEGER NOT NULL DEFAULT 0,
        total_timber_gross_idr REAL NOT NULL DEFAULT 0.0, total_timber_pph_idr REAL NOT NULL DEFAULT 0.0,
        total_timber_net_idr REAL NOT NULL DEFAULT 0.0,
        status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ISSUED','PAID','VOID')),
        issued_at TEXT, paid_at TEXT, invoice_number TEXT, payment_date TEXT, payment_method TEXT,
        notes TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_payment_forms_week ON payment_forms(tenant_id, week_start_date);
      CREATE INDEX IF NOT EXISTS idx_payment_forms_status ON payment_forms(tenant_id, status);
    `);
  }

  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_payment_forms_supplier ON payment_forms(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_payment_forms_status ON payment_forms(status);
      UPDATE payment_forms
      SET supplier_id = (
        SELECT id FROM suppliers
        WHERE LOWER(name) = LOWER(payment_forms.supplier_name)
        LIMIT 1
      )
      WHERE supplier_id IS NULL OR supplier_id = '';
    `);
  } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_form_lines (
      id TEXT PRIMARY KEY, payment_form_id TEXT NOT NULL REFERENCES payment_forms(id) ON DELETE CASCADE,
      tenant_id TEXT NOT NULL DEFAULT 'default-tenant', item_sequence INTEGER NOT NULL DEFAULT 1,
      kategori TEXT NOT NULL DEFAULT '', konten TEXT NOT NULL DEFAULT '', tujuan TEXT NOT NULL DEFAULT '',
      harga_satuan_idr REAL NOT NULL DEFAULT 0.0, jumlah REAL NOT NULL DEFAULT 0.0,
      unit TEXT NOT NULL DEFAULT 'm³' CHECK (unit IN ('m³', 'batang', 'rit', 'lain-lain')),
      total_idr REAL NOT NULL DEFAULT 0.0, source_record_id TEXT, source_item_id TEXT, notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_payment_form_lines_form ON payment_form_lines(payment_form_id);
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
    const formCols = db.prepare(`PRAGMA table_info(payment_forms);`).all() as { name: string }[];
    if (!formCols.some((c) => c.name === 'species_id')) {
      db.exec(`ALTER TABLE payment_forms ADD COLUMN species_id TEXT REFERENCES wood_species(id) ON DELETE SET NULL;`);
    }
  } catch (err) {
    console.warn('Payment form column migrations notice:', err);
  }
}

function resolveSupplierId(db: DatabaseSync, supplierName?: string): string | null {
  if (!supplierName) return null;
  try {
    const row = db.prepare('SELECT id FROM suppliers WHERE LOWER(name) = LOWER(?) LIMIT 1').get(supplierName.trim()) as { id: string } | undefined;
    return row?.id ?? null;
  } catch {
    return null;
  }
}

function resolveSpeciesId(db: DatabaseSync, woodSpeciesName?: string): string | null {
  if (!woodSpeciesName) return null;
  try {
    const row = db.prepare('SELECT id FROM wood_species WHERE LOWER(common_name) = LOWER(?) LIMIT 1').get(woodSpeciesName.trim()) as { id: string } | undefined;
    return row?.id ?? null;
  } catch {
    return null;
  }
}

function mapRowToPaymentForm(row: PaymentFormRow): PaymentForm {
  return {
    id: row.id, tenantId: row.tenant_id,
    preprintedNumber: row.preprinted_number ?? row.form_number ?? '',
    issueDate: row.issue_date || '',
    weekStartDate: row.week_start_date, weekEndDate: row.week_end_date,
    supplierName: row.supplier_name, supplierId: row.supplier_id || '',
    woodSpecies: row.wood_species, speciesId: row.species_id || undefined, contractNumber: row.contract_number || '', lines: [],
    recordIds: JSON.parse(row.record_ids || '[]'), itemIds: JSON.parse(row.item_ids || '[]'),
    totalAmountIDR: Number(row.total_amount_idr) || Number(row.total_timber_net_idr) || 0,
    terbilang: row.terbilang || '', totalTallyVolumeM3: Number(row.total_tally_volume_m3) || 0,
    totalTallyPieces: Number(row.total_tally_pieces) || 0, totalTimberGrossIDR: Number(row.total_timber_gross_idr) || 0,
    totalTimberPphIDR: Number(row.total_timber_pph_idr) || 0, totalTimberNetIDR: Number(row.total_timber_net_idr) || 0,
    status: row.status as PaymentFormStatus, issuedAt: row.issued_at || undefined, paidAt: row.paid_at || undefined,
    invoiceNumber: row.invoice_number || undefined, paymentDate: row.payment_date || undefined,
    paymentMethod: row.payment_method || undefined, notes: row.notes || undefined,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export function listPaymentForms(db: DatabaseSync, tenantId: string = 'default-tenant', filter?: PaymentFormFilterCriteria): PaymentForm[] {
  let sql = `SELECT * FROM payment_forms WHERE tenant_id = ?`;
  const params: string[] = [tenantId];
  if (filter?.weekStartDate) { sql += ` AND week_start_date = ?`; params.push(filter.weekStartDate); }
  if (filter?.status && filter.status !== 'ALL') { sql += ` AND status = ?`; params.push(filter.status); }
  if (filter?.supplierName) { sql += ` AND LOWER(supplier_name) LIKE ?`; params.push(`%${filter.supplierName.trim().toLowerCase()}%`); }
  if (filter?.searchQuery) {
    sql += ` AND (LOWER(preprinted_number) LIKE ? OR LOWER(supplier_name) LIKE ? OR LOWER(wood_species) LIKE ? OR LOWER(contract_number) LIKE ?)`;
    const q = `%${filter.searchQuery.trim().toLowerCase()}%`;
    params.push(q, q, q, q);
  }
  sql += ` ORDER BY week_start_date DESC, preprinted_number ASC`;
  return (db.prepare(sql).all(...params) as unknown as PaymentFormRow[]).map(mapRowToPaymentForm);
}

export function getPaymentFormById(db: DatabaseSync, id: string, tenantId: string = 'default-tenant'): PaymentFormWithLines | null {
  const row = db.prepare(`SELECT * FROM payment_forms WHERE id = ? AND tenant_id = ?`).get(id, tenantId) as unknown as PaymentFormRow | undefined;
  if (!row) return null;
  const form = mapRowToPaymentForm(row);
  const lineRows = db.prepare(`SELECT * FROM payment_form_lines WHERE payment_form_id = ? ORDER BY item_sequence ASC`).all(id) as unknown as PaymentFormLineRow[];

  const lines: PaymentFormLineItem[] = lineRows.map((r) => ({
    id: r.id, paymentFormId: r.payment_form_id, itemSequence: r.item_sequence,
    kategori: r.kategori, konten: r.konten, tujuan: r.tujuan,
    hargaSatuanIDR: Number(r.harga_satuan_idr) || 0, jumlah: Number(r.jumlah) || 0,
    unit: r.unit as LineItemUnit, totalIDR: Number(r.total_idr) || 0,
    sourceRecordId: r.source_record_id || undefined, sourceItemId: r.source_item_id || undefined, notes: r.notes || undefined,
  }));

  if (lines.length === 0 && form.recordIds.length > 0) {
    const placeholders = form.recordIds.map(() => '?').join(',');
    const flatRows = db.prepare(`SELECT * FROM v_buku_besar_flat WHERE id IN (${placeholders}) OR manifest_id IN (${placeholders})`).all(...form.recordIds, ...form.recordIds) as unknown as FlatBukuBesarRow[];
    const seen = new Set<string>();
    let seq = 1;
    for (const r of flatRows) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      const harga = Number(r.timberPricePerM3) || 0;
      const vol = Number(r.tallyVolumeM3) || 0;
      lines.push({
        id: `line-${r.id}`, paymentFormId: form.id, itemSequence: seq++,
        kategori: 'Pembelian Kayu', konten: `${r.forestryDocNumber || '—'} - ${r.woodSpecies || form.woodSpecies}`,
        tujuan: form.supplierName, hargaSatuanIDR: harga, jumlah: vol, unit: 'm³',
        totalIDR: Number(r.timberNetPayable) || (harga * vol), sourceRecordId: r.id,
        sourceItemId: r.item_id || undefined, notes: r.notes || undefined,
      });
    }
  }

  return { ...form, lines };
}

export function createPaymentForm(db: DatabaseSync, form: PaymentForm): PaymentForm {
  if (!form.supplierId) {
    const sId = resolveSupplierId(db, form.supplierName);
    if (sId) {
      form.supplierId = sId;
    }
  }
  const speciesId = form.speciesId || resolveSpeciesId(db, form.woodSpecies);
  db.prepare(`
    INSERT INTO payment_forms (
      id, tenant_id, preprinted_number, issue_date, week_start_date, week_end_date, supplier_name, supplier_id, wood_species, species_id,
      contract_number, record_ids, item_ids, total_amount_idr, terbilang, total_tally_volume_m3, total_tally_pieces,
      total_timber_gross_idr, total_timber_pph_idr, total_timber_net_idr, status, issued_at, paid_at, invoice_number,
      payment_date, payment_method, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    form.id, form.tenantId, form.preprintedNumber || '', form.issueDate || '', form.weekStartDate, form.weekEndDate,
    form.supplierName, form.supplierId || null, form.woodSpecies, speciesId, form.contractNumber || '',
    JSON.stringify(form.recordIds), JSON.stringify(form.itemIds), form.totalAmountIDR || 0, form.terbilang || '',
    form.totalTallyVolumeM3, form.totalTallyPieces, form.totalTimberGrossIDR, form.totalTimberPphIDR, form.totalTimberNetIDR,
    form.status, form.issuedAt || null, form.paidAt || null, form.invoiceNumber || null, form.paymentDate || null,
    form.paymentMethod || null, form.notes || null, form.createdAt, form.updatedAt
  );

  if (form.lines && form.lines.length > 0) {
    const insertLine = db.prepare(`
      INSERT OR REPLACE INTO payment_form_lines (
        id, payment_form_id, tenant_id, item_sequence, kategori, konten, tujuan,
        harga_satuan_idr, jumlah, unit, total_idr, source_record_id, source_item_id, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    form.lines.forEach((l, i) => insertLine.run(
      l.id || `line-${form.id}-${i + 1}`, form.id, form.tenantId || 'default-tenant', l.itemSequence || (i + 1),
      l.kategori || 'Pembelian Kayu', l.konten || '', l.tujuan || form.supplierName, l.hargaSatuanIDR ?? 0,
      l.jumlah ?? 0, l.unit || 'm³', l.totalIDR ?? ((l.hargaSatuanIDR ?? 0) * (l.jumlah ?? 0)),
      l.sourceRecordId || null, l.sourceItemId || null, l.notes || null, form.createdAt, form.updatedAt
    ));
  }
  linkRecordsToForm(db, form.id, form.recordIds, form.itemIds);
  return form;
}

export function updatePaymentForm(db: DatabaseSync, id: string, updates: Partial<PaymentForm>, tenantId: string = 'default-tenant'): PaymentFormWithLines {
  const existing = getPaymentFormById(db, id, tenantId);
  if (!existing) throw new Error(`Payment form ${id} not found`);
  const prepNum = updates.preprintedNumber !== undefined ? updates.preprintedNumber : existing.preprintedNumber;
  const issDate = updates.issueDate !== undefined ? updates.issueDate : existing.issueDate;
  const totAmount = updates.totalAmountIDR !== undefined ? updates.totalAmountIDR : existing.totalAmountIDR;
  const terb = updates.terbilang !== undefined ? updates.terbilang : existing.terbilang;
  const notes = updates.notes !== undefined ? updates.notes : existing.notes;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE payment_forms SET preprinted_number = ?, issue_date = ?, total_amount_idr = ?, terbilang = ?, notes = ?, updated_at = ?
    WHERE id = ? AND tenant_id = ?
  `).run(prepNum, issDate, totAmount, terb, notes || null, now, id, tenantId);

  if (updates.lines && Array.isArray(updates.lines)) {
    db.prepare(`DELETE FROM payment_form_lines WHERE payment_form_id = ?`).run(id);
    const insertLine = db.prepare(`
      INSERT OR REPLACE INTO payment_form_lines (
        id, payment_form_id, tenant_id, item_sequence, kategori, konten, tujuan,
        harga_satuan_idr, jumlah, unit, total_idr, source_record_id, source_item_id, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    updates.lines.forEach((l, i) => insertLine.run(
      l.id || `line-${id}-${i + 1}`, id, tenantId, l.itemSequence || (i + 1),
      l.kategori || 'Pembelian Kayu', l.konten || '', l.tujuan || existing.supplierName, l.hargaSatuanIDR ?? 0,
      l.jumlah ?? 0, l.unit || 'm³', l.totalIDR ?? ((l.hargaSatuanIDR ?? 0) * (l.jumlah ?? 0)),
      l.sourceRecordId || null, l.sourceItemId || null, l.notes || null, now, now
    ));
  }
  return getPaymentFormById(db, id, tenantId)!;
}

export function linkRecordsToForm(db: DatabaseSync, formId: string, recordIds: string[], itemIds: string[] = []): void {
  for (const id of recordIds) {
    db.prepare(`UPDATE receiving_manifests SET payment_form_id = ? WHERE id = ?`).run(formId, id);
    db.prepare(`UPDATE receiving_items SET payment_form_id = ? WHERE id = ? OR manifest_id = ?`).run(formId, id, id);
  }
  for (const id of itemIds) db.prepare(`UPDATE receiving_items SET payment_form_id = ? WHERE id = ?`).run(formId, id);
}

export function unlinkRecordsFromForm(db: DatabaseSync, formId: string): void {
  db.prepare(`UPDATE receiving_manifests SET payment_form_id = NULL WHERE payment_form_id = ?`).run(formId);
  db.prepare(`UPDATE receiving_items SET payment_form_id = NULL WHERE payment_form_id = ?`).run(formId);
}

function generateFormNumber(db: DatabaseSync, tenantId: string, issueDate: string): string {
  const yyyymm = issueDate.slice(0, 7).replace('-', ''); // "2026-11-03" → "202611"
  const prefix = `KWT-${yyyymm}-`;
  const row = db.prepare(`
    SELECT COALESCE(MAX(CAST(SUBSTR(preprinted_number, ?) AS INTEGER)), 0) + 1 AS next_seq
    FROM payment_forms
    WHERE tenant_id = ?
      AND preprinted_number LIKE ?
      AND status != 'VOID'
  `).get(prefix.length + 1, tenantId, `${prefix}%`) as { next_seq: number };
  const seq = String(row.next_seq).padStart(4, '0');
  return `${prefix}${seq}`;
}

export function updatePaymentFormStatus(
  db: DatabaseSync, id: string, targetStatus: PaymentFormStatus,
  data?: { invoiceNumber?: string; paymentDate?: string; paymentMethod?: string; notes?: string; issueDate?: string },
  tenantId: string = 'default-tenant'
): PaymentFormWithLines {
  const existing = getPaymentFormById(db, id, tenantId);
  if (!existing) throw new Error(`Payment form ${id} not found`);

  const current = existing.status;
  const valid = (current === 'DRAFT' && (targetStatus === 'ISSUED' || targetStatus === 'VOID')) ||
    (current === 'ISSUED' && (targetStatus === 'PAID' || targetStatus === 'VOID')) ||
    (current === 'PAID' && targetStatus === 'VOID');
  if (!valid) throw new Error(`Invalid status transition from ${current} to ${targetStatus}`);

  const issDate = data?.issueDate !== undefined ? data.issueDate : existing.issueDate;
  if (targetStatus === 'ISSUED') {
    if (!issDate.trim()) throw new Error('Tanggal Terbit (issueDate) wajib diisi sebelum menerbitkan form');
  }

  // Auto-generate form number at ISSUED transition (ADR-0016)
  const prepNum = (targetStatus === 'ISSUED' && !existing.preprintedNumber.trim())
    ? generateFormNumber(db, tenantId, issDate)
    : existing.preprintedNumber;

  const now = new Date().toISOString();
  let issuedAt = existing.issuedAt;
  let paidAt = existing.paidAt;
  if (targetStatus === 'ISSUED' && !issuedAt) issuedAt = now;
  if (targetStatus === 'PAID') {
    paidAt = now;
    for (const recId of existing.recordIds) {
      db.prepare(`UPDATE receiving_manifests SET payment_status = 'PAID', invoice_number = COALESCE(?, invoice_number), payment_date = COALESCE(?, payment_date) WHERE id = ?`)
        .run(data?.invoiceNumber || null, data?.paymentDate || null, recId);
    }
  }
  if (targetStatus === 'VOID') {
    unlinkRecordsFromForm(db, id);
    for (const recId of existing.recordIds) db.prepare(`UPDATE receiving_manifests SET payment_status = 'UNPAID' WHERE id = ?`).run(recId);
  }

  db.prepare(`
    UPDATE payment_forms SET
      preprinted_number = ?, issue_date = ?, status = ?, issued_at = ?, paid_at = ?,
      invoice_number = COALESCE(?, invoice_number), payment_date = COALESCE(?, payment_date),
      payment_method = COALESCE(?, payment_method), notes = COALESCE(?, notes), updated_at = ?
    WHERE id = ? AND tenant_id = ?
  `).run(prepNum, issDate, targetStatus, issuedAt || null, paidAt || null, data?.invoiceNumber || null, data?.paymentDate || null, data?.paymentMethod || null, data?.notes || null, now, id, tenantId);

  return getPaymentFormById(db, id, tenantId)!;
}
