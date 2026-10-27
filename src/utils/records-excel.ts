/**
 * src/utils/records-excel.ts
 *
 * Excel (.xlsx) export utility for wood receiving records.
 * Uses SheetJS (xlsx) Community Edition.
 */

import * as XLSX from 'xlsx';
import type { WoodReceivingRecord } from '../types/index.ts';
import { CSV_HEADERS } from './records-csv.ts';

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
    r.brokerName || r.brokerId || '',
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

  ws['!cols'] = computeColWidths(rows);

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
  if (typeof window === 'undefined') return;

  const start = startDate ? startDate.replace(/-/g, '') : 'awal';
  const end   = endDate   ? endDate.replace(/-/g, '')   : 'akhir';
  const rows  = buildSheetRows(records);
  const ws    = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = computeColWidths(rows);

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

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Import');
  XLSX.writeFile(wb, 'template_import_buku_besar.xlsx');
}
