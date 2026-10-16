/**
 * test/species-combobox.test.ts
 *
 * Unit tests for timber species catalogue management, filtering logic,
 * custom species detection, and combobox option synthesis.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_TIMBER_SPECIES,
  filterSpeciesOptions,
  getMergedSpeciesList,
  isCustomSpecies,
} from '../src/utils/timber-species.ts';

test('Timber Species Combobox Logic Suite', async (t) => {
  await t.test('DEFAULT_TIMBER_SPECIES contains standard Indonesian/tropical varieties', () => {
    assert.ok(Array.isArray(DEFAULT_TIMBER_SPECIES));
    assert.ok(DEFAULT_TIMBER_SPECIES.length >= 8);
    assert.ok(DEFAULT_TIMBER_SPECIES.some((s) => s.includes('Jati') || s.includes('Teak')));
    assert.ok(DEFAULT_TIMBER_SPECIES.some((s) => s.includes('Merbau')));
    assert.ok(DEFAULT_TIMBER_SPECIES.some((s) => s.includes('Kamper')));
    assert.ok(DEFAULT_TIMBER_SPECIES.some((s) => s.includes('Bengkirai')));
  });

  await t.test('filterSpeciesOptions matches by English, Indonesian, or Chinese character', () => {
    const list = [
      'Teak / Jati (柚木)',
      'Merbau (菠萝格)',
      'Kamper (樟木)',
      'Bengkirai / Balau (黄梢木)',
      'Mahoni / Mahogany (桃花心木)',
    ];

    // Indonesian match
    const jati = filterSpeciesOptions(list, 'jati');
    assert.strictEqual(jati.length, 1);
    assert.strictEqual(jati[0], 'Teak / Jati (柚木)');

    // English match
    const teak = filterSpeciesOptions(list, 'teak');
    assert.strictEqual(teak.length, 1);
    assert.strictEqual(teak[0], 'Teak / Jati (柚木)');

    // Chinese match
    const chineseMerbau = filterSpeciesOptions(list, '菠萝格');
    assert.strictEqual(chineseMerbau.length, 1);
    assert.strictEqual(chineseMerbau[0], 'Merbau (菠萝格)');

    // Substring partial match
    const mah = filterSpeciesOptions(list, 'mah');
    assert.strictEqual(mah.length, 1);
    assert.strictEqual(mah[0], 'Mahoni / Mahogany (桃花心木)');

    // Empty query returns all
    assert.deepStrictEqual(filterSpeciesOptions(list, ''), list);
  });

  await t.test('getMergedSpeciesList combines defaults with dynamic records without duplicates', () => {
    const dynamicFromDb = [
      'Teak / Jati (柚木)', // Duplicate with default
      'Kayu Karet (橡胶木)',  // New dynamic species
      'Akasia / Acacia',    // New dynamic species
    ];

    const merged = getMergedSpeciesList(dynamicFromDb);
    assert.ok(merged.includes('Kayu Karet (橡胶木)'));
    assert.ok(merged.includes('Akasia / Acacia'));
    assert.ok(merged.includes('Teak / Jati (柚木)'));

    // Check no duplicates
    const unique = new Set(merged);
    assert.strictEqual(unique.size, merged.length);
  });

  await t.test('isCustomSpecies identifies whether input is outside standard list', () => {
    const standard = ['Teak / Jati (柚木)', 'Merbau (菠萝格)'];

    assert.strictEqual(isCustomSpecies('Teak / Jati (柚木)', standard), false);
    assert.strictEqual(isCustomSpecies('teak / jati (柚木)', standard), false); // case insensitive match
    assert.strictEqual(isCustomSpecies('Cendana Wangi', standard), true);
    assert.strictEqual(isCustomSpecies('', standard), false);
  });
});
