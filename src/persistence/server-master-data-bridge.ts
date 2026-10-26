import type { SqliteRecordStore } from './sqlite-record-store.ts';
import { supabaseFetch } from './supabase/supabase-client.ts';
import {
  fetchSupabaseSuppliers, saveSupabaseSupplier, deleteSupabaseSupplier,
  fetchSupabaseSpecies, saveSupabaseSpecies, fetchSupabaseSettings, saveSupabaseSettings,
  fetchSupabaseActivityLogs, fetchSupabaseUserActivityLogs, appendSupabaseActivityLog,
} from './supabase/master-data-supabase.ts';
import { fetchSupabaseBrokers, saveSupabaseBroker, deleteSupabaseBroker } from './supabase/supabase-broker-store.ts';
import type {
  Supplier, Broker, WoodSpecies, AppSettings, ActivityLogEntry,
  StorageYard, StorageLot, StorageLotStatus, StorageLotWithYard,
} from '../types/index.ts';
import { loadStorageLocations, addYard, addLot } from '../utils/storage-locations.ts';

interface SupabaseYardRow {
  id: string;
  tenant_id?: string;
  yard_code: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

interface SupabaseLotRow {
  id: string;
  tenant_id?: string;
  yard_id: string;
  lot_code: string;
  status: StorageLotStatus;
  created_at?: string;
  updated_at?: string;
  storage_yards?: { name?: string; location_code?: string };
}

export class ServerMasterDataBridge {
  private isSupabaseMode: () => boolean;
  private isFileMode: () => boolean;
  private getSqliteStore: () => SqliteRecordStore;

  constructor(
    isSupabaseMode: () => boolean,
    isFileMode: () => boolean,
    getSqliteStore: () => SqliteRecordStore
  ) {
    this.isSupabaseMode = isSupabaseMode;
    this.isFileMode = isFileMode;
    this.getSqliteStore = getSqliteStore;
  }

  async getStorageLocations(): Promise<{ yards: StorageYard[]; lots: StorageLotWithYard[] }> {
    if (this.isSupabaseMode()) {
      try {
        const yardsData = await supabaseFetch<SupabaseYardRow[]>('/storage_yards?select=*&order=name.asc');
        const yards: StorageYard[] = yardsData.map((y) => ({
          id: y.id,
          tenantId: y.tenant_id || 'default-tenant',
          yardCode: y.yard_code,
          name: y.name,
          description: y.description || undefined,
          createdAt: y.created_at || new Date().toISOString(),
          updatedAt: y.updated_at || new Date().toISOString(),
        }));
        const lotsData = await supabaseFetch<SupabaseLotRow[]>('/storage_lots?select=*,storage_yards(name,location_code)&order=lot_code.asc');
        const lots: StorageLotWithYard[] = lotsData.map((l) => ({
          id: l.id,
          tenantId: l.tenant_id || 'default-tenant',
          yardId: l.yard_id,
          lotCode: l.lot_code,
          status: l.status,
          createdAt: l.created_at || new Date().toISOString(),
          updatedAt: l.updated_at || new Date().toISOString(),
          yardCode: l.storage_yards?.location_code || '',
          yardName: l.storage_yards?.name || '',
        }));
        return { yards, lots };
      } catch (err) {
        console.warn('[ServerRecordStore] Supabase getStorageLocations failed, falling back to SQLite:', err);
      }
    }
    if (!this.isFileMode()) {
      return this.getSqliteStore().getStorageLocations();
    }
    const data = loadStorageLocations();
    const lots: StorageLotWithYard[] = data.lots.map((lot) => {
      const yard = data.yards.find((y) => y.id === lot.yardId);
      return { ...lot, yardCode: yard?.yardCode || '', yardName: yard?.name || '' };
    });
    return { yards: data.yards, lots };
  }

  async saveStorageYard(yard: { id?: string; name: string; yardCode?: string; description?: string }): Promise<StorageYard> {
    if (!this.isFileMode()) {
      return this.getSqliteStore().saveStorageYard(yard);
    }
    return addYard(yard.name, yard.description);
  }

  async saveStorageLot(lot: { id?: string; yardId: string; lotCode: string; status?: StorageLotStatus }): Promise<StorageLot> {
    if (!this.isFileMode()) {
      return this.getSqliteStore().saveStorageLot(lot);
    }
    return addLot(lot.yardId, lot.lotCode, lot.status);
  }

