import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

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
  });
});
