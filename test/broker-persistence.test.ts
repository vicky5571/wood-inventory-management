import test from 'node:test';
import assert from 'node:assert/strict';
import { createSqliteDatabase } from '../src/persistence/sqlite/db.ts';
import { runMigrations } from '../src/persistence/sqlite/migrations.ts';
import {
  getBrokersFromDb,
  saveBrokerToDb,
  deleteBrokerFromDb,
} from '../src/persistence/sqlite/broker-queries.ts';
import { BrokerRepository } from '../src/persistence/broker-repository.ts';
import { MemoryStorageAdapter } from '../src/persistence/storage.ts';

test('Broker SQLite & Client Repository Persistence Suite', async (t) => {
  const db = createSqliteDatabase(':memory:');
  runMigrations(db);
  t.after(() => db.close());

  await t.test('SQLite: seeds default brokers and returns active list', () => {
    const brokers = getBrokersFromDb(db);
    assert.ok(brokers.length >= 3);
    const agus = brokers.find((b) => b.code === 'BRK-001');
    assert.ok(agus);
    assert.equal(agus.name, 'Pak Agus Santoso');
    assert.equal(agus.defaultCommissionPerM3, 50000);
    assert.equal(agus.status, 'ACTIVE');
  });

  await t.test('SQLite: creates new broker and auto-generates code if absent', () => {
    const created = saveBrokerToDb(db, {
      name: 'CV Sentosa Perkasa',
      phone: '0812-9988-7766',
      defaultCommissionPerM3: 60000,
    });
    assert.ok(created.id);
    assert.ok(created.code.startsWith('BRK-'));
    assert.equal(created.name, 'CV Sentosa Perkasa');
    assert.equal(created.defaultCommissionPerM3, 60000);

    const all = getBrokersFromDb(db);
    assert.ok(all.some((b) => b.id === created.id));
  });

  await t.test('SQLite: updates existing broker', () => {
    const created = saveBrokerToDb(db, {
      name: 'Broker Update Test',
      defaultCommissionPerM3: 35000,
    });

    const updated = saveBrokerToDb(db, {
      id: created.id,
      name: 'Broker Update Test Renamed',
      defaultCommissionPerM3: 45000,
    });
    assert.equal(updated.name, 'Broker Update Test Renamed');
    assert.equal(updated.defaultCommissionPerM3, 45000);
  });

  await t.test('SQLite: soft-deletes broker (sets status to INACTIVE)', () => {
    const created = saveBrokerToDb(db, { name: 'Broker To Delete' });
    const success = deleteBrokerFromDb(db, created.id);
    assert.equal(success, true);

    const all = getBrokersFromDb(db);
    const target = all.find((b) => b.id === created.id);
    assert.ok(target);
    assert.equal(target.status, 'INACTIVE');
  });

  await t.test('BrokerRepository: in-memory / local storage CRUD operations', () => {
    const memStorage = new MemoryStorageAdapter();
    const repo = new BrokerRepository(undefined, memStorage);

    const initial = repo.getAll();
    assert.ok(initial.length >= 3);

    const saved = repo.save({
      name: 'Broker Repo Test',
      phone: '0811-0000-1111',
    });
    assert.equal(saved.name, 'Broker Repo Test');

    const filtered = repo.filter({ searchQuery: 'Repo Test' });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, saved.id);

    repo.delete(saved.id);
    const afterDelete = repo.getById(saved.id);
    assert.equal(afterDelete?.status, 'INACTIVE');

    repo.restore(saved.id);
    const afterRestore = repo.getById(saved.id);
    assert.equal(afterRestore?.status, 'ACTIVE');
  });
});
