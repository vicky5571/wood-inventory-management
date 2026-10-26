# Export / Import — Implementation Plan

**Feature:** Export/Import Modal for Buku Besar Penerimaan Kayu
**Spec Reference:** `docs/superpowers/export-import-spec.md`
**Estimated Steps:** 7 discrete changes across 7 files

---

## Overview — Dependency Order

Steps must be executed in this order to avoid broken imports:

```
Step 1  →  npm install xlsx
Step 2  →  src/utils/records-export-filter.ts     (NEW — date filter util)
Step 3  →  src/utils/records-excel.ts             (NEW — Excel export util)
Step 4  →  src/utils/records-csv.ts               (MODIFY — add CSV import parser)
Step 5  →  src/utils/records-import.ts            (NEW — import merge logic)
Step 6  →  src/hooks/useWoodRecords.ts            (MODIFY — add importRecords())
Step 7  →  src/components/ledger/ExportImportModal.tsx  (NEW — modal component)
Step 8  →  src/components/ledger/Toolbar.tsx      (MODIFY — swap button + prop)
Step 9  →  app/ledger/page.tsx                    (MODIFY — wire modal + state)
```

---

## Step 1 — Install xlsx (SheetJS)

```bash
npm install xlsx
```

- Package: `xlsx` (SheetJS Community Edition)
- Used in: Step 3 (Excel export) and Step 5 (Excel import parsing)
- No type package needed — `xlsx` ships its own `.d.ts`
- Add to `package.json` under `dependencies` (not devDependencies — needed at runtime)

---

## Step 2 — CREATE `src/utils/records-export-filter.ts`

**Purpose:** Pure date-range filter for export. Intentionally separate from
`filterWoodRecords()` (which handles toolbar state) so the modal can filter
`allRecords` independently without touching toolbar state.

### Full file content to write:

```ts
/**
 * src/utils/records-export-filter.ts
 *
 * Date-range filtering utility for the Export/Import modal.
 * Operates on WoodReceivingRecord.receiptDate (YYYY-MM-DD strings).
 * Independent of toolbar RecordFilterCriteria state.
 */

import type { WoodReceivingRecord } from '../types/index.ts';

/** Returns YYYY-MM-DD string for today */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Returns YYYY-MM-DD for the first day of the current month */
export function thisMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Returns YYYY-MM-DD for the first day of the previous month */
export function lastMonthStart(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Returns YYYY-MM-DD for the last day of the previous month */
export function lastMonthEnd(): string {
  const d = new Date();
  d.setDate(0); // day 0 = last day of previous month
  return d.toISOString().slice(0, 10);
}

/** Returns YYYY-MM-DD for Monday of the current week (ISO week: Mon=start) */
export function thisWeekStart(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** Returns YYYY-MM-DD for Monday of last week */
export function lastWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -13 : 1 - day - 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** Returns YYYY-MM-DD for Sunday of last week */
export function lastWeekEnd(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -7 : -day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export type DatePreset = 'this_month' | 'last_month' | 'this_week' | 'last_week' | 'custom' | 'all';

export interface PresetDateRange {
  startDate?: string;
  endDate?: string;
}

/** Resolves a preset label to a concrete { startDate, endDate } pair */
export function resolveDatePreset(preset: DatePreset): PresetDateRange {
  switch (preset) {
    case 'this_month':  return { startDate: thisMonthStart(), endDate: todayISO() };
    case 'last_month':  return { startDate: lastMonthStart(), endDate: lastMonthEnd() };
    case 'this_week':   return { startDate: thisWeekStart(),  endDate: todayISO() };
    case 'last_week':   return { startDate: lastWeekStart(),  endDate: lastWeekEnd() };
    case 'all':         return { startDate: undefined,        endDate: undefined };
    case 'custom':      return { startDate: undefined,        endDate: undefined }; // caller fills in
    default:            return { startDate: undefined,        endDate: undefined };
  }
}

/**
 * Filter records by receiptDate within [startDate, endDate] (inclusive).
 * Undefined bounds = open-ended.
 * Uses lexicographic compare — safe for YYYY-MM-DD format.
 */
export function filterRecordsByDateRange(
  records: WoodReceivingRecord[],
  startDate?: string,
  endDate?: string,
): WoodReceivingRecord[] {
  if (!startDate && !endDate) return records;
  return records.filter((r) => {
    const d = r.receiptDate;
    if (!d) return false;
    if (startDate && d < startDate) return false;
    if (endDate   && d > endDate)   return false;
    return true;
  });
}
```

