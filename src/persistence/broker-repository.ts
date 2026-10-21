import type { Broker, BrokerFilterCriteria } from '../types/index.ts';
import type { StorageAdapter } from './storage.ts';
import { MemoryStorageAdapter } from './storage.ts';
import { SEED_BROKERS } from './seed-data.ts';

const STORAGE_KEY = 'wood_brokers_v1';

export class BrokerRepository {
  private memoryCache: Broker[] = [];
  private storage?: StorageAdapter;

  constructor(initialData: Broker[] = SEED_BROKERS, storage?: StorageAdapter) {
    this.storage = storage;
    this.load(initialData);
  }

  private load(fallbackData: Broker[]): void {
    let serialized: string | null = null;

    if (this.storage instanceof MemoryStorageAdapter) {
      const storeMap = (this.storage as unknown as { store: Map<string, string> }).store;
      serialized = storeMap ? storeMap.get(STORAGE_KEY) || null : null;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      try {
        serialized = window.localStorage.getItem(STORAGE_KEY);
      } catch {
        serialized = null;
      }
    }

    if (!serialized) {
      this.memoryCache = JSON.parse(JSON.stringify(fallbackData));
      this.persist();
      return;
    }

    try {
      const parsed = JSON.parse(serialized);
      if (Array.isArray(parsed) && parsed.length > 0) {
        this.memoryCache = parsed;
      } else {
        this.memoryCache = JSON.parse(JSON.stringify(fallbackData));
        this.persist();
      }
    } catch {
      this.memoryCache = JSON.parse(JSON.stringify(fallbackData));
      this.persist();
    }
  }

  private persist(): void {
    const serialized = JSON.stringify(this.memoryCache);

    if (this.storage instanceof MemoryStorageAdapter) {
      const storeMap = (this.storage as unknown as { store: Map<string, string> }).store;
      if (storeMap) {
        storeMap.set(STORAGE_KEY, serialized);
      }
    } else if (this.storage) {
      this.storage.setItem(STORAGE_KEY, serialized);
    } else if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, serialized);
      } catch (err) {
        console.warn('[BrokerRepository] LocalStorage write failed:', err);
      }
    }
  }

  getAll(): Broker[] {
    return [...this.memoryCache];
  }

  getById(id: string): Broker | undefined {
    return this.memoryCache.find((b) => b.id === id);
  }

  filter(criteria: BrokerFilterCriteria): Broker[] {
    return this.memoryCache.filter((broker) => {
      if (criteria.status && criteria.status !== 'ALL') {
        if (broker.status !== criteria.status) return false;
      }

      if (criteria.searchQuery && criteria.searchQuery.trim().length > 0) {
        const q = criteria.searchQuery.toLowerCase().trim();
        const matchName = broker.name.toLowerCase().includes(q);
        const matchCode = broker.code.toLowerCase().includes(q);
        const matchPhone = Boolean(broker.phone && broker.phone.toLowerCase().includes(q));
        const matchContact = Boolean(broker.contactPerson && broker.contactPerson.toLowerCase().includes(q));
        if (!matchName && !matchCode && !matchPhone && !matchContact) {
          return false;
        }
      }

      return true;
    });
  }

  save(data: Partial<Broker> & { name: string }): Broker {
    const now = new Date().toISOString();

    if (data.id) {
      const idx = this.memoryCache.findIndex((b) => b.id === data.id);
      if (idx !== -1) {
        const existing = this.memoryCache[idx];
        const updated: Broker = {
          ...existing,
          ...data,
          id: existing.id,
          code: data.code || existing.code,
          name: data.name.trim(),
          updatedAt: now,
        };
        this.memoryCache[idx] = updated;
        this.persist();
        return updated;
      }
    }

    const id = data.id || `brk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const nextNum = this.memoryCache.length + 1;
    const code = data.code || `BRK-${String(nextNum).padStart(3, '0')}`;

    const newBroker: Broker = {
      id,
      code,
      name: data.name.trim(),
      contactPerson: data.contactPerson,
      phone: data.phone,
      address: data.address,
      taxId: data.taxId,
      defaultCommissionPerM3: data.defaultCommissionPerM3,
      notes: data.notes,
      status: data.status || 'ACTIVE',
      createdAt: data.createdAt || now,
      updatedAt: now,
    };

    this.memoryCache.unshift(newBroker);
    this.persist();
    return newBroker;
  }

  delete(id: string): boolean {
    const idx = this.memoryCache.findIndex((b) => b.id === id);
    if (idx === -1) return false;
    // Soft-delete
    this.memoryCache[idx] = {
      ...this.memoryCache[idx],
      status: 'INACTIVE',
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return true;
  }

  restore(id: string): boolean {
    const idx = this.memoryCache.findIndex((b) => b.id === id);
    if (idx === -1) return false;
    this.memoryCache[idx] = {
      ...this.memoryCache[idx],
      status: 'ACTIVE',
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return true;
  }
}
