import test from 'node:test';
import assert from 'node:assert/strict';
import { SqliteRecordStore } from '../src/persistence/sqlite-record-store.ts';
import { ServerRecordStore } from '../src/persistence/server-record-store.ts';
import { GET, POST } from '../app/api/storage-locations/route.ts';
import { createSessionToken, COOKIE_NAME } from '../src/auth/session.ts';
import type { StorageLotStatus } from '../src/types/index.ts';

test('Storage Locations SQLite Persistence & REST API Suite', async (t) => {
  const managerToken = createSessionToken({
    id: 'usr-mgr',
    email: 'manager@timber.id',
    name: 'Manager',
    roleLevel: 1,
    title: 'Operations Manager',
  });

  const staffToken = createSessionToken({
    id: 'usr-staff',
    email: 'staff@timber.id',
    name: 'Staff',
    roleLevel: 2,
    title: 'Clerk',
  });

  const viewerToken = createSessionToken({
    id: 'usr-view',
    email: 'viewer@timber.id',
    name: 'Viewer',
    roleLevel: 3,
    title: 'Observer',
  });

  await t.test('SqliteRecordStore: getStorageLocations returns yards and joined lots', async () => {
    const store = new SqliteRecordStore(':memory:');
    const locations = await store.getStorageLocations();

    assert.ok(Array.isArray(locations.yards));
    assert.ok(Array.isArray(locations.lots));
    assert.ok(locations.yards.length > 0, 'should have initial seed yards');
    assert.ok(locations.lots.length > 0, 'should have initial seed lots');

    const firstYard = locations.yards[0];
    assert.ok(firstYard.id);
    assert.ok(firstYard.yardCode);
    assert.ok(firstYard.name);

    const firstLot = locations.lots[0];
    assert.ok(firstLot.id);
    assert.ok(firstLot.yardId);
    assert.ok(firstLot.lotCode);
    assert.ok(firstLot.status);
    assert.ok(firstLot.yardCode, 'joined yardCode must be present');
    assert.ok(firstLot.yardName, 'joined yardName must be present');
  });

  await t.test('SqliteRecordStore: saveStorageYard creates and updates a yard', async () => {
    const store = new SqliteRecordStore(':memory:');
    const created = await store.saveStorageYard({
      name: 'TPK-Gudang-Baru',
      yardCode: 'TPK-GB',
      description: 'Gudang transit baru',
    });

    assert.ok(created.id);
    assert.strictEqual(created.name, 'TPK-Gudang-Baru');
    assert.strictEqual(created.yardCode, 'TPK-GB');
    assert.strictEqual(created.description, 'Gudang transit baru');

    const updated = await store.saveStorageYard({
      id: created.id,
      name: 'TPK-Gudang-Baru-Renovasi',
      yardCode: 'TPK-GB',
      description: 'Gudang transit selesai renovasi',
    });

    assert.strictEqual(updated.id, created.id);
    assert.strictEqual(updated.name, 'TPK-Gudang-Baru-Renovasi');
    assert.strictEqual(updated.description, 'Gudang transit selesai renovasi');
  });

  await t.test('SqliteRecordStore: saveStorageLot creates and updates a lot', async () => {
    const store = new SqliteRecordStore(':memory:');
    const yard = await store.saveStorageYard({
      name: 'TPK-Lot-Test',
      yardCode: 'TPK-LT',
    });

    const lot = await store.saveStorageLot({
      yardId: yard.id,
      lotCode: 'KAV-X1',
      status: 'ACTIVE' as StorageLotStatus,
    });

    assert.ok(lot.id);
    assert.strictEqual(lot.yardId, yard.id);
    assert.strictEqual(lot.lotCode, 'KAV-X1');
    assert.strictEqual(lot.status, 'ACTIVE');

    const updatedLot = await store.saveStorageLot({
      id: lot.id,
      yardId: yard.id,
      lotCode: 'KAV-X1',
      status: 'FULL' as StorageLotStatus,
    });

    assert.strictEqual(updatedLot.id, lot.id);
    assert.strictEqual(updatedLot.status, 'FULL');
  });

  await t.test('ServerRecordStore: bridges storage location methods in SQLite mode', async () => {
    const sqliteStore = new SqliteRecordStore(':memory:');
    const serverStore = new ServerRecordStore(sqliteStore);

    const locations = await serverStore.getStorageLocations();
    assert.ok(Array.isArray(locations.yards));
    assert.ok(Array.isArray(locations.lots));

    const yard = await serverStore.saveStorageYard({
      name: 'TPK-Bridge-Test',
      yardCode: 'TPK-BT',
    });
    assert.strictEqual(yard.name, 'TPK-Bridge-Test');

    const lot = await serverStore.saveStorageLot({
      yardId: yard.id,
      lotCode: 'KAV-B1',
      status: 'MAINTENANCE',
    });
    assert.strictEqual(lot.lotCode, 'KAV-B1');
    assert.strictEqual(lot.status, 'MAINTENANCE');
  });

  await t.test('ServerRecordStore: bridges storage location methods in file mode', async () => {
    const serverStore = new ServerRecordStore('/tmp/test-wood-records.json');
    const locations = await serverStore.getStorageLocations();
    assert.ok(Array.isArray(locations.yards));
    assert.ok(Array.isArray(locations.lots));

    const yard = await serverStore.saveStorageYard({
      name: 'TPK-File-Test',
    });
    assert.strictEqual(yard.name, 'TPK-File-Test');

    const lot = await serverStore.saveStorageLot({
      yardId: yard.id,
      lotCode: 'KAV-F1',
      status: 'ACTIVE',
    });
    assert.strictEqual(lot.lotCode, 'KAV-F1');
  });

  await t.test('GET /api/storage-locations returns 200 with yards and lots', async () => {
    const req = new Request('http://localhost:3000/api/storage-locations', {
      method: 'GET',
    });

    const res = await GET();
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data.yards));
    assert.ok(Array.isArray(body.data.lots));
  });

  await t.test('POST /api/storage-locations rejects unauthenticated requests with 401', async () => {
    const req = new Request('http://localhost:3000/api/storage-locations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'yard', name: 'TPK-Hacker' }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  await t.test('POST /api/storage-locations rejects viewer role (roleLevel 3) with 403', async () => {
    const req = new Request('http://localhost:3000/api/storage-locations', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${COOKIE_NAME}=${viewerToken}`,
      },
      body: JSON.stringify({ type: 'yard', name: 'TPK-Viewer-Yard' }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  await t.test('POST /api/storage-locations validates payload type and required fields', async () => {
    const req = new Request('http://localhost:3000/api/storage-locations', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${COOKIE_NAME}=${staffToken}`,
      },
      body: JSON.stringify({ type: 'invalid_type' }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  await t.test('POST /api/storage-locations saves a new yard successfully', async () => {
    const req = new Request('http://localhost:3000/api/storage-locations', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify({
        type: 'yard',
        name: 'TPK-REST-Yard',
        yardCode: 'TPK-RY',
        description: 'Yard created via REST API',
      }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.name, 'TPK-REST-Yard');
    assert.strictEqual(body.data.yardCode, 'TPK-RY');
  });

  await t.test('POST /api/storage-locations saves a new lot successfully', async () => {
    const req = new Request('http://localhost:3000/api/storage-locations', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${COOKIE_NAME}=${staffToken}`,
      },
      body: JSON.stringify({
        type: 'lot',
        yardId: 'yard-timur',
        lotCode: 'KAV-REST-01',
        status: 'ACTIVE',
      }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.lotCode, 'KAV-REST-01');
    assert.strictEqual(body.data.status, 'ACTIVE');
  });
});