---

## Step 3 — CREATE `src/utils/records-excel.ts`

**Purpose:** Excel export using SheetJS. Styled amber header row, auto column widths, frozen top row.

### Full file content to write:

```ts
/**
 * src/utils/records-excel.ts
 *
 * Excel (.xlsx) export utility for wood receiving records.
 * Uses SheetJS (xlsx) Community Edition.
 * Header row styled with amber background (#FFC908) via writeFile with cellStyles.
 */

import * as XLSX from 'xlsx';
import type { WoodReceivingRecord } from '../types/index.ts';
import { CSV_HEADERS, generateRecordsCsvContent } from './records-csv.ts';

/**
 * Build a 2D array (rows of cells) from records — same column order as CSV.
 */
function buildSheetRows(records: WoodReceivingRecord[]): (string | number | null)[][] {
  const dataRows: (string | number | null)[][] = records.map((r) => [
    r.receiptDate,
    r.docDate || '',
    r.truckPlateNumber,
    r.forestryDocNumber,
    r.receiptNumber,
    r.contractNumber,
    r.supplierName,
    r.woodSpecies,
    r.woodLengthM ?? '',
    r.kavlingNumber,
    r.storageYard || '',
    r.deliveredPieces,
    r.deliveredVolumeM3,
    r.tallyPieces,
    r.tallyVolumeM3,
    r.timberPricePerM3,
    r.timberGrossTotal,
    r.timberPphAmount,
    r.timberNetPayable,
    r.freightRatePerM3,
    r.freightGrossTotal,
    r.freightPphAmount,
    r.freightNetPayable,
    r.brokerId || '',
    r.brokerFee,
    r.grandNetPayable,
    r.paymentStatus || 'UNPAID',
  ]);
  return [CSV_HEADERS, ...dataRows];
}

/**
 * Derive column widths: max of header length and longest cell value in first 50 rows.
 */
function computeColWidths(rows: (string | number | null)[][]): XLSX.ColInfo[] {
  const headerRow = rows[0] as string[];
  return headerRow.map((h, colIdx) => {
    let max = String(h).length;
    for (let r = 1; r < Math.min(rows.length, 51); r++) {
      const cell = rows[r][colIdx];
      if (cell != null) max = Math.max(max, String(cell).length);
    }
    return { wch: Math.min(max + 2, 40) };
  });
}

/**
 * Export records to a .xlsx file and trigger browser download.
 */
export function exportRecordsToExcel(
  records: WoodReceivingRecord[],
  filenamePrefix = 'penerimaan_kayu',
): void {
  if (typeof window === 'undefined') return;

  const rows = buildSheetRows(records);
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws['!cols'] = computeColWidths(rows);

  // Freeze top row
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Buku Besar');

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  XLSX.writeFile(wb, `${filenamePrefix}_${dateStr}.xlsx`);
}

/**
 * Export records to Excel with a specific date range label in the filename.
 */
export function exportRecordsToExcelWithRange(
  records: WoodReceivingRecord[],
  startDate?: string,
  endDate?: string,
  filenamePrefix = 'penerimaan_kayu',
): void {
  const start = startDate ? startDate.replace(/-/g, '') : 'awal';
  const end   = endDate   ? endDate.replace(/-/g, '')   : 'akhir';
  const rows  = buildSheetRows(records);
  const ws    = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = computeColWidths(rows);
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Buku Besar');
  XLSX.writeFile(wb, `${filenamePrefix}_${start}_${end}.xlsx`);
}

/**
 * Download a blank import template (.xlsx) with header row + 1 example row.
 */
export function downloadExcelTemplate(): void {
  if (typeof window === 'undefined') return;

  const exampleRow = [
    '2026-01-15', '2026-01-14', 'B 1234 XY', 'SKSHHK-001', 'KWT-001',
    'KTR-001', 'PT Supplier Kayu', 'Jati', 4, 'KAV-01', 'TPK-A',
    20, 12.5, 19, 11.8, 1500000, '', '', '', 50000, '', '', '',
    '', 0, '', 'UNPAID',
  ];

  const rows = [CSV_HEADERS, exampleRow];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = computeColWidths(rows);
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Import');
  XLSX.writeFile(wb, 'template_import_buku_besar.xlsx');
}
```

