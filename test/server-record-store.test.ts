import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import { ServerRecordStore, serverRecordStore } from '../src/persistence/server-record-store.ts';
import { SqliteRecordStore } from '../src/persistence/sqlite-record-store.ts';
import { SEED_WOOD_RECORDS } from '../src/persistence/seed/fixtures.ts';
import type { WoodReceivingRecord } from '../src/types/index.ts';
import { GET, POST, DELETE } from '../app/api/records/route.ts';
import { createSessionToken, COOKIE_NAME } from '../src/auth/session.ts';

const TEST_FILE_PATH = path.join(process.cwd(), 'data', 'test_wood_records.json');

async function cleanupTestFile() {
  try {
    await fs.rm(TEST_FILE_PATH, { force: true });
    // Also remove any stray temp files
    const dir = path.dirname(TEST_FILE_PATH);
    const files = await fs.readdir(dir).catch(() => []);
    for (const f of files) {
      if (f.startsWith('test_wood_records.json.tmp')) {
        await fs.rm(path.join(dir, f), { force: true });
      }
    }
  } catch {
    // Ignore cleanup error
  }
}

test('ServerRecordStore Core Persistence Suite', async (t) => {
  await cleanupTestFile();

  t.after(async () => {
    await cleanupTestFile();
  });

  const store = new ServerRecordStore(TEST_FILE_PATH);

  await t.test('getAll() initializes with 10 seed records when file does not exist', async () => {
    const records = await store.getAll();
    assert.equal(records.length, 10);
    assert.equal(records[0].id, SEED_WOOD_RECORDS[0].id);

    // Verify file was written to disk
    const content = await fs.readFile(TEST_FILE_PATH, 'utf-8');
    const onDisk = JSON.parse(content);
    assert.equal(Array.isArray(onDisk), true);
    assert.equal(onDisk.length, 10);
  });

  await t.test('reset() re-seeds store back to 10 seed records', async () => {
    const resetRecords = await store.reset();
    assert.equal(resetRecords.length, 10);
    assert.equal(resetRecords[0].woodSpecies, SEED_WOOD_RECORDS[0].woodSpecies);
  });

  await t.test('save() persists a new record by prepending it with createdAt and updatedAt', async () => {
    const newRecordData = {
      receiptDate: '2026-10-17',
      truckPlateNumber: 'B 1234 XYZ',
      forestryDocNumber: 'DOC-NEW-001',
      receiptNumber: 'KW-NEW-001',
      contractNumber: 'CTR-NEW-01',
      supplierName: 'PT Kayu Baru',
      woodSpecies: 'Bangkirai / Yellow Balau (黄梢)',
      woodLengthM: 4.0,
      kavlingNumber: 'KAV-99',
      storageYard: 'TPK-Baru',
      deliveredPieces: 50,
      deliveredVolumeM3: 10.0,
      tallyPieces: 50,
      tallyVolumeM3: 10.0,
      timberPricePerM3: 3500000,
      timberGrossTotal: 35000000,
      timberPphRate: 0.5,
      timberPphAmount: 175000,
      timberNetPayable: 34825000,
      freightRatePerM3: 200000,
      freightGrossTotal: 2000000,
      freightPphAmount: 40000,
      freightNetPayable: 1960000,
      brokerFee: 250000,
      grandNetPayable: 37035000,
    } as unknown as WoodReceivingRecord;

    const saved = await store.save(newRecordData);
    assert.ok(saved.id, 'Should generate an id if not provided');
    assert.ok(saved.createdAt, 'Should populate createdAt');
    assert.ok(saved.updatedAt, 'Should populate updatedAt');
    assert.equal(saved.woodSpecies, 'Bangkirai / Yellow Balau (黄梢)');

    const all = await store.getAll();
    assert.equal(all.length, 11);
    assert.equal(all[0].id, saved.id, 'New record should be prepended to the front');

    // Verify on disk
    const onDiskRaw = await fs.readFile(TEST_FILE_PATH, 'utf-8');
    const onDisk = JSON.parse(onDiskRaw);
    assert.equal(onDisk.length, 11);
    assert.equal(onDisk[0].id, saved.id);
  });

  await t.test('save() updates an existing record and refreshes updatedAt', async () => {
    const all = await store.getAll();
    const existing = all[0];
    const previousUpdatedAt = existing.updatedAt;

    // Small delay to ensure timestamp difference
    await new Promise((r) => setTimeout(r, 5));

    const updated = await store.save({
      ...existing,
      tallyVolumeM3: 12.5,
      truckPlateNumber: 'B 9999 MOD',
    });

    assert.equal(updated.id, existing.id);
    assert.equal(updated.tallyVolumeM3, 12.5);
    assert.equal(updated.truckPlateNumber, 'B 9999 MOD');
    assert.notEqual(updated.updatedAt, previousUpdatedAt);

    const reloaded = await store.getAll();
    assert.equal(reloaded[0].tallyVolumeM3, 12.5);
    assert.equal(reloaded[0].truckPlateNumber, 'B 9999 MOD');
  });

  await t.test('delete() removes record by id and returns true', async () => {
    const all = await store.getAll();
    const targetId = all[0].id;

    const result = await store.delete(targetId);
    assert.equal(result, true);

    const reloaded = await store.getAll();
    assert.equal(reloaded.length, 10);
    assert.ok(!reloaded.some((r) => r.id === targetId));

    // Verify on disk
    const onDiskRaw = await fs.readFile(TEST_FILE_PATH, 'utf-8');
    const onDisk = JSON.parse(onDiskRaw);
    assert.equal(onDisk.length, 10);
  });

  await t.test('delete() returns false when record does not exist', async () => {
    const result = await store.delete('non-existent-id-999');
    assert.equal(result, false);
  });

  await t.test('handles concurrent saves and deletes without dropping records (runExclusive mutex)', async () => {
    await store.reset(); // back to 10 seed records

    // Concurrently save 10 new distinct records
    const concurrentRecords = Array.from({ length: 10 }, (_, i) => ({
      id: `rec-concurrent-${i}`,
      receiptDate: '2026-10-17',
      truckPlateNumber: `B 100${i} CC`,
      forestryDocNumber: `DOC-CC-${i}`,
      receiptNumber: `KW-CC-${i}`,
      contractNumber: `CTR-CC-${i}`,
      supplierName: `Supplier ${i}`,
      woodSpecies: 'Teak / Jati (柚木)',
      woodLengthM: 4.0,
      kavlingNumber: `KAV-${i}`,
      storageYard: 'TPK-1',
      deliveredPieces: 10,
      deliveredVolumeM3: 2.5,
      tallyPieces: 10,
      tallyVolumeM3: 2.5,
      timberPricePerM3: 3000000,
      timberGrossTotal: 7500000,
      timberPphRate: 0.5,
      timberPphAmount: 37500,
      timberNetPayable: 7462500,
      freightRatePerM3: 200000,
      freightGrossTotal: 500000,
      freightPphAmount: 10000,
      freightNetPayable: 490000,
      brokerFee: 100000,
      grandNetPayable: 8052500,
    } as unknown as WoodReceivingRecord));

    const savedResults = await Promise.all(concurrentRecords.map((r) => store.save(r)));
    assert.equal(savedResults.length, 10);

    const afterConcurrentSave = await store.getAll();
    assert.equal(afterConcurrentSave.length, 20, 'Should contain exactly 10 seed records + 10 saved records');

    // Concurrently delete 5 records
    const toDeleteIds = ['rec-concurrent-0', 'rec-concurrent-2', 'rec-concurrent-4', 'rec-concurrent-6', 'rec-concurrent-8'];
    const deleteResults = await Promise.all(toDeleteIds.map((id) => store.delete(id)));
    assert.ok(deleteResults.every((res) => res === true), 'All 5 concurrent delete operations must return true');

    const afterConcurrentDelete = await store.getAll();
    assert.equal(afterConcurrentDelete.length, 15, 'Should contain exactly 15 records after 5 concurrent deletions');
    for (const deletedId of toDeleteIds) {
      assert.ok(!afterConcurrentDelete.some((r) => r.id === deletedId), `Record ${deletedId} must not exist`);
    }
  });

  await t.test('honors process.env.WOOD_RECORDS_PATH when custom path is not passed', async () => {
    const envTestPath = path.join(process.cwd(), 'data', 'test_env_records.json');
    process.env.WOOD_RECORDS_PATH = envTestPath;
    try {
      const envStore = new ServerRecordStore();
      const records = await envStore.getAll();
      assert.equal(records.length, 10);
      const exists = await fs.stat(envTestPath).then(() => true).catch(() => false);
      assert.ok(exists, 'File at process.env.WOOD_RECORDS_PATH should be created');
    } finally {
      delete process.env.WOOD_RECORDS_PATH;
      await fs.rm(envTestPath, { force: true }).catch(() => {});
    }
  });
});

