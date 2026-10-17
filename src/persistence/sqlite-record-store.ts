/**
 * src/persistence/sqlite-record-store.ts
 *
 * Relational SQLite Record Store for Wood Receiving Records.
 * Implements the asynchronous persistence contract backed by SQLite relational tables
 * and views (v_buku_besar_flat) using Node.js 26 native node:sqlite.
 */

import type { DatabaseSync } from 'node:sqlite';
import { createSqliteDatabase } from './sqlite/db.ts';
import { runMigrations } from './sqlite/migrations.ts';
import { migrateJsonToSqlite, saveManifestToSqlite } from './sqlite/migrate-json.ts';
import { SEED_WOOD_RECORDS } from './seed-data.ts';
import type { WoodReceivingRecord, ManifestFormInput } from '../types/index.ts';

export class SqliteRecordStore {
  private db: DatabaseSync;
  private initialized = false;

  constructor(dbPath?: string) {
    this.db = createSqliteDatabase(dbPath);
    this.ensureInitialized();
  }

  private ensureInitialized(): void {
    if (this.initialized) return;
    runMigrations(this.db);

    const countRow = this.db.prepare('SELECT COUNT(*) AS c FROM tenants;').get() as { c: number } | undefined;
    if (!countRow || countRow.c === 0) {
      migrateJsonToSqlite(this.db, SEED_WOOD_RECORDS);
    }
    this.initialized = true;
  }

  /**
   * Retrieves all flat receiving records from the relational view v_buku_besar_flat,
   * sorted by receiptDate descending and id ascending.
   */
  async getAll(): Promise<WoodReceivingRecord[]> {
    this.ensureInitialized();
    const rows = this.db.prepare('SELECT * FROM v_buku_besar_flat ORDER BY receiptDate DESC, id ASC;').all();
    return rows as unknown as WoodReceivingRecord[];
  }

  /**
   * Retrieves a single flat receiving record by its manifest id from v_buku_besar_flat.
   */
  async getById(id: string): Promise<WoodReceivingRecord | null> {
    this.ensureInitialized();
    const row = this.db.prepare('SELECT * FROM v_buku_besar_flat WHERE id = ?;').get(id);
    return (row as unknown as WoodReceivingRecord) || null;
  }

  /**
   * Saves or updates a receiving record.
   * Dispatches into normalized relational entities (manifest, items, supplier, species, yard, lot)
   * and queries the dynamically computed view to return the updated record.
   */
  async save(record: WoodReceivingRecord): Promise<WoodReceivingRecord> {
    this.ensureInitialized();
    const now = new Date().toISOString();
    const manifestId = record.id || `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const recordToSave: WoodReceivingRecord = {
      ...record,
      id: manifestId,
      createdAt: record.createdAt || now,
      updatedAt: now,
    };

    migrateJsonToSqlite(this.db, [recordToSave]);
    const saved = await this.getById(manifestId);
    if (!saved) {
      throw new Error(`Failed to save record ${manifestId}`);
    }
    return saved;
  }

  /**
   * Saves a multi-item manifest and returns the projected flat WoodReceivingRecord items.
   */
  async saveManifest(manifest: ManifestFormInput): Promise<WoodReceivingRecord[]> {
    this.ensureInitialized();
    const manifestId = saveManifestToSqlite(this.db, manifest);
    const rows = this.db.prepare('SELECT * FROM v_buku_besar_flat WHERE manifest_id = ? ORDER BY id ASC;').all(manifestId);
    return rows as unknown as WoodReceivingRecord[];
  }

  /**
   * Deletes a manifest by manifestId.
   * Cascading foreign keys remove all associated line items from receiving_items.
   */
  async deleteManifest(manifestId: string): Promise<boolean> {
    this.ensureInitialized();
    const result = this.db.prepare('DELETE FROM receiving_manifests WHERE id = ?;').run(manifestId);
    return Number(result.changes) > 0;
  }

  /**
   * Deletes a receiving record by id or synthetic line item id (manifestId_itemId).
   * If synthetic, deletes the line item from receiving_items. If 0 items remain,
   * cascades parent manifest deletion.
   */
  async delete(id: string): Promise<boolean> {
    this.ensureInitialized();
    const flatRow = this.db
      .prepare('SELECT manifest_id, item_id FROM v_buku_besar_flat WHERE id = ?;')
      .get(id) as { manifest_id: string; item_id: string } | undefined;

    if (flatRow && id !== flatRow.manifest_id) {
      this.db.prepare('DELETE FROM receiving_items WHERE id = ?;').run(flatRow.item_id);
      const remaining = this.db
        .prepare('SELECT COUNT(*) AS c FROM receiving_items WHERE manifest_id = ?;')
        .get(flatRow.manifest_id) as { c: number } | undefined;
      if (!remaining || remaining.c === 0) {
        this.db.prepare('DELETE FROM receiving_manifests WHERE id = ?;').run(flatRow.manifest_id);
      }
      return true;
    }

    const result = this.db.prepare('DELETE FROM receiving_manifests WHERE id = ?;').run(id);
    if (Number(result.changes) > 0) {
      return true;
    }

    if (id.includes('_')) {
      const idx = id.lastIndexOf('_');
      const manifestId = id.slice(0, idx);
      const itemId = id.slice(idx + 1);
      const itemRow = this.db
        .prepare('SELECT id, manifest_id FROM receiving_items WHERE id = ? AND manifest_id = ?;')
        .get(itemId, manifestId) as { id: string; manifest_id: string } | undefined;
      if (itemRow) {
        this.db.prepare('DELETE FROM receiving_items WHERE id = ?;').run(itemRow.id);
        const remaining = this.db
          .prepare('SELECT COUNT(*) AS c FROM receiving_items WHERE manifest_id = ?;')
          .get(itemRow.manifest_id) as { c: number } | undefined;
        if (!remaining || remaining.c === 0) {
          this.db.prepare('DELETE FROM receiving_manifests WHERE id = ?;').run(itemRow.manifest_id);
        }
        return true;
      }
    }

    return false;
  }

  /**
   * Resets receiving operational records and re-hydrates with default SEED_WOOD_RECORDS.
   */
  async reset(): Promise<WoodReceivingRecord[]> {
    this.ensureInitialized();
    this.db.exec('DELETE FROM receiving_items;');
    this.db.exec('DELETE FROM receiving_manifests;');
    migrateJsonToSqlite(this.db, SEED_WOOD_RECORDS);
    return this.getAll();
  }

  /**
   * Closes database connection.
   */
  close(): void {
    try {
      this.db.close();
    } catch {
      // Ignore if already closed
    }
  }
}

export const sqliteRecordStore = new SqliteRecordStore();
