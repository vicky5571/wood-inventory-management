/**
 * test/payment-form-totals-footer.test.ts
 *
 * Unit tests untuk computeFormTotals yang menjadi sumber kebenaran
 * PaymentFormTotalsFooter saat form berstatus DRAFT.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeFormTotals } from '../src/utils/payment-form-grouping.ts';
import type { PaymentFormLineItem } from '../src/types/index.ts';

function makeLine(overrides: Partial<PaymentFormLineItem> = {}): PaymentFormLineItem {
  return {
    id: 'line-test-1',
    paymentFormId: 'pay-test',
    itemSequence: 1,
    kategori: 'Pembelian Kayu',
    konten: 'DKP-001 - Jati',
    tujuan: 'PT Rimba Jaya',
    hargaSatuanIDR: 3_000_000,
    jumlah: 5.0,
    unit: 'm³',
    totalIDR: 14_962_500,
    tallyPieces: 10,
    tallyVolumeM3: 5.0,
    timberGrossIDR: 15_000_000,
    timberPphIDR: 37_500,
    timberNetIDR: 14_962_500,
    ...overrides,
  };
}

test('computeFormTotals: lines kosong menghasilkan semua 0', () => {
  const result = computeFormTotals([]);
  assert.equal(result.totalAmountIDR, 0);
  assert.equal(result.totalTallyVolumeM3, 0);
  assert.equal(result.totalTallyPieces, 0);
  assert.equal(result.totalTimberGrossIDR, 0);
  assert.equal(result.totalTimberPphIDR, 0);
  assert.equal(result.totalTimberNetIDR, 0);
});

test('computeFormTotals: satu baris m3 menghitung agregat dengan benar', () => {
  const result = computeFormTotals([makeLine()]);
  assert.equal(result.totalTallyVolumeM3, 5.0);
  assert.equal(result.totalTallyPieces, 10);
  assert.equal(result.totalTimberGrossIDR, 15_000_000);
  assert.equal(result.totalTimberPphIDR, 37_500);
  assert.equal(result.totalTimberNetIDR, 14_962_500);
  assert.equal(result.totalAmountIDR, 14_962_500);
});

test('computeFormTotals: dua baris dijumlahkan dengan benar', () => {
  const line1 = makeLine({ id: 'line-1' });
  const line2 = makeLine({
    id: 'line-2',
    itemSequence: 2,
    jumlah: 3.0,
    totalIDR: 8_977_500,
    tallyPieces: 6,
    tallyVolumeM3: 3.0,
    timberGrossIDR: 9_000_000,
    timberPphIDR: 22_500,
    timberNetIDR: 8_977_500,
  });
  const result = computeFormTotals([line1, line2]);
  assert.equal(result.totalTallyVolumeM3, 8.0);
  assert.equal(result.totalTallyPieces, 16);
  assert.equal(result.totalTimberGrossIDR, 24_000_000);
  assert.equal(result.totalTimberPphIDR, 60_000);
  assert.equal(result.totalTimberNetIDR, 23_940_000);
});

test('computeFormTotals: baris unit batang tidak masuk totalTallyVolumeM3', () => {
  const line = makeLine({ unit: 'batang', jumlah: 10, tallyVolumeM3: undefined });
  const result = computeFormTotals([line]);
  assert.equal(result.totalTallyVolumeM3, 0);
});
