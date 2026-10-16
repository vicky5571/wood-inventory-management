import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import { ServerRecordStore } from '../src/persistence/server-record-store.ts';
import { SEED_WOOD_RECORDS } from '../src/persistence/seed-data.ts';
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

  await t.test('getAll() initializes with 4 seed records when file does not exist', async () => {
    const records = await store.getAll();
    assert.equal(records.length, 4);
    assert.equal(records[0].id, SEED_WOOD_RECORDS[0].id);

    // Verify file was written to disk
    const content = await fs.readFile(TEST_FILE_PATH, 'utf-8');
    const onDisk = JSON.parse(content);
    assert.equal(Array.isArray(onDisk), true);
    assert.equal(onDisk.length, 4);
  });

  await t.test('reset() re-seeds store back to 4 seed records', async () => {
    const resetRecords = await store.reset();
    assert.equal(resetRecords.length, 4);
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
    assert.equal(all.length, 5);
    assert.equal(all[0].id, saved.id, 'New record should be prepended to the front');

    // Verify on disk
    const onDiskRaw = await fs.readFile(TEST_FILE_PATH, 'utf-8');
    const onDisk = JSON.parse(onDiskRaw);
    assert.equal(onDisk.length, 5);
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
    assert.equal(reloaded.length, 4);
    assert.ok(!reloaded.some((r) => r.id === targetId));

    // Verify on disk
    const onDiskRaw = await fs.readFile(TEST_FILE_PATH, 'utf-8');
    const onDisk = JSON.parse(onDiskRaw);
    assert.equal(onDisk.length, 4);
  });

  await t.test('delete() returns false when record does not exist', async () => {
    const result = await store.delete('non-existent-id-999');
    assert.equal(result, false);
  });
});

test('Records API Route Handlers Suite', async (t) => {
  const managerToken = createSessionToken({
    id: 'usr-1',
    email: 'manager@timber.id',
    name: 'Manager',
    roleLevel: 1,
    title: 'Manager',
  });

  const staffToken = createSessionToken({
    id: 'usr-2',
    email: 'staff@timber.id',
    name: 'Staff',
    roleLevel: 2,
    title: 'Staff',
  });

  const viewerToken = createSessionToken({
    id: 'usr-3',
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

  await t.test('POST /api/records with roleLevel 1 or 2 saves valid record', async () => {
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

    const req = new Request('http://localhost:3000/api/records', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${COOKIE_NAME}=${staffToken}`,
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
