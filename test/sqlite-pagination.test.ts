import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import { SqliteRecordStore } from '../src/persistence/sqlite-record-store.ts';
import { ServerRecordStore } from '../src/persistence/server-record-store.ts';
import type { WoodReceivingRecord } from '../src/types/index.ts';

test('SqliteRecordStore Parameterized Pagination & Filtering Suite', async (t) => {
  const store = new SqliteRecordStore(':memory:');

  await t.test('default pagination returns page 1 with pageSize 50 and valid PaginationMeta', async () => {
    const result = await store.getPaginated();
    assert.ok(result);
    assert.ok(Array.isArray(result.data));
    assert.strictEqual(result.data.length, 4);

    assert.deepStrictEqual(result.pagination, {
      page: 1,
      pageSize: 50,
      totalRecords: 4,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });

    // Default sorting is receiptDate DESC
    assert.strictEqual(result.data[0].receiptDate, '2026-10-08');
    assert.strictEqual(result.data[3].receiptDate, '2026-10-01');
  });

  await t.test('page size & offset pagination returns distinct non-overlapping slices', async () => {
    const page1 = await store.getPaginated({ page: 1, pageSize: 2 });
    assert.strictEqual(page1.data.length, 2);
    assert.strictEqual(page1.pagination.page, 1);
    assert.strictEqual(page1.pagination.pageSize, 2);
    assert.strictEqual(page1.pagination.totalRecords, 4);
    assert.strictEqual(page1.pagination.totalPages, 2);
    assert.strictEqual(page1.pagination.hasNextPage, true);
    assert.strictEqual(page1.pagination.hasPreviousPage, false);

    const page2 = await store.getPaginated({ page: 2, pageSize: 2 });
    assert.strictEqual(page2.data.length, 2);
    assert.strictEqual(page2.pagination.page, 2);
    assert.strictEqual(page2.pagination.pageSize, 2);
    assert.strictEqual(page2.pagination.totalRecords, 4);
    assert.strictEqual(page2.pagination.totalPages, 2);
    assert.strictEqual(page2.pagination.hasNextPage, false);
    assert.strictEqual(page2.pagination.hasPreviousPage, true);

    // Verify non-overlapping IDs
    const ids1 = page1.data.map((r) => r.id);
    const ids2 = page2.data.map((r) => r.id);
    for (const id of ids1) {
      assert.ok(!ids2.includes(id), `Page 2 must not contain ID ${id} from Page 1`);
    }
  });

  await t.test('pageSize = -1 returns all records in a single page', async () => {
    const result = await store.getPaginated({ pageSize: -1 });
    assert.strictEqual(result.data.length, 4);
    assert.strictEqual(result.pagination.page, 1);
    assert.strictEqual(result.pagination.pageSize, -1);
    assert.strictEqual(result.pagination.totalRecords, 4);
    assert.strictEqual(result.pagination.totalPages, 1);
    assert.strictEqual(result.pagination.hasNextPage, false);
    assert.strictEqual(result.pagination.hasPreviousPage, false);
  });

  await t.test('searchQuery filters across truckPlateNumber, supplierName, forestryDocNumber, and invoiceNumber', async () => {
    // 1. Truck plate search
    const plateResult = await store.getPaginated({ searchQuery: '9283' });
    assert.strictEqual(plateResult.data.length, 1);
    assert.strictEqual(plateResult.data[0].truckPlateNumber, 'B 9283 TDA');
    assert.strictEqual(plateResult.pagination.totalRecords, 1);

    // 2. Supplier name search
    const supplierResult = await store.getPaginated({ searchQuery: 'Papua Rimba' });
    assert.strictEqual(supplierResult.data.length, 1);
    assert.strictEqual(supplierResult.data[0].supplierName, 'CV Papua Rimba Sejahtera');

    // 3. Forestry document number search
    const docResult = await store.getPaginated({ searchQuery: 'DKP-SLK-8821' });
    assert.strictEqual(docResult.data.length, 1);
    assert.strictEqual(docResult.data[0].forestryDocNumber, 'DKP-SLK-8821');

    // 4. Update one record with invoice number and search
    const target = plateResult.data[0];
    await store.save({
      ...target,
      invoiceNumber: 'INV-2026-X88',
    });

    const invoiceResult = await store.getPaginated({ searchQuery: 'INV-2026-X88' });
    assert.strictEqual(invoiceResult.data.length, 1);
    assert.strictEqual(invoiceResult.data[0].invoiceNumber, 'INV-2026-X88');
  });

  await t.test('category filters: species, kavling, yard, date range, payment status', async () => {
    // 1. Species filter
    const speciesResult = await store.getPaginated({ species: 'Merbau (菠萝格)' });
    assert.strictEqual(speciesResult.data.length, 1);
    assert.strictEqual(speciesResult.data[0].woodSpecies, 'Merbau (菠萝格)');

    // 2. Kavling filter
    const kavlingResult = await store.getPaginated({ kavling: 'KAV-01' });
    assert.strictEqual(kavlingResult.data.length, 1);
    assert.strictEqual(kavlingResult.data[0].kavlingNumber, 'KAV-01');

    // 3. Yard filter
    const yardResult = await store.getPaginated({ yard: 'TPK-Timur' });
    assert.strictEqual(yardResult.data.length, 1);
    assert.strictEqual(yardResult.data[0].storageYard, 'TPK-Timur');

    // 4. Date range filter
    const dateResult = await store.getPaginated({ startDate: '2026-10-02', endDate: '2026-10-06' });
    assert.strictEqual(dateResult.data.length, 2);
    assert.ok(dateResult.data.every((r) => r.receiptDate >= '2026-10-02' && r.receiptDate <= '2026-10-06'));

    // 5. Payment status filter
    const unpaidResult = await store.getPaginated({ paymentStatus: 'UNPAID' });
    assert.strictEqual(unpaidResult.pagination.totalRecords, 4);

    const paidResult = await store.getPaginated({ paymentStatus: 'PAID' });
    assert.strictEqual(paidResult.pagination.totalRecords, 0);

    const allStatusResult = await store.getPaginated({ paymentStatus: 'ALL' });
    assert.strictEqual(allStatusResult.pagination.totalRecords, 4);
  });

  await t.test('sorting whitelist: sortBy and sortOrder', async () => {
    // Sort by grandNetPayable ASC
    const ascResult = await store.getPaginated({ sortBy: 'grandNetPayable', sortOrder: 'ASC' });
    assert.strictEqual(ascResult.data.length, 4);
    assert.ok(ascResult.data[0].grandNetPayable <= ascResult.data[1].grandNetPayable);
    assert.ok(ascResult.data[1].grandNetPayable <= ascResult.data[2].grandNetPayable);

    // Sort by supplierName DESC
    const descResult = await store.getPaginated({ sortBy: 'supplierName', sortOrder: 'DESC' });
    assert.strictEqual(descResult.data.length, 4);
    assert.ok(descResult.data[0].supplierName >= descResult.data[1].supplierName);

    // Invalid sortBy falls back to receiptDate DESC
    const fallbackResult = await store.getPaginated({ sortBy: 'invalidColumn' as any });
    assert.strictEqual(fallbackResult.data[0].receiptDate, '2026-10-08');
  });

  await t.test('empty result handles totalPages = 0 and page boundaries', async () => {
    const emptyResult = await store.getPaginated({ searchQuery: 'NON_EXISTENT_QUERY_XYZ' });
    assert.strictEqual(emptyResult.data.length, 0);
    assert.strictEqual(emptyResult.pagination.totalRecords, 0);
    assert.strictEqual(emptyResult.pagination.totalPages, 0);
    assert.strictEqual(emptyResult.pagination.hasNextPage, false);
    assert.strictEqual(emptyResult.pagination.hasPreviousPage, false);
  });

  store.close();
});

