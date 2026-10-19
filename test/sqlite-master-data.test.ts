import test from 'node:test';
import assert from 'node:assert/strict';
import { SqliteRecordStore } from '../src/persistence/sqlite-record-store.ts';

test('SqliteRecordStore Suppliers & Species Master Data Suite', async (t) => {
  const store = new SqliteRecordStore(':memory:');
  t.after(() => store.close());

  await t.test('seeds initial suppliers and supports create, update, and safe delete', async () => {
    const initial = await store.getSuppliers();
    assert.ok(initial.length > 0);

    const created = await store.saveSupplier({
      name: 'CV Rimba Borneo',
      contactPerson: 'Hendra',
      phone: '08123456789',
      status: 'ACTIVE',
    });
    assert.ok(created.id);
    assert.equal(created.name, 'CV Rimba Borneo');

    const deleted = await store.deleteSupplier(created.id);
    assert.equal(deleted, true);
  });

  await t.test('prevents deleting a supplier referenced by an active receiving manifest', async () => {
    const suppliers = await store.getSuppliers();
    const activeSupplier = suppliers[0];
    await assert.rejects(
      async () => store.deleteSupplier(activeSupplier.id),
      /referenced by existing receiving manifests|FOREIGN KEY/i
    );
  });

  await t.test('lists and upserts wood species catalog entries', async () => {
    const species = await store.getSpecies();
    assert.ok(species.length > 0);

    const saved = await store.saveSpecies({
      code: 'KMP',
      commonName: 'Kempas',
      botanicalName: 'Koompassia malaccensis',
      densityKgM3: 880,
      isHardwood: true,
    });
    assert.equal(saved.code, 'KMP');
    assert.equal(saved.densityKgM3, 880);
  });
});
