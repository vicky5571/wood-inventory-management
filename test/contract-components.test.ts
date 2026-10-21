/**
 * test/contract-components.test.ts
 *
 * Architectural and LOC budget verification for Perhutani Contract Tracking
 * UI components, coordinators, modals, and client hooks.
 * Enforces the strict < 250 LOC rule and verifies required exports.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const CONTRACT_FILES = [
  'src/components/contracts/ContractEmptyState.tsx',
  'src/components/contracts/ContractKpiStrip.tsx',
  'src/components/contracts/ContractToolbar.tsx',
  'src/components/contracts/ContractTable.tsx',
  'src/components/contracts/ContractListView.tsx',
  'src/components/contracts/ContractHeaderCard.tsx',
  'src/components/contracts/ContractFulfillmentCard.tsx',
  'src/components/contracts/ContractSortimentTable.tsx',
  'src/components/contracts/ContractReceiptsPanel.tsx',
  'src/components/contracts/LinkedReceivingList.tsx',
  'src/components/contracts/ContractDetailView.tsx',
  'src/components/contracts/SortimentItemRow.tsx',
  'src/components/contracts/ContractHeaderFields.tsx',
  'src/components/contracts/ContractFormModal.tsx',
  'src/components/contracts/ReceiptFormModal.tsx',
  'src/components/contracts/ContractCombobox.tsx',
  'src/hooks/useContracts.ts',
  'app/contracts/page.tsx',
  'app/contracts/[id]/page.tsx',
];

test('Contract Component Architecture & Budget Suite', async (t) => {
  await t.test('All contract components, views, and hooks exist on disk', () => {
    for (const relPath of CONTRACT_FILES) {
      const fullPath = path.resolve(process.cwd(), relPath);
      assert.ok(fs.existsSync(fullPath), `File must exist: ${relPath}`);
    }
  });

  await t.test('All contract components and coordinators strictly obey < 250 LOC limit', () => {
    for (const relPath of CONTRACT_FILES) {
      const fullPath = path.resolve(process.cwd(), relPath);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n').length;
      assert.ok(
        lines < 250,
        `File ${relPath} exceeds 250 LOC limit (${lines} lines, limit: 250)`
      );
    }
  });

  await t.test('ContractListView coordinator correctly imports subcomponents and hook', () => {
    const filePath = path.resolve(process.cwd(), 'src/components/contracts/ContractListView.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.match(content, /ContractKpiStrip/);
    assert.match(content, /ContractToolbar/);
    assert.match(content, /ContractTable/);
    assert.match(content, /ContractEmptyState/);
    assert.match(content, /ContractFormModal/);
    assert.match(content, /useContracts/);
  });

  await t.test('ContractDetailView coordinator correctly wires up fulfillment, sortimen, and receipts', () => {
    const filePath = path.resolve(process.cwd(), 'src/components/contracts/ContractDetailView.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.match(content, /ContractHeaderCard/);
    assert.match(content, /ContractFulfillmentCard/);
    assert.match(content, /ContractSortimentTable/);
    assert.match(content, /ContractReceiptsPanel/);
    assert.match(content, /LinkedReceivingList/);
    assert.match(content, /ReceiptFormModal/);
  });

  await t.test('RecordDocumentSection integrates ContractCombobox for hybrid Perhutani linkage', () => {
    const filePath = path.resolve(process.cwd(), 'src/components/ledger/RecordDocumentSection.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.match(content, /ContractCombobox/);
  });
});
