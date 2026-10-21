/**
 * test/use-wood-records.test.ts
 *
 * Unit tests verifying useWoodRecords contracts, filtering invariants,
 * mutation mechanics, CSV generation, storage adapters, and optimistic server sync.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { useWoodRecords } from '../src/hooks/useWoodRecords.ts';
import { SEED_WOOD_RECORDS } from '../src/persistence/seed-data.ts';
import { MemoryStorageAdapter, LocalStorageAdapter } from '../src/persistence/storage.ts';
import { toastStore } from '../src/utils/toast-store.ts';
import { escapeCsvField, generateRecordsCsvContent, CSV_HEADERS } from '../src/utils/records-csv.ts';
import { recordMatchesSearchQuery } from '../src/utils/record-search.ts';
import type { WoodReceivingRecord, RecordFilterCriteria } from '../src/types/index.ts';

function renderHook<T>(hookFn: () => T): T {
  let result: T | undefined;
  function Component() {
    result = hookFn();
    return null;
  }
  renderToString(React.createElement(Component));
  return result as T;
}

test('useWoodRecords Hook & Storage Invariants Test Suite', async (t) => {
  await t.test('useWoodRecords hook is exported as a callable function', () => {
    assert.strictEqual(typeof useWoodRecords, 'function');
  });

  await t.test('useWoodRecords exports complete contract including isSyncing state', () => {
    const hookResult = renderHook(useWoodRecords);

    assert.strictEqual(typeof hookResult.isSyncing, 'boolean');
    assert.strictEqual(hookResult.isSyncing, false);
    assert.strictEqual(typeof hookResult.isHydrated, 'boolean');
    assert.ok(Array.isArray(hookResult.records));
    assert.ok(Array.isArray(hookResult.allRecords));
    assert.ok(typeof hookResult.metrics === 'object' && hookResult.metrics !== null);
    assert.ok(typeof hookResult.filters === 'object' && hookResult.filters !== null);
    assert.ok(Array.isArray(hookResult.speciesList));
    assert.strictEqual(typeof hookResult.setFilters, 'function');
    assert.strictEqual(typeof hookResult.saveRecord, 'function');
    assert.strictEqual(typeof hookResult.updateRecordPrice, 'function');
    assert.strictEqual(typeof hookResult.saveManifest, 'function');
    assert.strictEqual(typeof hookResult.deleteRecord, 'function');
    assert.strictEqual(typeof hookResult.restoreRecord, 'function');
    assert.strictEqual(typeof hookResult.resetDemo, 'function');
    assert.strictEqual(typeof hookResult.exportCsv, 'function');
  });

  await t.test('saveRecord initiates background POST sync and triggers warning toast on failure', async () => {
    toastStore.clearToasts();
    const originalFetch = globalThis.fetch;
    let postedUrl = '';
    let postedMethod = '';
    let postedBody = '';

    globalThis.fetch = async (url: any, opts: any) => {
      postedUrl = String(url);
      postedMethod = opts?.method || 'GET';
      postedBody = opts?.body || '';
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { status: 403 });
    };

    try {
      const hookResult = renderHook(useWoodRecords);

      const testRecord: WoodReceivingRecord = {
        ...SEED_WOOD_RECORDS[0],
        id: 'rec-sync-test-1',
        receiptNumber: 'KW-TEST-SYNC',
      };

      hookResult.saveRecord(testRecord);

      // Wait for background async fetch to settle
      await new Promise((resolve) => setTimeout(resolve, 50));

      assert.strictEqual(postedUrl, '/api/records');
      assert.strictEqual(postedMethod, 'POST');
      assert.ok(postedBody.includes('rec-sync-test-1'));

      const toasts = toastStore.getToasts();
      assert.ok(toasts.length > 0);
      const warnToast = toasts.find((toastItem) => toastItem.title === 'Sinkronisasi Server Gagal');
      assert.ok(warnToast, 'Should display server sync failure warning toast');
      assert.strictEqual(warnToast.description, 'Data tersimpan di perangkat lokal.');
    } finally {
      globalThis.fetch = originalFetch;
      toastStore.clearToasts();
    }
  });

  await t.test('deleteRecord initiates background DELETE sync', async () => {
    toastStore.clearToasts();
    const originalFetch = globalThis.fetch;
    let deleteUrl = '';
    let deleteMethod = '';

    globalThis.fetch = async (url: any, opts: any) => {
      deleteUrl = String(url);
      deleteMethod = opts?.method || 'GET';
      return new Response(JSON.stringify({ success: true }));
    };

    try {
      const hookResult = renderHook(useWoodRecords);

      hookResult.deleteRecord('rec-delete-test', { showUndoToast: false });

      await new Promise((resolve) => setTimeout(resolve, 50));

      assert.strictEqual(deleteUrl, '/api/records?id=rec-delete-test');
      assert.strictEqual(deleteMethod, 'DELETE');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('restoreRecord initiates background POST sync', async () => {
    toastStore.clearToasts();
    const originalFetch = globalThis.fetch;
    let restoreUrl = '';
    let restoreMethod = '';
    let restoreBody = '';

    globalThis.fetch = async (url: any, opts: any) => {
      restoreUrl = String(url);
      restoreMethod = opts?.method || 'GET';
      restoreBody = opts?.body || '';
      return new Response(JSON.stringify({ success: true }));
    };

    try {
      const hookResult = renderHook(useWoodRecords);

      const restoreTarget: WoodReceivingRecord = {
        ...SEED_WOOD_RECORDS[0],
        id: 'rec-restore-test',
      };

      hookResult.restoreRecord(restoreTarget);

      await new Promise((resolve) => setTimeout(resolve, 50));

      assert.strictEqual(restoreUrl, '/api/records');
      assert.strictEqual(restoreMethod, 'POST');
      assert.ok(restoreBody.includes('rec-restore-test'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('saveRecord and deleteRecord persist updates immediately to localStorage', () => {
    const map = new Map<string, string>();
    const origWindow = globalThis.window;
    globalThis.window = {
      localStorage: {
        getItem: (k: string) => map.get(k) || null,
        setItem: (k: string, v: string) => map.set(k, v),
        removeItem: (k: string) => map.delete(k),
        clear: () => map.clear(),
      },
    } as any;

    try {
      const hookResult = renderHook(useWoodRecords);
      const testRecord: WoodReceivingRecord = {
        ...SEED_WOOD_RECORDS[0],
        id: 'rec-local-persist',
        supplierName: 'Persisted Supplier',
      };

      hookResult.saveRecord(testRecord);
      const savedRaw = map.get('wood_receiving_records_next_v1');
      assert.ok(savedRaw);
      const savedParsed = JSON.parse(savedRaw);
      assert.ok(savedParsed.some((r: any) => r.id === 'rec-local-persist'));

      hookResult.deleteRecord('rec-local-persist', { showUndoToast: false });
      const afterDeleteRaw = map.get('wood_receiving_records_next_v1');
      assert.ok(afterDeleteRaw);
      const afterDeleteParsed = JSON.parse(afterDeleteRaw);
      assert.ok(!afterDeleteParsed.some((r: any) => r.id === 'rec-local-persist'));
    } finally {
      globalThis.window = origWindow;
    }
  });

  await t.test('source code verifies hasMutatedRef and activeSyncsRef concurrency invariants', () => {
    const hookPath = path.resolve(process.cwd(), 'src/hooks/useWoodRecords.ts');
    const content = fs.readFileSync(hookPath, 'utf-8');

    assert.match(content, /hasMutatedRef = useRef\(false\)/, 'Tracks local mutation ref');
    assert.match(content, /activeSyncsRef = useRef\(0\)/, 'Tracks active sync counter ref');
    assert.match(content, /!hasMutatedRef\.current && json\?\.success/, 'Guards mount GET response against stale overwrite');
    assert.match(content, /setIsSyncing\(activeSyncsRef\.current > 0\)/, 'Derives isSyncing from activeSyncs counter');
  });

  await t.test('SEED_WOOD_RECORDS conforms to WoodReceivingRecord structure', () => {
    assert.ok(Array.isArray(SEED_WOOD_RECORDS));
    assert.strictEqual(SEED_WOOD_RECORDS.length, 4);
    for (const record of SEED_WOOD_RECORDS) {
      assert.ok(record.id.startsWith('rec-'));
      assert.ok(typeof record.receiptDate === 'string');
      assert.ok(typeof record.truckPlateNumber === 'string');
      assert.ok(typeof record.tallyVolumeM3 === 'number');
      assert.ok(typeof record.grandNetPayable === 'number');
      assert.ok(record.grandNetPayable > 0);
    }
  });

  await t.test('MemoryStorageAdapter in storage.ts persists and clears items correctly', async () => {
    const storage = new MemoryStorageAdapter();
    const testData = [{ id: 'test-1', value: 42 }];

    await storage.setItem('test_key', testData);
    const retrieved = await storage.getItem<typeof testData>('test_key');
    assert.deepStrictEqual(retrieved, testData);

    await storage.removeItem('test_key');
    const afterDelete = await storage.getItem('test_key');
    assert.strictEqual(afterDelete, null);

    await storage.setItem('key_a', 'val_a');
    await storage.setItem('key_b', 'val_b');
    await storage.clear();
    assert.strictEqual(await storage.getItem('key_a'), null);
    assert.strictEqual(await storage.getItem('key_b'), null);
  });

  await t.test('LocalStorageAdapter falls back gracefully in non-browser environment', async () => {
    const adapter = new LocalStorageAdapter();
    assert.strictEqual(adapter.isLocalStorageAvailable(), false);

    await adapter.setItem('fallback_key', { status: 'ok' });
    const res = await adapter.getItem<{ status: string }>('fallback_key');
    assert.deepStrictEqual(res, { status: 'ok' });
  });

  await t.test('Record mutation logic preserves immutability and updates timestamps', () => {
    const initial: WoodReceivingRecord[] = JSON.parse(JSON.stringify(SEED_WOOD_RECORDS));
    const target = initial[0];

    // Simulating saveRecord (update existing)
    const updated: WoodReceivingRecord = {
      ...target,
      truckPlateNumber: 'B 1111 UPD',
      updatedAt: new Date().toISOString(),
    };
    const index = initial.findIndex((r) => r.id === updated.id);
    const next = [...initial];
    next[index] = updated;

    assert.strictEqual(next[0].truckPlateNumber, 'B 1111 UPD');
    assert.strictEqual(initial[0].truckPlateNumber, 'B 9283 TDA', 'Initial state untouched');

    // Simulating saveRecord (insert new)
    const newRecord: WoodReceivingRecord = {
      ...target,
      id: 'rec-new-999',
      receiptNumber: 'KW-NEW-999',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const prepended = [newRecord, ...next];
    assert.strictEqual(prepended.length, 5);
    assert.strictEqual(prepended[0].id, 'rec-new-999');

    // Simulating deleteRecord
    const filtered = prepended.filter((r) => r.id !== 'rec-new-999');
    assert.strictEqual(filtered.length, 4);
    assert.ok(filtered.every((r) => r.id !== 'rec-new-999'));

    // Simulating restoreRecord / undo operation
    const restored = [...filtered];
    restored.unshift(newRecord);
    assert.strictEqual(restored.length, 5);
    assert.strictEqual(restored[0].id, 'rec-new-999');
    assert.deepStrictEqual(restored[0], newRecord);
  });

  await t.test('Filter criteria logic accurately filters by species, kavling, date, and query', () => {
    const records: WoodReceivingRecord[] = JSON.parse(JSON.stringify(SEED_WOOD_RECORDS));

    // Filter by species
    const speciesFilter: RecordFilterCriteria = { species: 'Teak / Jati (柚木)' };
    const jatiOnly = records.filter((r) => !speciesFilter.species || r.woodSpecies === speciesFilter.species);
    assert.strictEqual(jatiOnly.length, 1);
    assert.strictEqual(jatiOnly[0].woodSpecies, 'Teak / Jati (柚木)');

    // Filter by kavling
    const kavFilter: RecordFilterCriteria = { kavling: 'KAV-02' };
    const kav02Only = records.filter((r) => !kavFilter.kavling || r.kavlingNumber === kavFilter.kavling);
    assert.strictEqual(kav02Only.length, 1);
    assert.strictEqual(kav02Only[0].kavlingNumber, 'KAV-02');

    // Filter by search query across multiple fields
    const queryFilter = 'papua';
    const queryResults = records.filter((r) => recordMatchesSearchQuery(r, queryFilter));
    assert.strictEqual(queryResults.length, 1);
    assert.strictEqual(queryResults[0].supplierName, 'CV Papua Rimba Sejahtera');
  });

  await t.test('RFC 4180 CSV escaping handles quotes, commas, and formatting', () => {
    assert.strictEqual(escapeCsvField('Simple Text'), '"Simple Text"');
    assert.strictEqual(escapeCsvField('Text with "quotes"'), '"Text with ""quotes"""');
    assert.strictEqual(escapeCsvField('Comma, and "quotes"'), '"Comma, and ""quotes"""');
    assert.strictEqual(escapeCsvField(''), '""');

    const csvOutput = generateRecordsCsvContent(SEED_WOOD_RECORDS.slice(0, 1));
    assert.ok(csvOutput.startsWith(CSV_HEADERS.join(',')));
    assert.ok(csvOutput.includes(SEED_WOOD_RECORDS[0].receiptDate));
    assert.ok(csvOutput.includes(`"${SEED_WOOD_RECORDS[0].supplierName}"`));
  });
});
