/**
 * src/persistence/indexed-db-adapter.ts
 *
 * Native zero-dependency IndexedDB Storage Adapter with automatic localStorage migration
 * and transparent MemoryStorageAdapter fallback for non-browser or unsupported runtimes.
 */

import { type StorageAdapter, MemoryStorageAdapter } from './storage.ts';

const DEFAULT_DB_NAME = 'wood_inventory_db';
const DEFAULT_STORE_NAME = 'keyval';
const DB_VERSION = 1;

const DEFAULT_MIGRATION_KEYS = [
  'wood_receiving_records_v1',
  'wood_suppliers_v1',
  'wood_storage_locations_v1',
  'wood_settings_v1',
  'wood_activity_log_v1',
];

export class IndexedDbAdapter implements StorageAdapter {
  private dbName: string;
  private storeName: string;
  private fallback: MemoryStorageAdapter;
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(dbName: string = DEFAULT_DB_NAME, storeName: string = DEFAULT_STORE_NAME) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.fallback = new MemoryStorageAdapter();
  }

  private  isAvailable(): boolean {
    return typeof window !== 'undefined' && Boolean(window.indexedDB);
  }

  private getDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      try {
        const request = window.indexedDB.open(this.dbName, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName);
          }
        };
        request.onsuccess = () => {
          const db = request.result;
          db.onclose = () => { this.dbPromise = null; };
          db.onversionchange = () => { db.close(); this.dbPromise = null; };
          resolve(db);
        };
        request.onerror = () => {
          this.dbPromise = null;
          reject(request.error || new Error('Failed to open IndexedDB'));
        };
        request.onblocked = () => {
          this.dbPromise = null;
          reject(new Error('IndexedDB opening blocked'));
        };
      } catch (err) {
        this.dbPromise = null;
        reject(err);
      }
    });

    return this.dbPromise;
  }

  private async withStore(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<void> {
    const db = await this.getDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.storeName, mode);
      const store = tx.objectStore(this.storeName);
      const req = action(store);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async getItem<T = any>(key: string): Promise<T | null> {
    if (!this.isAvailable()) return this.fallback.getItem<T>(key);
    try {
      const db = await this.getDb();
      return new Promise<T | null>((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result === undefined ? null : (req.result as T));
        req.onerror = () => reject(req.error);
      });
    } catch {
      return this.fallback.getItem<T>(key);
    }
  }

  async setItem<T = any>(key: string, value: T): Promise<void> {
    if (!this.isAvailable()) return this.fallback.setItem<T>(key, value);
    try {
      await this.withStore('readwrite', (store) => store.put(value, key));
    } catch {
      return this.fallback.setItem<T>(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    if (!this.isAvailable()) return this.fallback.removeItem(key);
    try {
      await this.withStore('readwrite', (store) => store.delete(key));
    } catch {
      return this.fallback.removeItem(key);
    }
  }

  async clear(): Promise<void> {
    if (!this.isAvailable()) return this.fallback.clear();
    try {
      await this.withStore('readwrite', (store) => store.clear());
    } catch {
      return this.fallback.clear();
    }
  }

  close(): void {
    if (this.dbPromise) {
      this.dbPromise.then((db) => db.close()).catch(() => {});
      this.dbPromise = null;
    }
  }

  async migrateFromLocalStorage(keys?: string[]): Promise<number> {
    const storage =
      typeof window !== 'undefined' && window.localStorage
        ? window.localStorage
        : typeof globalThis !== 'undefined' && (globalThis as any).localStorage
        ? (globalThis as any).localStorage
        : null;

    if (!storage) return 0;

    let targetKeys = keys;
    if (!targetKeys || targetKeys.length === 0) {
      const discovered = new Set<string>(DEFAULT_MIGRATION_KEYS);
      try {
        if (typeof storage.length === 'number') {
          for (let i = 0; i < storage.length; i++) {
            const k = storage.key?.(i);
            if (k) discovered.add(k);
          }
        }
        for (const k of Object.keys(storage)) {
          if (typeof storage.getItem(k) === 'string') discovered.add(k);
        }
      } catch {
        // Safe discovery fallback
      }
      targetKeys = Array.from(discovered);
    }

    let migratedCount = 0;
    for (const key of targetKeys) {
      try {
        const raw = storage.getItem(key);
        if (raw !== null && raw !== undefined) {
          let parsed: unknown;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          await this.setItem(key, parsed);
          migratedCount++;
        }
      } catch {
        // Skip individual unreadable entry
      }
    }

    return migratedCount;
  }
}
