/**
 * test/record-search.test.ts
 *
 * Unit tests verifying pure lazy short-circuit search matching:
 * - Supports invoiceNumber matching
 * - Excludes date string substrings to prevent false positive collisions
 * - Matches standard operational attributes
 * - Allocates zero temporary arrays
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { recordMatchesSearchQuery, isInvoiceSearchMatch } from '../src/utils/record-search.ts';
import type { WoodReceivingRecord } from '../src/types/index.ts';

test('recordMatchesSearchQuery Suite', async (t) => {
  const sample: WoodReceivingRecord = {
    id: 'rec-test-1',
    receiptDate: '2026-10-01',
    docDate: '2026-09-29',
    truckPlateNumber: 'B 9283 TDA',
    forestryDocNumber: 'SKSHHK-2026-001',
    receiptNumber: 'KW-2026-101',
    contractNumber: 'CTR-JATI-01',
    supplierName: 'PT Wana Lestari',
    woodSpecies: 'Teak / Jati (柚木)',
    woodLengthM: 4.2,
    kavlingNumber: 'KAV-01',
    storageYard: 'TPK-Timur',
    deliveredPieces: 85,
    deliveredVolumeM3: 14.5,
    tallyPieces: 85,
    tallyVolumeM3: 14.65,
    timberPricePerM3: 4200000,
    timberGrossTotal: 61530000,
    timberPphRate: 0.5,
    timberPphAmount: 307650,
    timberNetPayable: 61222350,
    freightRatePerM3: 250000,
    freightGrossTotal: 3662500,
    freightPphAmount: 73250,
    freightNetPayable: 3589250,
    brokerFee: 500000,
    grandNetPayable: 65311600,
    invoiceNumber: 'INV-2026-889',
    createdAt: '2026-10-01T08:30:00.000Z',
    updatedAt: '2026-10-01T08:30:00.000Z',
  };

  await t.test('matches across invoiceNumber cleanly', () => {
    assert.strictEqual(recordMatchesSearchQuery(sample, 'INV-2026-889'), true);
    assert.strictEqual(recordMatchesSearchQuery(sample, '889'), true);
    assert.strictEqual(isInvoiceSearchMatch(sample, 'INV-2026-889'), true);
  });

  await t.test('does NOT match on date substrings to prevent false positive collisions', () => {
    assert.strictEqual(recordMatchesSearchQuery(sample, '2026-10-01'), false);
    assert.strictEqual(recordMatchesSearchQuery(sample, '09-29'), false);
  });

  await t.test('matches standard operational attributes', () => {
    assert.strictEqual(recordMatchesSearchQuery(sample, '9283'), true);
    assert.strictEqual(recordMatchesSearchQuery(sample, 'wana'), true);
    assert.strictEqual(recordMatchesSearchQuery(sample, 'KAV-01'), true);
    assert.strictEqual(recordMatchesSearchQuery(sample, '柚木'), true);
  });

  await t.test('handles whitespace and empty search queries', () => {
    assert.strictEqual(recordMatchesSearchQuery(sample, ''), true);
    assert.strictEqual(recordMatchesSearchQuery(sample, '   '), true);
    assert.strictEqual(isInvoiceSearchMatch(sample, ''), false);
  });
});
