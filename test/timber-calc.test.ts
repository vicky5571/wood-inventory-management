import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTimberPayment,
  calculateFreightPayment,
  computeRecordCalculations,
  aggregateDashboardMetrics,
  calculateRoundLogVolumeM3,
} from '../src/utils/timber-calc.ts';
import type {
  WoodReceivingRecord,
  DashboardMetrics,
  PaymentCalculationResult,
  RecordCalculationInput,
  RecordCalculationOutput,
  Tenant,
  StorageYard,
  StorageLot,
  ReceivingManifest,
  ReceivingItem,
  ManifestWithItems,
} from '../src/types/index.ts';



test('Timber Calculations & Aggregation Test Suite', async (t) => {
  await t.test('calculateTimberPayment computes gross, tax, and net accurately', () => {
    // 10 m³ @ Rp 3,000,000/m³ = Rp 30,000,000 gross. 1.5% PPh = Rp 450,000. Net = Rp 29,550,000
    const res = calculateTimberPayment(10, 3000000, 1.5);
    assert.strictEqual(res.gross, 30000000);
    assert.strictEqual(res.pphAmount, 450000);
    assert.strictEqual(res.netPayable, 29550000);
  });

  await t.test('calculateFreightPayment computes gross and net accurately', () => {
    // 10 m³ @ Rp 250,000/m³ = Rp 2,500,000 gross. PPh = Rp 50,000. Net = Rp 2,450,000
    const res = calculateFreightPayment(10, 250000, 50000);
    assert.strictEqual(res.gross, 2500000);
    assert.strictEqual(res.pphAmount, 50000);
    assert.strictEqual(res.netPayable, 2450000);
  });

  await t.test('computeRecordCalculations auto-completes computed fields from raw inputs', () => {
    const raw = {
      tallyVolumeM3: 12.5,
      deliveredVolumeM3: 12.0,
      tallyPieces: 100,
      deliveredPieces: 98,
      timberPricePerM3: 2000000,
      timberPphRate: 0.5,
      freightRatePerM3: 200000,
      freightPphAmount: 25000,
      brokerFee: 500000,
    };
    const computed = computeRecordCalculations(raw);
    assert.strictEqual(computed.volumeDiscrepancyM3, 0.5);
    assert.strictEqual(computed.pieceDiscrepancy, 2);
    assert.strictEqual(computed.timberGrossTotal, 25000000);
    assert.strictEqual(computed.timberPphAmount, 125000);
    assert.strictEqual(computed.timberNetPayable, 24875000);
    assert.strictEqual(computed.freightGrossTotal, 2500000);
    assert.strictEqual(computed.freightNetPayable, 2475000);
    assert.strictEqual(computed.grandNetPayable, 24875000 + 2475000 + 500000);
  });

  await t.test('aggregateDashboardMetrics computes correct totals across records', () => {
    const records: WoodReceivingRecord[] = [
      {
        id: '1',
        receiptDate: '2026-10-14',
        truckPlateNumber: 'B 1234 CD',
        forestryDocNumber: 'SK-01',
        receiptNumber: 'KW-01',
        contractNumber: 'CT-01',
        supplierName: 'PT Rimba',
        woodSpecies: 'Teak / Jati',
        woodLengthM: 4.0,
        kavlingNumber: 'KAV-A1',
        storageYard: 'TPK-1',
        deliveredPieces: 50,
        deliveredVolumeM3: 5.0,
        tallyPieces: 50,
        tallyVolumeM3: 5.0,
        timberPricePerM3: 1000000,
        timberGrossTotal: 5000000,
        timberPphRate: 0,
        timberPphAmount: 0,
        timberNetPayable: 5000000,
        freightRatePerM3: 100000,
        freightGrossTotal: 500000,
        freightPphAmount: 0,
        freightNetPayable: 500000,
        brokerFee: 100000,
        grandNetPayable: 5600000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const metrics = aggregateDashboardMetrics(records);
    assert.strictEqual(metrics.totalTallyVolumeM3, 5.0);
    assert.strictEqual(metrics.totalTallyPieces, 50);
    assert.strictEqual(metrics.totalGrandExpenditure, 5600000);
    assert.strictEqual(metrics.activeKavlingCount, 1);
    assert.strictEqual(metrics.speciesVolumeBreakdown['Teak / Jati'], 5.0);
  });

  await t.test('calculations throw RangeError on negative numerical inputs', () => {
    assert.throws(() => calculateTimberPayment(-5, 1000, 0), { name: 'RangeError' });
    assert.throws(() => calculateTimberPayment(5, -1000, 0), { name: 'RangeError' });
    assert.throws(() => calculateTimberPayment(5, 1000, -1), { name: 'RangeError' });
    assert.throws(() => calculateFreightPayment(5, -100, 0), { name: 'RangeError' });
    assert.throws(() => calculateFreightPayment(-5, 100, 0), { name: 'RangeError' });
    assert.throws(() => calculateFreightPayment(5, 100, -10), { name: 'RangeError' });
    assert.throws(() => computeRecordCalculations({
      tallyVolumeM3: 5,
      deliveredVolumeM3: 5,
      tallyPieces: 10,
      deliveredPieces: 10,
      timberPricePerM3: 1000,
      freightRatePerM3: 100,
      brokerFee: -50,
    }), { name: 'RangeError' });
  });

  await t.test('aggregateDashboardMetrics handles empty record list', () => {
    const emptyMetrics = aggregateDashboardMetrics([]);
    assert.strictEqual(emptyMetrics.totalDeliveredVolumeM3, 0);
    assert.strictEqual(emptyMetrics.totalTallyVolumeM3, 0);
    assert.strictEqual(emptyMetrics.volumeDiscrepancyM3, 0);
    assert.strictEqual(emptyMetrics.totalDeliveredPieces, 0);
    assert.strictEqual(emptyMetrics.totalTallyPieces, 0);
    assert.strictEqual(emptyMetrics.pieceDiscrepancy, 0);
    assert.strictEqual(emptyMetrics.totalNetTimberPayable, 0);
    assert.strictEqual(emptyMetrics.totalNetFreightPayable, 0);
    assert.strictEqual(emptyMetrics.totalGrandExpenditure, 0);
    assert.strictEqual(emptyMetrics.totalRecordsCount, 0);
    assert.strictEqual(emptyMetrics.activeKavlingCount, 0);
    assert.deepStrictEqual(emptyMetrics.speciesVolumeBreakdown, {});
  });

  await t.test('aggregateDashboardMetrics handles multiple records, duplicate kavling, and unknown species', () => {
    const records: WoodReceivingRecord[] = [
      {
        id: '1',
        receiptDate: '2026-10-14',
        truckPlateNumber: 'B 1234 CD',
        forestryDocNumber: 'SK-01',
        receiptNumber: 'KW-01',
        contractNumber: 'CT-01',
        supplierName: 'PT Rimba',
        woodSpecies: 'Teak / Jati',
        woodLengthM: 4.0,
        kavlingNumber: 'KAV-A1',
        storageYard: 'TPK-1',
        deliveredPieces: 50,
        deliveredVolumeM3: 5.0,
        tallyPieces: 48,
        tallyVolumeM3: 4.8,
        timberPricePerM3: 1000000,
        timberGrossTotal: 4800000,
        timberPphRate: 0,
        timberPphAmount: 0,
        timberNetPayable: 4800000,
        freightRatePerM3: 100000,
        freightGrossTotal: 480000,
        freightPphAmount: 0,
        freightNetPayable: 480000,
        brokerFee: 20000,
        grandNetPayable: 5300000,
        createdAt: '2026-10-14T00:00:00.000Z',
        updatedAt: '2026-10-14T00:00:00.000Z',
      },
      {
        id: '2',
        receiptDate: '2026-10-14',
        truckPlateNumber: 'B 5678 EF',
        forestryDocNumber: 'SK-02',
        receiptNumber: 'KW-02',
        contractNumber: 'CT-02',
        supplierName: 'PT Sumber Kayu',
        woodSpecies: '',
        woodLengthM: 3.0,
        kavlingNumber: ' KAV-A1 ', // duplicate with whitespace
        storageYard: 'TPK-1',
        deliveredPieces: 20,
        deliveredVolumeM3: 2.0,
        tallyPieces: 20,
        tallyVolumeM3: 2.2,
        timberPricePerM3: 500000,
        timberGrossTotal: 1100000,
        timberPphRate: 0,
        timberPphAmount: 0,
        timberNetPayable: 1100000,
        freightRatePerM3: 50000,
        freightGrossTotal: 110000,
        freightPphAmount: 0,
        freightNetPayable: 110000,
        brokerFee: 10000,
        grandNetPayable: 1220000,
        createdAt: '2026-10-14T00:00:00.000Z',
        updatedAt: '2026-10-14T00:00:00.000Z',
      },
    ];

    const metrics = aggregateDashboardMetrics(records);
    assert.strictEqual(metrics.totalRecordsCount, 2);
    assert.strictEqual(metrics.activeKavlingCount, 1); // Deduplicated KAV-A1
    assert.strictEqual(metrics.totalDeliveredPieces, 70);
    assert.strictEqual(metrics.totalTallyPieces, 68);
    assert.strictEqual(metrics.pieceDiscrepancy, -2);
    assert.strictEqual(metrics.totalDeliveredVolumeM3, 7.0);
    assert.strictEqual(metrics.totalTallyVolumeM3, 7.0);
    assert.strictEqual(metrics.volumeDiscrepancyM3, 0);
    assert.strictEqual(metrics.totalNetTimberPayable, 5900000);
    assert.strictEqual(metrics.totalNetFreightPayable, 590000);
    assert.strictEqual(metrics.totalGrandExpenditure, 6520000);
    assert.strictEqual(metrics.speciesVolumeBreakdown['Teak / Jati'], 4.8);
    assert.strictEqual(metrics.speciesVolumeBreakdown['Unknown'], 2.2);
  });

  await t.test('SSOT domain calculation types and results conform to interface contracts', () => {
    const input: RecordCalculationInput = {
      tallyVolumeM3: 10,
      deliveredVolumeM3: 10,
      tallyPieces: 50,
      deliveredPieces: 50,
      timberPricePerM3: 1000000,
      freightRatePerM3: 100000,
    };
    const output: RecordCalculationOutput = computeRecordCalculations(input);
    const payment: PaymentCalculationResult = calculateTimberPayment(10, 1000000, 0);

    assert.strictEqual(output.timberGrossTotal, payment.gross);
    assert.strictEqual(output.timberNetPayable, payment.netPayable);
    assert.strictEqual(typeof output.grandNetPayable, 'number');
  });
});

test('Relational Domain Type Invariants Suite', async (t) => {
  await t.test('ManifestWithItems matches aggregate financial properties', async () => {
    const { getDatabaseConnection } = await import('../src/persistence/sqlite/db.ts');
    assert.ok(getDatabaseConnection);

    const tenant: Tenant = {
      id: 'tenant-default',
      name: 'Default Timber Enterprise',
      slug: 'default',
      createdAt: '2026-10-18T00:00:00.000Z',
      updatedAt: '2026-10-18T00:00:00.000Z',
    };

    const yard: StorageYard = {
      id: 'yard-1',
      tenantId: tenant.id,
      yardCode: 'TPK-01',
      name: 'Central Log Yard',
      description: 'Main storage yard for teak logs',
      createdAt: '2026-10-18T00:00:00.000Z',
      updatedAt: '2026-10-18T00:00:00.000Z',
    };

    const lot: StorageLot = {
      id: 'lot-1',
      tenantId: tenant.id,
      yardId: yard.id,
      lotCode: 'KAV-A1',
      status: 'ACTIVE',
      createdAt: '2026-10-18T00:00:00.000Z',
      updatedAt: '2026-10-18T00:00:00.000Z',
    };

    const manifest: ReceivingManifest = {
      id: 'manifest-1',
      tenantId: tenant.id,
      manifestNumber: 'MNF-2026-001',
      receiptDate: '2026-10-18',
      docDate: '2026-10-17',
      truckPlateNumber: 'B 1234 CD',
      forestryDocNumber: 'SKSHHK-999',
      receiptNumber: 'KW-100',
      contractNumber: 'CTR-2026',
      supplierId: 'supp-1',
      freightRatePerM3: 150000,
      freightPphRate: 0.02,
      brokerFee: 50000,
      paymentStatus: 'UNPAID',
      createdAt: '2026-10-18T00:00:00.000Z',
      updatedAt: '2026-10-18T00:00:00.000Z',
    };

    const item: ReceivingItem = {
      id: 'item-1',
      manifestId: manifest.id,
      tenantId: tenant.id,
      itemSequence: 1,
      speciesId: 'spec-1',
      lotId: lot.id,
      woodLengthM: 4.0,
      deliveredPieces: 25,
      deliveredVolumeM3: 2.5,
      tallyPieces: 24,
      tallyVolumeM3: 2.4,
      timberPricePerM3: 3000000,
      timberPphRate: 0.015,
      notes: 'Slight sapwood',
      createdAt: '2026-10-18T00:00:00.000Z',
      updatedAt: '2026-10-18T00:00:00.000Z',
    };

    const manifestWithItems: ManifestWithItems = {
      ...manifest,
      supplierName: 'PT Rimba Sejahtera',
      items: [
        {
          ...item,
          speciesName: 'Teak / Jati',
          kavlingNumber: lot.lotCode,
          storageYard: yard.yardCode,
          timberGrossTotal: 7200000,
          timberPphAmount: 108000,
          timberNetPayable: 7092000,
          volumeDiscrepancyM3: -0.1,
          pieceDiscrepancy: -1,
        },
      ],
      summary: {
        totalDeliveredPieces: 25,
        totalDeliveredVolumeM3: 2.5,
        totalTallyPieces: 24,
        totalTallyVolumeM3: 2.4,
        totalTimberGross: 7200000,
        totalTimberPph: 108000,
        totalTimberNet: 7092000,
        freightGrossTotal: 360000,
        freightPphAmount: 7200,
        freightNetPayable: 352800,
        grandNetPayable: 7092000 + 352800 + 50000,
      },
    };

    assert.strictEqual(manifestWithItems.summary.grandNetPayable, 7494800);
    assert.strictEqual(manifestWithItems.items[0].speciesName, 'Teak / Jati');
    assert.strictEqual(manifestWithItems.items[0].kavlingNumber, 'KAV-A1');
    assert.strictEqual(manifestWithItems.items[0].storageYard, 'TPK-01');
    assert.strictEqual(manifestWithItems.paymentStatus, 'UNPAID');
    assert.strictEqual(manifestWithItems.items.length, 1);
  });

  await t.test('calculateRoundLogVolumeM3 computes accurate cubic volume for round logs', () => {
    // D=40cm, L=4m, 1 pc => 0.7854 * 1600 * 4 * 1 / 10000 = 0.5027 m³
    const vol1 = calculateRoundLogVolumeM3(40, 4, 1);
    assert.strictEqual(vol1, 0.5027);

    // D=30cm, L=3m, 5 pcs => 0.7854 * 900 * 3 * 5 / 10000 = 1.0603 m³
    const vol2 = calculateRoundLogVolumeM3(30, 3, 5);
    assert.strictEqual(vol2, 1.0603);

    // Default pieces = 1
    const volDefault = calculateRoundLogVolumeM3(40, 4);
    assert.strictEqual(volDefault, 0.5027);

    // Zero dimensions or pieces returns 0
    assert.strictEqual(calculateRoundLogVolumeM3(0, 4, 1), 0);
    assert.strictEqual(calculateRoundLogVolumeM3(40, 0, 1), 0);
    assert.strictEqual(calculateRoundLogVolumeM3(40, 4, 0), 0);

    // Negative dimensions throw RangeError
    assert.throws(() => calculateRoundLogVolumeM3(-10, 4, 1), RangeError);
    assert.throws(() => calculateRoundLogVolumeM3(40, -2, 1), RangeError);
    assert.throws(() => calculateRoundLogVolumeM3(40, 4, -1), RangeError);
  });
});


