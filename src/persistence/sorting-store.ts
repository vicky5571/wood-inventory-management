/**
 * src/persistence/sorting-store.ts
 *
 * Persistence bridge and manager for stock sorting redistribution records.
 * Supports Supabase PostgREST primary cloud persistence when configured,
 * with resilient fallback to local SQLite.
 */

import { sqliteRecordStore } from './sqlite-record-store.ts';
import { SortingQueries } from './sqlite/sorting-queries.ts';
import { isSupabaseConfigured } from './supabase/supabase-client.ts';
import { SupabaseSortingStore } from './supabase/supabase-sorting-store.ts';
import type { StockSortingRecord, StockSortingFormInput } from '../types/index.ts';

class SortingStore {
  private supabaseStore: SupabaseSortingStore | null = null;

  private getSupabaseStore(): SupabaseSortingStore {
    if (!this.supabaseStore) {
      this.supabaseStore = new SupabaseSortingStore();
    }
    return this.supabaseStore;
  }

  private isSupabaseMode(): boolean {
    return isSupabaseConfigured();
  }

  private getQueries(): SortingQueries {
    return new SortingQueries(sqliteRecordStore.getDatabase());
  }

  public getAll(tenantId = 'default-tenant'): StockSortingRecord[] | Promise<StockSortingRecord[]> {
    if (this.isSupabaseMode()) {
      return this.getSupabaseStore().getAll(tenantId).catch((err) => {
        console.warn('[SortingStore] Supabase getAll failed, falling back to SQLite:', err);
        return this.getQueries().getAll(tenantId);
      });
    }
    return this.getQueries().getAll(tenantId);
  }

  public getById(id: string, tenantId = 'default-tenant'): (StockSortingRecord | null) | Promise<StockSortingRecord | null> {
    if (this.isSupabaseMode()) {
      return this.getSupabaseStore().getById(id, tenantId).catch((err) => {
        console.warn('[SortingStore] Supabase getById failed, falling back to SQLite:', err);
        return this.getQueries().getById(id, tenantId);
      });
    }
    return this.getQueries().getById(id, tenantId);
  }

  public save(input: StockSortingFormInput, tenantId = 'default-tenant'): StockSortingRecord | Promise<StockSortingRecord> {
    if (this.isSupabaseMode()) {
      return this.getSupabaseStore().save(input, tenantId).catch((err) => {
        console.warn('[SortingStore] Supabase save failed, falling back to SQLite:', err);
        return this.saveToSqlite(input, tenantId);
      });
    }
    return this.saveToSqlite(input, tenantId);
  }

  private saveToSqlite(input: StockSortingFormInput, tenantId = 'default-tenant'): StockSortingRecord {
    const queries = this.getQueries();
    const id = input.id || `SRT-${Date.now()}`;

    const existing = input.id ? queries.getById(input.id, tenantId) : null;
    if (existing) {
      return queries.update({
        id,
        sortingDate: input.sortingDate,
        species: input.species,
        sourceStorageYard: input.sourceStorageYard,
        sourceKavlingNumber: input.sourceKavlingNumber,
        targetStorageYard: input.targetStorageYard,
        targetKavlingNumber: input.targetKavlingNumber,
        volumeM3: Number(input.volumeM3),
        pieces: Number(input.pieces),
        reason: input.reason,
        operatorName: input.operatorName,
        notes: input.notes,
      }, tenantId);
    }

    return queries.insert({
      id,
      tenantId,
      sortingDate: input.sortingDate,
      species: input.species,
      sourceStorageYard: input.sourceStorageYard,
      sourceKavlingNumber: input.sourceKavlingNumber,
      targetStorageYard: input.targetStorageYard,
      targetKavlingNumber: input.targetKavlingNumber,
      volumeM3: Number(input.volumeM3),
      pieces: Number(input.pieces),
      reason: input.reason,
      operatorName: input.operatorName,
      notes: input.notes,
    });
  }

  public delete(id: string, tenantId = 'default-tenant'): void | Promise<void> {
    if (this.isSupabaseMode()) {
      return this.getSupabaseStore().delete(id, tenantId).then(() => {}).catch((err) => {
        console.warn('[SortingStore] Supabase delete failed, falling back to SQLite:', err);
        this.getQueries().delete(id, tenantId);
      });
    }
    this.getQueries().delete(id, tenantId);
  }
}

export const sortingStore = new SortingStore();
