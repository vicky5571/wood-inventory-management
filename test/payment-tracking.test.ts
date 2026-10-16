import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateDashboardMetrics } from '../src/utils/timber-calc.ts';
import type { WoodReceivingRecord, PaymentStatus, RecordFilterCriteria } from '../src/types/index.ts';

function createMockRecord(overrides: Partial<WoodReceivingRecord> = {}): WoodReceivingRecord {
  return {
    id: 'rec-' + Math.random().toString(36).slice(2, 9),
    receiptDate: '2026-10-15',
    truckPlateNumber: 'B 1234 ABC',
    forestryDocNumber: 'SKSHHK-001',
    receiptNumber: 'KW-001',
    contractNumber: 'CTR-001',
    supplierName: 'PT Timber Jaya',
    woodSpecies: 'Teak / Jati (柚木)',
    woodLengthM: 4.0,
    kavlingNumber: 'KAV-01',
    storageYard: 'TPK-1',
    deliveredPieces: 50,
    deliveredVolumeM3: 10.0,
    tallyPieces: 50,
    tallyVolumeM3: 10.0,
    timberPricePerM3: 1000000,
    timberGrossTotal: 10000000,
    timberPphRate: 0.5,
    timberPphAmount: 50000,
    timberNetPayable: 9950000,
    freightRatePerM3: 100000,
    freightGrossTotal: 1000000,
    freightPphAmount: 20000,
    freightNetPayable: 980000,
    brokerFee: 100000,
    grandNetPayable: 11030000,
    createdAt: '2026-10-15T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z',
    ...overrides,
  };
}

test('Payment Status & Accounts Payable Tracking Suite', async (suite) => {
  await suite.test('aggregateDashboardMetrics computes totalOutstandingPayable and unpaidRecordsCount for empty list', () => {
    const metrics = aggregateDashboardMetrics([]);
    assert.strictEqual(metrics.totalOutstandingPayable, 0);
    assert.strictEqual(metrics.unpaidRecordsCount, 0);
  });

  await suite.test('aggregateDashboardMetrics treats records without paymentStatus as UNPAID (backward compatibility)', () => {
    const legacyRecord1 = createMockRecord({ grandNetPayable: 10000000 });
    const legacyRecord2 = createMockRecord({ grandNetPayable: 5000000 });
    delete legacyRecord1.paymentStatus;
    delete legacyRecord2.paymentStatus;

    const metrics = aggregateDashboardMetrics([legacyRecord1, legacyRecord2]);
    assert.strictEqual(metrics.unpaidRecordsCount, 2);
    assert.strictEqual(metrics.totalOutstandingPayable, 15000000);
  });

  await suite.test('aggregateDashboardMetrics correctly aggregates mixed payment statuses', () => {
    const unpaidRecord = createMockRecord({
      grandNetPayable: 12000000,
      paymentStatus: 'UNPAID',
    });
    const partialRecord = createMockRecord({
      grandNetPayable: 8000000,
      paymentStatus: 'PARTIAL',
      invoiceNumber: 'INV-2026-001',
    });
    const paidRecord = createMockRecord({
      grandNetPayable: 15000000,
      paymentStatus: 'PAID',
      invoiceNumber: 'INV-2026-002',
      paymentDate: '2026-10-16',
      paymentNotes: 'Lunas via Transfer BCA',
    });

    const metrics = aggregateDashboardMetrics([unpaidRecord, partialRecord, paidRecord]);
    assert.strictEqual(metrics.totalRecordsCount, 3);
    assert.strictEqual(metrics.totalGrandExpenditure, 35000000);
    // Unpaid & Partial are considered outstanding AP
    assert.strictEqual(metrics.unpaidRecordsCount, 2);
    assert.strictEqual(metrics.totalOutstandingPayable, 20000000);
  });

  await suite.test('aggregateDashboardMetrics calculates 0 outstanding when all records are PAID', () => {
    const paid1 = createMockRecord({ grandNetPayable: 5000000, paymentStatus: 'PAID' });
    const paid2 = createMockRecord({ grandNetPayable: 7500000, paymentStatus: 'PAID' });

    const metrics = aggregateDashboardMetrics([paid1, paid2]);
    assert.strictEqual(metrics.unpaidRecordsCount, 0);
    assert.strictEqual(metrics.totalOutstandingPayable, 0);
    assert.strictEqual(metrics.totalGrandExpenditure, 12500000);
  });

  await suite.test('payment status filtering logic accurately isolates UNPAID, PARTIAL, and PAID records', () => {
    const records: WoodReceivingRecord[] = [
      createMockRecord({ id: 'rec-1', paymentStatus: 'UNPAID' }),
      createMockRecord({ id: 'rec-2', paymentStatus: 'PARTIAL' }),
      createMockRecord({ id: 'rec-3', paymentStatus: 'PAID' }),
      createMockRecord({ id: 'rec-4' }), // undefined paymentStatus
    ];

    const filterRecords = (list: WoodReceivingRecord[], criteria: RecordFilterCriteria): WoodReceivingRecord[] => {
      return list.filter((r) => {
        if (criteria.paymentStatus && criteria.paymentStatus !== 'ALL') {
          if (criteria.paymentStatus === 'UNPAID') {
            return (r.paymentStatus || 'UNPAID') !== 'PAID';
          }
          if (criteria.paymentStatus === 'PAID') {
            return r.paymentStatus === 'PAID';
          }
          if (criteria.paymentStatus === 'PARTIAL') {
            return r.paymentStatus === 'PARTIAL';
          }
        }
        return true;
      });
    };

    // Filter by UNPAID (includes UNPAID, PARTIAL, and undefined legacy records)
    const unpaidFiltered = filterRecords(records, { paymentStatus: 'UNPAID' });
    assert.deepStrictEqual(
      unpaidFiltered.map((r) => r.id),
      ['rec-1', 'rec-2', 'rec-4']
    );

    // Filter by PAID
    const paidFiltered = filterRecords(records, { paymentStatus: 'PAID' });
    assert.deepStrictEqual(
      paidFiltered.map((r) => r.id),
      ['rec-3']
    );

    // Filter by PARTIAL
    const partialFiltered = filterRecords(records, { paymentStatus: 'PARTIAL' });
    assert.deepStrictEqual(
      partialFiltered.map((r) => r.id),
      ['rec-2']
    );

    // Filter by ALL
    const allFiltered = filterRecords(records, { paymentStatus: 'ALL' });
    assert.strictEqual(allFiltered.length, 4);

    // Unfiltered criteria
    const unfiltered = filterRecords(records, {});
    assert.strictEqual(unfiltered.length, 4);
  });
});
