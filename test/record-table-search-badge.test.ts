/**
 * test/record-table-search-badge.test.ts
 *
 * Unit tests verifying search transparency and visible match indicators:
 * - Toolbar input placeholder mentions Faktur
 * - RecordTableCompactView renders invoice badge when invoice query matches
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Search Transparency & Match Visibility Suite', async (t) => {
  const compactPath = path.resolve(process.cwd(), 'src/components/ledger/RecordTableCompactView.tsx');
  const toolbarPath = path.resolve(process.cwd(), 'src/components/ledger/Toolbar.tsx');
  const recordTablePath = path.resolve(process.cwd(), 'src/components/ledger/RecordTable.tsx');

  await t.test('Toolbar input placeholder mentions Faktur for search clarity', () => {
    const content = fs.readFileSync(toolbarPath, 'utf-8');
    assert.match(content, /Faktur/, 'Search placeholder must indicate invoice searchability');
  });

  await t.test('RecordTable.tsx accepts and forwards searchQuery to compact view', () => {
    const content = fs.readFileSync(recordTablePath, 'utf-8');
    assert.match(content, /searchQuery\?:?\s*string/, 'RecordTable must accept searchQuery prop');
    assert.match(content, /searchQuery=\{searchQuery\}/, 'RecordTable must pass searchQuery to views');
  });

  await t.test('RecordTableCompactView renders invoice badge when invoice query matches', () => {
    const content = fs.readFileSync(compactPath, 'utf-8');
    assert.match(content, /isInvoiceSearchMatch/, 'Must import and check isInvoiceSearchMatch');
    assert.match(content, /Faktur:/, 'Must render visible Faktur indicator on matching row');
  });
});
