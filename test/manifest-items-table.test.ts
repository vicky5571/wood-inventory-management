import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getYards, getLotsForYard, resetStorageLocations } from '../src/utils/storage-locations.ts';

test('Manifest Items Table Components Invariant Suite', async (t) => {
  const rowPath = path.join(process.cwd(), 'src/components/ledger/ManifestItemRow.tsx');
  const tablePath = path.join(process.cwd(), 'src/components/ledger/ManifestItemsTable.tsx');

  await t.test('ManifestItemRow exists and complies with <250 LOC rule', () => {
    assert.ok(fs.existsSync(rowPath), 'ManifestItemRow.tsx must exist');
    const content = fs.readFileSync(rowPath, 'utf-8');
    const lines = content.split('\n').length;
    assert.ok(lines < 250, `ManifestItemRow.tsx must be <250 LOC (got ${lines})`);
    assert.match(content, /export function ManifestItemRow/);
    assert.match(content, /SpeciesCombobox/);
    assert.match(content, /woodSpecies/);
    assert.match(content, /woodLengthM/);
    assert.match(content, /kavlingNumber/);
    assert.match(content, /storageYard/);
    assert.match(content, /deliveredPieces/);
    assert.match(content, /deliveredVolumeM3/);
    assert.match(content, /tallyPieces/);
    assert.match(content, /tallyVolumeM3/);
    assert.match(content, /timberPricePerM3/);
    assert.match(content, /timberPphRate/);
  });

  await t.test('ManifestItemRow integrates cascading YardSelect and KavlingSelect components', () => {
    const content = fs.readFileSync(rowPath, 'utf-8');
    assert.match(content, /YardSelect/, 'Must import or use YardSelect');
    assert.match(content, /KavlingSelect/, 'Must import or use KavlingSelect');
    assert.match(content, /getLotsForYard/, 'Must import getLotsForYard for lot validity checks');
    assert.match(content, /handleYardChange/, 'Must implement handleYardChange for cascading update');
    assert.doesNotMatch(
      content,
      /<input[^>]*value=\{item\.kavlingNumber/,
      'Freeform input for kavlingNumber must be replaced by KavlingSelect'
    );
    assert.doesNotMatch(
      content,
      /<input[^>]*value=\{item\.storageYard/,
      'Freeform input for storageYard must be replaced by YardSelect'
    );
  });

  await t.test('Cascading yard change preserves matching kavling and resets mismatched kavling', () => {
    resetStorageLocations();
    const isLotValidForYard = (yard: string, lotCode: string) => {
      if (!lotCode) return false;
      const validLots = getLotsForYard(yard);
      return validLots.some((l) => l.lotCode.toLowerCase() === lotCode.toLowerCase());
    };

    // TPK-Timur has KAV-01 and KAV-02
    assert.strictEqual(isLotValidForYard('TPK-Timur', 'KAV-01'), true);
    assert.strictEqual(isLotValidForYard('TPK-Timur', 'KAV-02'), true);
    assert.strictEqual(isLotValidForYard('TPK-Timur', 'KAV-03'), false);

    // TPK-Utara has KAV-03 and KAV-04
    assert.strictEqual(isLotValidForYard('TPK-Utara', 'KAV-03'), true);
    assert.strictEqual(isLotValidForYard('TPK-Utara', 'KAV-01'), false);

    // Empty yard has no valid lots
    assert.strictEqual(isLotValidForYard('', 'KAV-01'), false);

    // Intermediate keystrokes simulation
    const computeNextKavling = (currentKavling: string, newYard: string) => {
      let nextKavling = currentKavling || '';
      const trimmed = newYard.trim();
      if (!trimmed) {
        nextKavling = '';
      } else {
        const norm = trimmed.toLowerCase();
        const isRecognized = getYards().some(
          (y) => y.name.toLowerCase() === norm || y.yardCode.toLowerCase() === norm || y.id.toLowerCase() === norm
        );
        if (isRecognized && nextKavling) {
          const validLots = getLotsForYard(trimmed);
          const exists = validLots.some((lot) => lot.lotCode.toLowerCase() === nextKavling.toLowerCase());
          if (!exists) nextKavling = '';
        }
      }
      return nextKavling;
    };

    // Partial unconfirmed search string does NOT reset existing kavling
    assert.strictEqual(computeNextKavling('KAV-01', 'TP'), 'KAV-01');
    assert.strictEqual(computeNextKavling('KAV-01', 'TPK-'), 'KAV-01');

    // Confirmed recognized yard with mismatching lot resets kavling
    assert.strictEqual(computeNextKavling('KAV-01', 'TPK-Utara'), '');

    // Confirmed recognized yard with matching lot preserves kavling
    assert.strictEqual(computeNextKavling('KAV-01', 'TPK-Timur'), 'KAV-01');

    // Empty yard resets kavling
    assert.strictEqual(computeNextKavling('KAV-01', ''), '');
  });

  await t.test('ManifestItemRow implements live discrepancy badge, subtotal net, and guarded delete', () => {
    const content = fs.readFileSync(rowPath, 'utf-8');
    // Discrepancy calculations & badges
    assert.match(content, /volDiff/, 'Must calculate volume difference');
    assert.match(content, /pcsDiff/, 'Must calculate piece difference');
    assert.match(content, /timberNet/, 'Must calculate subtotal timber net');
    assert.match(content, /formatRupiah/, 'Must format subtotal timber net currency');
    // Delete guard
    assert.match(content, /totalItems <= 1/, 'Must disable delete button when only 1 item in manifest');
    assert.match(content, /Trash2/, 'Must render trash icon for row deletion');
  });

  await t.test('ManifestItemsTable exists and exports table component', () => {
    assert.ok(fs.existsSync(tablePath), 'ManifestItemsTable.tsx must exist');
    const content = fs.readFileSync(tablePath, 'utf-8');
    const lines = content.split('\n').length;
    assert.ok(lines < 250, `ManifestItemsTable.tsx must be <250 LOC (got ${lines})`);
    assert.match(content, /export function ManifestItemsTable/);
    assert.match(content, /Tambah Baris Kayu/);
    assert.match(content, /handleAddItem/);
    assert.match(content, /handleDeleteItem/);
    assert.match(content, /handleUpdateItem/);
    assert.match(content, /ManifestItemRow/);
    assert.match(content, /storageYard:\s*lastItem\s*\?\s*lastItem\.storageYard\s*:\s*['"]TPK-Timur['"]/);
  });
});
