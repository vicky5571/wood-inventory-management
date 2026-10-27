import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLotStockBalance, aggregateAllLotBalances } from '../src/utils/stock-balance.ts';
import type {
  WoodReceivingRecord,
  WoodSalesRecord,
  SawmillProductionRecord,
  StockSortingRecord,
} from '../src/types/index.ts';

test('Lot Stock Balance FK-First Aggregation Suite', async (t) => {
  const baseInbound: WoodReceivingRecord = {
    id: 'rec-001',
    tenantId: 'default-tenant',
    receiptDate: '2026-10-01',
    docDate: '2026-10-01',
    truckPlateNumber: 'B 1234 CD',
    forestryDocNumber: 'DOC-01',
    receiptNumber: 'KW-01',
    contractNumber: 'CTR-01',
    supplierName: 'PT. Timber Supplier',
    woodSpecies: 'Jati',
    woodLengthM: 4.0,
    storageYard: 'TPK-Timur',
    kavlingNumber: 'KAV-01',
    deliveredPieces: 50,
    deliveredVolumeM3: 20.0,
    tallyPieces: 50,
    tallyVolumeM3: 20.0,
    timberPricePerM3: null,
    timberGrossTotal: null,
    timberPphRate: 0.5,
    timberPphAmount: null,
    timberNetPayable: null,
    freightRatePerM3: 0,
    freightGrossTotal: 0,
    freightPphAmount: 0,
    freightNetPayable: 0,
    brokerFee: 0,
    grandNetPayable: null,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  };

  await t.test('deducts sales using lotId FK match even when kavlingNumber string has formatting differences', () => {
    const sale: WoodSalesRecord = {
      id: 'sls-001',
      saleDate: '2026-10-05',
      deliveryOrderNumber: 'DO-001',
      truckPlateNumber: 'B 9999 ZZ',
      customerName: 'Buyer A',
      storageYard: 'TPK-Timur',
      kavlingNumber: 'KAV-01-TYPO',
      lotId: 'lot-kav-01',
      woodSpecies: 'Jati',
      pieces: 10,
      volumeM3: 4.0,
      pricePerM3: 3000000,
      totalPrice: 12000000,
      paymentStatus: 'PAID',
      createdAt: '2026-10-05T00:00:00Z',
      updatedAt: '2026-10-05T00:00:00Z',
    };

    const balance = calculateLotStockBalance(
      [baseInbound],
      [sale],
      'TPK-Timur',
      'KAV-01',
      [],
      [],
      'lot-kav-01'
    );

    assert.equal(balance.inboundPieces, 50);
    assert.equal(balance.inboundVolumeM3, 20.0);
    assert.equal(balance.outboundPieces, 10);
    assert.equal(balance.outboundVolumeM3, 4.0);
    assert.equal(balance.remainingPieces, 40);
    assert.equal(balance.remainingVolumeM3, 16.0);
  });

  await t.test('deducts sawmill production consumption using sourceLotId FK', () => {
    const prod: SawmillProductionRecord = {
      id: 'prd-001',
      tenantId: 'default-tenant',
      productionDate: '2026-10-06',
      sourceStorageYard: 'TPK-Timur',
      sourceKavlingNumber: 'MISMATCH-KAV',
      sourceLotId: 'lot-kav-01',
      inputSpecies: 'Jati',
      inputPieces: 15,
      inputVolumeM3: 6.0,
      outputProduct: 'Papan',
      outputPieces: 20,
      outputVolumeM3: 4.5,
      yieldPercent: 75,
      wasteVolumeM3: 1.5,
      operatorName: 'Operator 1',
      createdAt: '2026-10-06T00:00:00Z',
      updatedAt: '2026-10-06T00:00:00Z',
    };

    const balance = calculateLotStockBalance(
      [baseInbound],
      [],
      'TPK-Timur',
      'KAV-01',
      [prod],
      [],
      'lot-kav-01'
    );

    assert.equal(balance.consumedPieces, 15);
    assert.equal(balance.consumedVolumeM3, 6.0);
    assert.equal(balance.remainingPieces, 35);
    assert.equal(balance.remainingVolumeM3, 14.0);
  });

  await t.test('adjusts stock sorting transfers using sourceLotId and targetLotId FKs', () => {
    const sort: StockSortingRecord = {
      id: 'sort-001',
      tenantId: 'default-tenant',
      sortingDate: '2026-10-07',
      species: 'Jati',
      sourceStorageYard: 'TPK-Timur',
      sourceKavlingNumber: 'SOURCE-STR-MISMATCH',
      sourceLotId: 'lot-kav-01',
      targetStorageYard: 'TPK-Timur',
      targetKavlingNumber: 'TARGET-STR-MISMATCH',
      targetLotId: 'lot-kav-02',
      pieces: 5,
      volumeM3: 2.0,
      reason: 'Re-grading',
      operatorName: 'Operator 2',
      createdAt: '2026-10-07T00:00:00Z',
      updatedAt: '2026-10-07T00:00:00Z',
    };

    // Source lot deduction:
    const sourceBal = calculateLotStockBalance(
      [baseInbound],
      [],
      'TPK-Timur',
      'KAV-01',
      [],
      [sort],
      'lot-kav-01'
    );
    assert.equal(sourceBal.transferredOutPieces, 5);
    assert.equal(sourceBal.transferredOutVolumeM3, 2.0);
    assert.equal(sourceBal.remainingPieces, 45);
    assert.equal(sourceBal.remainingVolumeM3, 18.0);

    // Target lot addition:
    const targetBal = calculateLotStockBalance(
      [],
      [],
      'TPK-Timur',
      'KAV-02',
      [],
      [sort],
      'lot-kav-02'
    );
    assert.equal(targetBal.transferredInPieces, 5);
    assert.equal(targetBal.transferredInVolumeM3, 2.0);
    assert.equal(targetBal.remainingPieces, 5);
    assert.equal(targetBal.remainingVolumeM3, 2.0);
  });

  await t.test('falls back to string match when lotId is absent', () => {
    const legacySale: WoodSalesRecord = {
      id: 'sls-legacy',
      saleDate: '2026-10-05',
      deliveryOrderNumber: 'DO-LEGACY',
      truckPlateNumber: 'B 1111 AA',
      customerName: 'Buyer Legacy',
      storageYard: 'TPK-Timur',
      kavlingNumber: 'KAV-01',
      woodSpecies: 'Jati',
      pieces: 8,
      volumeM3: 3.2,
      pricePerM3: 3000000,
      totalPrice: 9600000,
      paymentStatus: 'PAID',
      createdAt: '2026-10-05T00:00:00Z',
      updatedAt: '2026-10-05T00:00:00Z',
    };

    const balance = calculateLotStockBalance(
      [baseInbound],
      [legacySale],
      'TPK-Timur',
      'KAV-01'
    );

    assert.equal(balance.outboundPieces, 8);
    assert.equal(balance.outboundVolumeM3, 3.2);
    assert.equal(balance.remainingPieces, 42);
    assert.equal(balance.remainingVolumeM3, 16.8);
  });
});