test('Records API Route Handlers Suite', async (t) => {
  const managerToken = createSessionToken({
    id: 'usr-manager-01',
    email: 'manager@timber.id',
    name: 'Manager',
    roleLevel: 1,
    title: 'Manager',
  });

  const staffToken = createSessionToken({
    id: 'usr-admin-02',
    email: 'admin@timber.id',
    name: 'Staff',
    roleLevel: 2,
    title: 'Staff',
  });

  const viewerToken = createSessionToken({
    id: 'usr-viewer-03',
    email: 'viewer@timber.id',
    name: 'Viewer',
    roleLevel: 3,
    title: 'Auditor',
  });

  await t.test('GET /api/records returns 200 with records list and timestamp', async () => {
    const req = new Request('http://localhost:3000/api/records');
    const res = await GET();
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.timestamp);
  });

  await t.test('POST /api/records without session returns 401 Unauthorized', async () => {
    const req = new Request('http://localhost:3000/api/records', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ woodSpecies: 'Teak', tallyVolumeM3: 5.5 }),
    });

    const res = await POST(req);
    assert.equal(res.status, 401);
  });

  await t.test('POST /api/records with roleLevel 3 returns 403 Akses ditolak', async () => {
    const req = new Request('http://localhost:3000/api/records', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${COOKIE_NAME}=${viewerToken}`,
      },
      body: JSON.stringify({ woodSpecies: 'Teak', tallyVolumeM3: 5.5 }),
    });

    const res = await POST(req);
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.error.includes('Akses ditolak'));
  });

  await t.test('POST /api/records validates required fields (woodSpecies and tallyVolumeM3)', async () => {
    const req = new Request('http://localhost:3000/api/records', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify({ woodSpecies: 'Teak' }), // missing tallyVolumeM3
    });

    const res = await POST(req);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  await t.test('POST /api/records validates tallyVolumeM3 must be a positive finite number', async () => {
    // Negative volume
    const reqNegative = new Request('http://localhost:3000/api/records', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify({ woodSpecies: 'Teak', tallyVolumeM3: -5 }),
    });
    const resNegative = await POST(reqNegative);
    assert.equal(resNegative.status, 400);

    // Zero volume
    const reqZero = new Request('http://localhost:3000/api/records', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify({ woodSpecies: 'Teak', tallyVolumeM3: 0 }),
    });
    const resZero = await POST(reqZero);
    assert.equal(resZero.status, 400);

    // Non-numeric / NaN volume
    const reqNaN = new Request('http://localhost:3000/api/records', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify({ woodSpecies: 'Teak', tallyVolumeM3: NaN }),
    });
    const resNaN = await POST(reqNaN);
    assert.equal(resNaN.status, 400);
  });

  await t.test('POST /api/records with roleLevel 1 saves valid record while roleLevel 2 is rejected', async () => {
    const payload = {
      woodSpecies: 'Mahoni (桃花心木)',
      tallyVolumeM3: 8.5,
      truckPlateNumber: 'AD 5555 ZZ',
      forestryDocNumber: 'DOC-API-01',
      receiptNumber: 'KW-API-01',
      contractNumber: 'CTR-API-01',
      supplierName: 'PT Kayu Lestari',
      woodLengthM: 3.0,
      kavlingNumber: 'KAV-01',
      storageYard: 'TPK-1',
      deliveredPieces: 30,
      deliveredVolumeM3: 8.5,
      tallyPieces: 30,
      timberPricePerM3: 2000000,
      timberGrossTotal: 17000000,
      timberPphRate: 0.5,
      timberPphAmount: 85000,
      timberNetPayable: 16915000,
      freightRatePerM3: 150000,
      freightGrossTotal: 1275000,
      freightPphAmount: 25500,
      freightNetPayable: 1249500,
      brokerFee: 100000,
      grandNetPayable: 18264500,
    };

    // Test POST with Level 2 returns 403 (strictly view-only)
    const reqLevel2 = new Request('http://localhost:3000/api/records', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${COOKIE_NAME}=${staffToken}`,
      },
      body: JSON.stringify(payload),
    });
    const resLevel2 = await POST(reqLevel2);
    assert.equal(resLevel2.status, 403);
    const bodyLevel2 = await resLevel2.json();
    assert.ok(bodyLevel2.error.includes('Hanya Level 1'));

    // Test POST with Level 1 returns 200
    const req = new Request('http://localhost:3000/api/records', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.id);
    assert.equal(body.data.woodSpecies, 'Mahoni (桃花心木)');

    // Save ID for DELETE test
    const createdId = body.data.id;

    // Test DELETE without session returns 401
    const delUnauthReq = new Request(`http://localhost:3000/api/records?id=${createdId}`, {
      method: 'DELETE',
    });
    const delUnauthRes = await DELETE(delUnauthReq);
    assert.equal(delUnauthRes.status, 401);

    // Test DELETE with roleLevel 2 returns 403 (strictly view-only)
    const delLevel2Req = new Request(`http://localhost:3000/api/records?id=${createdId}`, {
      method: 'DELETE',
      headers: { cookie: `${COOKIE_NAME}=${staffToken}` },
    });
    const delLevel2Res = await DELETE(delLevel2Req);
    assert.equal(delLevel2Res.status, 403);
    const level2DelBody = await delLevel2Res.json();
    assert.ok(level2DelBody.error.includes('Hanya Level 1'));

    // Test DELETE with roleLevel 3 returns 403
    const delForbiddenReq = new Request(`http://localhost:3000/api/records?id=${createdId}`, {
      method: 'DELETE',
      headers: { cookie: `${COOKIE_NAME}=${viewerToken}` },
    });
    const delForbiddenRes = await DELETE(delForbiddenReq);
    assert.equal(delForbiddenRes.status, 403);
    const forbiddenBody = await delForbiddenRes.json();
    assert.ok(forbiddenBody.error.includes('Akses ditolak'));

    // Test DELETE without id query param returns 400
    const delNoIdReq = new Request('http://localhost:3000/api/records', {
      method: 'DELETE',
      headers: { cookie: `${COOKIE_NAME}=${managerToken}` },
    });
    const delNoIdRes = await DELETE(delNoIdReq);
    assert.equal(delNoIdRes.status, 400);

    // Test DELETE with roleLevel 1 returns 200
    const delSuccessReq = new Request(`http://localhost:3000/api/records?id=${createdId}`, {
      method: 'DELETE',
      headers: { cookie: `${COOKIE_NAME}=${managerToken}` },
    });
    const delSuccessRes = await DELETE(delSuccessReq);
    assert.equal(delSuccessRes.status, 200);
    const delSuccessBody = await delSuccessRes.json();
    assert.equal(delSuccessBody.success, true);

    // Test DELETE again with same id returns 404
    const delNotFoundReq = new Request(`http://localhost:3000/api/records?id=${createdId}`, {
      method: 'DELETE',
      headers: { cookie: `${COOKIE_NAME}=${managerToken}` },
    });
    const delNotFoundRes = await DELETE(delNotFoundReq);
    assert.equal(delNotFoundRes.status, 404);
  });
});