### Notes on Excel header styling:
SheetJS CE does not support cell background color in `aoa_to_sheet`. To get the amber header, two options exist:
- **Option A (Recommended):** Use `xlsx-js-style` package (a CE fork with style support) — drop-in replacement, same API, add `s: { fill: { fgColor: { rgb: 'FFC908' } }, font: { bold: true } }` to header cells.
- **Option B:** Accept no color in CE; the frozen row + bold text from column widths is sufficient for usability.

The implementation plan uses **Option A**. If `xlsx-js-style` causes issues, fall back to Option B with plain `xlsx`.


---

## Step 4 — MODIFY `src/utils/records-csv.ts`

**What to add:** Two new exported functions at the bottom of the existing file. Do NOT change existing code.

### Append to end of file:

```ts
/**
 * Export CSV with explicit date-range label in filename.
 */
export function exportRecordsToCsvWithRange(
  records: WoodReceivingRecord[],
  startDate?: string,
  endDate?: string,
  filenamePrefix = 'penerimaan_kayu',
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const start = startDate ? startDate.replace(/-/g, '') : 'awal';
  const end   = endDate   ? endDate.replace(/-/g, '')   : 'akhir';
  // UTF-8 BOM so Excel opens without encoding issues
  const BOM = '\uFEFF';
  const csvContent = BOM + generateRecordsCsvContent(records);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href  = url;
  link.download = `${filenamePrefix}_${start}_${end}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Download a blank CSV import template (header row only).
 */
export function downloadCsvTemplate(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const BOM = '\uFEFF';
  const content = BOM + CSV_HEADERS.join(',') + '\n';
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href  = url;
  link.download = 'template_import_buku_besar.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Parse a CSV string (RFC 4180) into raw row arrays.
 * Returns [headerRow, ...dataRows] — each row is string[].
 */
export function parseCsvToRows(csvText: string): string[][] {
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  return lines
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const fields: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
          else { inQuotes = !inQuotes; }
        } else if (ch === ',' && !inQuotes) {
          fields.push(current); current = '';
        } else {
          current += ch;
        }
      }
      fields.push(current);
      return fields;
    });
}
```


---

## Step 5 — CREATE `src/utils/records-import.ts`

**Purpose:** Parse raw rows (from CSV or Excel) into validated `WoodReceivingRecord[]`, detect duplicates, return structured result.

### Full file content to write:

```ts
/**
 * src/utils/records-import.ts
 *
 * Parses raw tabular data (from CSV or Excel) into WoodReceivingRecord objects.
 * Validates required fields, detects duplicates, assigns new IDs.
 */

import type { WoodReceivingRecord, PaymentStatus } from '../types/index.ts';
import { CSV_HEADERS, parseCsvToRows } from './records-csv.ts';
import * as XLSX from 'xlsx';

export interface ImportRow {
  record: WoodReceivingRecord;
  rowIndex: number;  // 1-based (excludes header)
}

export interface ImportError {
  rowIndex: number;
  reason: string;
}

export interface ImportParseResult {
  valid: ImportRow[];
  duplicates: ImportRow[];   // valid rows whose receiptNumber already exists
  errors: ImportError[];
  totalRows: number;         // data rows found (excl. header)
}

