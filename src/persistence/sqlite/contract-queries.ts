/**
 * src/persistence/sqlite/contract-queries.ts
 *
 * SQLite relational queries and DDL for Perhutani Procurement Contracts,
 * sortimen line items, and kwitansi receipts.
 */

import type { DatabaseSync } from 'node:sqlite';
import type {
  PerhutaniContract,
  ContractSortimentItem,
  ContractReceipt,
  ContractStatus,
} from '../../types/index.ts';
import {
  SEED_PERHUTANI_CONTRACTS,
  SEED_CONTRACT_ITEMS,
  SEED_CONTRACT_RECEIPTS,
} from '../seed/fixtures.ts';

export function ensureContractTables(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS perhutani_contracts (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
      contract_number TEXT NOT NULL,
      contract_date TEXT NOT NULL,
      effective_start_date TEXT NOT NULL,
      effective_end_date TEXT NOT NULL,
      kph_origin TEXT NOT NULL,
      po_number TEXT,
      total_contract_value_idr REAL NOT NULL DEFAULT 0.0,
      total_purchased_volume_m3 REAL NOT NULL DEFAULT 0.0,
      total_purchased_pieces INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'FULFILLED', 'EXPIRED', 'CANCELLED')),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, contract_number)
    );
    CREATE INDEX IF NOT EXISTS idx_contracts_tenant ON perhutani_contracts(tenant_id, contract_number);
    CREATE INDEX IF NOT EXISTS idx_contracts_status ON perhutani_contracts(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_contracts_dates ON perhutani_contracts(tenant_id, effective_end_date);

    CREATE TABLE IF NOT EXISTS contract_sortiment_items (
      id TEXT PRIMARY KEY,
      contract_id TEXT NOT NULL REFERENCES perhutani_contracts(id) ON DELETE CASCADE,
      tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
      item_sequence INTEGER NOT NULL DEFAULT 1,
      wood_species TEXT NOT NULL,
      grade TEXT NOT NULL,
      wood_length_m REAL,
      volume_m3 REAL NOT NULL CHECK (volume_m3 >= 0),
      pieces INTEGER,
      price_per_m3 REAL NOT NULL DEFAULT 0.0,
      subtotal_idr REAL NOT NULL DEFAULT 0.0,
      notes TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sortiment_contract ON contract_sortiment_items(contract_id);

    CREATE TABLE IF NOT EXISTS contract_receipts (
      id TEXT PRIMARY KEY,
      contract_id TEXT NOT NULL REFERENCES perhutani_contracts(id) ON DELETE CASCADE,
      tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
      receipt_number TEXT NOT NULL,
      receipt_date TEXT NOT NULL,
      amount_idr REAL NOT NULL DEFAULT 0.0 CHECK (amount_idr >= 0),
      covered_volume_m3 REAL NOT NULL DEFAULT 0.0,
      covered_pieces INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, receipt_number)
    );
    CREATE INDEX IF NOT EXISTS idx_receipts_contract ON contract_receipts(contract_id);
  `);
}

function mapRowToContract(row: Record<string, unknown>): PerhutaniContract {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    contractNumber: String(row.contract_number),
    contractDate: String(row.contract_date),
    effectiveStartDate: String(row.effective_start_date),
    effectiveEndDate: String(row.effective_end_date),
    kphOrigin: String(row.kph_origin),
    poNumber: row.po_number ? String(row.po_number) : undefined,
    totalContractValueIDR: Number(row.total_contract_value_idr),
    totalPurchasedVolumeM3: Number(row.total_purchased_volume_m3),
    totalPurchasedPieces: Number(row.total_purchased_pieces),
    status: (row.status as ContractStatus) || 'ACTIVE',
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapRowToSortiment(row: Record<string, unknown>): ContractSortimentItem {
  return {
    id: String(row.id),
    contractId: String(row.contract_id),
    tenantId: String(row.tenant_id),
    itemSequence: Number(row.item_sequence),
    woodSpecies: String(row.wood_species),
    grade: String(row.grade),
    woodLengthM: row.wood_length_m !== null ? Number(row.wood_length_m) : undefined,
    volumeM3: Number(row.volume_m3),
    pieces: row.pieces !== null ? Number(row.pieces) : undefined,
    pricePerM3: Number(row.price_per_m3),
    subtotalIDR: Number(row.subtotal_idr),
    notes: row.notes ? String(row.notes) : undefined,
  };
}

function mapRowToReceipt(row: Record<string, unknown>): ContractReceipt {
  return {
    id: String(row.id),
    contractId: String(row.contract_id),
    tenantId: String(row.tenant_id),
    receiptNumber: String(row.receipt_number),
    receiptDate: String(row.receipt_date),
    amountIDR: Number(row.amount_idr),
    coveredVolumeM3: Number(row.covered_volume_m3),
    coveredPieces: row.covered_pieces !== null ? Number(row.covered_pieces) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export class ContractQueries {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
    ensureContractTables(db);
  }

  public getAll(tenantId: string = 'default-tenant'): PerhutaniContract[] {
    const stmt = this.db.prepare(
      `SELECT * FROM perhutani_contracts WHERE tenant_id = ? ORDER BY contract_date DESC, created_at DESC`
    );
    const rows = stmt.all(tenantId) as Record<string, unknown>[];
    return rows.map(mapRowToContract);
  }

  public getById(id: string): PerhutaniContract | null {
    const stmt = this.db.prepare(`SELECT * FROM perhutani_contracts WHERE id = ? LIMIT 1`);
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    return row ? mapRowToContract(row) : null;
  }

  public getItemsByContractId(contractId: string): ContractSortimentItem[] {
    const stmt = this.db.prepare(
      `SELECT * FROM contract_sortiment_items WHERE contract_id = ? ORDER BY item_sequence ASC`
    );
    const rows = stmt.all(contractId) as Record<string, unknown>[];
    return rows.map(mapRowToSortiment);
  }

  public getReceiptsByContractId(contractId: string): ContractReceipt[] {
    const stmt = this.db.prepare(
      `SELECT * FROM contract_receipts WHERE contract_id = ? ORDER BY receipt_date ASC, created_at ASC`
    );
    const rows = stmt.all(contractId) as Record<string, unknown>[];
    return rows.map(mapRowToReceipt);
  }

  public getAllReceipts(tenantId: string = 'default-tenant'): ContractReceipt[] {
    const stmt = this.db.prepare(
      `SELECT * FROM contract_receipts WHERE tenant_id = ? ORDER BY receipt_date ASC`
    );
    const rows = stmt.all(tenantId) as Record<string, unknown>[];
    return rows.map(mapRowToReceipt);
  }

  public insertContract(c: PerhutaniContract): PerhutaniContract {
    const stmt = this.db.prepare(`
      INSERT INTO perhutani_contracts (
        id, tenant_id, contract_number, contract_date, effective_start_date, effective_end_date,
        kph_origin, po_number, total_contract_value_idr, total_purchased_volume_m3,
        total_purchased_pieces, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      c.id, c.tenantId, c.contractNumber, c.contractDate, c.effectiveStartDate, c.effectiveEndDate,
      c.kphOrigin, c.poNumber ?? null, c.totalContractValueIDR, c.totalPurchasedVolumeM3,
      c.totalPurchasedPieces, c.status, c.notes ?? null, c.createdAt, c.updatedAt
    );
    return c;
  }

  public updateContract(c: PerhutaniContract): PerhutaniContract {
    const stmt = this.db.prepare(`
      UPDATE perhutani_contracts SET
        contract_number = ?, contract_date = ?, effective_start_date = ?, effective_end_date = ?,
        kph_origin = ?, po_number = ?, total_contract_value_idr = ?, total_purchased_volume_m3 = ?,
        total_purchased_pieces = ?, status = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(
      c.contractNumber, c.contractDate, c.effectiveStartDate, c.effectiveEndDate,
      c.kphOrigin, c.poNumber ?? null, c.totalContractValueIDR, c.totalPurchasedVolumeM3,
      c.totalPurchasedPieces, c.status, c.notes ?? null, c.updatedAt, c.id
    );
    return c;
  }

  public deleteContract(id: string): void {
    this.db.prepare(`DELETE FROM perhutani_contracts WHERE id = ?`).run(id);
  }

  public replaceItems(contractId: string, items: ContractSortimentItem[]): void {
    this.db.prepare(`DELETE FROM contract_sortiment_items WHERE contract_id = ?`).run(contractId);
    const stmt = this.db.prepare(`
      INSERT INTO contract_sortiment_items (
        id, contract_id, tenant_id, item_sequence, wood_species, grade,
        wood_length_m, volume_m3, pieces, price_per_m3, subtotal_idr, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of items) {
      stmt.run(
        item.id, contractId, item.tenantId, item.itemSequence, item.woodSpecies, item.grade,
        item.woodLengthM ?? null, item.volumeM3, item.pieces ?? null, item.pricePerM3,
        item.subtotalIDR, item.notes ?? null
      );
    }
  }

  public insertReceipt(r: ContractReceipt): ContractReceipt {
    const stmt = this.db.prepare(`
      INSERT INTO contract_receipts (
        id, contract_id, tenant_id, receipt_number, receipt_date, amount_idr,
        covered_volume_m3, covered_pieces, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      r.id, r.contractId, r.tenantId, r.receiptNumber, r.receiptDate, r.amountIDR,
      r.coveredVolumeM3, r.coveredPieces ?? null, r.notes ?? null, r.createdAt, r.updatedAt
    );
    return r;
  }

  public deleteReceipt(receiptId: string): void {
    this.db.prepare(`DELETE FROM contract_receipts WHERE id = ?`).run(receiptId);
  }
}

export function seedContractsIfEmpty(db: DatabaseSync): void {
  ensureContractTables(db);
  const countRow = db.prepare(`SELECT count(*) as count FROM perhutani_contracts`).get() as { count: number };
  if (countRow.count === 0) {
    const q = new ContractQueries(db);
    for (const contract of SEED_PERHUTANI_CONTRACTS) {
      q.insertContract(contract);
    }
    for (const item of SEED_CONTRACT_ITEMS) {
      q.replaceItems(item.contractId, SEED_CONTRACT_ITEMS.filter((i) => i.contractId === item.contractId));
    }
    for (const receipt of SEED_CONTRACT_RECEIPTS) {
      q.insertReceipt(receipt);
    }
  }
}
