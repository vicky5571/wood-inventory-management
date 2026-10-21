import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, normalizeSettings } from '../src/hooks/useSettings.ts';
import { TIMBER_SPECIES_CATALOGUE } from '../src/utils/timber-species.ts';

test('App Settings & Master Data Suite', async (t) => {
  await t.test('default settings contain valid Indonesian timber tax rates and yard metadata', () => {
    assert.equal(DEFAULT_SETTINGS.defaultTimberPphRate, 0.5);
    assert.equal(DEFAULT_SETTINGS.defaultFreightPphRate, 2.0);
    assert.ok(DEFAULT_SETTINGS.defaultBrokerFee >= 0);
    assert.ok(DEFAULT_SETTINGS.acceptableDiscrepancyThresholdPct > 0);
    assert.equal(DEFAULT_SETTINGS.discrepancyAlarmVolumeM3, 1.5);
    assert.equal(DEFAULT_SETTINGS.discrepancyAlarmPercent, 2.0);
    assert.ok(DEFAULT_SETTINGS.yardCode.length > 0);
    assert.ok(DEFAULT_SETTINGS.yardName.length > 0);
  });

  await t.test('normalizeSettings migrates legacy settings and fills defaults', () => {
    // Legacy setting with only acceptableDiscrepancyThresholdPct: 3.5
    const migrated = normalizeSettings({
      acceptableDiscrepancyThresholdPct: 3.5,
    } as any);
    assert.equal(migrated.discrepancyAlarmPercent, 3.5);
    assert.equal(migrated.discrepancyAlarmVolumeM3, 1.5);

    // Custom alarm thresholds preserved
    const custom = normalizeSettings({
      discrepancyAlarmVolumeM3: 2.2,
      discrepancyAlarmPercent: 4.0,
    });
    assert.equal(custom.discrepancyAlarmVolumeM3, 2.2);
    assert.equal(custom.discrepancyAlarmPercent, 4.0);
  });

  await t.test('timber species master data contains required tropical hardwood varieties', () => {
    assert.ok(TIMBER_SPECIES_CATALOGUE.length >= 8);
    const teak = TIMBER_SPECIES_CATALOGUE.find((s) => s.code === 'TEAK');
    assert.ok(teak);
    assert.equal(teak.isHardwood, true);
    assert.ok(teak.densityKgM3 > 0);
  });

  await t.test('RecordModal wires useSettings for defaultBrokerFee and defaultTimberPphRate', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const modalPath = path.resolve(process.cwd(), 'src/components/ledger/RecordModal.tsx');
    const content = fs.readFileSync(modalPath, 'utf-8');
    assert.match(content, /useSettings/, 'RecordModal must import and invoke useSettings');
    assert.match(content, /defaultBrokerFee/, 'RecordModal must apply defaultBrokerFee from settings');
    assert.match(content, /defaultTimberPphRate/, 'RecordModal must apply defaultTimberPphRate from settings');
  });
});
