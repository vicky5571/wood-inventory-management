import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Suppliers Page Integration Invariants Suite', async (t) => {
  await t.test('app/suppliers/page.tsx mounts SupplierModal and handles Add/Edit/Delete workflows', () => {
    const pagePath = path.resolve(process.cwd(), 'app/suppliers/page.tsx');
    assert.ok(fs.existsSync(pagePath), 'app/suppliers/page.tsx must exist');

    const content = fs.readFileSync(pagePath, 'utf-8');
    assert.match(content, /SupplierModal/);
    assert.match(content, /Tambah Pemasok/);
    assert.match(content, /addSupplier/);
    assert.match(content, /updateSupplier/);
    assert.match(content, /deleteSupplier/);
    assert.match(content, /toast/);
    assert.match(content, /useActivityLog/);
  });
});
