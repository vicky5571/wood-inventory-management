/**
 * src/utils/records-import.ts
 *
 * Parses raw tabular data (from CSV or Excel) into WoodReceivingRecord objects.
 * Validates required fields, detects duplicates, assigns new IDs.
 */

import type {
  WoodReceivingRecord,
  PaymentStatus,
  ImportRow,
  ImportError,
  ImportParseResult,
} from '../types/index.ts';
import { parseCsvToRows } from './records-csv.ts';
import * as XLSX from 'xlsx';

export type { ImportRow, ImportError, ImportParseResult };

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
