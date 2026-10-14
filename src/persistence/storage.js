/**
 * src/persistence/storage.js
 *
 * Persistence Adapter & State Synchronization Layer
 * Provides resilient offline/local memory fallback with remote synchronization contracts.
 */

/**
 * In-memory fallback adapter for environments without window.localStorage or server runtimes.
 */
export class MemoryStorageAdapter {
  constructor() {
    this.store = new Map();
  }

  async getItem(key) {
    const data = this.store.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async setItem(key, value) {
    this.store.set(key, JSON.stringify(value));
  }

  async removeItem(key) {
    this.store.delete(key);
  }

  async clear() {
    this.store.clear();
  }
}

/**
 * LocalStorage wrapper with graceful fallback to MemoryStorageAdapter.
 */
export class LocalStorageAdapter {
  constructor() {
    this.memoryFallback = new MemoryStorageAdapter();
  }

  isLocalStorageAvailable() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  async getItem(key) {
    if (!this.isLocalStorageAvailable()) {
      return this.memoryFallback.getItem(key);
    }
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return this.memoryFallback.getItem(key);
    }
  }

  async setItem(key, value) {
    if (!this.isLocalStorageAvailable()) {
      return this.memoryFallback.setItem(key, value);
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      await this.memoryFallback.setItem(key, value);
    }
  }

  async removeItem(key) {
    if (!this.isLocalStorageAvailable()) {
      return this.memoryFallback.removeItem(key);
    }
    try {
      window.localStorage.removeItem(key);
    } catch {
      await this.memoryFallback.removeItem(key);
    }
  }

  async clear() {
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
