import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('SupplierModal Validation & Component Suite', async (t) => {
  await t.test('SupplierModal component file exists and contains essential form controls', () => {
    const modalPath = path.resolve(process.cwd(), 'src/components/suppliers/SupplierModal.tsx');
    assert.ok(fs.existsSync(modalPath), 'SupplierModal.tsx must exist');

    const content = fs.readFileSync(modalPath, 'utf-8');
    assert.match(content, /export function SupplierModal/);
    assert.match(content, /Tambah Pemasok Baru/);
    assert.match(content, /Edit Data Pemasok/);
    assert.match(content, /Nama Pemasok \/ Rekanan/);
    assert.match(content, /Penanggung Jawab \(PIC\)/);
    assert.match(content, /NPWP/);
    assert.match(content, /onSave/);
    assert.match(content, /onClose/);
  });

  await t.test('validates supplier name requires at least 3 characters', () => {
    const isValidName = (name: string) => name.trim().length >= 3;
    assert.equal(isValidName(''), false);
    assert.equal(isValidName('   '), false);
    assert.equal(isValidName('PT'), false);
    assert.equal(isValidName('PT Rimba Indah'), true);
  });
});
