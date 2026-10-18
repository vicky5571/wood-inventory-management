import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Receiving Form Performance & Optimization Invariants Suite', async (t) => {
  const modalPath = path.join(process.cwd(), 'src/components/ledger/RecordModal.tsx');
  const rowPath = path.join(process.cwd(), 'src/components/ledger/ManifestItemRow.tsx');
  const tablePath = path.join(process.cwd(), 'src/components/ledger/ManifestItemsTable.tsx');
  const supplierComboPath = path.join(process.cwd(), 'src/components/ledger/SupplierCombobox.tsx');
  const docSectionPath = path.join(process.cwd(), 'src/components/ledger/RecordDocumentSection.tsx');
  const finSectionPath = path.join(process.cwd(), 'src/components/ledger/RecordFinancialSection.tsx');
  const cardPath = path.join(process.cwd(), 'src/components/ledger/RecordReconciliationCard.tsx');

  await t.test('ManifestItemRow is wrapped in React.memo and complies with <250 LOC', () => {
    assert.ok(fs.existsSync(rowPath));
    const content = fs.readFileSync(rowPath, 'utf-8');
    const lines = content.split('\n').length;
    assert.ok(lines < 250, `ManifestItemRow.tsx must be < 250 LOC (got ${lines})`);
    assert.match(content, /memo\(/, 'ManifestItemRow must be wrapped with React.memo');
  });

  await t.test('Form sections and reconciliation card are wrapped in React.memo', () => {
    const docContent = fs.readFileSync(docSectionPath, 'utf-8');
    const finContent = fs.readFileSync(finSectionPath, 'utf-8');
    const cardContent = fs.readFileSync(cardPath, 'utf-8');

    assert.match(docContent, /memo\(/, 'RecordDocumentSection must be wrapped with React.memo');
    assert.match(finContent, /memo\(/, 'RecordFinancialSection must be wrapped with React.memo');
    assert.match(cardContent, /memo\(/, 'RecordReconciliationCard must be wrapped with React.memo');
  });

  await t.test('SupplierCombobox does not invoke useSuppliers analytics hook and adheres to <250 LOC', () => {
    assert.ok(fs.existsSync(supplierComboPath));
    const content = fs.readFileSync(supplierComboPath, 'utf-8');
    const lines = content.split('\n').length;
    assert.ok(lines < 250, `SupplierCombobox.tsx must be < 250 LOC (got ${lines})`);
    assert.doesNotMatch(content, /useSuppliers\(/, 'SupplierCombobox must NOT call useSuppliers analytics hook');
  });

  await t.test('Currency formatters use module-level singletons rather than instantiating inside format functions', () => {
    const rowContent = fs.readFileSync(rowPath, 'utf-8');
    const cardContent = fs.readFileSync(cardPath, 'utf-8');

    assert.match(rowContent, /const \w+Formatter = new Intl\.NumberFormat/, 'ManifestItemRow must declare a module-level formatter');
    assert.match(cardContent, /const \w+Formatter = new Intl\.NumberFormat/, 'RecordReconciliationCard must declare a module-level formatter');
  });

  await t.test('RecordModal integrates useDeferredValue for fluid non-blocking calculations and adheres to <250 LOC', () => {
    assert.ok(fs.existsSync(modalPath));
    const content = fs.readFileSync(modalPath, 'utf-8');
    const lines = content.split('\n').length;
    assert.ok(lines <= 250, `RecordModal.tsx must be <= 250 LOC (got ${lines})`);
    assert.match(content, /useDeferredValue/, 'RecordModal must integrate useDeferredValue');
  });

  await t.test('ManifestItemsTable uses stable memoized callbacks for item updates', () => {
    assert.ok(fs.existsSync(tablePath));
    const content = fs.readFileSync(tablePath, 'utf-8');
    assert.match(content, /useCallback/, 'ManifestItemsTable must use useCallback for stable update delegation');
  });
});
