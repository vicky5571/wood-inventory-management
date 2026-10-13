/**
 * src/persistence/storage.ts
 *
 * Persistence Adapter & State Synchronization Layer
 * Provides resilient offline/local memory fallback with remote synchronization contracts.
 */

import type { WoodItem, InventoryTransaction } from '../types/index.ts';

export interface StorageAdapter {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * In-memory fallback adapter for environments without window.localStorage or server runtimes.
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, string>();

  async getItem<T>(key: string): Promise<T | null> {
    const data = this.store.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    this.store.set(key, JSON.stringify(value));
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

/**
 * LocalStorage wrapper with graceful fallback to MemoryStorageAdapter.
 */
export class LocalStorageAdapter implements StorageAdapter {
  private memoryFallback = new MemoryStorageAdapter();

  private isLocalStorageAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  async getItem<T>(key: string): Promise<T | null> {
    if (!this.isLocalStorageAvailable()) {
      return this.memoryFallback.getItem<T>(key);
    }
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return this.memoryFallback.getItem<T>(key);
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    if (!this.isLocalStorageAvailable()) {
      return this.memoryFallback.setItem<T>(key, value);
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      await this.memoryFallback.setItem<T>(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    if (!this.isLocalStorageAvailable()) {
      return this.memoryFallback.removeItem(key);
    }
    try {
      window.localStorage.removeItem(key);
    } catch {
      await this.memoryFallback.removeItem(key);
    }
  }

  async clear(): Promise<void> {
    if (!this.isLocalStorageAvailable()) {
      return this.memoryFallback.clear();
    }
    try {
      window.localStorage.clear();
    } catch {
      await this.memoryFallback.clear();
    }
  }
}

export const defaultStorage = new LocalStorageAdapter();
