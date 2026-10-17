import test from 'node:test';
import assert from 'node:assert/strict';
import { computeManifestCalculations } from '../src/utils/timber-calc.ts';
import type { ManifestFormInput } from '../src/types/index.ts';

test('Manifest Multi-Item Calculations Suite', async (t) => {
  const sampleManifest: ManifestFormInput = {
    id: 'man-test-1',
    receiptDate: '2026-10-18',
    truckPlateNumber: 'B 9283 TDA',
    forestryDocNumber: 'SKSHHK-2026-001',
    receiptNumber: 'KW-101',
    contractNumber: 'CTR-01',
    supplierName: 'PT Wana Lestari',
    freightRatePerM3: 200000,
    brokerFee: 500000,
    items: [
      {
        id: 'item-1',
        woodSpecies: 'Teak / Jati (柚木)',
        woodLengthM: 4.0,
        kavlingNumber: 'KAV-01',
        storageYard: 'TPK-1',
        deliveredPieces: 50,
        deliveredVolumeM3: 10.0,
        tallyPieces: 50,
        tallyVolumeM3: 10.0,
        timberPricePerM3: 4000000,
        timberPphRate: 0.5,
      },
      {
        id: 'item-2',
        woodSpecies: 'Mahoni (桃花心木)',
        woodLengthM: 3.0,
        kavlingNumber: 'KAV-02',
        storageYard: 'TPK-1',
        deliveredPieces: 30,
        deliveredVolumeM3: 5.0,
        tallyPieces: 30,
        tallyVolumeM3: 5.0,
        timberPricePerM3: 2000000,
        timberPphRate: 0.5,
      },
    ],
  };

  await t.test('aggregates delivered and tally volume across all items', () => {
    const result = computeManifestCalculations(sampleManifest);
    assert.strictEqual(result.totalDeliveredPieces, 80);
    assert.strictEqual(result.totalDeliveredVolumeM3, 15.0);
    assert.strictEqual(result.totalTallyPieces, 80);
    assert.strictEqual(result.totalTallyVolumeM3, 15.0);
    assert.strictEqual(result.volumeDiscrepancyM3, 0);
  });

  await t.test('calculates individual line financials accurately', () => {
    const result = computeManifestCalculations(sampleManifest);
    assert.strictEqual(result.items.length, 2);

    // Item 1: 10 m³ * 4,000,000 = 40,000,000; PPh = 200,000; Net = 39,800,000
    assert.strictEqual(result.items[0].timberGrossTotal, 40000000);
    assert.strictEqual(result.items[0].timberPphAmount, 200000);
    assert.strictEqual(result.items[0].timberNetPayable, 39800000);

    // Item 2: 5 m³ * 2,000,000 = 10,000,000; PPh = 50,000; Net = 9,950,000
    assert.strictEqual(result.items[1].timberGrossTotal, 10000000);
    assert.strictEqual(result.items[1].timberPphAmount, 50000);
    assert.strictEqual(result.items[1].timberNetPayable, 9950000);
  });

  await t.test('computes truck freight on aggregated tally volume and grand net payable', () => {
    const result = computeManifestCalculations(sampleManifest);
    // Freight: 15 m³ * 200,000 = 3,000,000; PPh 2% = 60,000; Net Freight = 2,940,000
    assert.strictEqual(result.freightGrossTotal, 3000000);
    assert.strictEqual(result.freightPphAmount, 60000);
    assert.strictEqual(result.freightNetPayable, 2940000);

    // Grand Net = 39,800,000 + 9,950,000 + 2,940,000 + 500,000 = 53,190,000
    assert.strictEqual(result.grandNetPayable, 53190000);
  });
});
