/**
 * test/record-table-pagination.test.ts
 *
 * Unit and contract test suite for RecordTablePagination and RecordTable integration.
 * Verifies:
 * - Architectural invariants and LOC ceilings (< 150 LOC for subcomponent, < 250 LOC for coordinator)
 * - RecordTablePagination props and bilingual rendering contract
 * - RecordTable pagination state, slicing, and subcomponent wiring
 * - Pure pagination calculation and slicing algorithms across page sizes and boundaries
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Pure pagination calculation matching the contract in task-4-brief.md
function calculatePaginationBounds(totalRecords: number, pageSize: number, currentPage: number) {
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(totalRecords / pageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  const start = totalRecords === 0 ? 0 : pageSize === -1 ? 1 : (validPage - 1) * pageSize + 1;
  const end = pageSize === -1 ? totalRecords : Math.min(validPage * pageSize, totalRecords);
  return { totalPages, validPage, start, end };
}

function sliceRecords<T>(records: T[], pageSize: number, currentPage: number): T[] {
  if (pageSize === -1) return records;
  const start = (currentPage - 1) * pageSize;
  return records.slice(start, start + pageSize);
}

function formatPaginationLabel(totalRecords: number, pageSize: number, currentPage: number): string {
  const { start, end } = calculatePaginationBounds(totalRecords, pageSize, currentPage);
  if (totalRecords === 0) {
    return '0 data (0 条数据)';
  }
  return `Menampilkan ${start}-${end} dari ${totalRecords} data (显示 ${start}-${end} 条，共 ${totalRecords} 条)`;
}

test('RecordTablePagination Architecture & Invariants Suite', async (t) => {
  const paginationPath = path.resolve(process.cwd(), 'src/components/ledger/RecordTablePagination.tsx');
  const coordinatorPath = path.resolve(process.cwd(), 'src/components/ledger/RecordTable.tsx');

  await t.test('RecordTablePagination.tsx exists and adheres to < 150 LOC ceiling', () => {
    assert.ok(fs.existsSync(paginationPath), 'RecordTablePagination.tsx must exist');
    const lines = fs.readFileSync(paginationPath, 'utf-8').split('\n');
    assert.ok(lines.length <= 150, `RecordTablePagination.tsx must not exceed 150 LOC (currently ${lines.length})`);
  });

  await t.test('RecordTable.tsx exists and adheres to < 250 LOC Strangler invariant', () => {
    assert.ok(fs.existsSync(coordinatorPath), 'RecordTable.tsx must exist');
    const lines = fs.readFileSync(coordinatorPath, 'utf-8').split('\n');
    assert.ok(lines.length <= 250, `RecordTable.tsx must not exceed 250 LOC (currently ${lines.length})`);
  });

  await t.test('RecordTablePagination exports RecordTablePaginationProps interface and component', () => {
    const content = fs.readFileSync(paginationPath, 'utf-8');
    assert.match(content, /export interface RecordTablePaginationProps/, 'Must export RecordTablePaginationProps');
    assert.match(content, /currentPage:\s*number/, 'Must declare currentPage prop');
    assert.match(content, /pageSize:\s*number/, 'Must declare pageSize prop');
    assert.match(content, /totalRecords:\s*number/, 'Must declare totalRecords prop');
    assert.match(content, /onPageChange:\s*\(page:\s*number\)\s*=>\s*void/, 'Must declare onPageChange handler');
    assert.match(content, /onPageSizeChange:\s*\(pageSize:\s*number\)\s*=>\s*void/, 'Must declare onPageSizeChange handler');
    assert.match(content, /export function RecordTablePagination/, 'Must export RecordTablePagination function');
  });

  await t.test('RecordTablePagination includes page sizes [25, 50, 100, -1] and active styling', () => {
    const content = fs.readFileSync(paginationPath, 'utf-8');
    assert.match(content, /25/, 'Must contain page size 25');
    assert.match(content, /50/, 'Must contain page size 50');
    assert.match(content, /100/, 'Must contain page size 100');
    assert.match(content, /-1/, 'Must support page size -1 for all');
    assert.match(content, /Semua\s*\(全部\)/, 'Must label -1 as Semua (全部)');
    assert.match(content, /bg-\[#ffc908\]\s+text-\[#101828\]\s+font-bold/, 'Must highlight active page size button');
  });

  await t.test('RecordTablePagination implements bilingual count display and navigation buttons', () => {
    const content = fs.readFileSync(paginationPath, 'utf-8');
    assert.match(content, /Menampilkan/, 'Must contain Indonesian Menampilkan text');
    assert.match(content, /0 data\s*\(0 条数据\)/, 'Must contain zero-state bilingual counter');
    assert.match(content, /ChevronLeft/, 'Must import and use ChevronLeft icon');
    assert.match(content, /ChevronRight/, 'Must import and use ChevronRight icon');
    assert.match(content, /disabled=\{.*currentPage\s*<=\s*1/, 'Must disable Prev on first page or all');
    assert.match(content, /disabled=\{.*currentPage\s*>=\s*totalPages/, 'Must disable Next on last page or all');
  });
});

test('RecordTable Coordinator Integration Suite', async (t) => {
  const coordinatorPath = path.resolve(process.cwd(), 'src/components/ledger/RecordTable.tsx');

  await t.test('RecordTable imports and wires RecordTablePagination', () => {
    const content = fs.readFileSync(coordinatorPath, 'utf-8');
    assert.match(content, /import\s+{[^}]*RecordTablePagination[^}]*}\s+from\s+['"]\.\/RecordTablePagination['"]/, 'Must import RecordTablePagination');
    assert.match(content, /<RecordTablePagination/, 'Must render RecordTablePagination component');
  });

  await t.test('RecordTable manages currentPage and pageSize state with reset on filter/record changes', () => {
    const content = fs.readFileSync(coordinatorPath, 'utf-8');
    assert.match(content, /useState<number>\(1\)|useState\(1\)/, 'Must define currentPage state default 1');
    assert.match(content, /useState<number>\(50\)|useState\(50\)/, 'Must define pageSize state default 50');
    assert.match(content, /setCurrentPage\(1\)/, 'Must reset currentPage to 1');
    assert.match(content, /useEffect\(/, 'Must have useEffect hook for resetting page');
  });

  await t.test('RecordTable computes displayedRecords slice and forwards to Excel & Compact views', () => {
    const content = fs.readFileSync(coordinatorPath, 'utf-8');
    assert.match(content, /displayedRecords/, 'Must compute displayedRecords');
    assert.match(content, /slice\(/, 'Must slice records according to page');
    assert.match(content, /records=\{displayedRecords\}/, 'Must pass displayedRecords to table views');
  });
});

test('Pagination Calculations & Slicing Logic Suite', async (t) => {
  const dummyItems = Array.from({ length: 130 }, (_, i) => ({ id: `rec-${i + 1}`, index: i + 1 }));

  await t.test('page size 25: 130 records results in 6 pages with accurate slices', () => {
    const bounds = calculatePaginationBounds(130, 25, 1);
    assert.strictEqual(bounds.totalPages, 6);
    assert.strictEqual(bounds.start, 1);
    assert.strictEqual(bounds.end, 25);

    const page1 = sliceRecords(dummyItems, 25, 1);
    assert.strictEqual(page1.length, 25);
    assert.strictEqual(page1[0].id, 'rec-1');
    assert.strictEqual(page1[24].id, 'rec-25');

    const lastBounds = calculatePaginationBounds(130, 25, 6);
    assert.strictEqual(lastBounds.start, 126);
    assert.strictEqual(lastBounds.end, 130);

    const page6 = sliceRecords(dummyItems, 25, 6);
    assert.strictEqual(page6.length, 5);
    assert.strictEqual(page6[0].id, 'rec-126');
    assert.strictEqual(page6[4].id, 'rec-130');
  });

  await t.test('page size 50: 130 records results in 3 pages with accurate slices', () => {
    const bounds = calculatePaginationBounds(130, 50, 1);
    assert.strictEqual(bounds.totalPages, 3);
    assert.strictEqual(bounds.start, 1);
    assert.strictEqual(bounds.end, 50);

    const page1 = sliceRecords(dummyItems, 50, 1);
    assert.strictEqual(page1.length, 50);
    assert.strictEqual(page1[0].id, 'rec-1');

    const page3 = sliceRecords(dummyItems, 50, 3);
    assert.strictEqual(page3.length, 30);
    assert.strictEqual(page3[0].id, 'rec-101');
    assert.strictEqual(page3[29].id, 'rec-130');
  });

  await t.test('page size 100: 130 records results in 2 pages', () => {
    const bounds = calculatePaginationBounds(130, 100, 1);
    assert.strictEqual(bounds.totalPages, 2);
    assert.strictEqual(bounds.start, 1);
    assert.strictEqual(bounds.end, 100);

    const page2 = sliceRecords(dummyItems, 100, 2);
    assert.strictEqual(page2.length, 30);
    assert.strictEqual(page2[0].id, 'rec-101');
  });

  await t.test('page size -1 (Semua): displays all records in 1 page', () => {
    const bounds = calculatePaginationBounds(130, -1, 1);
    assert.strictEqual(bounds.totalPages, 1);
    assert.strictEqual(bounds.start, 1);
    assert.strictEqual(bounds.end, 130);

    const all = sliceRecords(dummyItems, -1, 1);
    assert.strictEqual(all.length, 130);
    assert.deepStrictEqual(all, dummyItems);
  });

  await t.test('empty dataset (0 records): calculates 0 bounds cleanly', () => {
    const bounds = calculatePaginationBounds(0, 50, 1);
    assert.strictEqual(bounds.totalPages, 1);
    assert.strictEqual(bounds.start, 0);
    assert.strictEqual(bounds.end, 0);

    const sliced = sliceRecords([], 50, 1);
    assert.strictEqual(sliced.length, 0);
  });

  await t.test('bilingual counter string formatting matches expected template', () => {
    assert.strictEqual(
      formatPaginationLabel(130, 25, 1),
      'Menampilkan 1-25 dari 130 data (显示 1-25 条，共 130 条)'
    );
    assert.strictEqual(
      formatPaginationLabel(130, 25, 6),
      'Menampilkan 126-130 dari 130 data (显示 126-130 条，共 130 条)'
    );
    assert.strictEqual(
      formatPaginationLabel(0, 50, 1),
      '0 data (0 条数据)'
    );
  });
});
