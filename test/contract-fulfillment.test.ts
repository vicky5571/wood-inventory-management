import test from 'node:test';
import assert from 'node:assert/strict';
import type { PerhutaniContract, WoodReceivingRecord } from '../src/types/index.ts';
import { computeFulfillmentSummary } from '../src/utils/contract-calc.ts';

test('Contract Fulfillment Calculation Suite (FK-based vs String-based)', async (t) => {
  const sampleContract: PerhutaniContract = {
    id: 'ctr-uuid-001',
    tenantId: 'default-tenant',
    contractNumber: 'CTR/PH/2026/001',
    supplierId: 'sup-1',
    contractDate: '2026-01-01',
    targetDeliveryDate: '2026-12-31',
    totalPurchasedVolumeM3: 100.0,
    totalPurchasedPieces: 50,
    totalContractValueIDR: 500000000,
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  await t.test('matches records by contractId FK even when contractNumber string has typos or different formatting', () => {
    const records: WoodReceivingRecord[] = [
      {
        id: 'rec-1',
        receiptDate: '2026-03-01',
        truckPlateNumber: 'B 1234 CD',
        forestryDocNumber: 'DKP-1',
        receiptNumber: 'KW-1',
        contractNumber: 'CTR-PH-2026-001-TYPO', // string differs
        contractId: 'ctr-uuid-001',            // FK matches contract.id
        supplierName: 'Perhutani KPH',
        woodSpecies: 'Jati',
        woodLengthM: 4.0,
        kavlingNumber: 'KAV-1',
        storageYard: 'TPK-1',
        deliveredPieces: 10,
        deliveredVolumeM3: 20.0,
        tallyPieces: 10,
        tallyVolumeM3: 20.0,
        timberPricePerM3: 5000000,
        timberGrossTotal: 100000000,
        timberPphRate: 0.5,
        timberPphAmount: 500000,
        timberNetPayable: 99500000,
        freightRatePerM3: 100000,
        freightGrossTotal: 2000000,
        freightPphAmount: 40000,
        freightNetPayable: 1960000,
        brokerFee: 0,
        grandNetPayable: 101460000,
        paymentStatus: 'UNPAID',
        createdAt: '2026-03-01T00:00:00Z',
        updatedAt: '2026-03-01T00:00:00Z',
      },
    ];

    const summary = computeFulfillmentSummary(sampleContract, [], [], records);
    assert.equal(summary.receivedVolumeM3, 20.0);
    assert.equal(summary.receivedPieces, 10);
    assert.equal(summary.remainingVolumeM3, 80.0);
    assert.equal(summary.remainingPieces, 40);
    assert.equal(summary.fulfillmentPercent, 20.0);
  });

  await t.test('falls back to contractNumber string matching when contractId is undefined', () => {
    const records: WoodReceivingRecord[] = [
      {
        id: 'rec-legacy',
        receiptDate: '2026-03-01',
        truckPlateNumber: 'B 1234 CD',
        forestryDocNumber: 'DKP-1',
        receiptNumber: 'KW-1',
        contractNumber: 'CTR/PH/2026/001', // Exact match
        supplierName: 'Perhutani KPH',
        woodSpecies: 'Jati',
        woodLengthM: 4.0,
        kavlingNumber: 'KAV-1',
        storageYard: 'TPK-1',
        deliveredPieces: 5,
        deliveredVolumeM3: 12.5,
        tallyPieces: 5,
        tallyVolumeM3: 12.5,
        timberPricePerM3: 5000000,
        timberGrossTotal: 62500000,
        timberPphRate: 0.5,
        timberPphAmount: 312500,
        timberNetPayable: 62187500,
        freightRatePerM3: 100000,
        freightGrossTotal: 1250000,
        freightPphAmount: 25000,
        freightNetPayable: 1225000,
        brokerFee: 0,
        grandNetPayable: 63412500,
        paymentStatus: 'UNPAID',
        createdAt: '2026-03-01T00:00:00Z',
        updatedAt: '2026-03-01T00:00:00Z',
      },
    ];

    const summary = computeFulfillmentSummary(sampleContract, [], [], records);
    assert.equal(summary.receivedVolumeM3, 12.5);
    assert.equal(summary.receivedPieces, 5);
    assert.equal(summary.fulfillmentPercent, 12.5);
  });

  await t.test('ignores records pointing to a different contractId even if contractNumber text happens to match', () => {
    const records: WoodReceivingRecord[] = [
      {
        id: 'rec-different-contract',
        receiptDate: '2026-03-01',
        truckPlateNumber: 'B 1234 CD',
        forestryDocNumber: 'DKP-1',
        receiptNumber: 'KW-1',
        contractNumber: 'CTR/PH/2026/001',
        contractId: 'ctr-uuid-OTHER', // Different FK
        supplierName: 'Perhutani KPH',
        woodSpecies: 'Jati',
        woodLengthM: 4.0,
        kavlingNumber: 'KAV-1',
        storageYard: 'TPK-1',
        deliveredPieces: 5,
        deliveredVolumeM3: 12.5,
        tallyPieces: 5,
        tallyVolumeM3: 12.5,
        timberPricePerM3: 5000000,
        timberGrossTotal: 62500000,
        timberPphRate: 0.5,
        timberPphAmount: 312500,
        timberNetPayable: 62187500,
        freightRatePerM3: 100000,
        freightGrossTotal: 1250000,
        freightPphAmount: 25000,
        freightNetPayable: 1225000,
        brokerFee: 0,
        grandNetPayable: 63412500,
        paymentStatus: 'UNPAID',
        createdAt: '2026-03-01T00:00:00Z',
        updatedAt: '2026-03-01T00:00:00Z',
      },
    ];

    const summary = computeFulfillmentSummary(sampleContract, [], [], records);
    assert.equal(summary.receivedVolumeM3, 0);
    assert.equal(summary.receivedPieces, 0);
    assert.equal(summary.fulfillmentPercent, 0);
  });
});
