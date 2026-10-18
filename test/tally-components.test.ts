import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Mobile Tally Workstation Subcomponents Suite', async (t) => {
  const measurementPadPath = path.resolve(process.cwd(), 'src/components/tally/TallyMeasurementPad.tsx');
  const discrepancyCardPath = path.resolve(process.cwd(), 'src/components/tally/TallyDiscrepancyCard.tsx');

  await t.test('TallyMeasurementPad.tsx exists and respects < 200 LOC limit', () => {
    assert.ok(fs.existsSync(measurementPadPath), 'TallyMeasurementPad.tsx must exist');
    const lines = fs.readFileSync(measurementPadPath, 'utf-8').split('\n');
    assert.ok(lines.length <= 200, `TallyMeasurementPad.tsx must not exceed 200 LOC (currently ${lines.length})`);
  });

  await t.test('TallyDiscrepancyCard.tsx exists and respects < 120 LOC limit', () => {
    assert.ok(fs.existsSync(discrepancyCardPath), 'TallyDiscrepancyCard.tsx must exist');
    const lines = fs.readFileSync(discrepancyCardPath, 'utf-8').split('\n');
    assert.ok(lines.length <= 120, `TallyDiscrepancyCard.tsx must not exceed 120 LOC (currently ${lines.length})`);
  });

  await t.test('TallyMeasurementPad exports component and interface contract', () => {
    const content = fs.readFileSync(measurementPadPath, 'utf-8');
    assert.match(content, /export interface TallyMeasurementPadProps/, 'Must export TallyMeasurementPadProps');
    assert.match(content, /export function TallyMeasurementPad/, 'Must export TallyMeasurementPad component');
    assert.match(content, /calculateCubicFromCentimeters/, 'Must import calculateCubicFromCentimeters');
    assert.match(content, /calculateRoundLogVolumeM3/, 'Must import calculateRoundLogVolumeM3');
    assert.match(content, /SAWN/, 'Must support SAWN mode');
    assert.match(content, /ROUND/, 'Must support ROUND log mode');
    assert.match(content, /\+1/, 'Must support +1 stepper');
    assert.match(content, /\+5/, 'Must support +5 stepper');
    assert.match(content, /\+10/, 'Must support +10 stepper');
  });

  await t.test('TallyDiscrepancyCard exports component and implements status thresholds', () => {
    const content = fs.readFileSync(discrepancyCardPath, 'utf-8');
    assert.match(content, /export interface TallyDiscrepancyCardProps/, 'Must export TallyDiscrepancyCardProps');
    assert.match(content, /export function TallyDiscrepancyCard/, 'Must export TallyDiscrepancyCard component');
    assert.match(content, /Cocok\s*\(匹配\)|Cocok/, 'Must display Cocok status');
    assert.match(content, /Penyusutan\s*\(亏损\)|Penyusutan/, 'Must display Penyusutan status');
    assert.match(content, /Surplus\s*\(超出\)|Surplus/, 'Must display Surplus status');
  });
});
