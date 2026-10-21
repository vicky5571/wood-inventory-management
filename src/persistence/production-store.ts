/**
 * src/persistence/production-store.ts
 *
 * Persistence bridge and manager for sawmill production records.
 * Supports Supabase PostgREST primary cloud persistence when configured,
 * with resilient fallback to local SQLite.
 */

import { sqliteRecordStore } from './sqlite-record-store.ts';
import { ProductionQueries } from './sqlite/production-queries.ts';
import { isSupabaseConfigured } from './supabase/supabase-client.ts';
import { SupabaseProductionStore } from './supabase/supabase-production-store.ts';
import type { SawmillProductionRecord, SawmillProductionFormInput } from '../types/index.ts';

class ProductionStore {
  private supabaseStore: SupabaseProductionStore | null = null;

  private getSupabaseStore(): SupabaseProductionStore {
    if (!this.supabaseStore) {
      this.supabaseStore = new SupabaseProductionStore();
    }
    return this.supabaseStore;
  }

  private isSupabaseMode(): boolean {
    return isSupabaseConfigured();
  }

  private getQueries(): ProductionQueries {
    return new ProductionQueries(sqliteRecordStore.getDatabase());
  }

  public getAll(tenantId = 'default-tenant'): SawmillProductionRecord[] | Promise<SawmillProductionRecord[]> {
    if (this.isSupabaseMode()) {
      return this.getSupabaseStore().getAll(tenantId).catch((err) => {
        console.warn('[ProductionStore] Supabase getAll failed, falling back to SQLite:', err);
        return this.getQueries().getAll(tenantId);
      });
    }
    return this.getQueries().getAll(tenantId);
  }

  public getById(id: string, tenantId = 'default-tenant'): (SawmillProductionRecord | null) | Promise<SawmillProductionRecord | null> {
    if (this.isSupabaseMode()) {
      return this.getSupabaseStore().getById(id, tenantId).catch((err) => {
        console.warn('[ProductionStore] Supabase getById failed, falling back to SQLite:', err);
        return this.getQueries().getById(id, tenantId);
      });
    }
    return this.getQueries().getById(id, tenantId);
  }

  public save(input: SawmillProductionFormInput, tenantId = 'default-tenant'): SawmillProductionRecord | Promise<SawmillProductionRecord> {
    if (this.isSupabaseMode()) {
      return this.getSupabaseStore().save(input, tenantId).catch((err) => {
        console.warn('[ProductionStore] Supabase save failed, falling back to SQLite:', err);
        return this.saveToSqlite(input, tenantId);
      });
    }
    return this.saveToSqlite(input, tenantId);
  }

  private saveToSqlite(input: SawmillProductionFormInput, tenantId = 'default-tenant'): SawmillProductionRecord {
    const queries = this.getQueries();
    const id = input.id || `PRD-${Date.now()}`;

    const existing = input.id ? queries.getById(input.id, tenantId) : null;
    if (existing) {
      return queries.update({
        id,
        productionDate: input.productionDate,
        shift: input.shift,
        sourceStorageYard: input.sourceStorageYard,
        sourceKavlingNumber: input.sourceKavlingNumber,
        inputSpecies: input.inputSpecies,
        inputVolumeM3: Number(input.inputVolumeM3),
        inputPieces: Number(input.inputPieces),
        outputProduct: input.outputProduct,
        outputVolumeM3: Number(input.outputVolumeM3),
        outputPieces: Number(input.outputPieces),
        operatorName: input.operatorName,
        notes: input.notes,
      }, tenantId);
    }

    return queries.insert({
      id,
      tenantId,
      productionDate: input.productionDate,
      shift: input.shift,
      sourceStorageYard: input.sourceStorageYard,
      sourceKavlingNumber: input.sourceKavlingNumber,
      inputSpecies: input.inputSpecies,
      inputVolumeM3: Number(input.inputVolumeM3),
      inputPieces: Number(input.inputPieces),
      outputProduct: input.outputProduct,
      outputVolumeM3: Number(input.outputVolumeM3),
      outputPieces: Number(input.outputPieces),
      operatorName: input.operatorName,
      notes: input.notes,
    });
  }

  public delete(id: string, tenantId = 'default-tenant'): void | Promise<void> {
    if (this.isSupabaseMode()) {
      return this.getSupabaseStore().delete(id, tenantId).then(() => {}).catch((err) => {
        console.warn('[ProductionStore] Supabase delete failed, falling back to SQLite:', err);
        this.getQueries().delete(id, tenantId);
      });
    }
    this.getQueries().delete(id, tenantId);
  }
}

export const productionStore = new ProductionStore();
