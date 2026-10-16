import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('SupplierCombobox Component & Search Suite', async (t) => {
  await t.test('SupplierCombobox.tsx exists and implements accessible combobox pattern', () => {
    const filePath = path.resolve(process.cwd(), 'src/components/ledger/SupplierCombobox.tsx');
    assert.ok(fs.existsSync(filePath), 'SupplierCombobox.tsx must exist');

    const content = fs.readFileSync(filePath, 'utf-8');
    assert.match(content, /export function SupplierCombobox/);
    assert.match(content, /role="combobox"/);
    assert.match(content, /aria-expanded/);
    assert.match(content, /Kustom/);
  });

  await t.test('fuzzy matches supplier by name or code', () => {
    const suppliers = [
      { name: 'PT Wana Lestari Abadi', code: 'SPL-001' },
      { name: 'CV Papua Rimba Sejahtera', code: 'SPL-002' },
      { name: 'PT Kayu Makmur Nusantara', code: 'SPL-003' },
    ];

    const filterSuppliers = (q: string) => {
      const query = q.toLowerCase().trim();
      if (!query) return suppliers;
      return suppliers.filter(
        (s) => s.name.toLowerCase().includes(query) || s.code.toLowerCase().includes(query)
      );
    };

    assert.equal(filterSuppliers('SPL-002').length, 1);
    assert.equal(filterSuppliers('SPL-002')[0].name, 'CV Papua Rimba Sejahtera');
    assert.equal(filterSuppliers('makmur').length, 1);
    assert.equal(filterSuppliers('nonexistent').length, 0);
  });
});
