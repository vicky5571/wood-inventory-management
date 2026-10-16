import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorageAdapter } from '../src/persistence/storage.ts';
import { WoodRecordRepository } from '../src/persistence/record-repository.ts';
import { SEED_WOOD_RECORDS } from '../src/persistence/seed-data.ts';

test('Ledger Date Range Filtering & Persistence Suite', async (t) => {
  const storage = new MemoryStorageAdapter();
  await storage.setItem('wood_receiving_records_v1', JSON.stringify(SEED_WOOD_RECORDS));
  const repo = new WoodRecordRepository(storage);

  await t.test('filters records within inclusive date bounds', async () => {
    const oct1to3 = await repo.getFiltered({
      startDate: '2026-10-01',
      endDate: '2026-10-03',
    });

    assert.equal(oct1to3.length, 2);
    assert.ok(oct1to3.every((r) => r.receiptDate >= '2026-10-01' && r.receiptDate <= '2026-10-03'));
  });

  await t.test('combines date filter with search query and species', async () => {
    const filtered = await repo.getFiltered({
      startDate: '2026-10-01',
      endDate: '2026-10-05',
      species: 'Teak / Jati (柚木)',
    });

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].woodSpecies, 'Teak / Jati (柚木)');
  });
});
