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

  await t.test('SqliteRecordStore: getStorageLocations returns canonical yards and joined lots', async () => {
    const store = new SqliteRecordStore(':memory:');
    const locations = await store.getStorageLocations();

    assert.ok(Array.isArray(locations.yards));
    assert.ok(Array.isArray(locations.lots));
    assert.ok(locations.yards.length >= 4, 'should have at least 4 canonical seed yards');
    assert.ok(locations.lots.length >= 8, 'should have at least 8 canonical seed lots');

    const canonicalYardIds = ['yard-barat', 'yard-selatan', 'yard-timur', 'yard-utara'];
    for (const yId of canonicalYardIds) {
      assert.ok(locations.yards.some((y) => y.id === yId), `canonical yard ${yId} must be present`);
    }

    const canonicalLotIds = [
      'lot-kav-01',
      'lot-kav-02',
      'lot-kav-03',
      'lot-kav-04',
      'lot-kav-05',
      'lot-kav-06',
      'lot-kav-07',
      'lot-kav-08',
    ];
    for (const lId of canonicalLotIds) {
      assert.ok(locations.lots.some((l) => l.id === lId), `canonical lot ${lId} must be present`);
    }

    const fullLot = locations.lots.find((l) => l.id === 'lot-kav-04');
    assert.strictEqual(fullLot?.status, 'FULL');
    assert.strictEqual(fullLot?.yardCode, 'TPK-U');

    const maintLot = locations.lots.find((l) => l.id === 'lot-kav-06');
    assert.strictEqual(maintLot?.status, 'MAINTENANCE');
    assert.strictEqual(maintLot?.yardCode, 'TPK-B');
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

  await t.test('GET /api/storage-locations returns 200 with canonical yards and lots', async () => {
    const res = await GET();
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data.yards));
    assert.ok(Array.isArray(body.data.lots));
    assert.ok(body.data.yards.length >= 4);
    assert.ok(body.data.lots.length >= 8);

    const yardIds = body.data.yards.map((y: any) => y.id);
    assert.ok(yardIds.includes('yard-timur'));
    assert.ok(yardIds.includes('yard-utara'));
    assert.ok(yardIds.includes('yard-barat'));
    assert.ok(yardIds.includes('yard-selatan'));

    const lotIds = body.data.lots.map((l: any) => l.id);
    for (let i = 1; i <= 8; i++) {
      assert.ok(lotIds.includes(`lot-kav-0${i}`));
    }
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

  await t.test('POST /api/storage-locations rejects invalid lot status with 400', async () => {
    const req = new Request('http://localhost:3000/api/storage-locations', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${COOKIE_NAME}=${staffToken}`,
      },
      body: JSON.stringify({
        type: 'lot',
        yardId: 'yard-timur',
        lotCode: 'KAV-INVALID',
        status: 'CORRUPTED',
      }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.error, /Invalid lot status/);
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

  await t.test('POST /api/storage-locations saves lot to canonical yard without creating phantom yards', async () => {
    const beforeRes = await GET();
    const beforeBody = await beforeRes.json();
    const initialYardCount = beforeBody.data.yards.length;

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
    assert.strictEqual(body.data.yardId, 'yard-timur');
    assert.strictEqual(body.data.lotCode, 'KAV-REST-01');
    assert.strictEqual(body.data.status, 'ACTIVE');

    const afterRes = await GET();
    const afterBody = await afterRes.json();
    assert.strictEqual(afterBody.data.yards.length, initialYardCount);
  });
});
