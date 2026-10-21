/**
 * test/stock-balance-production.test.ts
 *
 * Unit tests verifying that SawmillProductionRecord correctly decrements
 * lot inventory balances while preserving backward compatibility.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLotStockBalance, aggregateAllLotBalances } from '../src/utils/stock-balance.ts';
import type { WoodReceivingRecord, WoodSalesRecord, SawmillProductionRecord } from '../src/types/index.ts';

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

const mockProduction = (overrides: Partial<SawmillProductionRecord> = {}): SawmillProductionRecord => ({
  id: 'prod-1',
  tenantId: 'tenant-default',
  productionDate: '2026-10-21',
  shift: 'PAGI',
  sourceStorageYard: 'TPK-Timur',
  sourceKavlingNumber: 'KAV-01',
  inputSpecies: 'Jati',
  inputVolumeM3: 4.0,
  inputPieces: 8,
  outputProduct: 'Papan 2x20x400cm',
  outputVolumeM3: 2.8,
  outputPieces: 12,
  yieldPercent: 70.0,
  wasteVolumeM3: 1.2,
  operatorName: 'Pak Joko',
  createdAt: '2026-10-21T00:00:00.000Z',
  updatedAt: '2026-10-21T00:00:00.000Z',
  ...overrides,
});

test('Sawmill Production Stock Deduction Suite', async (t) => {
  await t.test('Production consumes stock from source lot and decreases remaining balance', () => {
    const inbound = [mockInbound()];
    const sales: WoodSalesRecord[] = [];
    const production = [mockProduction({ inputVolumeM3: 4.0, inputPieces: 8 })];

    const balance = calculateLotStockBalance(inbound, sales, 'TPK-Timur', 'KAV-01', production);

    assert.equal(balance.inboundPieces, 20);
    assert.equal(balance.inboundVolumeM3, 10.0);
    assert.equal(balance.consumedPieces, 8);
    assert.equal(balance.consumedVolumeM3, 4.0);
    assert.equal(balance.remainingPieces, 12);
    assert.equal(balance.remainingVolumeM3, 6.0);
  });

  await t.test('Multiple productions on the same lot accumulate deductions', () => {
    const inbound = [mockInbound({ tallyPieces: 30, tallyVolumeM3: 15.0 })];
    const sales: WoodSalesRecord[] = [];
    const production = [
      mockProduction({ id: 'p1', inputVolumeM3: 3.5, inputPieces: 7 }),
      mockProduction({ id: 'p2', inputVolumeM3: 4.5, inputPieces: 9 }),
    ];

    const balance = calculateLotStockBalance(inbound, sales, 'TPK-Timur', 'KAV-01', production);

    assert.equal(balance.consumedPieces, 16);
    assert.equal(balance.consumedVolumeM3, 8.0);
    assert.equal(balance.remainingPieces, 14);
    assert.equal(balance.remainingVolumeM3, 7.0);
  });

  await t.test('Production exceeding available stock is clamped to 0 remaining', () => {
    const inbound = [mockInbound({ tallyPieces: 10, tallyVolumeM3: 5.0 })];
    const sales: WoodSalesRecord[] = [];
    const production = [mockProduction({ inputVolumeM3: 8.0, inputPieces: 15 })];

    const balance = calculateLotStockBalance(inbound, sales, 'TPK-Timur', 'KAV-01', production);

    assert.equal(balance.consumedPieces, 15);
    assert.equal(balance.consumedVolumeM3, 8.0);
    assert.equal(balance.remainingPieces, 0);
    assert.equal(balance.remainingVolumeM3, 0.0);
  });

  await t.test('Backward compatibility: calling calculateLotStockBalance without production records preserves original behavior', () => {
    const inbound = [mockInbound({ tallyPieces: 25, tallyVolumeM3: 12.5 })];
    const sales: WoodSalesRecord[] = [];

    const balance = calculateLotStockBalance(inbound, sales, 'TPK-Timur', 'KAV-01');

    assert.equal(balance.inboundPieces, 25);
    assert.equal(balance.inboundVolumeM3, 12.5);
    assert.equal(balance.consumedPieces, 0);
    assert.equal(balance.consumedVolumeM3, 0);
    assert.equal(balance.remainingPieces, 25);
    assert.equal(balance.remainingVolumeM3, 12.5);
  });

  await t.test('aggregateAllLotBalances includes production lots and decrements remaining balances', () => {
    const inbound = [
      mockInbound({ kavlingNumber: 'KAV-01', tallyVolumeM3: 10.0, tallyPieces: 20 }),
      mockInbound({ id: 'rec-2', kavlingNumber: 'KAV-02', tallyVolumeM3: 8.0, tallyPieces: 16 }),
    ];
    const production = [
      mockProduction({ sourceKavlingNumber: 'KAV-01', inputVolumeM3: 6.0, inputPieces: 12 }),
    ];

    const balances = aggregateAllLotBalances(inbound, [], production);
    const kav1 = balances.find((b) => b.kavlingNumber === 'KAV-01')!;
    const kav2 = balances.find((b) => b.kavlingNumber === 'KAV-02')!;

    assert.equal(kav1.remainingVolumeM3, 4.0);
    assert.equal(kav1.consumedVolumeM3, 6.0);
    assert.equal(kav2.remainingVolumeM3, 8.0);
    assert.equal(kav2.consumedVolumeM3, 0);
  });
});
