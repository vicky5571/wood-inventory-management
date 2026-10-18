import test from 'node:test';
import assert from 'node:assert/strict';
import type { WoodReceivingRecord, WoodSalesRecord } from '../src/types/index.ts';
import {
  calculateLotStockBalance,
  validateSalesStockAllowance,
  calculateSalesFinancials,
} from '../src/utils/stock-balance.ts';

test('Stock Balance & Deduction Engine Test Suite', async (t) => {
  const mockInbounds: WoodReceivingRecord[] = [
    {
      id: 'REC-001',
      receiptDate: '2026-10-15',
      truckPlateNumber: 'KB 1001 AA',
      forestryDocNumber: 'SKSHH-001',
      receiptNumber: 'RCP-001',
      contractNumber: 'CTR-001',
      supplierName: 'PT Borneo Timber',
      woodSpecies: 'Meranti',
      woodLengthM: 4,
      kavlingNumber: 'KAV-01',
      storageYard: 'TPK-Timur',
      deliveredPieces: 50,
      deliveredVolumeM3: 20.0,
      tallyPieces: 50,
      tallyVolumeM3: 20.0,
      timberPricePerM3: 1500000,
      timberPphRate: 0.015,
      timberGrossTotal: 30000000,
      timberPphAmount: 450000,
      timberNetPayable: 29550000,
      freightRatePerM3: 100000,
      freightGrossTotal: 2000000,
      freightPphAmount: 40000,
      freightNetPayable: 1960000,
      brokerFee: 0,
      grandNetPayable: 31510000,
      createdAt: '2026-10-15T08:00:00Z',
      updatedAt: '2026-10-15T08:00:00Z',
    },
    {
      id: 'REC-002',
      receiptDate: '2026-10-16',
      truckPlateNumber: 'KB 1002 BB',
      forestryDocNumber: 'SKSHH-002',
      receiptNumber: 'RCP-002',
      contractNumber: 'CTR-002',
      supplierName: 'PT Borneo Timber',
      woodSpecies: 'Meranti',
      woodLengthM: 4,
      kavlingNumber: 'KAV-01',
      storageYard: 'TPK-Timur',
      deliveredPieces: 30,
      deliveredVolumeM3: 12.5,
      tallyPieces: 30,
      tallyVolumeM3: 12.5,
      timberPricePerM3: 1500000,
      timberPphRate: 0.015,
      timberGrossTotal: 18750000,
      timberPphAmount: 281250,
      timberNetPayable: 18468750,
      freightRatePerM3: 100000,
      freightGrossTotal: 1250000,
      freightPphAmount: 25000,
      freightNetPayable: 1225000,
      brokerFee: 0,
      grandNetPayable: 19693750,
      createdAt: '2026-10-16T08:00:00Z',
      updatedAt: '2026-10-16T08:00:00Z',
    },
    {
      id: 'REC-003',
      receiptDate: '2026-10-16',
      truckPlateNumber: 'KB 1003 CC',
      forestryDocNumber: 'SKSHH-003',
      receiptNumber: 'RCP-003',
      contractNumber: 'CTR-003',
      supplierName: 'CV Rimba Jaya',
      woodSpecies: 'Bengkirai',
      woodLengthM: 4,
      kavlingNumber: 'KAV-02',
      storageYard: 'TPK-Timur',
      deliveredPieces: 20,
      deliveredVolumeM3: 8.0,
      tallyPieces: 20,
      tallyVolumeM3: 8.0,
      timberPricePerM3: 2000000,
      timberPphRate: 0.015,
      timberGrossTotal: 16000000,
      timberPphAmount: 240000,
      timberNetPayable: 15760000,
      freightRatePerM3: 100000,
      freightGrossTotal: 800000,
      freightPphAmount: 16000,
      freightNetPayable: 784000,
      brokerFee: 0,
      grandNetPayable: 16544000,
      createdAt: '2026-10-16T08:00:00Z',
      updatedAt: '2026-10-16T08:00:00Z',
    },
  ];

  const mockSales: WoodSalesRecord[] = [
    {
      id: 'SLS-001',
      saleDate: '2026-10-17',
      deliveryOrderNumber: 'DO-261017-001',
      truckPlateNumber: 'KB 9001 XX',
      driverName: 'Pak Joko',
      customerName: 'CV Surya Mebel',
      storageYard: 'TPK-Timur',
      kavlingNumber: 'KAV-01',
      woodSpecies: 'Meranti',
      pieces: 25,
      volumeM3: 10.0,
      pricePerM3: 2200000,
      totalPrice: 22000000,
      paymentStatus: 'PAID',
      createdAt: '2026-10-17T10:00:00Z',
      updatedAt: '2026-10-17T10:00:00Z',
    },
  ];

  await t.test('calculateLotStockBalance computes net remaining stock correctly', () => {
    // KAV-01: Inbound = 50 + 30 = 80 btg, 20.0 + 12.5 = 32.5 m³. Sales = 25 btg, 10.0 m³.
    // Remaining = 80 - 25 = 55 btg, 32.5 - 10.0 = 22.5 m³.
    const balance = calculateLotStockBalance(mockInbounds, mockSales, 'TPK-Timur', 'KAV-01');
    assert.equal(balance.storageYard, 'TPK-Timur');
    assert.equal(balance.kavlingNumber, 'KAV-01');
    assert.equal(balance.inboundPieces, 80);
    assert.equal(balance.inboundVolumeM3, 32.5);
    assert.equal(balance.outboundPieces, 25);
    assert.equal(balance.outboundVolumeM3, 10.0);
    assert.equal(balance.remainingPieces, 55);
    assert.equal(balance.remainingVolumeM3, 22.5);
  });

  await t.test('calculateLotStockBalance handles empty yard/kavling without error', () => {
    const balance = calculateLotStockBalance(mockInbounds, mockSales, 'TPK-Timur', 'KAV-99');
    assert.equal(balance.inboundPieces, 0);
    assert.equal(balance.inboundVolumeM3, 0);
    assert.equal(balance.outboundPieces, 0);
    assert.equal(balance.outboundVolumeM3, 0);
    assert.equal(balance.remainingPieces, 0);
    assert.equal(balance.remainingVolumeM3, 0);
  });

  await t.test('validateSalesStockAllowance flags overdrawn stock with warning', () => {
    const balance = calculateLotStockBalance(mockInbounds, mockSales, 'TPK-Timur', 'KAV-01');
    
    // Normal sale within remaining volume (15 m³, 30 btg <= 22.5 m³, 55 btg)
    const validCheck = validateSalesStockAllowance(balance, 15.0, 30);
    assert.equal(validCheck.isAllowed, true);
    assert.equal(validCheck.warning, undefined);

    // Excessive sale exceeding remaining volume (25.0 m³ > 22.5 m³)
    const invalidCheck = validateSalesStockAllowance(balance, 25.0, 30);
    assert.equal(invalidCheck.isAllowed, false);
    assert.match(invalidCheck.warning || '', /Volume melebihi sisa stok kavling/);
  });

  await t.test('calculateSalesFinancials computes accurate gross revenue', () => {
    const res = calculateSalesFinancials(12.3456, 2500000);
    // 12.3456 * 2,500,000 = 30,864,000
    assert.equal(res.totalPrice, 30864000);
  });
});