const REQUIRED_COL_INDICES = {
  receiptDate:      0,
  docDate:          1,
  truckPlateNumber: 2,
  forestryDocNumber:3,
  receiptNumber:    4,
  contractNumber:   5,
  supplierName:     6,
  woodSpecies:      7,
  woodLengthM:      8,
  kavlingNumber:    9,
  storageYard:      10,
  deliveredPieces:  11,
  deliveredVolumeM3:12,
  tallyPieces:      13,
  tallyVolumeM3:    14,
  timberPricePerM3: 15,
  timberGrossTotal: 16,
  timberPphAmount:  17,
  timberNetPayable: 18,
  freightRatePerM3: 19,
  freightGrossTotal:20,
  freightPphAmount: 21,
  freightNetPayable:22,
  brokerId:         23,
  brokerFee:        24,
  grandNetPayable:  25,
  paymentStatus:    26,
} as const;

function safeNum(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

function safeNullNum(val: string | number | null | undefined): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function safeStr(val: string | number | null | undefined): string {
  return val == null ? '' : String(val).trim();
}

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function rowToRecord(fields: (string | number | null | undefined)[]): WoodReceivingRecord {
  const now = new Date().toISOString();
  const ps = safeStr(fields[REQUIRED_COL_INDICES.paymentStatus]).toUpperCase();
  const validStatuses: PaymentStatus[] = ['UNPAID', 'PARTIAL', 'PAID'];
  const paymentStatus: PaymentStatus = validStatuses.includes(ps as PaymentStatus)
    ? (ps as PaymentStatus)
    : 'UNPAID';

  return {
    id:                 crypto.randomUUID(),
    receiptDate:        safeStr(fields[REQUIRED_COL_INDICES.receiptDate]),
    docDate:            safeStr(fields[REQUIRED_COL_INDICES.docDate]) || undefined,
    truckPlateNumber:   safeStr(fields[REQUIRED_COL_INDICES.truckPlateNumber]),
    forestryDocNumber:  safeStr(fields[REQUIRED_COL_INDICES.forestryDocNumber]),
    receiptNumber:      safeStr(fields[REQUIRED_COL_INDICES.receiptNumber]),
    contractNumber:     safeStr(fields[REQUIRED_COL_INDICES.contractNumber]),
    supplierName:       safeStr(fields[REQUIRED_COL_INDICES.supplierName]),
    woodSpecies:        safeStr(fields[REQUIRED_COL_INDICES.woodSpecies]),
    woodLengthM:        safeNum(fields[REQUIRED_COL_INDICES.woodLengthM]),
    kavlingNumber:      safeStr(fields[REQUIRED_COL_INDICES.kavlingNumber]),
    storageYard:        safeStr(fields[REQUIRED_COL_INDICES.storageYard]),
    deliveredPieces:    safeNum(fields[REQUIRED_COL_INDICES.deliveredPieces]),
    deliveredVolumeM3:  safeNum(fields[REQUIRED_COL_INDICES.deliveredVolumeM3]),
    tallyPieces:        safeNum(fields[REQUIRED_COL_INDICES.tallyPieces]),
    tallyVolumeM3:      safeNum(fields[REQUIRED_COL_INDICES.tallyVolumeM3]),
    timberPricePerM3:   safeNullNum(fields[REQUIRED_COL_INDICES.timberPricePerM3]),
    timberGrossTotal:   safeNullNum(fields[REQUIRED_COL_INDICES.timberGrossTotal]),
    timberPphRate:      0,
    timberPphAmount:    safeNullNum(fields[REQUIRED_COL_INDICES.timberPphAmount]),
    timberNetPayable:   safeNullNum(fields[REQUIRED_COL_INDICES.timberNetPayable]),
    freightRatePerM3:   safeNum(fields[REQUIRED_COL_INDICES.freightRatePerM3]),
    freightGrossTotal:  safeNum(fields[REQUIRED_COL_INDICES.freightGrossTotal]),
    freightPphAmount:   safeNum(fields[REQUIRED_COL_INDICES.freightPphAmount]),
    freightNetPayable:  safeNum(fields[REQUIRED_COL_INDICES.freightNetPayable]),
    brokerId:           safeStr(fields[REQUIRED_COL_INDICES.brokerId]) || undefined,
    brokerFee:          safeNum(fields[REQUIRED_COL_INDICES.brokerFee]),
    grandNetPayable:    safeNullNum(fields[REQUIRED_COL_INDICES.grandNetPayable]),
    paymentStatus,
    createdAt:          now,
    updatedAt:          now,
  };
}

/**
 * Parse rows (header + data) into ImportParseResult.
 * existingReceiptNumbers: Set of receiptNumbers already in allRecords.
 */
export function parseImportRows(
  rows: (string | number | null | undefined)[][],
  existingReceiptNumbers: Set<string>,
): ImportParseResult {
  if (rows.length < 2) {
    return { valid: [], duplicates: [], errors: [], totalRows: 0 };
  }

  const dataRows = rows.slice(1); // skip header
  const valid: ImportRow[] = [];
  const duplicates: ImportRow[] = [];
  const errors: ImportError[] = [];

  dataRows.forEach((fields, idx) => {
    const rowIndex = idx + 1;
    const receiptDate = safeStr(fields[REQUIRED_COL_INDICES.receiptDate]);
    const receiptNumber = safeStr(fields[REQUIRED_COL_INDICES.receiptNumber]);
    const truckPlate = safeStr(fields[REQUIRED_COL_INDICES.truckPlateNumber]);
    const supplier = safeStr(fields[REQUIRED_COL_INDICES.supplierName]);
    const species = safeStr(fields[REQUIRED_COL_INDICES.woodSpecies]);

    // Validate required fields
    if (!isValidDate(receiptDate)) {
      errors.push({ rowIndex, reason: `receiptDate "${receiptDate}" bukan format YYYY-MM-DD` });
      return;
    }
    if (!receiptNumber) {
      errors.push({ rowIndex, reason: 'No. Kwitansi (receiptNumber) kosong' });
      return;
    }
    if (!truckPlate) {
      errors.push({ rowIndex, reason: 'No. Polisi (truckPlateNumber) kosong' });
      return;
    }
    if (!supplier) {
      errors.push({ rowIndex, reason: 'Supplier kosong' });
      return;
    }
    if (!species) {
      errors.push({ rowIndex, reason: 'Jenis Kayu kosong' });
      return;
    }

    const record = rowToRecord(fields);

    if (existingReceiptNumbers.has(receiptNumber)) {
      duplicates.push({ record, rowIndex });
    } else {
      valid.push({ record, rowIndex });
    }
  });

  return { valid, duplicates, errors, totalRows: dataRows.length };
}

/** Parse a CSV text string into ImportParseResult */
export function parseImportCsv(
  csvText: string,
  existingReceiptNumbers: Set<string>,
): ImportParseResult {
  const rows = parseCsvToRows(csvText);
  return parseImportRows(rows as string[][], existingReceiptNumbers);
}

/** Parse an Excel ArrayBuffer into ImportParseResult */
export function parseImportExcel(
  buffer: ArrayBuffer,
  existingReceiptNumbers: Set<string>,
): ImportParseResult {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, { header: 1, defval: '' });
  return parseImportRows(rows, existingReceiptNumbers);
}
```


---

## Step 6 — MODIFY `src/hooks/useWoodRecords.ts`

**What to change:** Add `importRecords` callback. Two edits to the existing file.

### Edit A — Add import to top of file

Find the existing import line:
```ts
import { exportRecordsToCsv } from '../utils/records-csv.ts';
```

Replace with:
```ts
import { exportRecordsToCsv } from '../utils/records-csv.ts';
import type { ImportRow } from '../utils/records-import.ts';
```

### Edit B — Add `importRecords` callback before the `return` statement

Find:
```ts
  const exportCsv = useCallback(() => exportRecordsToCsv(records), [records]);
