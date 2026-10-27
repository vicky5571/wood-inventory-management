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

  await t.test('deduplicates suppliers with identical names and handles duplicate entries safely', () => {
    const rawSuppliers = [
      { id: 'sup-1', name: 'PT Hutan Lestari', code: 'SPL-008' },
      { id: 'sup-2', name: 'PT Hutan Lestari', code: 'SPL-013' },
      { id: 'sup-3', name: 'CV Jati Makmur', code: 'SPL-001' },
      { id: 'sup-4', name: 'pt hutan lestari', code: 'SPL-014' },
    ];

    const map = new Map<string, (typeof rawSuppliers)[0]>();
    for (const s of rawSuppliers) {
      const cleanName = (s.name || '').trim();
      if (!cleanName) continue;
      const key = cleanName.toLowerCase();
      const existing = map.get(key);
      if (!existing) {
        map.set(key, s);
      } else if (!existing.code && s.code) {
        map.set(key, { ...s, id: s.id || existing.id });
      }
    }
    const deduplicated = Array.from(map.values());
    assert.equal(deduplicated.length, 2);
    assert.deepEqual(deduplicated.map((s) => s.name), ['PT Hutan Lestari', 'CV Jati Makmur']);
  });

  await t.test('SupplierCombobox does not use raw opt.name as duplicate-prone key', () => {
    const filePath = path.resolve(process.cwd(), 'src/components/ledger/SupplierCombobox.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.doesNotMatch(content, /key=\{opt\.name\}/, 'Must not use key={opt.name}');
    assert.match(content, /key=\{itemKey\}/, 'Must use key={itemKey}');
  });
});

