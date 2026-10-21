/**
 * test/records-csv.test.ts
 *
 * Unit tests verifying RFC 4180 CSV export with all 26 granular Excel columns:
 * Inbound Manifest, Wood Specs, Delivery & Tally, Timber Payment, Freight Payment, Broker, and Net Totals.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CSV_HEADERS,
  escapeCsvField,
  generateRecordsCsvContent,
} from '../src/utils/records-csv.ts';
import { SEED_WOOD_RECORDS } from '../src/persistence/seed-data.ts';

test('Records CSV Export Suite — All Excel Columns', async (t) => {
  await t.test('CSV_HEADERS contains all 27 comprehensive Excel columns', () => {
    assert.strictEqual(CSV_HEADERS.length, 27);
    
    // Check key header columns from Excel
    assert.strictEqual(CSV_HEADERS[0], 'Penerimaan (到货日期)');
    assert.strictEqual(CSV_HEADERS[1], 'Dokumen Tanggal (发货时间)');
    assert.strictEqual(CSV_HEADERS[2], 'No. Polisi (车牌号)');
    assert.strictEqual(CSV_HEADERS[3], 'SKSHHK / DKP (送货单号)');
    assert.strictEqual(CSV_HEADERS[4], 'No. Kwitansi (订货单号)');
    assert.strictEqual(CSV_HEADERS[5], 'No. Kontrak (合同编号)');
    assert.strictEqual(CSV_HEADERS[6], 'Supplier (供应商)');
    assert.strictEqual(CSV_HEADERS[7], 'Jenis Kayu (树种)');
    assert.strictEqual(CSV_HEADERS[8], 'Panjang Kayu m (材长)');
    assert.strictEqual(CSV_HEADERS[9], 'No. Kav (进厂批号)');
    assert.strictEqual(CSV_HEADERS[10], 'TPK (木堆场地)');
    assert.strictEqual(CSV_HEADERS[11], 'Batang Del (送货根数)');
    assert.strictEqual(CSV_HEADERS[12], 'Vol Del m³ (送货立方)');
    assert.strictEqual(CSV_HEADERS[13], 'Batang Tally (检尺根数)');
    assert.strictEqual(CSV_HEADERS[14], 'Vol Tally m³ (检尺立方)');
    assert.strictEqual(CSV_HEADERS[15], 'Harga Kayu / m³ (均价)');
    assert.strictEqual(CSV_HEADERS[16], 'Total Kayu Kotor (货物价格)');
    assert.strictEqual(CSV_HEADERS[17], 'PPh Kayu (税)');
    assert.strictEqual(CSV_HEADERS[18], 'Net Kayu (应付金额)');
    assert.strictEqual(CSV_HEADERS[19], 'Tarif Ongkir / m³ (单价)');
    assert.strictEqual(CSV_HEADERS[20], 'Total Ongkir Kotor (货物价格)');
    assert.strictEqual(CSV_HEADERS[21], 'PPh Ongkir (税)');
    assert.strictEqual(CSV_HEADERS[22], 'Net Ongkir (应付金额)');
    assert.strictEqual(CSV_HEADERS[23], 'Nama Broker (经纪人)');
    assert.strictEqual(CSV_HEADERS[24], 'Broker (中介费)');
    assert.strictEqual(CSV_HEADERS[25], 'Total Bayar (总应付)');
    assert.strictEqual(CSV_HEADERS[26], 'Status Bayar (付款状态)');
  });

  await t.test('generateRecordsCsvContent accurately maps each record to 27 columns', () => {
    const record = SEED_WOOD_RECORDS[0];
    const csv = generateRecordsCsvContent([record]);
    const lines = csv.split('\n');

    assert.strictEqual(lines.length, 2); // Header + 1 record row
    const row = lines[1];

    // Verify row has all expected values
    assert.ok(row.includes(record.receiptDate));
    assert.ok(row.includes(record.docDate || ''));
    assert.ok(row.includes(record.truckPlateNumber));
    assert.ok(row.includes(record.forestryDocNumber));
    assert.ok(row.includes(record.receiptNumber));
    assert.ok(row.includes(record.contractNumber));
    assert.ok(row.includes(record.supplierName));
    assert.ok(row.includes(record.woodSpecies));
    assert.ok(row.includes(String(record.woodLengthM)));
    assert.ok(row.includes(record.kavlingNumber));
    assert.ok(row.includes(record.storageYard));
    assert.ok(row.includes(String(record.deliveredPieces)));
    assert.ok(row.includes(String(record.deliveredVolumeM3)));
    assert.ok(row.includes(String(record.tallyPieces)));
    assert.ok(row.includes(String(record.tallyVolumeM3)));
    assert.ok(row.includes(String(record.timberPricePerM3)));
    assert.ok(row.includes(String(record.timberGrossTotal)));
    assert.ok(row.includes(String(record.timberPphAmount)));
    assert.ok(row.includes(String(record.timberNetPayable)));
    assert.ok(row.includes(String(record.freightRatePerM3)));
    assert.ok(row.includes(String(record.freightGrossTotal)));
    assert.ok(row.includes(String(record.freightPphAmount)));
    assert.ok(row.includes(String(record.freightNetPayable)));
    assert.ok(row.includes(String(record.brokerFee)));
    assert.ok(row.includes(String(record.grandNetPayable)));
  });
});

