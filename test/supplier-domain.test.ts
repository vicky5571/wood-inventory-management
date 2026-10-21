import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEED_SUPPLIERS } from '../src/persistence/seed/fixtures.ts';
import { formatActivityDescription } from '../src/utils/activity-logger.ts';
import type { Supplier } from '../src/types/index.ts';

test('Supplier SSOT Domain & Seed Invariants Suite', async (t) => {
  await t.test('SEED_SUPPLIERS contains valid active supplier profiles matching receiving records', () => {
    assert.ok(Array.isArray(SEED_SUPPLIERS));
    assert.ok(SEED_SUPPLIERS.length >= 4);

    const names = SEED_SUPPLIERS.map((s) => s.name);
    assert.ok(names.includes('Perum Perhutani KPH Randublatung'));
    assert.ok(names.includes('Perum Perhutani KPH Mantingan'));
    assert.ok(names.includes('PT Hutan Lestari Nusantara'));
    assert.ok(names.includes('CV Rimba Kayu Jaya'));

    for (const s of SEED_SUPPLIERS) {
      assert.ok(s.id.toUpperCase().startsWith('SPL-'));
      assert.ok(s.code.startsWith('SPL-'));
      assert.ok(s.name.trim().length > 0);
      assert.equal(s.status, 'ACTIVE');
      assert.ok(s.createdAt);
      assert.ok(s.updatedAt);
    }
  });

  await t.test('formatActivityDescription formats supplier lifecycle actions with bilingual labels', () => {
    const createdMsg = formatActivityDescription('SUPPLIER_CREATED', 'PT Rimba Baru');
    assert.equal(createdMsg, 'Pemasok baru didaftarkan: PT Rimba Baru (新增供应商)');

    const updatedMsg = formatActivityDescription('SUPPLIER_UPDATED', 'PT Rimba Baru');
    assert.equal(updatedMsg, 'Data pemasok diperbarui: PT Rimba Baru (更新供应商)');

    const deletedMsg = formatActivityDescription('SUPPLIER_DELETED', 'PT Rimba Baru');
    assert.equal(deletedMsg, 'Pemasok dihapus: PT Rimba Baru (删除供应商)');
  });
});
