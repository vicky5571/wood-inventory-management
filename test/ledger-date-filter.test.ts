import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorageAdapter } from '../src/persistence/storage.ts';
import { WoodRecordRepository } from '../src/persistence/record-repository.ts';
import { SEED_WOOD_RECORDS } from '../src/persistence/seed/fixtures.ts';

test('Ledger Date Range Filtering & Persistence Suite', async (t) => {
  const storage = new MemoryStorageAdapter();
  await storage.setItem('wood_receiving_records_v1', JSON.stringify(SEED_WOOD_RECORDS));
  const repo = new WoodRecordRepository(storage);

  await t.test('filters records within inclusive date bounds', async () => {
    const julToAug = await repo.getFiltered({
      startDate: '2026-07-25',
      endDate: '2026-08-05',
    });

    assert.equal(julToAug.length, 2);
    assert.ok(julToAug.every((r) => r.receiptDate >= '2026-07-25' && r.receiptDate <= '2026-08-05'));
  });

  await t.test('combines date filter with search query and species', async () => {
    const filtered = await repo.getFiltered({
      startDate: '2026-07-25',
      endDate: '2026-08-01',
      species: 'Jati / Teak (柚木)',
    });

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].woodSpecies, 'Jati / Teak (柚木)');
  });
});
