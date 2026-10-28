/**
 * test/seed-fixtures.test.ts
 *
 * Test suite for the unified seed fixtures module.
 * Verifies relational FK consistency, date boundaries, entity counts,
 * and mutation detection.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as fixtures from '../src/persistence/seed/fixtures.ts';

describe('Seed Fixtures Validation', () => {
  it('validates default seed fixtures with zero errors', () => {
    const result = fixtures.validateFixtureConsistency();
    assert.deepEqual(result.errors, [], `Expected 0 errors, got: ${result.errors.join('; ')}`);
    assert.equal(result.ok, true);
  });

  it('matches entity counts defined in spec Section 2.2', () => {
    assert.equal(fixtures.SEED_TENANTS.length, 1, 'Tenants count');
    assert.ok(fixtures.SEED_SETTINGS, 'Settings exists');
    assert.equal(fixtures.SEED_SPECIES.length, 8, 'WoodSpecies count');
    assert.equal(fixtures.SEED_YARDS.length, 3, 'StorageYard count');
    assert.equal(fixtures.SEED_LOTS.length, 15, 'StorageLot count');
    assert.equal(fixtures.SEED_SUPPLIERS.length, 7, 'Supplier count');
    assert.equal(fixtures.SEED_BROKERS.length, 5, 'Broker count');
    assert.equal(fixtures.SEED_CONTRACTS.length, 4, 'PerhutaniContract count');
    assert.equal(fixtures.SEED_SORTIMENT_ITEMS.length, 10, 'Sortiment items count');
    assert.equal(fixtures.SEED_CONTRACT_RECEIPTS.length, 6, 'ContractReceipt count');
    assert.equal(fixtures.SEED_MANIFESTS.length, 10, 'ReceivingManifest count');
    assert.equal(fixtures.SEED_RECEIVING_ITEMS.length, 18, 'ReceivingItem count');
    assert.equal(fixtures.SEED_WOOD_RECORDS.length, 10, 'WoodReceivingRecord backward-compat count');
    assert.equal(fixtures.SEED_SALES.length, 10, 'WoodSalesRecord count');
    assert.equal(fixtures.SEED_PRODUCTION.length, 8, 'SawmillProductionRecord count');
    assert.equal(fixtures.SEED_SORTING.length, 5, 'StockSortingRecord count');
    assert.equal(fixtures.SEED_PAYMENT_FORMS.length, 6, 'PaymentForm count');
    assert.equal(fixtures.SEED_PAYMENT_FORM_LINES.length, 15, 'PaymentFormLineItem count');
    assert.equal(fixtures.SEED_REPORT_PERIODS.length, 3, 'ReportPeriod count');
  });

  it('preserves backward-compatible aliases', () => {
    assert.equal(fixtures.SEED_PERHUTANI_CONTRACTS, fixtures.SEED_CONTRACTS);
    assert.equal(fixtures.SEED_CONTRACT_ITEMS, fixtures.SEED_SORTIMENT_ITEMS);
    assert.equal(fixtures.SEED_WOOD_SALES, fixtures.SEED_SALES);
  });

  it('catches unknown supplierId FK mutation in manifests', () => {
    const mutatedManifests = [
      ...fixtures.SEED_MANIFESTS.slice(0, 1),
      {
        ...fixtures.SEED_MANIFESTS[0],
        id: 'MFT-MUTATED',
        supplierId: 'SPL-NON-EXISTENT',
      },
    ];

    const result = fixtures.validateFixtureConsistency({
      tenants: fixtures.SEED_TENANTS,
      yards: fixtures.SEED_YARDS,
      lots: fixtures.SEED_LOTS,
      species: fixtures.SEED_SPECIES,
      suppliers: fixtures.SEED_SUPPLIERS,
      brokers: fixtures.SEED_BROKERS,
      contracts: fixtures.SEED_CONTRACTS,
      sortimentItems: fixtures.SEED_SORTIMENT_ITEMS,
      contractReceipts: fixtures.SEED_CONTRACT_RECEIPTS,
      manifests: mutatedManifests,
      receivingItems: fixtures.SEED_RECEIVING_ITEMS,
      sales: fixtures.SEED_SALES,
      production: fixtures.SEED_PRODUCTION,
      sorting: fixtures.SEED_SORTING,
      paymentForms: fixtures.SEED_PAYMENT_FORMS,
      paymentFormLines: fixtures.SEED_PAYMENT_FORM_LINES,
    });

    assert.equal(result.ok, false);
    assert.ok(
      result.errors.some((e) => e.includes("references unknown supplierId 'SPL-NON-EXISTENT'")),
      `Expected unknown supplierId error, got: ${result.errors.join('; ')}`
    );
  });

  it('catches out-of-range date mutation in contracts', () => {
    const mutatedContracts = [
      ...fixtures.SEED_CONTRACTS.slice(1),
      {
        ...fixtures.SEED_CONTRACTS[0],
        contractDate: '2025-01-01', // Before SEED_DATE_RANGE_START
      },
    ];

    const result = fixtures.validateFixtureConsistency({
      tenants: fixtures.SEED_TENANTS,
      yards: fixtures.SEED_YARDS,
      lots: fixtures.SEED_LOTS,
      species: fixtures.SEED_SPECIES,
      suppliers: fixtures.SEED_SUPPLIERS,
      brokers: fixtures.SEED_BROKERS,
      contracts: mutatedContracts,
      sortimentItems: fixtures.SEED_SORTIMENT_ITEMS,
      contractReceipts: fixtures.SEED_CONTRACT_RECEIPTS,
      manifests: fixtures.SEED_MANIFESTS,
      receivingItems: fixtures.SEED_RECEIVING_ITEMS,
      sales: fixtures.SEED_SALES,
      production: fixtures.SEED_PRODUCTION,
      sorting: fixtures.SEED_SORTING,
      paymentForms: fixtures.SEED_PAYMENT_FORMS,
      paymentFormLines: fixtures.SEED_PAYMENT_FORM_LINES,
    });

    assert.equal(result.ok, false);
    assert.ok(
      result.errors.some((e) => e.includes('outside allowed range')),
      `Expected date range error, got: ${result.errors.join('; ')}`
    );
  });

  it('catches negative volume mutation in sortiment items', () => {
    const mutatedSortiment = [
      ...fixtures.SEED_SORTIMENT_ITEMS.slice(1),
      {
        ...fixtures.SEED_SORTIMENT_ITEMS[0],
        volumeM3: -5.0,
      },
    ];

    const result = fixtures.validateFixtureConsistency({
      tenants: fixtures.SEED_TENANTS,
      yards: fixtures.SEED_YARDS,
      lots: fixtures.SEED_LOTS,
      species: fixtures.SEED_SPECIES,
      suppliers: fixtures.SEED_SUPPLIERS,
      brokers: fixtures.SEED_BROKERS,
      contracts: fixtures.SEED_CONTRACTS,
      sortimentItems: mutatedSortiment,
      contractReceipts: fixtures.SEED_CONTRACT_RECEIPTS,
      manifests: fixtures.SEED_MANIFESTS,
      receivingItems: fixtures.SEED_RECEIVING_ITEMS,
      sales: fixtures.SEED_SALES,
      production: fixtures.SEED_PRODUCTION,
      sorting: fixtures.SEED_SORTING,
      paymentForms: fixtures.SEED_PAYMENT_FORMS,
      paymentFormLines: fixtures.SEED_PAYMENT_FORM_LINES,
    });

    assert.equal(result.ok, false);
    assert.ok(
      result.errors.some((e) => e.includes('negative volumeM3')),
      `Expected negative volume error, got: ${result.errors.join('; ')}`
    );
  });
});
