import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorageAdapter } from '../src/persistence/storage.ts';
import { WoodRecordRepository } from '../src/persistence/record-repository.ts';
import { SEED_WOOD_RECORDS } from '../src/persistence/seed-data.ts';

test('WoodRecordRepository CRUD & Filtering Suite', async (t) => {
  const storage = new MemoryStorageAdapter();
  const repo = new WoodRecordRepository(storage);

  await t.test('initializes with seed data when empty', async () => {
    const records = await repo.getAll();
    assert.ok(records.length >= 4, 'Should contain seed records');
    assert.strictEqual(records[0].woodSpecies, SEED_WOOD_RECORDS[0].woodSpecies);
  });

  await t.test('filters records by species and query', async () => {
    const teakOnly = await repo.getFiltered({ species: 'Teak / Jati (柚木)' });
    assert.ok(teakOnly.length > 0);
    assert.ok(teakOnly.every((r) => r.woodSpecies.includes('Teak')));

    const querySearch = await repo.getFiltered({ searchQuery: 'SKSHHK-2026-001' });
    assert.strictEqual(querySearch.length, 1);
  });

  await t.test('filters records by kavling and date range', async () => {
    const kav01 = await repo.getFiltered({ kavling: 'KAV-01' });
    assert.strictEqual(kav01.length, 1);
    assert.strictEqual(kav01[0].kavlingNumber, 'KAV-01');

    const dateFiltered = await repo.getFiltered({
      startDate: '2026-10-02',
      endDate: '2026-10-06',
    });
    assert.ok(dateFiltered.length > 0);
    assert.ok(
      dateFiltered.every(
        (r) => r.receiptDate >= '2026-10-02' && r.receiptDate <= '2026-10-06'
      )
    );
  });

  await t.test('saves a new record and updates existing', async () => {
    const newRecord = { ...SEED_WOOD_RECORDS[0], id: 'custom-rec-99', receiptNumber: 'KW-NEW-99' };
    await repo.save(newRecord);

    const retrieved = await repo.getById('custom-rec-99');
    assert.ok(retrieved !== null);
    assert.strictEqual(retrieved?.receiptNumber, 'KW-NEW-99');

    // Update
    newRecord.supplierName = 'Updated Supplier';
    await repo.save(newRecord);
    const updated = await repo.getById('custom-rec-99');
    assert.strictEqual(updated?.supplierName, 'Updated Supplier');
  });

  await t.test('getById returns null for nonexistent id', async () => {
    const retrieved = await repo.getById('nonexistent-id');
    assert.strictEqual(retrieved, null);
  });

  await t.test('deletes record successfully', async () => {
    await repo.delete('custom-rec-99');
    const retrieved = await repo.getById('custom-rec-99');
    assert.strictEqual(retrieved, null);
  });

  await t.test('resetToSeed resets repository back to fresh seed data', async () => {
    // Delete one item
    await repo.delete(SEED_WOOD_RECORDS[0].id);
    const current = await repo.getAll();
    assert.strictEqual(current.length, SEED_WOOD_RECORDS.length - 1);

    const fresh = await repo.resetToSeed();
    assert.strictEqual(fresh.length, SEED_WOOD_RECORDS.length);
    const reloaded = await repo.getAll();
    assert.strictEqual(reloaded.length, SEED_WOOD_RECORDS.length);
    assert.strictEqual(reloaded[0].id, SEED_WOOD_RECORDS[0].id);
  });
});
