import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Mobile Tally Dedicated Route Integration Suite', async (t) => {
  const pagePath = path.resolve(process.cwd(), 'app/tally/page.tsx');

  await t.test('app/tally/page.tsx exists and respects < 200 LOC limit', () => {
    assert.ok(fs.existsSync(pagePath), 'app/tally/page.tsx must exist');
    const lines = fs.readFileSync(pagePath, 'utf-8').split('\n');
    assert.ok(lines.length <= 200, `app/tally/page.tsx must not exceed 200 LOC (currently ${lines.length})`);
  });

  await t.test('app/tally/page.tsx wires required subcomponents and hooks', () => {
    const content = fs.readFileSync(pagePath, 'utf-8');
    assert.match(content, /useAuth/, 'Must import and use useAuth hook');
    assert.match(content, /useWoodRecords/, 'Must import and use useWoodRecords hook');
    assert.match(content, /YardSelect/, 'Must import and use YardSelect');
    assert.match(content, /KavlingSelect/, 'Must import and use KavlingSelect');
    assert.match(content, /TallyMeasurementPad/, 'Must import and use TallyMeasurementPad');
    assert.match(content, /TallyDiscrepancyCard/, 'Must import and use TallyDiscrepancyCard');
  });

  await t.test('app/tally/page.tsx enforces Level 1 RBAC write guard and bilingual submit action', () => {
    const content = fs.readFileSync(pagePath, 'utf-8');
    assert.match(content, /canWrite/, 'Must verify canWrite permission');
    assert.match(content, /Simpan & Sinkron Manifest|Simpan Manifest/, 'Must contain manifest save button');
    assert.match(content, /truckPlateNumber/, 'Must capture truckPlateNumber');
    assert.match(content, /supplierName/, 'Must capture supplierName');
  });
});

