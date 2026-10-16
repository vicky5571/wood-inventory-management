/**
 * test/confirm-dialog.test.ts
 *
 * Unit and contract tests for the ConfirmDialog component and its integration
 * into Ledger (record deletions) and Suppliers (supplier deletions).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('ConfirmDialog Component & Safeguard Contract Suite', async (t) => {
  const dialogPath = path.resolve(process.cwd(), 'src/components/ui/ConfirmDialog.tsx');
  const typesPath = path.resolve(process.cwd(), 'src/types/index.ts');
  const ledgerPath = path.resolve(process.cwd(), 'app/ledger/page.tsx');
  const suppliersPath = path.resolve(process.cwd(), 'app/suppliers/page.tsx');

  await t.test('ConfirmDialog.tsx exists and stays strictly within the 120 LOC ceiling', () => {
    assert.ok(fs.existsSync(dialogPath), 'src/components/ui/ConfirmDialog.tsx must exist');
    const content = fs.readFileSync(dialogPath, 'utf-8');
    const lines = content.split('\n');
    assert.ok(
      lines.length <= 120,
      `ConfirmDialog.tsx LOC (${lines.length}) exceeds 120 line ceiling`
    );
  });

  await t.test('ConfirmDialog exports component and defines ConfirmDialogProps interface contract', () => {
    const content = fs.readFileSync(dialogPath, 'utf-8');
    assert.match(content, /export (function|const) ConfirmDialog/, 'Must export ConfirmDialog component');
    assert.match(content, /export interface ConfirmDialogProps/, 'Must export ConfirmDialogProps');
    assert.match(content, /isOpen:\s*boolean/);
    assert.match(content, /title:\s*string/);
    assert.match(content, /description:\s*string/);
    assert.match(content, /confirmLabel\?:\s*string/);
    assert.match(content, /cancelLabel\?:\s*string/);
    assert.match(content, /isDestructive\?:\s*boolean/);
    assert.match(content, /onConfirm:\s*\(\)\s*=>\s*void/);
    assert.match(content, /onCancel:\s*\(\)\s*=>\s*void/);
  });

  await t.test('SSOT types definition exports ConfirmDialogProps', () => {
    assert.ok(fs.existsSync(typesPath), 'src/types/index.ts must exist');
    const content = fs.readFileSync(typesPath, 'utf-8');
    assert.match(content, /export interface ConfirmDialogProps/, 'SSOT must export ConfirmDialogProps');
  });

  await t.test('ConfirmDialog implements accessibility standards and Escape key dismissal', () => {
    const content = fs.readFileSync(dialogPath, 'utf-8');
    assert.match(content, /role=["']dialog["']/, 'Must include ARIA role="dialog"');
    assert.match(content, /aria-modal=["']true["']/, 'Must include aria-modal="true"');
    assert.match(content, /aria-labelledby/, 'Must include aria-labelledby');
    assert.match(content, /aria-describedby/, 'Must include aria-describedby');
    assert.match(content, /Escape/, 'Must listen for Escape key');
    assert.match(content, /addEventListener\(['"]keydown['"]/, 'Must bind keydown listener');
    assert.match(content, /removeEventListener\(['"]keydown['"]/, 'Must clean up keydown listener');
    assert.match(content, /z-50/, 'Must have z-50 backdrop');
    assert.match(content, /backdrop-blur/, 'Must have backdrop blur');
  });

  await t.test('app/ledger/page.tsx wires ConfirmDialog for record deletions with undo safeguard notice', () => {
    assert.ok(fs.existsSync(ledgerPath), 'app/ledger/page.tsx must exist');
    const content = fs.readFileSync(ledgerPath, 'utf-8');
    assert.match(content, /ConfirmDialog/, 'Ledger must import and render ConfirmDialog');
    assert.match(content, /pendingDeleteId/, 'Ledger must maintain pendingDeleteId state');
    assert.match(content, /setPendingDeleteId/, 'Ledger must have setPendingDeleteId');
    assert.match(
      content,
      /Hapus Penerimaan Kayu\?\s*\(确认删除入库记录\)/,
      'Must have bilingual delete confirmation title'
    );
    assert.match(
      content,
      /diurungkan melalui notifikasi/,
      'Must explain that record deletion can be undone via toast notification'
    );
  });

  await t.test('app/suppliers/page.tsx wires ConfirmDialog for supplier deletions', () => {
    assert.ok(fs.existsSync(suppliersPath), 'app/suppliers/page.tsx must exist');
    const content = fs.readFileSync(suppliersPath, 'utf-8');
    assert.match(content, /ConfirmDialog/, 'Suppliers page must import and render ConfirmDialog');
    assert.match(content, /pendingDeleteSupplier/, 'Suppliers page must maintain pendingDeleteSupplier state');
    assert.match(content, /setPendingDeleteSupplier/, 'Suppliers page must have setPendingDeleteSupplier');
    assert.match(
      content,
      /Hapus Rekanan Supplier\?\s*\(确认删除供应商\)/,
      'Must have bilingual delete confirmation title'
    );
    assert.match(
      content,
      /direktori aktif rekanan/,
      'Must describe supplier deletion impact'
    );
  });
});
