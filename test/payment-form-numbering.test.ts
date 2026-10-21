import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateFormNumber } from '../src/utils/payment-form-number.ts';

test('Payment Form Numbering Generator Suite', async (t) => {
  await t.test('generates standard structured form number from week, supplier and species', () => {
    const num = generateFormNumber({
      weekStartDate: '2026-10-17',
      supplierName: 'PT Sumber Kayu Abadi',
      woodSpecies: 'Jati',
      sequence: 1,
    });
    // Format: PAY-YYYY-W<week>-<supplier>-<species>-<seq>
    assert.equal(num, 'PAY-2026-W42-PTS-JATI-01');
  });

  await t.test('prefers supplierCode over supplierName truncation when provided', () => {
    const num = generateFormNumber({
      weekStartDate: '2026-10-17',
      supplierName: 'PT Sumber Kayu Abadi',
      supplierCode: 'SPL08',
      woodSpecies: 'Mahoni',
      sequence: 3,
    });
    assert.equal(num, 'PAY-2026-W42-SPL08-MAHO-03');
  });

  await t.test('pads sequence number to at least 2 digits', () => {
    const num = generateFormNumber({
      weekStartDate: '2026-10-17',
      supplierName: 'CV Jati Murni',
      woodSpecies: 'Pinus',
      sequence: 9,
    });
    assert.match(num, /-09$/);

    const num12 = generateFormNumber({
      weekStartDate: '2026-10-17',
      supplierName: 'CV Jati Murni',
      woodSpecies: 'Pinus',
      sequence: 12,
    });
    assert.match(num12, /-12$/);
  });

  await t.test('sanitizes special characters and spaces from names', () => {
    const num = generateFormNumber({
      weekStartDate: '2026-10-17',
      supplierName: '  KUD "Rimba & Makmur"  ',
      woodSpecies: 'Akasia Mangium',
      sequence: 1,
    });
    // Supplier: KUD, Species: AKAS
    assert.equal(num, 'PAY-2026-W42-KUD-AKAS-01');
  });
});
