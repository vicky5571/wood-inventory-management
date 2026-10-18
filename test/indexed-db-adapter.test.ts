import test from 'node:test';
import assert from 'node:assert/strict';
import { IndexedDbAdapter } from '../src/persistence/indexed-db-adapter.ts';
import { defaultStorage } from '../src/persistence/storage.ts';
import type { PaginationMeta, PaginatedResult, RecordQueryParams } from '../src/types/index.ts';

test('IndexedDbAdapter & SSOT Domain Types Suite', async (t) => {
  await t.test('SSOT domain types compilation and interface contract', () => {
    const meta: PaginationMeta = {
      page: 1,
      pageSize: 25,
      totalRecords: 100,
      totalPages: 4,
      hasNextPage: true,
      hasPreviousPage: false,
    };
    assert.strictEqual(meta.page, 1);
    assert.strictEqual(meta.totalPages, 4);

    const result: PaginatedResult<string> = {
      data: ['item-1', 'item-2'],
      pagination: meta,
    };
    assert.strictEqual(result.data.length, 2);
    assert.strictEqual(result.pagination.totalRecords, 100);

    const query: RecordQueryParams = {
      page: 2,
      pageSize: 50,
      searchQuery: 'Teak',
      species: 'Teak',
      kavling: 'KAV-01',
      yard: 'TPK-01',
      startDate: '2026-01-01',
      endDate: '2026-10-18',
      paymentStatus: 'PAID',
      sortBy: 'receiptDate',
      sortOrder: 'DESC',
    };
    assert.strictEqual(query.page, 2);
    assert.strictEqual(query.sortBy, 'receiptDate');
  });

  await t.test('graceful fallback to MemoryStorageAdapter in Node / non-browser runtime', async () => {
    const adapter = new IndexedDbAdapter('test_db', 'test_store');

    // CRUD in fallback mode
    assert.strictEqual(await adapter.getItem('missing_key'), null);

    await adapter.setItem('test_record', { id: 'rec-001', volume: 15.5 });
    const item = await adapter.getItem<{ id: string; volume: number }>('test_record');
    assert.deepStrictEqual(item, { id: 'rec-001', volume: 15.5 });

    await adapter.removeItem('test_record');
    assert.strictEqual(await adapter.getItem('test_record'), null);

    await adapter.setItem('k1', 'val1');
    await adapter.setItem('k2', 'val2');
    await adapter.clear();
    assert.strictEqual(await adapter.getItem('k1'), null);
    assert.strictEqual(await adapter.getItem('k2'), null);
  });

  await t.test('native IndexedDB operations when window.indexedDB is present', async () => {
    const originalWindow = (globalThis as any).window;
    const storeMap = new Map<string, any>();

    const mockIndexedDB = {
      open: (_dbName: string, _version: number) => {
        const req: any = {
          result: null,
          error: null,
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
        };
        queueMicrotask(() => {
          const db: any = {
            objectStoreNames: {
              contains: () => true,
            },
            createObjectStore: () => {},
            transaction: () => ({
              objectStore: () => ({
                get: (key: string) => {
                  const r: any = { result: storeMap.get(key), error: null };
                  queueMicrotask(() => r.onsuccess?.({ target: r }));
                  return r;
                },
                put: (value: any, key: string) => {
                  storeMap.set(key, value);
                  const r: any = { result: key, error: null };
                  queueMicrotask(() => r.onsuccess?.({ target: r }));
                  return r;
                },
                delete: (key: string) => {
                  storeMap.delete(key);
                  const r: any = { result: undefined, error: null };
                  queueMicrotask(() => r.onsuccess?.({ target: r }));
                  return r;
                },
                clear: () => {
                  storeMap.clear();
                  const r: any = { result: undefined, error: null };
                  queueMicrotask(() => r.onsuccess?.({ target: r }));
                  return r;
                },
              }),
            }),
            close: () => {},
          };
          req.result = db;
          if (req.onupgradeneeded) req.onupgradeneeded({ target: req });
          if (req.onsuccess) req.onsuccess({ target: req });
        });
        return req;
      },
    };

    (globalThis as any).window = {
      indexedDB: mockIndexedDB,
    };

    try {
      const adapter = new IndexedDbAdapter('wood_inventory_db', 'keyval');

      await adapter.setItem('idb_item', { name: 'Merbau', count: 42 });
      assert.deepStrictEqual(storeMap.get('idb_item'), { name: 'Merbau', count: 42 });

      const retrieved = await adapter.getItem<{ name: string; count: number }>('idb_item');
      assert.deepStrictEqual(retrieved, { name: 'Merbau', count: 42 });

      await adapter.removeItem('idb_item');
      assert.strictEqual(await adapter.getItem('idb_item'), null);

      await adapter.setItem('key_a', 'val_a');
      await adapter.setItem('key_b', 'val_b');
      await adapter.clear();
      assert.strictEqual(await adapter.getItem('key_a'), null);
      assert.strictEqual(await adapter.getItem('key_b'), null);
    } finally {
      if (originalWindow === undefined) {
        delete (globalThis as any).window;
      } else {
        (globalThis as any).window = originalWindow;
      }
    }
  });

  await t.test('migrateFromLocalStorage copies legacy keys into IndexedDB adapter', async () => {
    const originalWindow = (globalThis as any).window;
    const mockStorageMap: Record<string, string> = {
      wood_receiving_records_v1: JSON.stringify([{ id: 'rec-1', woodSpecies: 'Teak' }]),
      wood_suppliers_v1: JSON.stringify([{ id: 'sup-1', name: 'CV Kayu Abadi' }]),
      wood_settings_v1: JSON.stringify({ yardName: 'Base Yard' }),
      unrelated_key: 'unrelated_data',
    };

    (globalThis as any).window = {
      localStorage: {
        getItem: (k: string) => mockStorageMap[k] ?? null,
        setItem: (k: string, v: string) => { mockStorageMap[k] = v; },
        removeItem: (k: string) => { delete mockStorageMap[k]; },
        clear: () => { for (const k in mockStorageMap) delete mockStorageMap[k]; },
      },
    };

    try {
      const adapter = new IndexedDbAdapter();

      // Test explicit key array migration
      const count1 = await adapter.migrateFromLocalStorage(['wood_receiving_records_v1', 'wood_suppliers_v1']);
      assert.strictEqual(count1, 2);

      const records = await adapter.getItem<Array<{ id: string; woodSpecies: string }>>('wood_receiving_records_v1');
      assert.ok(Array.isArray(records));
      assert.strictEqual(records[0].woodSpecies, 'Teak');

      const suppliers = await adapter.getItem<Array<{ id: string; name: string }>>('wood_suppliers_v1');
      assert.ok(Array.isArray(suppliers));
      assert.strictEqual(suppliers[0].name, 'CV Kayu Abadi');

      // Test default auto-discovery migration
      const count2 = await adapter.migrateFromLocalStorage();
      assert.ok(count2 >= 3, 'Should discover and migrate known default keys');
      const settings = await adapter.getItem<{ yardName: string }>('wood_settings_v1');
      assert.strictEqual(settings?.yardName, 'Base Yard');
    } finally {
      if (originalWindow === undefined) {
        delete (globalThis as any).window;
      } else {
        (globalThis as any).window = originalWindow;
      }
    }
  });

  await t.test('defaultStorage export conforms to StorageAdapter interface', async () => {
    assert.ok(defaultStorage !== null && typeof defaultStorage === 'object');
    assert.strictEqual(typeof defaultStorage.getItem, 'function');
    assert.strictEqual(typeof defaultStorage.setItem, 'function');
    assert.strictEqual(typeof defaultStorage.removeItem, 'function');
    assert.strictEqual(typeof defaultStorage.clear, 'function');
  });
});