```

Replace with:
```ts
  const exportCsv = useCallback(() => exportRecordsToCsv(records), [records]);

  /**
   * importRecords — merges validated import rows into allRecords.
   * Prepends new records (they appear at top of the ledger).
   * Skips duplicates (already filtered by parseImportRows before this is called).
   */
  const importRecords = useCallback((importedRows: ImportRow[]) => {
    if (importedRows.length === 0) return;
    hasMutatedRef.current = true;
    const newRecords = importedRows.map((r) => r.record);
    const next = [...newRecords, ...recordsRef.current];
    updateRecords(next);

    // Best-effort server sync — bulk POST
    syncWithServer(async () => {
      for (const record of newRecords) {
        const res = await fetch('/api/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        });
        if (!res.ok) notifySyncFailure();
      }
    }, true);
  }, [syncWithServer, updateRecords]);
```

### Edit C — Add `importRecords` to the return object

Find:
```ts
    restoreRecord, resetDemo, exportCsv,
```

Replace with:
```ts
    restoreRecord, resetDemo, exportCsv, importRecords,
```


---

## Step 7 — CREATE `src/components/ledger/ExportImportModal.tsx`

**Purpose:** The main modal component. Two tabs: Export and Import.

### Props interface:

```ts
interface ExportImportModalProps {
  isOpen: boolean;
  allRecords: WoodReceivingRecord[];   // unfiltered — modal does its own date filter
  onClose: () => void;
  onImportConfirm: (rows: ImportRow[]) => void;
}
```

### Component structure (pseudocode / outline):

```
ExportImportModal
  ├── if (!isOpen) return null
  ├── useEffect → Escape key closes modal
  ├── State:
  │     activeTab: 'export' | 'import'
  │     // Export tab state
  │     selectedPreset: DatePreset  (default: 'this_month')
  │     customStart: string
  │     customEnd: string
  │     exportFormat: 'csv' | 'excel'
  │     isExporting: boolean
  │     // Import tab state
  │     importFile: File | null
  │     parseResult: ImportParseResult | null
  │     isParsing: boolean
  │     parseError: string | null
  │     isImporting: boolean
  │
  ├── Derived:
  │     resolvedRange = selectedPreset === 'custom'
  │                     ? { startDate: customStart, endDate: customEnd }
  │                     : resolveDatePreset(selectedPreset)
  │     filteredRecords = filterRecordsByDateRange(allRecords, ...resolvedRange)
  │
  ├── Overlay div (fixed inset-0 z-50 bg-[#101828]/60 backdrop-blur-xs)
  └── Modal card (max-w-2xl, rounded-2xl, bg-white, shadow-2xl)
        ├── Header row
        │     Left: ArrowUpDown icon + "Export / Import Data" title
        │     Subtitle: "Buku Besar Penerimaan Kayu"
        │     Right: X close button
        ├── Tab switcher (Export | Import)
        │     role="tablist", two buttons with active amber underline style
        ├── Tab panel: Export
        │     Section: "Rentang Tanggal (日期范围)"
        │       Preset pills: All Data | This Month | Last Month | This Week | Last Week | Custom
        │       If 'custom': two date inputs (Dari / Sampai)
        │     Section: "Format Ekspor"
        │       Radio-style buttons: CSV | Excel (.xlsx)
        │     Info line: "X record akan diekspor" (gray text, or warning if 0)
        │     Export button (disabled + spinner if isExporting or filteredRecords.length === 0)
        │       Label: "↓ Export CSV" or "↓ Export Excel"
        └── Tab panel: Import
              Drop zone (dashed border, FileUp icon, text instruction)
                → input[type=file] accept=".csv,.xlsx,.xls" hidden, triggered by click/drop
              If file selected: show filename chip + clear button
              If isParsing: spinner
              If parseError: red error box
              If parseResult:
                Preview table (first 10 valid rows)
                  Columns: No | Tgl Terima | No Pol | No Kwit | Supplier | Spesies | Vol m³
                Summary pills: N valid | N duplikat | N error
              Confirm Import button (disabled if no valid rows or isImporting)
              Separator + "Download Template" section
                Two buttons: Template CSV | Template Excel
```

### Key implementation details:

**File reading:**
```ts
async function handleFileSelect(file: File) {
  if (file.size > 5 * 1024 * 1024) { setParseError('Ukuran file melebihi batas 5 MB'); return; }
  setIsParsing(true);
  setParseError(null);
  const existingNos = new Set(allRecords.map((r) => r.receiptNumber));
  try {
    let result: ImportParseResult;
    if (file.name.endsWith('.csv')) {
      const text = await file.text();
      result = parseImportCsv(text, existingNos);
    } else {
      const buffer = await file.arrayBuffer();
      result = parseImportExcel(buffer, existingNos);
    }
    if (result.totalRows === 0) { setParseError('File tidak memiliki data'); return; }
    setParseResult(result);
  } catch {
    setParseError('Gagal membaca file. Pastikan file tidak rusak.');
  } finally {
    setIsParsing(false);
  }
}
```

**Export handler:**
```ts
function handleExport() {
  setIsExporting(true);
  try {
    if (exportFormat === 'csv') {
      exportRecordsToCsvWithRange(filteredRecords, resolvedRange.startDate, resolvedRange.endDate);
    } else {
      exportRecordsToExcelWithRange(filteredRecords, resolvedRange.startDate, resolvedRange.endDate);
    }
  } finally {
    setIsExporting(false);
  }
}
```

**Confirm import handler:**
```ts
function handleConfirmImport() {
  if (!parseResult || parseResult.valid.length === 0) return;
  setIsImporting(true);
  onImportConfirm(parseResult.valid);
  onClose();
}
```

**Drag and drop:**
```ts
onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
onDragLeave={() => setIsDragging(false)}
onDrop={(e) => {
  e.preventDefault(); setIsDragging(false);
  const file = e.dataTransfer.files[0];
  if (file) handleFileSelect(file);
}}
```

### Preset pill labels (Indonesian/Chinese):

| Preset key | Label |
|------------|-------|
| `all` | Semua Data |
| `this_month` | Bulan Ini (本月) |
| `last_month` | Bulan Lalu (上月) |
| `this_week` | Minggu Ini (本周) |
| `last_week` | Minggu Lalu (上周) |
| `custom` | Kustom (自定义) |


---

## Step 8 — MODIFY `src/components/ledger/Toolbar.tsx`

**What to change:** Swap `onExportCsv` prop for `onExportImport`, update the button UI.

### Edit A — Props interface

Find:
```ts
  onExportCsv: () => void;
```
Replace with:
```ts
  onExportImport: () => void;
```

### Edit B — Destructured prop in function signature

Find:
```ts
  onExportCsv,
```
Replace with:
```ts
  onExportImport,
```

### Edit C — Update import (add ArrowUpDown, remove Download)

Find:
```ts
import { Search, Download, RotateCcw, Plus, X, Calendar } from 'lucide-react';
```
Replace with:
```ts
import { Search, ArrowUpDown, RotateCcw, Plus, X, Calendar } from 'lucide-react';
```

### Edit D — Replace the button JSX

Find:
```tsx
          {/* Export CSV */}
          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition shadow-2xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-gray-500" />
            <span>Export CSV</span>
          </button>
```
Replace with:
```tsx
          {/* Export / Import */}
          <button
            type="button"
            onClick={onExportImport}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition shadow-2xs cursor-pointer"
          >
            <ArrowUpDown className="w-4 h-4 text-gray-500" />
            <span>Export / Import</span>
          </button>
```


---

## Step 9 — MODIFY `app/ledger/page.tsx`

**What to change:** Import the modal, add state, wire it up.

### Edit A — Add imports at top of file

Find:
```ts
import { TableProperties, ShieldAlert } from 'lucide-react';
```
Replace with:
```ts
import { TableProperties, ShieldAlert } from 'lucide-react';
import { ExportImportModal } from '@/src/components/ledger/ExportImportModal';
```

### Edit B — Destructure `allRecords` and `importRecords` from the hook

Find:
```ts
  const {
    records,
    filters,
    speciesList,
    setFilters,
    saveRecord,
    saveManifest,
    deleteRecord,
    resetDemo,
    exportCsv,
  } = useWoodRecords();
```
Replace with:
```ts
  const {
    records,
    allRecords,
    filters,
    speciesList,
    setFilters,
    saveRecord,
    saveManifest,
    deleteRecord,
    resetDemo,
    importRecords,
  } = useWoodRecords();
```

### Edit C — Add modal state

Find:
```ts
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
```
Replace with:
```ts
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isExportImportOpen, setIsExportImportOpen] = useState(false);
```

### Edit D — Add import confirm handler (after handleResetDemo)

Find:
```ts
  return (
    <div className="flex flex-col gap-5">
```
Replace with:
```ts
  const handleImportConfirm = (rows: import('@/src/utils/records-import').ImportRow[]) => {
    if (!canWrite) return;
    importRecords(rows);
    addLog({
      action: 'RECORDS_IMPORTED',
      entitySummary: `${rows.length} record diimport ke buku besar`,
      operatorName: user?.name,
      operatorRole: user?.title,
    });
  };

  return (
    <div className="flex flex-col gap-5">
```

### Edit E — Update Toolbar prop

Find:
```tsx
            onExportCsv={exportCsv}
```
Replace with:
```tsx
            onExportImport={() => setIsExportImportOpen(true)}
```

### Edit F — Add modal to JSX (before the closing `</div>`)

Find:
```tsx
      {/* Reset Demo Confirmation Safeguard Dialog */}
```
Replace with:
```tsx
      {/* Export / Import Modal */}
      <ExportImportModal
        isOpen={isExportImportOpen}
        allRecords={allRecords}
        onClose={() => setIsExportImportOpen(false)}
        onImportConfirm={handleImportConfirm}
      />

      {/* Reset Demo Confirmation Safeguard Dialog */}
```


---

## Step 10 — Activity Log Action Type

If `useActivityLog` uses a typed `action` field (an enum/union), add `'RECORDS_IMPORTED'` to the allowed actions in `src/types/index.ts` or wherever the action type is defined.

Check the existing type and add if needed:
```ts
// In the ActivityLogAction type union, add:
| 'RECORDS_IMPORTED'
```

---

## Summary Checklist

```
[ ] npm install xlsx (or xlsx-js-style for colored headers)
[ ] CREATE  src/utils/records-export-filter.ts
[ ] CREATE  src/utils/records-excel.ts
[ ] MODIFY  src/utils/records-csv.ts          — append 3 new functions
[ ] CREATE  src/utils/records-import.ts
[ ] MODIFY  src/hooks/useWoodRecords.ts        — add importRecords
[ ] CREATE  src/components/ledger/ExportImportModal.tsx
[ ] MODIFY  src/components/ledger/Toolbar.tsx  — swap button + prop
[ ] MODIFY  app/ledger/page.tsx                — wire modal + state
[ ] CHECK   src/types/index.ts                 — add RECORDS_IMPORTED action if typed
```

---

## File Size Impact Estimate

| File | Change | Bundle impact |
|------|--------|---------------|
| `xlsx` / `xlsx-js-style` | New dep | ~500 KB (lazy-loadable via dynamic import) |
| `records-export-filter.ts` | New | ~2 KB |
| `records-excel.ts` | New | ~2 KB |
| `records-csv.ts` | +60 lines | ~1 KB |
| `records-import.ts` | New | ~4 KB |
| `useWoodRecords.ts` | +20 lines | negligible |
| `ExportImportModal.tsx` | New | ~8 KB |
| `Toolbar.tsx` | -1/+1 button | negligible |
| `page.tsx` | +15 lines | negligible |

**Recommendation:** Dynamically import `xlsx` inside `records-excel.ts` and `records-import.ts` using `await import('xlsx')` to keep the initial page bundle lean. This means `xlsx` only loads when the user opens the modal.

