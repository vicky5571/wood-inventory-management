import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  PerhutaniContract,
  ContractSortimentItem,
  ContractReceipt,
  WoodReceivingRecord,
} from '../src/types/index.ts';
import {
  computeContractTotals,
  computeFulfillmentSummary,
  deriveContractStatus,
} from '../src/utils/contract-calc.ts';

test('Perhutani Contract Calculations & Metrics Suite', async (t) => {
  await t.test('computeContractTotals with empty or null items -> all zeros', () => {
    assert.deepEqual(computeContractTotals([]), {
      totalValueIDR: 0,
      totalVolumeM3: 0,
      totalPieces: 0,
    });
    assert.deepEqual(computeContractTotals(undefined as any), {
      totalValueIDR: 0,
      totalVolumeM3: 0,
      totalPieces: 0,
    });
  });

  await t.test('computeContractTotals with multi-item -> correct sums', () => {
    const items: ContractSortimentItem[] = [
      {
        id: 'item-1',
        contractId: 'ctr-1',
        tenantId: 'tenant-1',
        itemSequence: 1,
        woodSpecies: 'Jati',
        grade: 'A1',
        volumeM3: 45.5,
        pieces: 100,
        pricePerM3: 6000000,
        subtotalIDR: 273000000,
      },
      {
        id: 'item-2',
        contractId: 'ctr-1',
        tenantId: 'tenant-1',
        itemSequence: 2,
        woodSpecies: 'Jati',
        grade: 'A2',
        volumeM3: 20.25,
        pieces: 50,
        pricePerM3: 4500000,
        subtotalIDR: 91125000,
      },
    ];

    const totals = computeContractTotals(items);
    assert.equal(totals.totalVolumeM3, 65.75);
    assert.equal(totals.totalPieces, 150);
    assert.equal(totals.totalValueIDR, 364125000);
  });

  const baseContract: PerhutaniContract = {
    id: 'CTR-001',
    tenantId: 'tenant-1',
    contractNumber: 'PHT/RND/2026/001',
    contractDate: '2026-01-10',
    effectiveStartDate: '2026-01-15',
    effectiveEndDate: '2026-06-30',
    kphOrigin: 'KPH Randublatung',
    poNumber: 'PO-2026-01',
    totalContractValueIDR: 200000000,
    totalPurchasedVolumeM3: 50.0,
    totalPurchasedPieces: 100,
    status: 'ACTIVE',
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-01-10T00:00:00Z',
  };

  const receipts: ContractReceipt[] = [
    {
      id: 'RCP-1',
      contractId: 'CTR-001',
      tenantId: 'tenant-1',
      receiptNumber: 'KW-001',
      receiptDate: '2026-01-20',
      amountIDR: 100000000, // 50% paid
      coveredVolumeM3: 25.0,
      coveredPieces: 50,
      createdAt: '2026-01-20T00:00:00Z',
      updatedAt: '2026-01-20T00:00:00Z',
    },
  ];

  await t.test('computeFulfillmentSummary with no receiving records -> fully remaining', () => {
    const today = new Date('2026-03-01T00:00:00Z');
    const summary = computeFulfillmentSummary(baseContract, [], receipts, [], today);

    assert.equal(summary.purchasedVolumeM3, 50.0);
    assert.equal(summary.purchasedPieces, 100);
    assert.equal(summary.receivedVolumeM3, 0);
    assert.equal(summary.receivedPieces, 0);
    assert.equal(summary.remainingVolumeM3, 50.0);
    assert.equal(summary.remainingPieces, 100);
    assert.equal(summary.totalPaidIDR, 100000000);
    assert.equal(summary.outstandingIDR, 100000000);
    assert.equal(summary.fulfillmentPercent, 0);
    assert.equal(summary.isNearExpiry, false);
    assert.equal(summary.isOverdue, false);
    assert.equal(summary.status, 'ACTIVE');
  });

  await t.test('computeFulfillmentSummary with partial delivery -> correct remaining', () => {
    const receiving: WoodReceivingRecord[] = [
      {
        id: 'REC-1',
        receiptDate: '2026-02-10',
        truckPlateNumber: 'B 1234 CD',
        forestryDocNumber: 'SKSHHK-001',
        receiptNumber: 'RCP-001',
        contractNumber: 'pht/rnd/2026/001', // case-insensitive check
        supplierName: 'Perhutani KPH Randublatung',
        woodSpecies: 'Jati',
        woodLengthM: 4,
        kavlingNumber: 'KAV-01',
        storageYard: 'TPK-01',
        deliveredPieces: 30,
        deliveredVolumeM3: 15.0,
        tallyPieces: 30,
        tallyVolumeM3: 15.0,
        timberPricePerM3: 4000000,
        timberPphRate: 0.005,
        timberGrossTotal: 60000000,
        timberPphAmount: 300000,
        timberNetPayable: 59700000,
        freightRatePerM3: 100000,
        freightGrossTotal: 1500000,
        freightPphAmount: 30000,
        freightNetPayable: 1470000,
        brokerFee: 0,
        grandNetPayable: 61170000,
        createdAt: '2026-02-10T08:00:00Z',
        updatedAt: '2026-02-10T08:00:00Z',
      },
    ];

    const today = new Date('2026-03-01T00:00:00Z');
    const summary = computeFulfillmentSummary(baseContract, [], receipts, receiving, today);

    assert.equal(summary.receivedVolumeM3, 15.0);
    assert.equal(summary.receivedPieces, 30);
    assert.equal(summary.remainingVolumeM3, 35.0);
    assert.equal(summary.remainingPieces, 70);
    assert.equal(summary.fulfillmentPercent, 30.0);
  });

  await t.test('computeFulfillmentSummary where received > purchased -> remaining clamped to 0', () => {
    const overReceiving: WoodReceivingRecord[] = [
      {
        id: 'REC-2',
        receiptDate: '2026-02-10',
        truckPlateNumber: 'B 1234 CD',
        forestryDocNumber: 'SKSHHK-002',
        receiptNumber: 'RCP-002',
        contractNumber: 'PHT/RND/2026/001',
        supplierName: 'Perhutani KPH Randublatung',
        woodSpecies: 'Jati',
        woodLengthM: 4,
        kavlingNumber: 'KAV-01',
        storageYard: 'TPK-01',
        deliveredPieces: 120,
        deliveredVolumeM3: 60.0,
        tallyPieces: 120,
        tallyVolumeM3: 60.0,
        timberPricePerM3: 4000000,
        timberPphRate: 0.005,
        timberGrossTotal: 240000000,
        timberPphAmount: 1200000,
        timberNetPayable: 238800000,
        freightRatePerM3: 100000,
        freightGrossTotal: 6000000,
        freightPphAmount: 120000,
        freightNetPayable: 5880000,
        brokerFee: 0,
        grandNetPayable: 244680000,
        createdAt: '2026-02-10T08:00:00Z',
        updatedAt: '2026-02-10T08:00:00Z',
      },
    ];

    const today = new Date('2026-03-01T00:00:00Z');
    const summary = computeFulfillmentSummary(baseContract, [], receipts, overReceiving, today);

    assert.equal(summary.receivedVolumeM3, 60.0);
    assert.equal(summary.remainingVolumeM3, 0);
    assert.equal(summary.remainingPieces, 0);
    assert.equal(summary.status, 'FULFILLED');
  });

  await t.test('daysUntilExpiry, isNearExpiry, and isOverdue thresholds', () => {
    // End date is 2026-06-30.
    // 15 days before end date -> near expiry
    const nearDate = new Date('2026-06-15T00:00:00Z');
    const nearSummary = computeFulfillmentSummary(baseContract, [], receipts, [], nearDate);
    assert.equal(nearSummary.daysUntilExpiry, 15);
    assert.equal(nearSummary.isNearExpiry, true);
    assert.equal(nearSummary.isOverdue, false);

    // 1 day after end date -> overdue
    const overdueDate = new Date('2026-07-01T00:00:00Z');
    const overdueSummary = computeFulfillmentSummary(baseContract, [], receipts, [], overdueDate);
    assert.equal(overdueSummary.daysUntilExpiry, -1);
    assert.equal(overdueSummary.isNearExpiry, false);
    assert.equal(overdueSummary.isOverdue, true);
    assert.equal(overdueSummary.status, 'EXPIRED');

    // Exactly 0 days remaining (on end date) -> near expiry
    const endDate = new Date('2026-06-30T00:00:00Z');
    const endSummary = computeFulfillmentSummary(baseContract, [], receipts, [], endDate);
    assert.equal(endSummary.daysUntilExpiry, 0);
    assert.equal(endSummary.isNearExpiry, true);
    assert.equal(endSummary.isOverdue, false);
  });

  await t.test('deriveContractStatus transitions correctly', () => {
    // Fulfilled takes precedence over expired
    assert.equal(
      deriveContractStatus(baseContract, { remainingVolumeM3: 0, daysUntilExpiry: -5 }),
      'FULFILLED'
    );

    // Overdue with remaining stock -> EXPIRED
    assert.equal(
      deriveContractStatus(baseContract, { remainingVolumeM3: 10, daysUntilExpiry: -1 }),
      'EXPIRED'
    );

    // Active with remaining stock before expiry -> ACTIVE
    assert.equal(
      deriveContractStatus(baseContract, { remainingVolumeM3: 10, daysUntilExpiry: 20 }),
      'ACTIVE'
    );

    // DRAFT remains DRAFT
    const draftContract = { ...baseContract, status: 'DRAFT' as const };
    assert.equal(
      deriveContractStatus(draftContract, { remainingVolumeM3: 10, daysUntilExpiry: 20 }),
      'DRAFT'
    );

    // CANCELLED remains CANCELLED
    const cancelledContract = { ...baseContract, status: 'CANCELLED' as const };
    assert.equal(
      deriveContractStatus(cancelledContract, { remainingVolumeM3: 10, daysUntilExpiry: 20 }),
      'CANCELLED'
    );
  });
});
