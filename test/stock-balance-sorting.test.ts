/**
 * test/stock-balance-sorting.test.ts
 *
 * Unit tests verifying that StockSortingRecord redistributes stock between
 * source and target kavlings with net-zero inventory variance.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLotStockBalance, aggregateAllLotBalances } from '../src/utils/stock-balance.ts';
import type { WoodReceivingRecord, WoodSalesRecord, StockSortingRecord } from '../src/types/index.ts';

const mockInbound = (overrides: Partial<WoodReceivingRecord> = {}): WoodReceivingRecord => ({
  id: 'rec-1',
  receiptDate: '2026-10-21',
  truckPlateNumber: 'B 1234 CD',
  forestryDocNumber: 'DOC-001',
  receiptNumber: 'KW-001',
  contractNumber: 'CTR-001',
  supplierName: 'PT Kayu Bersama',
  woodSpecies: 'Jati',
  woodLengthM: 4.0,
  storageYard: 'TPK-Timur',
  kavlingNumber: 'KAV-01',
  deliveredPieces: 20,
  deliveredVolumeM3: 10.0,
  tallyPieces: 20,
  tallyVolumeM3: 10.0,
  timberPricePerM3: 5000000,
  timberGrossTotal: 50000000,
  timberPphRate: 0.5,
  timberPphAmount: 250000,
  timberNetPayable: 49750000,
  freightRatePerM3: 200000,
  freightGrossTotal: 2000000,
  freightPphAmount: 40000,
  freightNetPayable: 1960000,
  brokerFee: 0,
  grandNetPayable: 51710000,
  createdAt: '2026-10-21T00:00:00.000Z',
  updatedAt: '2026-10-21T00:00:00.000Z',
  ...overrides,
});

const mockSorting = (overrides: Partial<StockSortingRecord> = {}): StockSortingRecord => ({
  id: 'sort-1',
  tenantId: 'tenant-default',
  sortingDate: '2026-10-21',
  species: 'Jati',
  sourceStorageYard: 'TPK-Timur',
  sourceKavlingNumber: 'KAV-01',
  targetStorageYard: 'TPK-Timur',
  targetKavlingNumber: 'KAV-02',
  volumeM3: 3.0,
  pieces: 6,
  reason: 'Regrade kualitas B ke kavling sortimen kecil',
  operatorName: 'Budi',
  createdAt: '2026-10-21T00:00:00.000Z',
  updatedAt: '2026-10-21T00:00:00.000Z',
  ...overrides,
});

test('Stock Sorting Redistribution Suite', async (t) => {
  await t.test('Transfer moves stock: source decreases, target increases', () => {
    const inbound = [mockInbound({ kavlingNumber: 'KAV-01', tallyPieces: 20, tallyVolumeM3: 10.0 })];
    const sales: WoodSalesRecord[] = [];
    const sorting = [mockSorting({ volumeM3: 3.0, pieces: 6 })];

    const sourceBalance = calculateLotStockBalance(inbound, sales, 'TPK-Timur', 'KAV-01', [], sorting);
    const targetBalance = calculateLotStockBalance(inbound, sales, 'TPK-Timur', 'KAV-02', [], sorting);

    // Source lot checks
    assert.equal(sourceBalance.inboundVolumeM3, 10.0);
    assert.equal(sourceBalance.transferredOutVolumeM3, 3.0);
    assert.equal(sourceBalance.transferredInVolumeM3, 0);
    assert.equal(sourceBalance.remainingVolumeM3, 7.0);
    assert.equal(sourceBalance.remainingPieces, 14);

    // Target lot checks (no inbound, only transfer in)
    assert.equal(targetBalance.inboundVolumeM3, 0);
    assert.equal(targetBalance.transferredInVolumeM3, 3.0);
    assert.equal(targetBalance.transferredOutVolumeM3, 0);
    assert.equal(targetBalance.remainingVolumeM3, 3.0);
    assert.equal(targetBalance.remainingPieces, 6);
  });

  await t.test('Multiple transfers between 3 lots maintain global stock conservation', () => {
    const inbound = [
      mockInbound({ id: 'r1', kavlingNumber: 'KAV-01', tallyPieces: 30, tallyVolumeM3: 15.0 }),
      mockInbound({ id: 'r2', kavlingNumber: 'KAV-02', tallyPieces: 10, tallyVolumeM3: 5.0 }),
    ];
    const sorting = [
      mockSorting({ id: 's1', sourceKavlingNumber: 'KAV-01', targetKavlingNumber: 'KAV-02', volumeM3: 4.0, pieces: 8 }),
      mockSorting({ id: 's2', sourceKavlingNumber: 'KAV-02', targetKavlingNumber: 'KAV-03', volumeM3: 2.0, pieces: 4 }),
    ];

    const b1 = calculateLotStockBalance(inbound, [], 'TPK-Timur', 'KAV-01', [], sorting);
    const b2 = calculateLotStockBalance(inbound, [], 'TPK-Timur', 'KAV-02', [], sorting);
    const b3 = calculateLotStockBalance(inbound, [], 'TPK-Timur', 'KAV-03', [], sorting);

    assert.equal(b1.remainingVolumeM3, 11.0); // 15 - 4
    assert.equal(b2.remainingVolumeM3, 7.0);  // 5 + 4 - 2
    assert.equal(b3.remainingVolumeM3, 2.0);  // 0 + 2

    // Total remaining equals total inbound: 11 + 7 + 2 = 20
    assert.equal(b1.remainingVolumeM3 + b2.remainingVolumeM3 + b3.remainingVolumeM3, 20.0);
  });

  await t.test('aggregateAllLotBalances automatically creates lot entry for target lots without inbound records', () => {
    const inbound = [mockInbound({ kavlingNumber: 'KAV-01', tallyVolumeM3: 10.0, tallyPieces: 20 })];
    const sorting = [mockSorting({ sourceKavlingNumber: 'KAV-01', targetKavlingNumber: 'KAV-SPARE', volumeM3: 2.5, pieces: 5 })];

    const balances = aggregateAllLotBalances(inbound, [], [], sorting);
    const targetLot = balances.find((b) => b.kavlingNumber === 'KAV-SPARE');

    assert.ok(targetLot, 'Target lot KAV-SPARE should be present in aggregateAllLotBalances');
    assert.equal(targetLot.remainingVolumeM3, 2.5);
    assert.equal(targetLot.transferredInVolumeM3, 2.5);
  });
});