  async updateStorageLotStatus(id: string, status: StorageLotStatus): Promise<StorageLot> {
    return this.getSqliteStore().updateStorageLotStatus(id, status);
  }

  async deleteStorageLot(id: string): Promise<void> {
    return this.getSqliteStore().deleteStorageLot(id);
  }

  async deleteStorageYard(id: string): Promise<void> {
    return this.getSqliteStore().deleteStorageYard(id);
  }

  private async trySupabase<T>(fn: () => Promise<T>, op: string): Promise<T | null> {
    if (!this.isSupabaseMode()) return null;
    try {
      return await fn();
    } catch (err) {
      console.warn(`[ServerRecordStore] Supabase ${op} failed, falling back to SQLite:`, err);
      return null;
    }
  }

  async getSuppliers(): Promise<Supplier[]> {
    const remote = await this.trySupabase(() => fetchSupabaseSuppliers(), 'getSuppliers');
    return remote ?? this.getSqliteStore().getSuppliers();
  }

  async saveSupplier(data: Partial<Supplier> & { name: string }): Promise<Supplier> {
    const remote = await this.trySupabase(() => saveSupabaseSupplier(data), 'saveSupplier');
    return remote ?? this.getSqliteStore().saveSupplier(data);
  }

  async deleteSupplier(id: string): Promise<boolean> {
    const remote = await this.trySupabase(() => deleteSupabaseSupplier(id), 'deleteSupplier');
    return remote ?? this.getSqliteStore().deleteSupplier(id);
  }

  async getBrokers(): Promise<Broker[]> {
    const remote = await this.trySupabase(() => fetchSupabaseBrokers(), 'getBrokers');
    return remote ?? this.getSqliteStore().getBrokers();
  }

  async saveBroker(data: Partial<Broker> & { name: string }): Promise<Broker> {
    const remote = await this.trySupabase(() => saveSupabaseBroker(data), 'saveBroker');
    return remote ?? this.getSqliteStore().saveBroker(data);
  }

  async deleteBroker(id: string): Promise<boolean> {
    const remote = await this.trySupabase(() => deleteSupabaseBroker(id), 'deleteBroker');
    return remote ?? this.getSqliteStore().deleteBroker(id);
  }

  async getSpecies(): Promise<WoodSpecies[]> {
    const remote = await this.trySupabase(() => fetchSupabaseSpecies(), 'getSpecies');
    return remote ?? this.getSqliteStore().getSpecies();
  }

  async saveSpecies(species: Partial<WoodSpecies> & { code: string; commonName: string }): Promise<WoodSpecies> {
    const remote = await this.trySupabase(() => saveSupabaseSpecies(species), 'saveSpecies');
    return remote ?? this.getSqliteStore().saveSpecies(species);
  }

  async getSettings(): Promise<AppSettings> {
    const remote = await this.trySupabase(() => fetchSupabaseSettings(), 'getSettings');
    return remote ?? this.getSqliteStore().getSettings();
  }

  async saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    const remote = await this.trySupabase(() => saveSupabaseSettings(patch), 'saveSettings');
    return remote ?? this.getSqliteStore().saveSettings(patch);
  }

  async getActivityLogs(actionFilter?: string, limit?: number): Promise<ActivityLogEntry[]> {
    const remote = await this.trySupabase(() => fetchSupabaseActivityLogs(actionFilter, limit), 'getActivityLogs');
    return remote ?? this.getSqliteStore().getActivityLogs(actionFilter, limit);
  }

  async getUserActivityLogs(userId: string, limit: number = 100): Promise<ActivityLogEntry[]> {
    const remote = await this.trySupabase(() => fetchSupabaseUserActivityLogs(userId, limit), 'getUserActivityLogs');
    return remote ?? this.getSqliteStore().getUserActivityLogs(userId, limit);
  }

  async appendActivityLog(
    entry: Omit<ActivityLogEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
  ): Promise<ActivityLogEntry> {
    const remote = await this.trySupabase(() => appendSupabaseActivityLog(entry), 'appendActivityLog');
    return remote ?? this.getSqliteStore().appendActivityLog(entry);
  }
}