test('ServerRecordStore SQLite Delegation & Bridge Suite', async (t) => {
  await t.test('singleton serverRecordStore delegates directly to SQLite engine', async () => {
    const records = await serverRecordStore.getAll();
    assert.ok(Array.isArray(records));
    assert.ok(records.length >= 4);

    const first = records[0];
    const fetched = await serverRecordStore.getById(first.id);
    assert.ok(fetched);
    assert.strictEqual(fetched?.id, first.id);
  });

  await t.test('ServerRecordStore accepts custom SqliteRecordStore instance', async () => {
    const memorySqlite = new SqliteRecordStore(':memory:');
    const store = new ServerRecordStore(memorySqlite);

    const initial = await store.getAll();
    assert.strictEqual(initial.length, 10);

    const saved = await store.save({
      woodSpecies: 'Sonokeling (紫檀)',
      tallyVolumeM3: 3.5,
      truckPlateNumber: 'B 7777 SK',
      forestryDocNumber: 'DOC-SK-01',
      receiptNumber: 'KW-SK-01',
      contractNumber: 'CTR-SK-01',
      supplierName: 'PT Rimba Raya',
      woodLengthM: 2.0,
      kavlingNumber: 'KAV-S1',
      storageYard: 'TPK-1',
      deliveredPieces: 10,
      deliveredVolumeM3: 3.5,
      tallyPieces: 10,
      timberPricePerM3: 5000000,
    } as unknown as WoodReceivingRecord);

    assert.ok(saved.id);
    assert.strictEqual(saved.woodSpecies, 'Sonokeling (紫檀)');
    assert.strictEqual(saved.grandNetPayable, 17412500);

    const fetched = await store.getById(saved.id);
    assert.ok(fetched);
    assert.strictEqual(fetched?.truckPlateNumber, 'B 7777 SK');

    const deleted = await store.delete(saved.id);
    assert.strictEqual(deleted, true);

    const afterDelete = await store.getById(saved.id);
    assert.strictEqual(afterDelete, null);

    const resetRecords = await store.reset();
    assert.strictEqual(resetRecords.length, 10);

    store.close();
  });
});

