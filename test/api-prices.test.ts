import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { POST, GET } from '../app/api/prices/route.ts';
import { createSessionToken, COOKIE_NAME } from '../src/auth/session.ts';
import { runMigrations } from '../src/persistence/sqlite/migrations.ts';
import {
  savePriceEntryToDb,
  lookupPriceEntryFromDb,
  getAllPriceEntriesFromDb,
} from '../src/persistence/sqlite/price-queries.ts';

test('Timber Prices REST API & SQLite Queries Suite', async (t) => {
  const adminToken = createSessionToken({
    id: 'usr-manager-01',
    email: 'manager@timber.id',
    name: 'Budi Santoso',
    roleLevel: 1,
    title: 'Level 1',
  });

  const staffToken = createSessionToken({
    id: 'usr-admin-02',
    email: 'admin@timber.id',
    name: 'Siti Rahmawati',
    roleLevel: 2,
    title: 'Level 2',
  });

  await t.test('POST /api/prices rejects requests missing speciesId', async () => {
    const req = new Request('http://localhost:3000/api/prices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${COOKIE_NAME}=${adminToken}`,
      },
      body: JSON.stringify({
        woodSpecies: 'Jati Log',
        pricePerM3: 3500000,
        effectiveFrom: '2026-03-01',
      }),
    });

    const res = await POST(req);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.match(json.error, /Jenis kayu/);
  });

  await t.test('POST /api/prices rejects requests from non-admin role', async () => {
    const req = new Request('http://localhost:3000/api/prices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${COOKIE_NAME}=${staffToken}`,
      },
      body: JSON.stringify({
        speciesId: 'sp-teak',
        woodSpecies: 'Teak / Jati (柚木)',
        pricePerM3: 3500000,
        effectiveFrom: '2026-03-01',
      }),
    });

    const res = await POST(req);
    assert.equal(res.status, 403);
    const json = await res.json();
    assert.equal(json.success, false);
  });

  await t.test('SQLite price queries use species_id correctly', () => {
    const db = new DatabaseSync(':memory:');
    runMigrations(db);

    db.prepare(`
      INSERT OR IGNORE INTO tenants (id, name, slug)
      VALUES ('default-tenant', 'Default Tenant', 'default-tenant')
    `).run();

    // Insert dummy species first so FK succeeds
    db.prepare(`
      INSERT OR IGNORE INTO wood_species (id, tenant_id, code, common_name, density_kg_m3, is_hardwood, created_at, updated_at)
      VALUES ('sp-teak', 'default-tenant', 'TEAK', 'Teak / Jati', 650, 1, '2026-01-01', '2026-01-01')
    `).run();

    const saved = savePriceEntryToDb(db, {
      speciesId: 'sp-teak',
      woodSpecies: 'Teak / Jati',
      pricePerM3: 4000000,
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-12-31',
      timberPphRate: 0.5,
      notes: 'Standard Teak rate',
    });

    assert.ok(saved.id);
    assert.equal(saved.speciesId, 'sp-teak');
    assert.equal(saved.woodSpecies, 'Teak / Jati');
    assert.equal(saved.pricePerM3, 4000000);

    // Lookup by speciesId
    const found = lookupPriceEntryFromDb(db, 'sp-teak', undefined, '2026-06-01');
    assert.ok(found);
    assert.equal(found.id, saved.id);
    assert.equal(found.speciesId, 'sp-teak');

    // Lookup with non-matching speciesId should return null
    const notFound = lookupPriceEntryFromDb(db, 'sp-merbau', undefined, '2026-06-01');
    assert.equal(notFound, null);

    const all = getAllPriceEntriesFromDb(db);
    assert.equal(all.length, 1);
    assert.equal(all[0].speciesId, 'sp-teak');
  });
});
