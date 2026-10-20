import test from 'node:test';
import assert from 'node:assert/strict';
import type { WoodReceivingRecord, WoodSalesRecord } from '../src/types/index.ts';
import { aggregateAllLotBalances } from '../src/utils/stock-balance.ts';

test('aggregateAllLotBalances Pure Logic Suite', async (t) => {
  const sampleInbounds: WoodReceivingRecord[] = [
    {
      id: 'REC-101',
      receiptDate: '2026-10-10',
      truckPlateNumber: 'KB 1111 AA',
      forestryDocNumber: 'DOC-101',
      receiptNumber: 'RCP-101',
      contractNumber: 'CTR-101',
      supplierName: 'PT Borneo',
      woodSpecies: 'Meranti',
      woodLengthM: 4,
      kavlingNumber: 'KAV-A',
      storageYard: 'TPK-Timur',
      deliveredPieces: 40,
      deliveredVolumeM3: 16.0,
      tallyPieces: 40,
      tallyVolumeM3: 16.0,
      timberPricePerM3: 1500000,
      timberPphRate: 0.015,
      timberGrossTotal: 24000000,
      timberPphAmount: 360000,
      timberNetPayable: 23640000,
      freightRatePerM3: 100000,
      freightGrossTotal: 1600000,
      freightPphAmount: 32000,
      freightNetPayable: 1568000,
      brokerFee: 0,
      grandNetPayable: 25208000,
      createdAt: '2026-10-10T08:00:00Z',
      updatedAt: '2026-10-10T08:00:00Z',
    },
    {
      id: 'REC-102',
      receiptDate: '2026-10-11',
      truckPlateNumber: 'KB 1112 BB',
      forestryDocNumber: 'DOC-102',
      receiptNumber: 'RCP-102',
      contractNumber: 'CTR-102',
      supplierName: 'PT Borneo',
      woodSpecies: 'Meranti',
      woodLengthM: 4,
      kavlingNumber: 'kav-a', // Lowercase test for normalization
      storageYard: 'tpk-timur',
      deliveredPieces: 20,
      deliveredVolumeM3: 8.0,
      tallyPieces: 20,
      tallyVolumeM3: 8.0,
      timberPricePerM3: 1500000,
      timberPphRate: 0.015,
      timberGrossTotal: 12000000,
      timberPphAmount: 180000,
      timberNetPayable: 11820000,
      freightRatePerM3: 100000,
      freightGrossTotal: 800000,
      freightPphAmount: 16000,
      freightNetPayable: 784000,
      brokerFee: 0,
      grandNetPayable: 12604000,
      createdAt: '2026-10-11T08:00:00Z',
      updatedAt: '2026-10-11T08:00:00Z',
    },
    {
      id: 'REC-103',
      receiptDate: '2026-10-12',
      truckPlateNumber: 'KB 1113 CC',
      forestryDocNumber: 'DOC-103',
      receiptNumber: 'RCP-103',
      contractNumber: 'CTR-103',
      supplierName: 'CV Rimba',
      woodSpecies: 'Bengkirai',
      woodLengthM: 4,
      kavlingNumber: 'KAV-B',
      storageYard: 'TPK-Barat',
      deliveredPieces: 50,
      deliveredVolumeM3: 25.0,
      tallyPieces: 50,
      tallyVolumeM3: 25.0,
      timberPricePerM3: 2000000,
      timberPphRate: 0.015,
      timberGrossTotal: 50000000,
      timberPphAmount: 750000,
      timberNetPayable: 49250000,
      freightRatePerM3: 100000,
      freightGrossTotal: 2500000,
      freightPphAmount: 50000,
      freightNetPayable: 2450000,
      brokerFee: 0,
      grandNetPayable: 51700000,
      createdAt: '2026-10-12T08:00:00Z',
      updatedAt: '2026-10-12T08:00:00Z',
    },
    {
      id: 'REC-104',
      receiptDate: '2026-10-13',
      truckPlateNumber: 'KB 1114 DD',
      forestryDocNumber: 'DOC-104',
      receiptNumber: 'RCP-104',
      contractNumber: 'CTR-104',
      supplierName: 'CV Mahakam',
      woodSpecies: 'Kapur',
      woodLengthM: 4,
      kavlingNumber: 'KAV-C',
      storageYard: 'TPK-Barat',
      deliveredPieces: 10,
      deliveredVolumeM3: 5.0,
      tallyPieces: 10,
      tallyVolumeM3: 5.0,
      timberPricePerM3: 1200000,
      timberPphRate: 0.015,
      timberGrossTotal: 6000000,
      timberPphAmount: 90000,
      timberNetPayable: 5910000,
      freightRatePerM3: 100000,
      freightGrossTotal: 500000,
      freightPphAmount: 10000,
      freightNetPayable: 490000,
      brokerFee: 0,
      grandNetPayable: 6400000,
      createdAt: '2026-10-13T08:00:00Z',
      updatedAt: '2026-10-13T08:00:00Z',
    },
  ];

  const sampleSales: WoodSalesRecord[] = [
    {
      id: 'SLS-101',
      saleDate: '2026-10-15',
      deliveryOrderNumber: 'DO-101',
      truckPlateNumber: 'KB 9999 XX',
      driverName: 'Pak Budi',
      customerName: 'CV Indah Mebel',
      storageYard: 'TPK-Timur',
      kavlingNumber: 'KAV-A',
      woodSpecies: 'Meranti',
      pieces: 15,
      volumeM3: 6.0,
      pricePerM3: 2000000,
      totalPrice: 12000000,
      paymentStatus: 'PAID',
      createdAt: '2026-10-15T09:00:00Z',
      updatedAt: '2026-10-15T09:00:00Z',
    },
    {
      id: 'SLS-102',
      saleDate: '2026-10-16',
      deliveryOrderNumber: 'DO-102',
      truckPlateNumber: 'KB 9998 YY',
      driverName: 'Pak Agus',
      customerName: 'PT Mandiri Kayu',
      storageYard: 'TPK-Barat',
      kavlingNumber: 'KAV-C',
      woodSpecies: 'Kapur',
      pieces: 10,
      volumeM3: 5.0, // Fully depletes KAV-C
      pricePerM3: 1800000,
      totalPrice: 9000000,
      paymentStatus: 'PAID',
      createdAt: '2026-10-16T10:00:00Z',
      updatedAt: '2026-10-16T10:00:00Z',
    },
  ];

  await t.test('Empty inputs → empty array', () => {
    assert.deepEqual(aggregateAllLotBalances([], []), []);
    assert.deepEqual(aggregateAllLotBalances(undefined as any, undefined as any), []);
  });

  await t.test('Inbound only, no sales → remaining == inbound', () => {
    const onlyB = sampleInbounds.filter((r) => r.kavlingNumber === 'KAV-B');
    const result = aggregateAllLotBalances(onlyB, []);
    assert.equal(result.length, 1);
    assert.equal(result[0].kavlingNumber, 'KAV-B');
    assert.equal(result[0].storageYard, 'TPK-Barat');
    assert.equal(result[0].inboundPieces, 50);
    assert.equal(result[0].inboundVolumeM3, 25.0);
    assert.equal(result[0].outboundPieces, 0);
    assert.equal(result[0].outboundVolumeM3, 0);
    assert.equal(result[0].remainingPieces, 50);
    assert.equal(result[0].remainingVolumeM3, 25.0);
  });

  await t.test('Mixed inbound + sales, same lot → correct deduction', () => {
    const onlyAInbound = sampleInbounds.filter(
      (r) => r.kavlingNumber.toLowerCase() === 'kav-a'
    );
    const onlyASales = sampleSales.filter(
      (s) => s.kavlingNumber.toLowerCase() === 'kav-a'
    );
    // Inbound: 40 + 20 = 60 btg, 16.0 + 8.0 = 24.0 m3
    // Sales: 15 btg, 6.0 m3
    // Remaining: 45 btg, 18.0 m3
    const result = aggregateAllLotBalances(onlyAInbound, onlyASales);
    assert.equal(result.length, 1);
    assert.equal(result[0].inboundPieces, 60);
    assert.equal(result[0].inboundVolumeM3, 24.0);
    assert.equal(result[0].outboundPieces, 15);
    assert.equal(result[0].outboundVolumeM3, 6.0);
    assert.equal(result[0].remainingPieces, 45);
    assert.equal(result[0].remainingVolumeM3, 18.0);
  });

  await t.test('Multiple distinct lots → each returned once with case-insensitive normalization', () => {
    const result = aggregateAllLotBalances(sampleInbounds, sampleSales);
    // 3 distinct lots: (TPK-Barat, KAV-B), (TPK-Timur, KAV-A), (TPK-Barat, KAV-C)
    assert.equal(result.length, 3);
    const kavlingSet = new Set(result.map((r) => `${r.storageYard}:::${r.kavlingNumber.toUpperCase()}`));
    assert.ok(kavlingSet.has('TPK-Barat:::KAV-B'));
    assert.ok(kavlingSet.has('TPK-Timur:::KAV-A'));
    assert.ok(kavlingSet.has('TPK-Barat:::KAV-C'));
  });

  await t.test('Sort order: remaining volume DESC', () => {
    const result = aggregateAllLotBalances(sampleInbounds, sampleSales);
    // KAV-B: 25.0 m3
    // KAV-A: 18.0 m3
    // KAV-C: 0.0 m3 (depleted)
    assert.equal(result.length, 3);
    assert.equal(result[0].kavlingNumber, 'KAV-B');
    assert.equal(result[0].remainingVolumeM3, 25.0);

    assert.equal(result[1].kavlingNumber, 'KAV-A');
    assert.equal(result[1].remainingVolumeM3, 18.0);

    assert.equal(result[2].kavlingNumber, 'KAV-C');
    assert.equal(result[2].remainingVolumeM3, 0.0);
  });

  await t.test('Includes lot that exists only in sales if any', () => {
    const orphanSale: WoodSalesRecord = {
      id: 'SLS-999',
      saleDate: '2026-10-18',
      deliveryOrderNumber: 'DO-999',
      truckPlateNumber: 'KB 0000 ZZ',
      driverName: 'Pak Joko',
      customerName: 'Customer X',
      storageYard: 'TPK-Utara',
      kavlingNumber: 'KAV-ORPHAN',
      woodSpecies: 'Meranti',
      pieces: 5,
      volumeM3: 2.0,
      pricePerM3: 2000000,
      totalPrice: 4000000,
      paymentStatus: 'PAID',
      createdAt: '2026-10-18T10:00:00Z',
      updatedAt: '2026-10-18T10:00:00Z',
    };
    const result = aggregateAllLotBalances([], [orphanSale]);
    assert.equal(result.length, 1);
    assert.equal(result[0].kavlingNumber, 'KAV-ORPHAN');
    assert.equal(result[0].storageYard, 'TPK-Utara');
    assert.equal(result[0].inboundPieces, 0);
    assert.equal(result[0].outboundPieces, 5);
    assert.equal(result[0].remainingPieces, 0);
  });
});
