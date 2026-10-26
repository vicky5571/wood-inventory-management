import test from 'node:test';
import assert from 'node:assert/strict';
import { SqliteRecordStore } from '../src/persistence/sqlite-record-store.ts';
import { ServerRecordStore } from '../src/persistence/server-record-store.ts';
import { GET, POST, PATCH, DELETE } from '../app/api/storage-locations/route.ts';
import { createSessionToken, COOKIE_NAME } from '../src/auth/session.ts';
import type { StorageLotStatus } from '../src/types/index.ts';

test('Storage Locations SQLite Persistence & REST API Suite', async (t) => {
  const managerToken = createSessionToken({
    id: 'usr-manager-01',
    email: 'manager@timber.id',
    name: 'Manager',
    roleLevel: 1,
    title: 'Operations Manager',
  });

  const staffToken = createSessionToken({
    id: 'usr-admin-02',
    email: 'admin@timber.id',
    name: 'Staff',
    roleLevel: 2,
    title: 'Clerk',
  });

  const viewerToken = createSessionToken({
    id: 'usr-viewer-03',
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
    assert.ok(body.data.yards.length >= 3);
    assert.ok(body.data.lots.length >= 8);

    const yardIds = body.data.yards.map((y: any) => y.id);
    assert.ok(yardIds.includes('yard-timur') || yardIds.includes('YARD-TMR'));
    assert.ok(yardIds.includes('yard-utara') || yardIds.includes('YARD-UTR'));
    assert.ok(yardIds.includes('yard-barat') || yardIds.includes('YARD-BRT'));

    const lotCodes = body.data.lots.map((l: any) => l.lotCode);
    for (let i = 1; i <= 8; i++) {
      assert.ok(lotCodes.includes(`KAV-0${i}`));
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

  await t.test('POST /api/storage-locations rejects Level 2 role (roleLevel 2) with 403 (Strictly View-Only)', async () => {
    const req = new Request('http://localhost:3000/api/storage-locations', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${COOKIE_NAME}=${staffToken}`,
      },
      body: JSON.stringify({ type: 'yard', name: 'TPK-Level2-Yard' }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.error, /Hanya Level 1/);
  });

  await t.test('POST /api/storage-locations validates payload type and required fields', async () => {
    const req = new Request('http://localhost:3000/api/storage-locations', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
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
        cookie: `${COOKIE_NAME}=${managerToken}`,
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

    const targetYardId = beforeBody.data.yards[0].id;
    const req = new Request('http://localhost:3000/api/storage-locations', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify({
        type: 'lot',
        yardId: targetYardId,
        lotCode: 'KAV-REST-01',
        status: 'ACTIVE',
      }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.yardId, targetYardId);
    assert.strictEqual(body.data.lotCode, 'KAV-REST-01');
    assert.strictEqual(body.data.status, 'ACTIVE');

    const afterRes = await GET();
    const afterBody = await afterRes.json();
    assert.strictEqual(afterBody.data.yards.length, initialYardCount);
  });

  await t.test('POST /api/storage-locations resolves case-insensitive yard names cleanly without phantom yards', async () => {
    const beforeRes = await GET();
    const beforeBody = await beforeRes.json();
    const initialYardCount = beforeBody.data.yards.length;

    // Use lowercase 'tpk-timur' instead of exact 'TPK-Timur' or 'yard-timur'
    const req = new Request('http://localhost:3000/api/storage-locations', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify({
        type: 'lot',
        yardId: 'tpk-timur',
        lotCode: 'KAV-CASE-01',
        status: 'ACTIVE',
      }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    // Must resolve to canonical yard id, NOT a new yard named 'tpk-timur'
    assert.ok(
      body.data.yardId === 'yard-timur' || body.data.yardId === 'YARD-TMR',
      `Expected canonical yard id, got ${body.data.yardId}`
    );
    assert.strictEqual(body.data.lotCode, 'KAV-CASE-01');

    const afterRes = await GET();
    const afterBody = await afterRes.json();
    assert.strictEqual(afterBody.data.yards.length, initialYardCount, 'No phantom yard should have been created');
  });

  await t.test('SqliteRecordStore: updateStorageLotStatus and delete methods', async () => {
    const store = new SqliteRecordStore(':memory:');
    const locations = await store.getStorageLocations();
    const lot = locations.lots[0];
    assert.ok(lot);

    const updated = await store.updateStorageLotStatus(lot.id, 'MAINTENANCE');
    assert.strictEqual(updated.status, 'MAINTENANCE');

    // Trying to delete yard with lots must throw guard error
    await assert.rejects(
      async () => {
        await store.deleteStorageYard(lot.yardId);
      },
      /masih memiliki/
    );

    // Create a temporary empty yard and delete it
    const emptyYard = await store.saveStorageYard({ name: 'Empty Test Yard' });
    await store.deleteStorageYard(emptyYard.id);

    // Delete a lot
    const lotToDelete = await store.saveStorageLot({ yardId: lot.yardId, lotCode: 'KAV-TEMP-DEL' });
    await store.deleteStorageLot(lotToDelete.id);
  });

  await t.test('PATCH /api/storage-locations rejects unauthenticated requests with 401', async () => {
    const req = new Request('http://localhost:3000/api/storage-locations', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'lot', id: 'lot-kav-01', status: 'FULL' }),
    });
    const res = await PATCH(req);
    assert.strictEqual(res.status, 401);
  });

  await t.test('PATCH /api/storage-locations rejects roleLevel 2 and 3 with 403', async () => {
    const staffReq = new Request('http://localhost:3000/api/storage-locations', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        cookie: `${COOKIE_NAME}=${staffToken}`,
      },
      body: JSON.stringify({ type: 'lot', id: 'lot-kav-01', status: 'FULL' }),
    });
    const staffRes = await PATCH(staffReq);
    assert.strictEqual(staffRes.status, 403);

    const viewerReq = new Request('http://localhost:3000/api/storage-locations', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        cookie: `${COOKIE_NAME}=${viewerToken}`,
      },
      body: JSON.stringify({ type: 'lot', id: 'lot-kav-01', status: 'FULL' }),
    });
    const viewerRes = await PATCH(viewerReq);
    assert.strictEqual(viewerRes.status, 403);
  });

  await t.test('PATCH /api/storage-locations rejects invalid status with 400', async () => {
    const req = new Request('http://localhost:3000/api/storage-locations', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify({ type: 'lot', id: 'lot-kav-01', status: 'UNKNOWN_STATUS' }),
    });
    const res = await PATCH(req);
    assert.strictEqual(res.status, 400);
  });

  await t.test('PATCH /api/storage-locations updates lot status successfully with 200', async () => {
    const getRes = await GET();
    const getBody = await getRes.json();
    const targetLot = getBody.data.lots[0];
    assert.ok(targetLot, 'Expected at least one lot in GET()');

    const req = new Request('http://localhost:3000/api/storage-locations', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify({ type: 'lot', id: targetLot.id, status: 'FULL' }),
    });
    const res = await PATCH(req);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'FULL');
  });

  await t.test('DELETE /api/storage-locations rejects unauthenticated with 401 and roleLevel > 1 with 403', async () => {
    const unauthReq = new Request('http://localhost:3000/api/storage-locations', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'lot', id: 'some-lot-id' }),
    });
    const unauthRes = await DELETE(unauthReq);
    assert.strictEqual(unauthRes.status, 401);

    const staffReq = new Request('http://localhost:3000/api/storage-locations', {
      method: 'DELETE',
      headers: {
        'content-type': 'application/json',
        cookie: `${COOKIE_NAME}=${staffToken}`,
      },
      body: JSON.stringify({ type: 'lot', id: 'some-lot-id' }),
    });
    const staffRes = await DELETE(staffReq);
    assert.strictEqual(staffRes.status, 403);
  });

  await t.test('DELETE /api/storage-locations returns 409 when deleting yard with attached lots', async () => {
    const getRes = await GET();
    const getBody = await getRes.json();
    const yardWithLots = getBody.data.yards.find((y: { id: string }) =>
      getBody.data.lots.some((l: { yardId: string }) => l.yardId === y.id)
    );
    assert.ok(yardWithLots, 'Expected at least one yard with lots');

    const req = new Request('http://localhost:3000/api/storage-locations', {
      method: 'DELETE',
      headers: {
        'content-type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify({ type: 'yard', id: yardWithLots.id }),
    });
    const res = await DELETE(req);
    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.error.includes('masih memiliki'));
  });

  await t.test('DELETE /api/storage-locations deletes a lot and empty yard successfully', async () => {
    // First create a yard
    const yardReq = new Request('http://localhost:3000/api/storage-locations', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify({
        type: 'yard',
        name: 'Disposable Yard',
        yardCode: 'TPK-DSP',
      }),
    });
    const yardRes = await POST(yardReq);
    const yardBody = await yardRes.json();
    const yardId = yardBody.data.id;

    // Create a lot in that yard
    const lotReq = new Request('http://localhost:3000/api/storage-locations', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify({
        type: 'lot',
        yardId,
        lotCode: 'KAV-DSP-01',
      }),
    });
    const lotRes = await POST(lotReq);
    const lotBody = await lotRes.json();
    const lotId = lotBody.data.id;

    // Delete lot
    const delLotReq = new Request('http://localhost:3000/api/storage-locations', {
      method: 'DELETE',
      headers: {
        'content-type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify({ type: 'lot', id: lotId }),
    });
    const delLotRes = await DELETE(delLotReq);
    assert.strictEqual(delLotRes.status, 200);

    // Delete yard
    const delYardReq = new Request('http://localhost:3000/api/storage-locations', {
      method: 'DELETE',
      headers: {
        'content-type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify({ type: 'yard', id: yardId }),
    });
    const delYardRes = await DELETE(delYardReq);
    assert.strictEqual(delYardRes.status, 200);
  });
});
