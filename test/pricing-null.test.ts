import { test } from 'node:test';
import assert from 'node:assert/strict';
import { derivePricingStatus } from '../src/utils/pricing-status.ts';
import {
  calculateTimberPayment,
  computeRecordCalculations,
  aggregateDashboardMetrics,
} from '../src/utils/timber-calc.ts';
import { computeManifestCalculations } from '../src/utils/manifest-calc.ts';
import { flattenManifest } from '../src/utils/manifest-flattener.ts';
import type { WoodReceivingRecord, ManifestFormInput } from '../src/types/index.ts';

test('Pending Pricing SSOT & Pure Domain Calculators', async (t) => {
  await t.test('derivePricingStatus derives PENDING for null/undefined and PRICED for number', () => {
    assert.strictEqual(derivePricingStatus(null), 'PENDING');
    assert.strictEqual(derivePricingStatus(undefined), 'PENDING');
    assert.strictEqual(derivePricingStatus(0), 'PRICED');
    assert.strictEqual(derivePricingStatus(2500000), 'PRICED');
  });

  await t.test('calculateTimberPayment returns nulls when price is null', () => {
    const res = calculateTimberPayment(5.5, null, 1.5);
    assert.strictEqual(res.gross, null);
    assert.strictEqual(res.pphAmount, null);
    assert.strictEqual(res.netPayable, null);
  });

  await t.test('calculateTimberPayment computes correctly when price is 0 or positive', () => {
    const freeRes = calculateTimberPayment(10, 0, 0);
    assert.strictEqual(freeRes.gross, 0);
    assert.strictEqual(freeRes.pphAmount, 0);
    assert.strictEqual(freeRes.netPayable, 0);

    const normalRes = calculateTimberPayment(10, 1000000, 1.5);
    assert.strictEqual(normalRes.gross, 10000000);
    assert.strictEqual(normalRes.pphAmount, 150000);
    assert.strictEqual(normalRes.netPayable, 9850000);
  });

  await t.test('calculateTimberPayment throws RangeError on negative inputs', () => {
    assert.throws(() => calculateTimberPayment(-1, 100, 0), { name: 'RangeError' });
    assert.throws(() => calculateTimberPayment(1, -100, 0), { name: 'RangeError' });
    assert.throws(() => calculateTimberPayment(1, 100, -5), { name: 'RangeError' });
  });

  await t.test('computeRecordCalculations null-propagates when timberPricePerM3 is null', () => {
    const out = computeRecordCalculations({
      tallyVolumeM3: 4.5,
      deliveredVolumeM3: 4.0,
      tallyPieces: 20,
      deliveredPieces: 20,
      timberPricePerM3: null,
      freightRatePerM3: 150000,
      brokerFee: 50000,
    });

    assert.strictEqual(out.timberGrossTotal, null);
    assert.strictEqual(out.timberPphAmount, null);
    assert.strictEqual(out.timberNetPayable, null);
    assert.strictEqual(out.grandNetPayable, null);
    // Freight is still computed
    assert.strictEqual(out.freightGrossTotal, 675000);
    assert.strictEqual(out.freightNetPayable, 675000);
    assert.strictEqual(out.volumeDiscrepancyM3, 0.5);
  });

  await t.test('computeManifestCalculations null-propagates when any item has null price', () => {
    const manifest: ManifestFormInput = {
      receiptDate: '2026-10-21',
      truckPlateNumber: 'B 1234 CD',
      forestryDocNumber: 'DOC-01',
      receiptNumber: 'REC-01',
      supplierName: 'PT Timber Jaya',
      freightRatePerM3: 100000,
      brokerFee: 50000,
      paymentStatus: 'UNPAID',
      items: [
        {
          woodSpecies: 'Jati',
          woodLengthM: 4.0,
          deliveredPieces: 10,
          deliveredVolumeM3: 2.0,
          tallyPieces: 10,
          tallyVolumeM3: 2.0,
          timberPricePerM3: 2000000,
          timberPphRate: 0,
        },
        {
          woodSpecies: 'Mahoni',
          woodLengthM: 3.0,
          deliveredPieces: 15,
          deliveredVolumeM3: 3.0,
          tallyPieces: 15,
          tallyVolumeM3: 3.0,
          timberPricePerM3: null,
          timberPphRate: 0,
        },
      ],
    };

    const calc = computeManifestCalculations(manifest);
    assert.strictEqual(calc.items[0].timberGrossTotal, 4000000);
    assert.strictEqual(calc.items[1].timberGrossTotal, null);
    assert.strictEqual(calc.items[1].timberNetPayable, null);

    assert.strictEqual(calc.totalTimberGross, null);
    assert.strictEqual(calc.totalTimberNet, null);
    assert.strictEqual(calc.grandNetPayable, null);
    assert.strictEqual(calc.freightGrossTotal, 500000);
  });

  await t.test('flattenManifest preserves null prices and sets grandNetPayable to null', () => {
    const manifest: ManifestFormInput = {
      id: 'man-pending-01',
      receiptDate: '2026-10-21',
      truckPlateNumber: 'B 9999 ZZ',
      forestryDocNumber: 'DOC-PENDING',
      supplierName: 'Supplier A',
      freightRatePerM3: 100000,
      items: [
        {
          woodSpecies: 'Sonokeling',
          woodLengthM: 2.0,
          deliveredPieces: 5,
          deliveredVolumeM3: 1.0,
          tallyPieces: 5,
          tallyVolumeM3: 1.0,
          timberPricePerM3: null,
        },
      ],
    };

    const records = flattenManifest(manifest);
    assert.strictEqual(records.length, 1);
    assert.strictEqual(records[0].timberPricePerM3, null);
    assert.strictEqual(records[0].timberGrossTotal, null);
    assert.strictEqual(records[0].timberNetPayable, null);
    assert.strictEqual(records[0].grandNetPayable, null);
    assert.strictEqual(records[0].freightGrossTotal, 100000);
  });

  await t.test('aggregateDashboardMetrics isolates pending pricing and computes exposure', () => {
    const records: WoodReceivingRecord[] = [
      {
        id: 'r1',
        receiptDate: '2026-10-20',
        truckPlateNumber: 'B 1111 AA',
        forestryDocNumber: 'DOC-1',
        receiptNumber: 'REC-1',
        supplierName: 'Supplier 1',
        woodSpecies: 'Jati',
        woodLengthM: 4.0,
        deliveredPieces: 10,
        deliveredVolumeM3: 2.0,
        tallyPieces: 10,
        tallyVolumeM3: 2.0,
        timberPricePerM3: 2000000,
        timberGrossTotal: 4000000,
        timberPphRate: 0,
        timberPphAmount: 0,
        timberNetPayable: 4000000,
        freightRatePerM3: 100000,
        freightGrossTotal: 200000,
        freightPphAmount: 0,
        freightNetPayable: 200000,
        brokerFee: 0,
        grandNetPayable: 4200000,
        paymentStatus: 'UNPAID',
        createdAt: '2026-10-20T00:00:00Z',
        updatedAt: '2026-10-20T00:00:00Z',
      },
      {
        id: 'r2',
        receiptDate: '2026-10-21',
        truckPlateNumber: 'B 2222 BB',
        forestryDocNumber: 'DOC-2',
        receiptNumber: 'REC-2',
        supplierName: 'Supplier 2',
        woodSpecies: 'Mahoni',
        woodLengthM: 3.0,
        deliveredPieces: 20,
        deliveredVolumeM3: 4.0,
        tallyPieces: 20,
        tallyVolumeM3: 4.0,
        timberPricePerM3: null, // PENDING!
        timberGrossTotal: null,
        timberPphRate: 0,
        timberPphAmount: null,
        timberNetPayable: null,
        freightRatePerM3: 100000,
        freightGrossTotal: 400000,
        freightPphAmount: 0,
        freightNetPayable: 400000,
        brokerFee: 0,
        grandNetPayable: null,
        paymentStatus: 'UNPAID',
        createdAt: '2026-10-21T00:00:00Z',
        updatedAt: '2026-10-21T00:00:00Z',
      },
    ];

    const metrics = aggregateDashboardMetrics(records);

    // Tally volumes and pieces count all records
    assert.strictEqual(metrics.totalTallyVolumeM3, 6.0);
    assert.strictEqual(metrics.totalTallyPieces, 30);

    // Financial totals only include priced records
    assert.strictEqual(metrics.totalNetTimberPayable, 4000000);
    assert.strictEqual(metrics.totalGrandExpenditure, 4200000);
    assert.strictEqual(metrics.totalOutstandingPayable, 4200000);
    // Freight payable includes both records
    assert.strictEqual(metrics.totalNetFreightPayable, 600000);

    // Pending metrics
    assert.strictEqual(metrics.pendingPricingCount, 1);
    assert.strictEqual(metrics.pendingPricingVolumeM3, 4.0);
    // Exposure = pendingVolume (4.0) * avgPrice of priced (2,000,000) = 8,000,000
    assert.strictEqual(metrics.pendingPricingValueExposureIDR, 8000000);
  });

  await t.test('aggregateDashboardMetrics handles all pending records with zero exposure', () => {
    const records: WoodReceivingRecord[] = [
      {
        id: 'r1',
        receiptDate: '2026-10-21',
        truckPlateNumber: 'B 2222 BB',
        forestryDocNumber: 'DOC-2',
        receiptNumber: 'REC-2',
        supplierName: 'Supplier 2',
        woodSpecies: 'Mahoni',
        woodLengthM: 3.0,
        deliveredPieces: 20,
        deliveredVolumeM3: 3.5,
        tallyPieces: 20,
        tallyVolumeM3: 3.5,
        timberPricePerM3: null,
        timberGrossTotal: null,
        timberPphRate: 0,
        timberPphAmount: null,
        timberNetPayable: null,
        freightRatePerM3: 0,
        freightGrossTotal: 0,
        freightPphAmount: 0,
        freightNetPayable: 0,
        brokerFee: 0,
        grandNetPayable: null,
        paymentStatus: 'UNPAID',
        createdAt: '2026-10-21T00:00:00Z',
        updatedAt: '2026-10-21T00:00:00Z',
      },
    ];

    const metrics = aggregateDashboardMetrics(records);
    assert.strictEqual(metrics.pendingPricingCount, 1);
    assert.strictEqual(metrics.pendingPricingVolumeM3, 3.5);
    assert.strictEqual(metrics.pendingPricingValueExposureIDR, 0);
    assert.strictEqual(metrics.totalNetTimberPayable, 0);
    assert.strictEqual(metrics.totalGrandExpenditure, 0);
  });
});
