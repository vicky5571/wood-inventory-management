import test from 'node:test';
import assert from 'node:assert/strict';
import type { RecordFilterCriteria, WoodReceivingRecord } from '../src/types/index.ts';
import { SEED_WOOD_RECORDS } from '../src/persistence/seed-data.ts';

import { recordMatchesSearchQuery } from '../src/utils/record-search.ts';

/**
 * Filter helper matching the implementation in useWoodRecords / RecordTable
 */
function applyFilters(records: WoodReceivingRecord[], filters: RecordFilterCriteria): WoodReceivingRecord[] {
  return records.filter((r) => {
    if (filters.species && r.woodSpecies !== filters.species) {
      return false;
    }
    if (filters.kavling && r.kavlingNumber !== filters.kavling) {
      return false;
    }
    if (filters.searchQuery && !recordMatchesSearchQuery(r, filters.searchQuery)) {
      return false;
    }
    return true;
  });
}

test('Toolbar Quick-Filter Pills & Search State Suite', async (t) => {
  const records = SEED_WOOD_RECORDS;

  await t.test('toggling species pill updates filter state correctly', () => {
    let currentFilters: RecordFilterCriteria = {};

    const handleSpeciesPillClick = (selectedSpecies: string | undefined) => {
      if (!selectedSpecies || currentFilters.species === selectedSpecies) {
        currentFilters = { ...currentFilters, species: undefined };
      } else {
        currentFilters = { ...currentFilters, species: selectedSpecies };
      }
    };

    // 1. Select "Teak / Jati (柚木)"
    handleSpeciesPillClick('Teak / Jati (柚木)');
    assert.strictEqual(currentFilters.species, 'Teak / Jati (柚木)');
    const jatiFiltered = applyFilters(records, currentFilters);
    assert.strictEqual(jatiFiltered.length, 1);
    assert.strictEqual(jatiFiltered[0].woodSpecies, 'Teak / Jati (柚木)');

    // 2. Select another species "Merbau (菠萝格)"
    handleSpeciesPillClick('Merbau (菠萝格)');
    assert.strictEqual(currentFilters.species, 'Merbau (菠萝格)');
    const merbauFiltered = applyFilters(records, currentFilters);
    assert.strictEqual(merbauFiltered.length, 1);
    assert.strictEqual(merbauFiltered[0].woodSpecies, 'Merbau (菠萝格)');

    // 3. Re-clicking the active species toggles it back to undefined ("Semua")
    handleSpeciesPillClick('Merbau (菠萝格)');
    assert.strictEqual(currentFilters.species, undefined);
    const allFiltered = applyFilters(records, currentFilters);
    assert.strictEqual(allFiltered.length, records.length);

    // 4. Clicking undefined ("Semua") explicitly resets to undefined
    handleSpeciesPillClick('Teak / Jati (柚木)');
    assert.strictEqual(currentFilters.species, 'Teak / Jati (柚木)');
    handleSpeciesPillClick(undefined);
    assert.strictEqual(currentFilters.species, undefined);
  });

  await t.test('clear search button resets query to empty', () => {
    let currentFilters: RecordFilterCriteria = {
      searchQuery: 'SKSHHK-2026-001',
      species: 'Teak / Jati (柚木)',
    };

    const handleClearSearch = () => {
      currentFilters = { ...currentFilters, searchQuery: '' };
    };

    assert.strictEqual(applyFilters(records, currentFilters).length, 1);

    handleClearSearch();
    assert.strictEqual(currentFilters.searchQuery, '');
    assert.strictEqual(currentFilters.species, 'Teak / Jati (柚木)');
    assert.strictEqual(applyFilters(records, currentFilters).length, 1);
  });

  await t.test('combined quick-pill and text search filters with high precision', () => {
    const filters: RecordFilterCriteria = {
      species: 'Merbau (菠萝格)',
      searchQuery: '8172', // Plate L 8172 UX
    };

    const results = applyFilters(records, filters);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].truckPlateNumber, 'L 8172 UX');
    assert.strictEqual(results[0].woodSpecies, 'Merbau (菠萝格)');

    // Unmatched search query returns empty array
    const emptyResults = applyFilters(records, {
      ...filters,
      searchQuery: 'NONEXISTENT-999',
    });
    assert.strictEqual(emptyResults.length, 0);
  });

  await t.test('searches across invoiceNumber without false-positive date string collisions', () => {
    const testRecords: WoodReceivingRecord[] = [
      {
        ...records[0],
        id: 'rec-inv-test-1',
        invoiceNumber: 'INV-2026-999',
      },
    ];

    // Searching by invoice number finds the record
    const invoiceResults = applyFilters(testRecords, { searchQuery: 'INV-2026-999' });
    assert.strictEqual(invoiceResults.length, 1);
    assert.strictEqual(invoiceResults[0].invoiceNumber, 'INV-2026-999');

    // Searching by receiptDate substring '2026-10-01' does not match text search
    const dateResults = applyFilters(testRecords, { searchQuery: '2026-10-01' });
    assert.strictEqual(dateResults.length, 0);
  });
});
