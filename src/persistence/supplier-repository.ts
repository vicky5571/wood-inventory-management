import type { Supplier, SupplierFilterCriteria } from '../types/index.ts';
import type { StorageAdapter } from './storage.ts';
import { MemoryStorageAdapter } from './storage.ts';
import { SEED_SUPPLIERS } from './seed-data.ts';

const STORAGE_KEY = 'wood_suppliers_v1';

export class SupplierRepository {
  private memoryCache: Supplier[] = [];
  private storage?: StorageAdapter;

  constructor(initialData: Supplier[] = SEED_SUPPLIERS, storage?: StorageAdapter) {
    this.storage = storage;
    this.load(initialData);
  }

  private load(fallbackData: Supplier[]): void {
    let serialized: string | null = null;

    if (this.storage instanceof MemoryStorageAdapter) {
      // Direct synchronous read for in-memory adapter in unit tests
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
      this.storage.setItem(STORAGE_KEY, this.memoryCache).catch(() => {});
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, serialized);
      } catch (e) {
        console.error('Failed to persist suppliers to localStorage:', e);
      }
    }
  }

  public getAll(filter?: SupplierFilterCriteria): Supplier[] {
    let result = [...this.memoryCache];

    if (filter?.status && filter.status !== 'ALL') {
      result = result.filter((s) => s.status === filter.status);
    }

    if (filter?.searchQuery && filter.searchQuery.trim()) {
      const q = filter.searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
          (s.address && s.address.toLowerCase().includes(q))
      );
    }

    return result;
  }

  public getById(id: string): Supplier | null {
    return this.memoryCache.find((s) => s.id === id) || null;
  }

  public getByName(name: string): Supplier | null {
    const trimmed = name.trim().toLowerCase();
    return this.memoryCache.find((s) => s.name.trim().toLowerCase() === trimmed) || null;
  }

  public save(data: Partial<Supplier> & { name: string }): Supplier {
    const now = new Date().toISOString();
    const existingIndex = data.id ? this.memoryCache.findIndex((s) => s.id === data.id) : -1;

    if (existingIndex >= 0) {
      const current = this.memoryCache[existingIndex];
      const updated: Supplier = {
        ...current,
        ...data,
        id: current.id,
        code: data.code || current.code,
        updatedAt: now,
      };
      this.memoryCache[existingIndex] = updated;
      this.persist();
      return updated;
    }

    // New Supplier Creation
    const id = data.id || `spl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const nextCodeNumber = this.memoryCache.length + 1;
    const code = data.code || `SPL-${String(nextCodeNumber).padStart(3, '0')}`;

    const newSupplier: Supplier = {
      id,
      code,
      name: data.name.trim(),
      contactPerson: data.contactPerson?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      address: data.address?.trim() || undefined,
      taxId: data.taxId?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      status: data.status || 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };

    this.memoryCache.push(newSupplier);
    this.persist();
    return newSupplier;
  }

  public delete(id: string): boolean {
    const initialLen = this.memoryCache.length;
    this.memoryCache = this.memoryCache.filter((s) => s.id !== id);
    if (this.memoryCache.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  public resetToSeed(): void {
    this.memoryCache = JSON.parse(JSON.stringify(SEED_SUPPLIERS));
    this.persist();
  }
}
