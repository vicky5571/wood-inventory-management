import type { SqliteRecordStore } from './sqlite-record-store.ts';
import { supabaseFetch } from './supabase/supabase-client.ts';
import {
  fetchSupabaseSuppliers,
  saveSupabaseSupplier,
  deleteSupabaseSupplier,
  fetchSupabaseSpecies,
  saveSupabaseSpecies,
  fetchSupabaseSettings,
  saveSupabaseSettings,
  fetchSupabaseActivityLogs,
  fetchSupabaseUserActivityLogs,
  appendSupabaseActivityLog,
} from './supabase/master-data-supabase.ts';
import {
  fetchSupabaseBrokers,
  saveSupabaseBroker,
  deleteSupabaseBroker,
} from './supabase/supabase-broker-store.ts';
import type {
  Supplier,
  Broker,
  WoodSpecies,
  AppSettings,
  ActivityLogEntry,
  StorageYard,
  StorageLot,
  StorageLotStatus,
  StorageLotWithYard,
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
  storage_yards?: {
    name?: string;
    location_code?: string;
  };
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
      return {
        ...lot,
        yardCode: yard?.yardCode || '',
        yardName: yard?.name || '',
      };
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

  async getSuppliers(): Promise<Supplier[]> {
    if (this.isSupabaseMode()) {
      try {
        return await fetchSupabaseSuppliers();
      } catch (err) {
        console.warn('[ServerRecordStore] Supabase getSuppliers failed, falling back to SQLite:', err);
      }
    }
    return this.getSqliteStore().getSuppliers();
  }

  async saveSupplier(data: Partial<Supplier> & { name: string }): Promise<Supplier> {
    if (this.isSupabaseMode()) {
      try {
        return await saveSupabaseSupplier(data);
      } catch (err) {
        console.warn('[ServerRecordStore] Supabase saveSupplier failed, falling back to SQLite:', err);
      }
    }
    return this.getSqliteStore().saveSupplier(data);
  }

  async deleteSupplier(id: string): Promise<boolean> {
    if (this.isSupabaseMode()) {
      try {
        return await deleteSupabaseSupplier(id);
      } catch (err) {
        console.warn('[ServerRecordStore] Supabase deleteSupplier failed, falling back to SQLite:', err);
      }
    }
    return this.getSqliteStore().deleteSupplier(id);
  }

  async getBrokers(): Promise<Broker[]> {
    if (this.isSupabaseMode()) {
      try {
        return await fetchSupabaseBrokers();
      } catch (err) {
        console.warn('[ServerRecordStore] Supabase getBrokers failed, falling back to SQLite:', err);
      }
    }
    return this.getSqliteStore().getBrokers();
  }

  async saveBroker(data: Partial<Broker> & { name: string }): Promise<Broker> {
    if (this.isSupabaseMode()) {
      try {
        return await saveSupabaseBroker(data);
      } catch (err) {
        console.warn('[ServerRecordStore] Supabase saveBroker failed, falling back to SQLite:', err);
      }
    }
    return this.getSqliteStore().saveBroker(data);
  }

  async deleteBroker(id: string): Promise<boolean> {
    if (this.isSupabaseMode()) {
      try {
        return await deleteSupabaseBroker(id);
      } catch (err) {
        console.warn('[ServerRecordStore] Supabase deleteBroker failed, falling back to SQLite:', err);
      }
    }
    return this.getSqliteStore().deleteBroker(id);
  }

  async getSpecies(): Promise<WoodSpecies[]> {
    if (this.isSupabaseMode()) {
      try {
        return await fetchSupabaseSpecies();
      } catch (err) {
        console.warn('[ServerRecordStore] Supabase getSpecies failed, falling back to SQLite:', err);
      }
    }
    return this.getSqliteStore().getSpecies();
  }

  async saveSpecies(species: Partial<WoodSpecies> & { code: string; commonName: string }): Promise<WoodSpecies> {
    if (this.isSupabaseMode()) {
      try {
        return await saveSupabaseSpecies(species);
      } catch (err) {
        console.warn('[ServerRecordStore] Supabase saveSpecies failed, falling back to SQLite:', err);
      }
    }
    return this.getSqliteStore().saveSpecies(species);
  }

  async getSettings(): Promise<AppSettings> {
    if (this.isSupabaseMode()) {
      try {
        return await fetchSupabaseSettings();
      } catch (err) {
        console.warn('[ServerRecordStore] Supabase getSettings failed, falling back to SQLite:', err);
      }
    }
    return this.getSqliteStore().getSettings();
  }

  async saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    if (this.isSupabaseMode()) {
      try {
        return await saveSupabaseSettings(patch);
      } catch (err) {
        console.warn('[ServerRecordStore] Supabase saveSettings failed, falling back to SQLite:', err);
      }
    }
    return this.getSqliteStore().saveSettings(patch);
  }

  async getActivityLogs(actionFilter?: string, limit?: number): Promise<ActivityLogEntry[]> {
    if (this.isSupabaseMode()) {
      try {
        return await fetchSupabaseActivityLogs(actionFilter, limit);
      } catch (err) {
        console.warn('[ServerRecordStore] Supabase getActivityLogs failed, falling back to SQLite:', err);
      }
    }
    return this.getSqliteStore().getActivityLogs(actionFilter, limit);
  }

  async getUserActivityLogs(userId: string, limit: number = 100): Promise<ActivityLogEntry[]> {
    if (this.isSupabaseMode()) {
      try {
        return await fetchSupabaseUserActivityLogs(userId, limit);
      } catch (err) {
        console.warn('[ServerRecordStore] Supabase getUserActivityLogs failed, falling back to SQLite:', err);
      }
    }
    return this.getSqliteStore().getUserActivityLogs(userId, limit);
  }

  async appendActivityLog(
    entry: Omit<ActivityLogEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
  ): Promise<ActivityLogEntry> {
    if (this.isSupabaseMode()) {
      try {
        return await appendSupabaseActivityLog(entry);
      } catch (err) {
        console.warn('[ServerRecordStore] Supabase appendActivityLog failed, falling back to SQLite:', err);
      }
    }
    return this.getSqliteStore().appendActivityLog(entry);
  }
}
