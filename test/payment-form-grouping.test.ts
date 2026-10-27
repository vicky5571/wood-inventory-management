import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  groupRecordsForPayment,
  computeFormTotals,
  buildGroupingKey,
} from '../src/utils/payment-form-grouping.ts';
import type { WoodReceivingRecord, PaymentForm } from '../src/types/index.ts';

function createMockRecord(overrides: Partial<WoodReceivingRecord> = {}): WoodReceivingRecord {
  return {
    id: `rec-${Math.random().toString(36).slice(2, 8)}`,
    receiptDate: '2026-10-18', // Sunday within week 2026-10-17 to 2026-10-23
    truckPlateNumber: 'B 1234 CD',
    forestryDocNumber: 'DKP-001',
    receiptNumber: 'KW-001',
    contractNumber: 'CTR-001',
    supplierName: 'PT Rimba Jaya',
    woodSpecies: 'Jati',
    woodLengthM: 4.0,
    kavlingNumber: 'KAV-01',
    storageYard: 'TPK-Timur',
    deliveredPieces: 10,
    deliveredVolumeM3: 5.0,
    tallyPieces: 10,
    tallyVolumeM3: 5.0,
    timberPricePerM3: 3000000,
    timberGrossTotal: 15000000,
    timberPphRate: 0.25,
    timberPphAmount: 37500,
    timberNetPayable: 14962500,
    freightRatePerM3: 150000,
    freightGrossTotal: 750000,
    freightPphAmount: 15000,
    freightNetPayable: 735000,
    brokerFee: 0,
    grandNetPayable: 15697500,
    paymentStatus: 'UNPAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

test('Payment Form Grouping Engine Suite', async (t) => {
  const weekStart = '2026-10-17';
  const weekEnd = '2026-10-23';

  await t.test('empty records array produces empty groups and zero skipped', () => {
    const res = groupRecordsForPayment([], [], weekStart, weekEnd, []);
    assert.equal(res.groups.size, 0);
    assert.equal(res.skipped.length, 0);
  });

  await t.test('single eligible record creates single group', () => {
    const rec = createMockRecord();
    const res = groupRecordsForPayment([rec], [], weekStart, weekEnd, []);
    assert.equal(res.groups.size, 1);
    assert.equal(res.skipped.length, 0);

    const group = Array.from(res.groups.values())[0];
    assert.equal(group.supplierName, 'PT Rimba Jaya');
    assert.equal(group.woodSpecies, 'Jati');
    assert.equal(group.contractNumber, 'CTR-001');
    assert.equal(group.lines.length, 1);
    assert.equal(group.lines[0].recordId, rec.id);
  });

  await t.test('multiple records with identical supplier, species, and contract merge into same group', () => {
    const rec1 = createMockRecord({ id: 'rec-1', tallyVolumeM3: 4.0, tallyPieces: 8 });
    const rec2 = createMockRecord({ id: 'rec-2', tallyVolumeM3: 6.0, tallyPieces: 12 });
    const res = groupRecordsForPayment([rec1, rec2], [], weekStart, weekEnd, []);

    assert.equal(res.groups.size, 1);
    const group = Array.from(res.groups.values())[0];
    assert.equal(group.lines.length, 2);
    assert.deepEqual(group.recordIds, ['rec-1', 'rec-2']);
  });

  await t.test('records with different wood species split into separate groups', () => {
    const rec1 = createMockRecord({ id: 'rec-1', woodSpecies: 'Jati' });
    const rec2 = createMockRecord({ id: 'rec-2', woodSpecies: 'Mahoni' });
    const res = groupRecordsForPayment([rec1, rec2], [], weekStart, weekEnd, []);

    assert.equal(res.groups.size, 2);
  });

  await t.test('records with different contract numbers split into separate groups', () => {
    const rec1 = createMockRecord({ id: 'rec-1', contractNumber: 'CTR-A' });
    const rec2 = createMockRecord({ id: 'rec-2', contractNumber: 'CTR-B' });
    const res = groupRecordsForPayment([rec1, rec2], [], weekStart, weekEnd, []);

    assert.equal(res.groups.size, 2);
  });

  await t.test('buildGroupingKey prefers contractId over contractNumber string', () => {
    const keyWithId = buildGroupingKey('PT Rimba', 'Jati', 'CTR-001', 'ctr-id-123');
    assert.equal(keyWithId, 'pt rimba||jati||id:ctr-id-123');

    const keyWithoutId = buildGroupingKey('PT Rimba', 'Jati', 'CTR-001');
    assert.equal(keyWithoutId, 'pt rimba||jati||ctr-001');

    // Records with same contractId merge even if contractNumber string casing differs
    const rec1 = createMockRecord({ id: 'rec-1', contractNumber: 'CTR-001', contractId: 'ctr-uuid-1' });
    const rec2 = createMockRecord({ id: 'rec-2', contractNumber: 'ctr-001-diff', contractId: 'ctr-uuid-1' });
    const res = groupRecordsForPayment([rec1, rec2], [], weekStart, weekEnd, []);
    assert.equal(res.groups.size, 1);
  });

  await t.test('records with pending price (null) are skipped with PENDING_PRICE reason', () => {
    const recPriced = createMockRecord({ id: 'rec-priced', timberPricePerM3: 2500000 });
    const recPending = createMockRecord({ id: 'rec-pending', timberPricePerM3: null });
    const res = groupRecordsForPayment([recPriced, recPending], [], weekStart, weekEnd, []);

    assert.equal(res.groups.size, 1);
    assert.equal(res.skipped.length, 1);
    assert.equal(res.skipped[0].recordId, 'rec-pending');
    assert.equal(res.skipped[0].reason, 'PENDING_PRICE');
  });

  await t.test('records outside week window are skipped with OUT_OF_WINDOW reason', () => {
    const recIn = createMockRecord({ id: 'rec-in', receiptDate: '2026-10-18' });
    const recOut = createMockRecord({ id: 'rec-out', receiptDate: '2026-10-25' });
    const res = groupRecordsForPayment([recIn, recOut], [], weekStart, weekEnd, []);

    assert.equal(res.groups.size, 1);
    assert.equal(res.skipped.length, 1);
    assert.equal(res.skipped[0].recordId, 'rec-out');
    assert.equal(res.skipped[0].reason, 'OUT_OF_WINDOW');
  });

  await t.test('records already in ISSUED or PAID form are skipped with ALREADY_IN_LOCKED_FORM', () => {
    const lockedForm: PaymentForm = {
      id: 'form-locked',
      tenantId: 'tenant-1',
      formNumber: 'PAY-2026-W42-PTA-JATI-01',
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      supplierName: 'PT Rimba Jaya',
      supplierId: 'SPL-001',
      woodSpecies: 'Jati',
      contractNumber: 'CTR-001',
      recordIds: ['rec-locked'],
      itemIds: [],
      totalTallyVolumeM3: 5.0,
      totalTallyPieces: 10,
      totalTimberGrossIDR: 15000000,
      totalTimberPphIDR: 37500,
      totalTimberNetIDR: 14962500,
      status: 'ISSUED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const recLocked = createMockRecord({ id: 'rec-locked', paymentFormId: 'form-locked' });
    const recAvailable = createMockRecord({ id: 'rec-free' });

    const res = groupRecordsForPayment([recLocked, recAvailable], [], weekStart, weekEnd, [lockedForm]);
    assert.equal(res.groups.size, 1);
    assert.equal(res.skipped.length, 1);
    assert.equal(res.skipped[0].recordId, 'rec-locked');
    assert.equal(res.skipped[0].reason, 'ALREADY_IN_LOCKED_FORM');
    assert.equal(res.skipped[0].lockedFormNumber, 'PAY-2026-W42-PTA-JATI-01');
  });

  await t.test('computeFormTotals computes accurate financial and volumetric aggregations', () => {
    const rec1 = createMockRecord({ tallyVolumeM3: 5.0, tallyPieces: 10, timberPricePerM3: 2000000, timberPphRate: 0.25 });
    const rec2 = createMockRecord({ tallyVolumeM3: 3.5, tallyPieces: 7, timberPricePerM3: 2000000, timberPphRate: 0.25 });
    const res = groupRecordsForPayment([rec1, rec2], [], weekStart, weekEnd, []);

    const group = Array.from(res.groups.values())[0];
    const totals = computeFormTotals(group.lines);

    assert.equal(totals.totalTallyVolumeM3, 8.5);
    assert.equal(totals.totalTallyPieces, 17);
    assert.equal(totals.totalTimberGrossIDR, 17000000);
    assert.equal(totals.totalTimberPphIDR, 42500);
    assert.equal(totals.totalTimberNetIDR, 16957500);
    assert.equal(totals.totalAmountIDR, 16957500);
    assert.equal(totals.terbilang, 'ENAM BELAS JUTA SEMBILAN RATUS LIMA PULUH TUJUH RIBU LIMA RATUS RUPIAH');

    const firstLine = group.lines[0];
    assert.equal(firstLine.kategori, 'Pembelian Kayu');
    assert.equal(firstLine.konten, 'DKP-001 - Jati');
    assert.equal(firstLine.tujuan, 'PT Rimba Jaya');
    assert.equal(firstLine.hargaSatuanIDR, 2000000);
    assert.equal(firstLine.jumlah, 5.0);
    assert.equal(firstLine.unit, 'm³');
    assert.equal(firstLine.totalIDR, 9975000);
  });
});
