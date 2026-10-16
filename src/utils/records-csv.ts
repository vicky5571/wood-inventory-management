/**
 * src/utils/records-csv.ts
 *
 * Dedicated utility for RFC 4180-compliant CSV generation and browser download
 * of wood receiving records.
 */

import type { WoodReceivingRecord } from '../types/index.ts';

export const CSV_HEADERS = [
  'Penerimaan (到货日期)',
  'No. Polisi (车牌号)',
  'SKSHHK / DKP (送货单号)',
  'No. Kontrak (合同编号)',
  'Supplier (供应商)',
  'Jenis Kayu (树种)',
  'No. Kav (进厂批号)',
  'Batang Del (送货根数)',
  'Vol Del m³ (送货立方)',
  'Batang Tally (检尺根数)',
  'Vol Tally m³ (检尺立方)',
  'Net Kayu (木材应付)',
  'Net Ongkir (运费应付)',
  'Total Bayar (应付金额)',
];

export function escapeCsvField(str: string): string {
  return `"${(str || '').replace(/"/g, '""')}"`;
}

export function generateRecordsCsvContent(records: WoodReceivingRecord[]): string {
  const rows = records.map((r) => [
    r.receiptDate,
    escapeCsvField(r.truckPlateNumber),
    escapeCsvField(r.forestryDocNumber),
    escapeCsvField(r.contractNumber),
    escapeCsvField(r.supplierName),
    escapeCsvField(r.woodSpecies),
    escapeCsvField(r.kavlingNumber),
    r.deliveredPieces,
    r.deliveredVolumeM3,
    r.tallyPieces,
    r.tallyVolumeM3,
    r.timberNetPayable,
    r.freightNetPayable,
    r.grandNetPayable,
  ]);

  return [CSV_HEADERS.join(','), ...rows.map((e) => e.join(','))].join('\n');
}

export function exportRecordsToCsv(records: WoodReceivingRecord[], filenamePrefix = 'penerimaan_kayu'): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const csvContent = generateRecordsCsvContent(records);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
