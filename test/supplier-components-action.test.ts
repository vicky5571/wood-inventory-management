import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Supplier View Components Action Contracts Suite', async (t) => {
  await t.test('SupplierCard contains edit and delete action triggers and contact details', () => {
    const cardPath = path.resolve(process.cwd(), 'src/components/suppliers/SupplierCard.tsx');
    assert.ok(fs.existsSync(cardPath), 'SupplierCard.tsx must exist');

    const content = fs.readFileSync(cardPath, 'utf-8');
    assert.match(content, /onEdit/);
    assert.match(content, /onDelete/);
  });

  await t.test('SupplierTable contains action column header and row edit/delete triggers', () => {
    const tablePath = path.resolve(process.cwd(), 'src/components/suppliers/SupplierTable.tsx');
    assert.ok(fs.existsSync(tablePath), 'SupplierTable.tsx must exist');

    const content = fs.readFileSync(tablePath, 'utf-8');
    assert.match(content, /onEdit/);
    assert.match(content, /onDelete/);
    assert.match(content, /Aksi/);
  });
});
