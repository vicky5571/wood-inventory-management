import type { WoodReceivingRecord, RecordFilterCriteria } from '../types/index.ts';
import type { StorageAdapter } from './storage.ts';
import { SEED_WOOD_RECORDS } from './seed-data.ts';

const STORAGE_KEY = 'wood_receiving_records_v1';

export class WoodRecordRepository {
  private storage: StorageAdapter;

  constructor(storage: StorageAdapter) {
    this.storage = storage;
  }

  async getAll(): Promise<WoodReceivingRecord[]> {
    let records = await this.storage.getItem<WoodReceivingRecord[]>(STORAGE_KEY);
    if (!records || !Array.isArray(records) || records.length === 0) {
      records = JSON.parse(JSON.stringify(SEED_WOOD_RECORDS)) as WoodReceivingRecord[];
      await this.storage.setItem(STORAGE_KEY, records);
    }
    return records;
  }

  async getFiltered(criteria: RecordFilterCriteria): Promise<WoodReceivingRecord[]> {
    const records = await this.getAll();
    return records.filter((r) => {
      if (criteria.species && r.woodSpecies !== criteria.species) {
        return false;
      }
      if (criteria.kavling && r.kavlingNumber !== criteria.kavling) {
        return false;
      }
      if (criteria.startDate && r.receiptDate < criteria.startDate) {
        return false;
      }
      if (criteria.endDate && r.receiptDate > criteria.endDate) {
        return false;
      }
      if (criteria.searchQuery) {
        const query = criteria.searchQuery.trim().toLowerCase();
        const haystack = [
          r.truckPlateNumber,
          r.forestryDocNumber,
          r.receiptNumber,
          r.contractNumber,
          r.supplierName,
          r.woodSpecies,
          r.kavlingNumber,
          r.storageYard,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }

  async getById(id: string): Promise<WoodReceivingRecord | null> {
    const records = await this.getAll();
    return records.find((r) => r.id === id) ?? null;
  }

  async save(record: WoodReceivingRecord): Promise<void> {
    const records = await this.getAll();
    const index = records.findIndex((r) => r.id === record.id);
    if (index >= 0) {
      records[index] = { ...record, updatedAt: new Date().toISOString() };
    } else {
      records.unshift({
        ...record,
        createdAt: record.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    await this.storage.setItem(STORAGE_KEY, records);
  }

  async delete(id: string): Promise<void> {
    const records = await this.getAll();
    const filtered = records.filter((r) => r.id !== id);
    await this.storage.setItem(STORAGE_KEY, filtered);
  }

  async resetToSeed(): Promise<WoodReceivingRecord[]> {
    const fresh = JSON.parse(JSON.stringify(SEED_WOOD_RECORDS)) as WoodReceivingRecord[];
    await this.storage.setItem(STORAGE_KEY, fresh);
    return fresh;
  }
}
