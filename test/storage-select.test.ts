import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  getYards,
  getLotsForYard,
  addYard,
  addLot,
  isLotFullOrMaintenance,
  filterLots,
  filterYards,
  resetStorageLocations,
} from '../src/utils/storage-locations.ts';

test('Cascading Storage Select Components Suite (YardSelect & KavlingSelect)', async (t) => {
  t.beforeEach(() => {
    resetStorageLocations();
  });

  const yardSelectPath = path.resolve(process.cwd(), 'src/components/ledger/YardSelect.tsx');
  const kavlingSelectPath = path.resolve(process.cwd(), 'src/components/ledger/KavlingSelect.tsx');

  await t.test('YardSelect.tsx exists and adheres to component contract and LOC limit (<200 LOC)', () => {
    assert.ok(fs.existsSync(yardSelectPath), 'YardSelect.tsx must exist');
    const content = fs.readFileSync(yardSelectPath, 'utf-8');
    const lines = content.split('\n').length;
    assert.ok(lines <= 200, `YardSelect.tsx LOC must be <= 200, current: ${lines}`);

    // Verify component contracts
    assert.match(content, /export interface YardSelectProps/);
    assert.match(content, /export function YardSelect/);
    assert.match(content, /getYards/);
    assert.match(content, /filterYards/);
    assert.match(content, /addYard/);
    assert.match(content, /role="combobox"/);
    assert.match(content, /aria-expanded/);
    assert.match(content, /Tambah TPK/);
    assert.match(content, /添加场地/);
  });

  await t.test('KavlingSelect.tsx exists and adheres to component contract and LOC limit (<230 LOC)', () => {
    assert.ok(fs.existsSync(kavlingSelectPath), 'KavlingSelect.tsx must exist');
    const content = fs.readFileSync(kavlingSelectPath, 'utf-8');
    const lines = content.split('\n').length;
    assert.ok(lines <= 230, `KavlingSelect.tsx LOC must be <= 230, current: ${lines}`);

    // Verify component contracts
    assert.match(content, /export interface KavlingSelectProps/);
    assert.match(content, /selectedYard:\s*string/);
    assert.match(content, /export function KavlingSelect/);
    assert.match(content, /getLotsForYard/);
    assert.match(content, /filterLots/);
    assert.match(content, /addLot/);
    assert.match(content, /isLotFullOrMaintenance/);
    assert.match(content, /role="combobox"/);
    assert.match(content, /aria-expanded/);
    assert.match(content, /Pilih TPK terlebih dahulu/);
    assert.match(content, /Tambah Kavling/);
    assert.match(content, /添加批号/);
  });

  await t.test('Cascade logic: KavlingSelect is disabled when selectedYard is empty, enabled when selectedYard is set', () => {
    // When no yard is selected
    const emptyYard = '';
    const lotsEmpty = getLotsForYard(emptyYard);
    assert.strictEqual(lotsEmpty.length, 0);

    const whitespaceYard = '   ';
    const lotsWhitespace = getLotsForYard(whitespaceYard);
    assert.strictEqual(lotsWhitespace.length, 0);

    // When valid yard is selected
    const timurLots = getLotsForYard('TPK-Timur');
    assert.strictEqual(timurLots.length, 2);
    assert.deepStrictEqual(timurLots.map((l) => l.lotCode), ['KAV-01', 'KAV-02']);

    const utaraLots = getLotsForYard('TPK-Utara');
    assert.strictEqual(utaraLots.length, 2);
    assert.deepStrictEqual(utaraLots.map((l) => l.lotCode), ['KAV-03', 'KAV-04']);
  });

  await t.test('Status badges and soft capacity warning logic for full/maintenance lots', () => {
    const utaraLots = getLotsForYard('TPK-Utara');
    const kav03 = utaraLots.find((l) => l.lotCode === 'KAV-03');
    const kav04 = utaraLots.find((l) => l.lotCode === 'KAV-04');

    assert.ok(kav03);
    assert.strictEqual(kav03.status, 'ACTIVE');
    const warn03 = isLotFullOrMaintenance(kav03);
    assert.strictEqual(warn03.isWarning, false);

    assert.ok(kav04);
    assert.strictEqual(kav04.status, 'FULL');
    const warn04 = isLotFullOrMaintenance(kav04);
    assert.strictEqual(warn04.isWarning, true);
    assert.match(warn04.message || '', /FULL|PENUH/i);

    const baratLots = getLotsForYard('TPK-Barat');
    const kav06 = baratLots.find((l) => l.lotCode === 'KAV-06');
    assert.ok(kav06);
    assert.strictEqual(kav06.status, 'MAINTENANCE');
    const warn06 = isLotFullOrMaintenance(kav06);
    assert.strictEqual(warn06.isWarning, true);
    assert.match(warn06.message || '', /MAINTENANCE|PERAWATAN/i);
  });

  await t.test('Inline yard and lot creation allows rapid additions without reload', () => {
    // Adding yard inline
    const initialCount = getYards().length;
    const createdYard = addYard('TPK-Logistik');
    assert.strictEqual(createdYard.name, 'TPK-Logistik');
    assert.strictEqual(getYards().length, initialCount + 1);

    // Filtering new yard
    const filteredYard = filterYards(getYards(), 'logistik');
    assert.strictEqual(filteredYard.length, 1);
    assert.strictEqual(filteredYard[0].name, 'TPK-Logistik');

    // Adding lot inline to that yard
    const createdLot = addLot('TPK-Logistik', 'KAV-L1');
    assert.strictEqual(createdLot.lotCode, 'KAV-L1');
    assert.strictEqual(createdLot.yardId, createdYard.id);

    const yardLots = getLotsForYard('TPK-Logistik');
    assert.strictEqual(yardLots.length, 1);
    assert.strictEqual(yardLots[0].lotCode, 'KAV-L1');

    // Filtering lots
    const filteredLot = filterLots(yardLots, 'l1');
    assert.strictEqual(filteredLot.length, 1);
    assert.strictEqual(filteredLot[0].lotCode, 'KAV-L1');
  });
});
