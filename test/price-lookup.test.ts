import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { lookupPriceForRecord, batchLookupPrices } from '../src/utils/price-lookup.ts';
import type { TimberPriceEntry, WoodReceivingRecord } from '../src/types/index.ts';

describe('Price Lookup Utility Suite', () => {
  const baseRecord: WoodReceivingRecord = {
    id: 'REC-001',
    tenantId: 'default-tenant',
    receiptDate: '2026-03-15',
    docDate: '2026-03-14',
    truckPlateNumber: 'B 1234 CD',
    forestryDocNumber: 'DOC-01',
    receiptNumber: 'KW-01',
    contractNumber: 'CTR-01',
    supplierName: 'PT. Kayu Abadi',
    woodSpecies: 'Jati Log',
    woodLengthM: 4.0,
    kavlingNumber: 'KAV-A1',
    storageYard: 'TPK-01',
    deliveredPieces: 10,
    deliveredVolumeM3: 5.0,
    tallyPieces: 10,
    tallyVolumeM3: 5.0,
    timberPricePerM3: null,
    timberGrossTotal: null,
    timberPphRate: 0.5,
    timberPphAmount: null,
    timberNetPayable: null,
    freightRatePerM3: 100000,
    freightGrossTotal: 500000,
    freightPphAmount: 10000,
    freightNetPayable: 490000,
    brokerFee: 50000,
    grandNetPayable: null,
    createdAt: '2026-03-15T00:00:00Z',
    updatedAt: '2026-03-15T00:00:00Z',
  };

  const sampleEntries: TimberPriceEntry[] = [
    {
      id: 'tpe-jati-global-old',
      tenantId: 'default-tenant',
      speciesId: 'spc-jati',
      woodSpecies: 'Jati Log',
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-02-28',
      pricePerM3: 3000000,
      timberPphRate: 0.5,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'tpe-jati-global-current',
      tenantId: 'default-tenant',
      speciesId: 'spc-jati',
      woodSpecies: 'Jati Log',
      effectiveFrom: '2026-03-01',
      effectiveTo: undefined,
      pricePerM3: 3500000,
      timberPphRate: 0.5,
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-03-01T00:00:00Z',
    },
    {
      id: 'tpe-jati-supplier-specific',
      tenantId: 'default-tenant',
      speciesId: 'spc-jati',
      woodSpecies: 'Jati Log',
      supplierName: 'PT. Kayu Abadi',
      effectiveFrom: '2026-03-01',
      effectiveTo: undefined,
      pricePerM3: 3800000,
      timberPphRate: 0.5,
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-03-01T00:00:00Z',
    },
    {
      id: 'tpe-merbau-global',
      tenantId: 'default-tenant',
      speciesId: 'spc-merbau',
      woodSpecies: 'Merbau',
      effectiveFrom: '2026-01-01',
      effectiveTo: undefined,
      pricePerM3: 4500000,
      timberPphRate: 0.5,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  it('matches supplier-specific entry over global entry when available', () => {
    const res = lookupPriceForRecord(baseRecord, sampleEntries);
    assert.equal(res.matched, true);
    if (res.matched) {
      assert.equal(res.entry.id, 'tpe-jati-supplier-specific');
      assert.equal(res.entry.pricePerM3, 3800000);
    }
  });

  it('falls back to global entry when record has a different supplier', () => {
    const otherSupplierRecord: WoodReceivingRecord = {
      ...baseRecord,
      supplierName: 'CV. Rimba Makmur',
    };
    const res = lookupPriceForRecord(otherSupplierRecord, sampleEntries);
    assert.equal(res.matched, true);
    if (res.matched) {
      assert.equal(res.entry.id, 'tpe-jati-global-current');
      assert.equal(res.entry.pricePerM3, 3500000);
    }
  });

  it('respects date boundaries (does not match expired price)', () => {
    const oldRecord: WoodReceivingRecord = {
      ...baseRecord,
      supplierName: 'CV. Rimba Makmur',
      receiptDate: '2026-02-15',
    };
    const res = lookupPriceForRecord(oldRecord, sampleEntries);
    assert.equal(res.matched, true);
    if (res.matched) {
      assert.equal(res.entry.id, 'tpe-jati-global-old');
      assert.equal(res.entry.pricePerM3, 3000000);
    }
  });

  it('matches via speciesId even when display woodSpecies differs slightly', () => {
    const recordWithSpeciesId = {
      ...baseRecord,
      woodSpecies: 'Jati Merah Super', // string differs
      speciesId: 'spc-jati',          // ID matches
      supplierName: 'CV. Other Supplier',
    };
    const res = lookupPriceForRecord(recordWithSpeciesId as unknown as WoodReceivingRecord, sampleEntries);
    assert.equal(res.matched, true);
    if (res.matched) {
      assert.equal(res.entry.id, 'tpe-jati-global-current');
      assert.equal(res.entry.speciesId, 'spc-jati');
    }
  });

  it('returns matched=false when species has no active price entry', () => {
    const sonokelingRecord: WoodReceivingRecord = {
      ...baseRecord,
      woodSpecies: 'Sonokeling',
    };
    const res = lookupPriceForRecord(sonokelingRecord, sampleEntries);
    assert.equal(res.matched, false);
    if (!res.matched) {
      assert.match(res.reason, /Sonokeling/);
    }
  });

  it('batchLookupPrices categorizes records into ready and pending lists', () => {
    const records: WoodReceivingRecord[] = [
      baseRecord,
      {
        ...baseRecord,
        id: 'REC-002',
        woodSpecies: 'Merbau',
      },
      {
        ...baseRecord,
        id: 'REC-003',
        woodSpecies: 'Mahoni',
      },
    ];

    const result = batchLookupPrices(records, sampleEntries);
    assert.equal(result.ready.length, 2);
    assert.equal(result.pending.length, 1);
    assert.equal(result.pending[0].record.id, 'REC-003');
    assert.match(result.pending[0].reason, /Mahoni/);
  });

  it('batchLookupPrices skips already-locked records with non-null price', () => {
    const records: WoodReceivingRecord[] = [
      {
        ...baseRecord,
        id: 'REC-LOCKED',
        timberPricePerM3: 4000000,
        isLocked: true,
      },
    ];
    const result = batchLookupPrices(records, sampleEntries);
    assert.equal(result.ready.length, 0);
    assert.equal(result.pending.length, 0);
  });

  it('matches by speciesId even if woodSpecies string differs', () => {
    const recordWithFk: WoodReceivingRecord = {
      ...baseRecord,
      speciesId: 'spc-merbau',
      woodSpecies: 'Merbau Papua Super',
    };
    const res = lookupPriceForRecord(recordWithFk, sampleEntries);
    assert.equal(res.matched, true);
    if (res.matched) {
      assert.equal(res.entry.id, 'tpe-merbau-global');
      assert.equal(res.entry.pricePerM3, 4500000);
    }
  });
});


