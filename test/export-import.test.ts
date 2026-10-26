/**
 * test/export-import.test.ts
 *
 * Unit tests for ledger export date filtering, CSV/Excel helpers,
 * and tabular import parsing/validation.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {
  todayISO,
  thisMonthStart,
  lastMonthStart,
  lastMonthEnd,
  thisWeekStart,
  lastWeekStart,
  lastWeekEnd,
  resolveDatePreset,
  filterRecordsByDateRange,
} from '../src/utils/records-export-filter.ts';
import {
  CSV_HEADERS,
  generateRecordsCsvContent,
  parseCsvToRows,
} from '../src/utils/records-csv.ts';
import {
  parseImportRows,
  parseImportCsv,
  parseImportExcel,
} from '../src/utils/records-import.ts';
import { SEED_WOOD_RECORDS } from '../src/persistence/seed/fixtures.ts';
import type { WoodReceivingRecord } from '../src/types/index.ts';

test('Export / Import Suite — Date Range Filtering', async (t) => {
  await t.test('date helper functions return valid YYYY-MM-DD strings', () => {
    const isIsoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
    assert.ok(isIsoDate(todayISO()), 'todayISO');
    assert.ok(isIsoDate(thisMonthStart()), 'thisMonthStart');
    assert.ok(isIsoDate(lastMonthStart()), 'lastMonthStart');
    assert.ok(isIsoDate(lastMonthEnd()), 'lastMonthEnd');
    assert.ok(isIsoDate(thisWeekStart()), 'thisWeekStart');
    assert.ok(isIsoDate(lastWeekStart()), 'lastWeekStart');
    assert.ok(isIsoDate(lastWeekEnd()), 'lastWeekEnd');
  });

  await t.test('resolveDatePreset returns correct bounds for each preset', () => {
    assert.deepStrictEqual(resolveDatePreset('all'), { startDate: undefined, endDate: undefined });
    assert.deepStrictEqual(resolveDatePreset('custom'), { startDate: undefined, endDate: undefined });

    const thisMonth = resolveDatePreset('this_month');
    assert.strictEqual(thisMonth.startDate, thisMonthStart());
    assert.strictEqual(thisMonth.endDate, todayISO());

    const lastMonth = resolveDatePreset('last_month');
    assert.strictEqual(lastMonth.startDate, lastMonthStart());
    assert.strictEqual(lastMonth.endDate, lastMonthEnd());
  });

  await t.test('filterRecordsByDateRange filters records correctly by receiptDate', () => {
    const records: WoodReceivingRecord[] = [
      { ...SEED_WOOD_RECORDS[0], receiptDate: '2026-01-10' },
      { ...SEED_WOOD_RECORDS[0], receiptDate: '2026-02-15' },
      { ...SEED_WOOD_RECORDS[0], receiptDate: '2026-03-20' },
    ];

    // Open bounds
    assert.strictEqual(filterRecordsByDateRange(records).length, 3);

    // Filter with both bounds
    const febOnly = filterRecordsByDateRange(records, '2026-02-01', '2026-02-28');
    assert.strictEqual(febOnly.length, 1);
    assert.strictEqual(febOnly[0].receiptDate, '2026-02-15');

    // Lower bound only
    const fromFeb = filterRecordsByDateRange(records, '2026-02-01');
    assert.strictEqual(fromFeb.length, 2);

    // Upper bound only
    const untilFeb = filterRecordsByDateRange(records, undefined, '2026-02-20');
    assert.strictEqual(untilFeb.length, 2);

    // Out of range
    const none = filterRecordsByDateRange(records, '2026-04-01', '2026-04-30');
    assert.strictEqual(none.length, 0);
  });
});

test('Export / Import Suite — CSV Parsing and Roundtrip', async (t) => {
  await t.test('parseCsvToRows accurately parses comma-separated and quoted fields', () => {
    const csv = `A,B,C\n1,"Hello, World",3\n4,"He said ""Hi""",6`;
    const rows = parseCsvToRows(csv);
    assert.strictEqual(rows.length, 3);
    assert.deepStrictEqual(rows[0], ['A', 'B', 'C']);
    assert.deepStrictEqual(rows[1], ['1', 'Hello, World', '3']);
    assert.deepStrictEqual(rows[2], ['4', 'He said "Hi"', '6']);
  });

  await t.test('parseImportCsv accurately parses exported CSV content', () => {
    const seed = SEED_WOOD_RECORDS[0];
    const csvContent = generateRecordsCsvContent([seed]);
    const result = parseImportCsv(csvContent, new Set());

    assert.strictEqual(result.totalRows, 1);
    assert.strictEqual(result.errors.length, 0);
    assert.strictEqual(result.valid.length, 1);
    assert.strictEqual(result.duplicates.length, 0);

    const parsed = result.valid[0].record;
    assert.strictEqual(parsed.receiptDate, seed.receiptDate);
    assert.strictEqual(parsed.truckPlateNumber, seed.truckPlateNumber);
    assert.strictEqual(parsed.receiptNumber, seed.receiptNumber);
    assert.strictEqual(parsed.supplierName, seed.supplierName);
    assert.strictEqual(parsed.woodSpecies, seed.woodSpecies);
    assert.strictEqual(parsed.tallyVolumeM3, seed.tallyVolumeM3);
  });
});

test('Export / Import Suite — Validation and Duplicate Detection', async (t) => {
  await t.test('parseImportRows detects duplicates and skips them', () => {
    const existingNos = new Set(['KWT-001']);
    const rows = [
      CSV_HEADERS,
      ['2026-01-15', '', 'B 1234 XY', 'SK-01', 'KWT-001', 'CTR-01', 'PT Supplier', 'Teak', 4, 'KAV-1', 'TPK-A', 10, 5, 10, 5, 1000, 5000, 0, 5000, 100, 500, 0, 500, '', 0, 5500, 'PAID'],
      ['2026-01-16', '', 'B 5678 ZW', 'SK-02', 'KWT-002', 'CTR-01', 'PT Supplier', 'Teak', 4, 'KAV-1', 'TPK-A', 10, 5, 10, 5, 1000, 5000, 0, 5000, 100, 500, 0, 500, '', 0, 5500, 'UNPAID'],
    ];

    const result = parseImportRows(rows, existingNos);
    assert.strictEqual(result.totalRows, 2);
    assert.strictEqual(result.duplicates.length, 1);
    assert.strictEqual(result.duplicates[0].record.receiptNumber, 'KWT-001');
    assert.strictEqual(result.valid.length, 1);
    assert.strictEqual(result.valid[0].record.receiptNumber, 'KWT-002');
  });

  await t.test('parseImportRows validates required fields and reports error reasons', () => {
    const rows = [
      CSV_HEADERS,
      ['invalid-date', '', 'B 1234 XY', 'SK-01', 'KWT-001', '', 'Supplier', 'Teak'],
      ['2026-01-15', '', 'B 1234 XY', 'SK-01', '', '', 'Supplier', 'Teak'], // missing receiptNumber
      ['2026-01-15', '', '', 'SK-01', 'KWT-003', '', 'Supplier', 'Teak'], // missing truckPlate
      ['2026-01-15', '', 'B 1234 XY', 'SK-01', 'KWT-004', '', '', 'Teak'], // missing supplier
      ['2026-01-15', '', 'B 1234 XY', 'SK-01', 'KWT-005', '', 'Supplier', ''], // missing species
    ];

    const result = parseImportRows(rows, new Set());
    assert.strictEqual(result.errors.length, 5);
    assert.strictEqual(result.valid.length, 0);
  });
});

test('Export / Import Suite — Excel Parsing with SheetJS', async (t) => {
  await t.test('parseImportExcel parses binary workbook into valid records', () => {
    const headerRow = CSV_HEADERS;
    const dataRow = [
      '2026-02-10', '2026-02-09', 'AD 9999 XX', 'SK-99', 'KWT-EXCEL-01',
      'CTR-99', 'CV Excel Supplier', 'Mahoni', 3, 'KAV-02', 'TPK-B',
      15, 8.5, 15, 8.5, 1200000, 10200000, 0, 10200000,
      50000, 425000, 0, 425000, '', 0, 10625000, 'UNPAID',
    ];

    const ws = XLSX.utils.aoa_to_sheet([headerRow, dataRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const result = parseImportExcel(buffer, new Set());
    assert.strictEqual(result.totalRows, 1);
    assert.strictEqual(result.valid.length, 1);
    assert.strictEqual(result.valid[0].record.receiptNumber, 'KWT-EXCEL-01');
    assert.strictEqual(result.valid[0].record.supplierName, 'CV Excel Supplier');
    assert.strictEqual(result.valid[0].record.woodSpecies, 'Mahoni');
  });
});
