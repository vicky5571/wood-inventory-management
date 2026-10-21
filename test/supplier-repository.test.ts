import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SupplierRepository } from '../src/persistence/supplier-repository.ts';
import { MemoryStorageAdapter } from '../src/persistence/storage.ts';
import { SEED_SUPPLIERS } from '../src/persistence/seed/fixtures.ts';

test('SupplierRepository CRUD & Persistence Suite', async (t) => {
  await t.test('initializes with seed data when storage is empty', () => {
    const storage = new MemoryStorageAdapter();
    const repo = new SupplierRepository(SEED_SUPPLIERS, storage);
    const all = repo.getAll();

    assert.equal(all.length, SEED_SUPPLIERS.length);
    assert.equal(all[0].name, SEED_SUPPLIERS[0].name);
  });

  await t.test('filters suppliers by search query and active status', () => {
    const storage = new MemoryStorageAdapter();
    const repo = new SupplierRepository(SEED_SUPPLIERS, storage);

    const rimbaSearch = repo.getAll({ searchQuery: 'rimba kayu' });
    assert.equal(rimbaSearch.length, 1);
    assert.equal(rimbaSearch[0].code, 'SPL-005');

    const activeOnly = repo.getAll({ status: 'ACTIVE' });
    assert.equal(activeOnly.length, SEED_SUPPLIERS.length);
  });

  await t.test('creates new supplier and generates deterministic unique code and id', () => {
    const storage = new MemoryStorageAdapter();
    const repo = new SupplierRepository(SEED_SUPPLIERS, storage);

    const created = repo.save({
      name: 'PT Rimba Nusantara Mandiri',
      contactPerson: 'Agus Salim',
      phone: '0812-9988-7766',
      status: 'ACTIVE',
    });

    assert.ok(created.id.startsWith('spl-'));
    assert.equal(created.code, 'SPL-008');
    assert.equal(created.name, 'PT Rimba Nusantara Mandiri');

    const fetched = repo.getById(created.id);
    assert.equal(fetched?.name, 'PT Rimba Nusantara Mandiri');
    assert.equal(repo.getAll().length, SEED_SUPPLIERS.length + 1);
  });

  await t.test('updates existing supplier attributes while preserving id and timestamps', () => {
    const storage = new MemoryStorageAdapter();
    const repo = new SupplierRepository(SEED_SUPPLIERS, storage);

    const original = repo.getAll()[0];
    const updated = repo.save({
      ...original,
      contactPerson: 'Hendra Wijaya (Updated)',
      phone: '0812-0000-1111',
    });

    assert.equal(updated.id, original.id);
    assert.equal(updated.contactPerson, 'Hendra Wijaya (Updated)');
    assert.equal(updated.phone, '0812-0000-1111');
    assert.notEqual(updated.updatedAt, original.createdAt);
  });

  await t.test('deletes supplier by id successfully', () => {
    const storage = new MemoryStorageAdapter();
    const repo = new SupplierRepository(SEED_SUPPLIERS, storage);

    const targetId = SEED_SUPPLIERS[0].id;
    const deleted = repo.delete(targetId);

    assert.equal(deleted, true);
    assert.equal(repo.getById(targetId), null);
    assert.equal(repo.getAll().length, SEED_SUPPLIERS.length - 1);
  });
});
