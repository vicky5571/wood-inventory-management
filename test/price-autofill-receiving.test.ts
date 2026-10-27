/**
 * test/price-autofill-receiving.test.ts
 *
 * Unit tests untuk lookupPriceForRecord — engine auto-fill harga
 * saat input penerimaan kayu.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lookupPriceForRecord } from '../src/utils/price-lookup.ts';
import type { TimberPriceEntry, WoodReceivingRecord } from '../src/types/index.ts';

function makeRecord(overrides: Partial<WoodReceivingRecord> = {}): WoodReceivingRecord {
  return {
    id: 'rec-test-1',
    receiptDate: '2026-10-15',
    truckPlateNumber: 'B 1234 AB',
    forestryDocNumber: 'DKP-001',
    receiptNumber: 'KW-001',
    contractNumber: '',
    supplierName: 'PT Rimba Jaya',
    woodSpecies: 'Jati',
    woodLengthM: 4.0,
    kavlingNumber: 'KAV-01',
    storageYard: 'TPK-Timur',
    deliveredPieces: 10, deliveredVolumeM3: 5.0,
    tallyPieces: 10, tallyVolumeM3: 5.0,
    timberPricePerM3: null, timberPphRate: 0.5,
    timberGrossTotal: null, timberPphAmount: null, timberNetPayable: null,
    freightRatePerM3: 0, freightGrossTotal: 0, freightPphAmount: 0, freightNetPayable: 0,
    brokerFee: 0, grandNetPayable: 0,
    paymentStatus: 'UNPAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeEntry(overrides: Partial<TimberPriceEntry> = {}): TimberPriceEntry {
  return {
    id: 'tpe-test-1',
    tenantId: 'default-tenant',
    speciesId: 'SPC-JATI',
    woodSpecies: 'Jati',
    effectiveFrom: '2026-01-01',
    pricePerM3: 4_500_000,
    timberPphRate: 0.5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

test('lookupPriceForRecord: global match ditemukan saat species cocok', () => {
  const result = lookupPriceForRecord(makeRecord(), [makeEntry()]);
  assert.equal(result.matched, true);
  if (result.matched) {
    assert.equal(result.entry.pricePerM3, 4_500_000);
    assert.equal(result.entry.timberPphRate, 0.5);
  }
});

test('lookupPriceForRecord: supplier-specific lebih prioritas dari global', () => {
  const global = makeEntry({ id: 'tpe-global', pricePerM3: 4_500_000 });
  const specific = makeEntry({
    id: 'tpe-specific',
    supplierName: 'PT Rimba Jaya',
    pricePerM3: 4_800_000,
    effectiveFrom: '2026-07-01',
  });
  const result = lookupPriceForRecord(makeRecord(), [global, specific]);
  assert.equal(result.matched, true);
  if (result.matched) {
    assert.equal(result.entry.pricePerM3, 4_800_000);
    assert.equal(result.entry.id, 'tpe-specific');
  }
});

test('lookupPriceForRecord: tidak match jika species berbeda', () => {
  const entry = makeEntry({ woodSpecies: 'Meranti' });
  const result = lookupPriceForRecord(makeRecord({ woodSpecies: 'Jati' }), [entry]);
  assert.equal(result.matched, false);
});

test('lookupPriceForRecord: tidak match jika receiptDate sebelum effectiveFrom', () => {
  const entry = makeEntry({ effectiveFrom: '2026-11-01' });
  const result = lookupPriceForRecord(makeRecord({ receiptDate: '2026-10-15' }), [entry]);
  assert.equal(result.matched, false);
});

test('lookupPriceForRecord: tidak match jika receiptDate setelah effectiveTo', () => {
  const entry = makeEntry({ effectiveFrom: '2026-01-01', effectiveTo: '2026-09-30' });
  const result = lookupPriceForRecord(makeRecord({ receiptDate: '2026-10-15' }), [entry]);
  assert.equal(result.matched, false);
});

test('lookupPriceForRecord: open-ended tanpa effectiveTo tetap match', () => {
  const entry = makeEntry({ effectiveFrom: '2026-01-01', effectiveTo: undefined });
  const result = lookupPriceForRecord(makeRecord({ receiptDate: '2026-12-31' }), [entry]);
  assert.equal(result.matched, true);
});

test('lookupPriceForRecord: entries kosong menghasilkan not matched', () => {
  const result = lookupPriceForRecord(makeRecord(), []);
  assert.equal(result.matched, false);
});
