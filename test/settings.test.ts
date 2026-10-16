import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS } from '../src/hooks/useSettings.ts';
import { TIMBER_SPECIES_CATALOGUE } from '../src/utils/timber-species.ts';

test('App Settings & Master Data Suite', async (t) => {
  await t.test('default settings contain valid Indonesian timber tax rates and yard metadata', () => {
    assert.equal(DEFAULT_SETTINGS.defaultTimberPphRate, 0.5);
    assert.equal(DEFAULT_SETTINGS.defaultFreightPphRate, 2.0);
    assert.ok(DEFAULT_SETTINGS.defaultBrokerFee >= 0);
    assert.ok(DEFAULT_SETTINGS.acceptableDiscrepancyThresholdPct > 0);
    assert.ok(DEFAULT_SETTINGS.yardCode.length > 0);
    assert.ok(DEFAULT_SETTINGS.yardName.length > 0);
  });

  await t.test('timber species master data contains required tropical hardwood varieties', () => {
    assert.ok(TIMBER_SPECIES_CATALOGUE.length >= 8);
    const teak = TIMBER_SPECIES_CATALOGUE.find((s) => s.code === 'TEAK');
    assert.ok(teak);
    assert.equal(teak.isHardwood, true);
    assert.ok(teak.densityKgM3 > 0);
  });
});
