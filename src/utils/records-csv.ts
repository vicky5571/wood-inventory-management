/**
 * src/utils/records-csv.ts
 *
 * Dedicated utility for RFC 4180-compliant CSV generation and browser download
 * of wood receiving records.
 */

import type { WoodReceivingRecord } from '../types/index.ts';

export const CSV_HEADERS = [
  'Penerimaan (到货日期)',
  'Dokumen Tanggal (发货时间)',
  'No. Polisi (车牌号)',
  'SKSHHK / DKP (送货单号)',
  'No. Kwitansi (订货单号)',
  'No. Kontrak (合同编号)',
  'Supplier (供应商)',
  'Jenis Kayu (树种)',
  'Panjang Kayu m (材长)',
  'No. Kav (进厂批号)',
  'TPK (木堆场地)',
  'Batang Del (送货根数)',
  'Vol Del m³ (送货立方)',
  'Batang Tally (检尺根数)',
  'Vol Tally m³ (检尺立方)',
  'Harga Kayu / m³ (均价)',
  'Total Kayu Kotor (货物价格)',
  'PPh Kayu (税)',
  'Net Kayu (应付金额)',
  'Tarif Ongkir / m³ (单价)',
  'Total Ongkir Kotor (货物价格)',
  'PPh Ongkir (税)',
  'Net Ongkir (应付金额)',
  'Nama Broker (经纪人)',
  'Broker (中介费)',
  'Total Bayar (总应付)',
  'Status Bayar (付款状态)',
];

export function escapeCsvField(str: string): string {
  return `"${(str || '').replace(/"/g, '""')}"`;
}

export function generateRecordsCsvContent(records: WoodReceivingRecord[], brokerMap?: Record<string, string>): string {
  const rows = records.map((r) => [
    r.receiptDate,
    escapeCsvField(r.docDate || ''),
    escapeCsvField(r.truckPlateNumber),
    escapeCsvField(r.forestryDocNumber),
    escapeCsvField(r.receiptNumber),
    escapeCsvField(r.contractNumber),
    escapeCsvField(r.supplierName),
    escapeCsvField(r.woodSpecies),
    r.woodLengthM ?? '',
    escapeCsvField(r.kavlingNumber),
    escapeCsvField(r.storageYard || ''),
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
    escapeCsvField(r.brokerId ? (brokerMap?.[r.brokerId] || r.brokerId) : ''),
    r.brokerFee,
    r.grandNetPayable,
    escapeCsvField(r.paymentStatus || 'UNPAID'),
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