test('ServerRecordStore getPaginated Bridge Suite', async (t) => {
  await t.test('delegates to sqliteRecordStore in SQLite mode', async () => {
    const memorySqlite = new SqliteRecordStore(':memory:');
    const store = new ServerRecordStore(memorySqlite);

    const res = await store.getPaginated({ pageSize: 2 });
    assert.strictEqual(res.data.length, 2);
    assert.strictEqual(res.pagination.totalRecords, 4);
    assert.strictEqual(res.pagination.totalPages, 2);

    store.close();
  });

  await t.test('filters and paginates in file mode', async () => {
    const testFilePath = path.join(process.cwd(), 'data', 'test_paginated_file_store.json');
    try {
      await fs.rm(testFilePath, { force: true });
      const fileStore = new ServerRecordStore(testFilePath);

      // Default pagination
      const defaultPage = await fileStore.getPaginated();
      assert.strictEqual(defaultPage.data.length, 4);
      assert.strictEqual(defaultPage.pagination.totalRecords, 4);
      assert.strictEqual(defaultPage.pagination.totalPages, 1);

      // Slicing
      const slicePage1 = await fileStore.getPaginated({ page: 1, pageSize: 2 });
      assert.strictEqual(slicePage1.data.length, 2);
      assert.strictEqual(slicePage1.pagination.hasNextPage, true);

      const slicePage2 = await fileStore.getPaginated({ page: 2, pageSize: 2 });
      assert.strictEqual(slicePage2.data.length, 2);
      assert.strictEqual(slicePage2.pagination.hasNextPage, false);
      assert.strictEqual(slicePage2.pagination.hasPreviousPage, true);

      // Filtering in file mode
      const filtered = await fileStore.getPaginated({ searchQuery: 'Papua' });
      assert.strictEqual(filtered.data.length, 1);
      assert.strictEqual(filtered.data[0].supplierName, 'CV Papua Rimba Sejahtera');
    } finally {
      await fs.rm(testFilePath, { force: true }).catch(() => {});
    }
  });
});
