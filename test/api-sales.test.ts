import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { ensureSalesTable, SalesQueries } from '../src/persistence/sqlite/sales-queries.ts';
import { GET, POST, DELETE } from '../app/api/sales/route.ts';
import { createSessionToken, COOKIE_NAME } from '../src/auth/session.ts';
import type { SalesFormInput } from '../src/types/index.ts';

test('Outbound Sales SQLite Queries & REST API Suite', async (t) => {
  const managerToken = createSessionToken({
    id: 'usr-mgr',
    email: 'manager@timber.id',
    name: 'Manager',
    roleLevel: 1,
    title: 'Operations Manager',
  });

  const level2Token = createSessionToken({
    id: 'usr-lvl2',
    email: 'level2@timber.id',
    name: 'Auditor Level 2',
    roleLevel: 2,
    title: 'Level 2 Auditor',
  });

  const viewerToken = createSessionToken({
    id: 'usr-view',
    email: 'viewer@timber.id',
    name: 'Viewer',
    roleLevel: 3,
    title: 'Observer',
  });

  await t.test('SalesQueries: inserts, queries, updates, and deletes sales records in SQLite', () => {
    const db = new DatabaseSync(':memory:');
    ensureSalesTable(db);
    const queries = new SalesQueries(db);

    const initial = queries.getAll();
    assert.equal(initial.length, 0);

    const created = queries.insert({
      id: 'SLS-TEST-001',
      saleDate: '2026-10-18',
      deliveryOrderNumber: 'DO-TEST-001',
      truckPlateNumber: 'KB 8888 YY',
      driverName: 'Pak Joko',
      customerName: 'CV Maju Mebel',
      storageYard: 'TPK-Timur',
      kavlingNumber: 'KAV-01',
      woodSpecies: 'Meranti',
      pieces: 30,
      volumeM3: 12.0,
      pricePerM3: 2000000,
      totalPrice: 24000000,
      paymentStatus: 'UNPAID',
    });

    assert.equal(created.id, 'SLS-TEST-001');
    assert.equal(created.customerName, 'CV Maju Mebel');
    assert.equal(created.volumeM3, 12.0);

    const all = queries.getAll();
    assert.equal(all.length, 1);
    assert.equal(all[0].deliveryOrderNumber, 'DO-TEST-001');

    const updated = queries.update({
      id: 'SLS-TEST-001',
      saleDate: '2026-10-18',
      deliveryOrderNumber: 'DO-TEST-001',
      truckPlateNumber: 'KB 8888 YY',
      driverName: 'Pak Joko',
      customerName: 'CV Maju Mebel Utama',
      storageYard: 'TPK-Timur',
      kavlingNumber: 'KAV-01',
      woodSpecies: 'Meranti',
      pieces: 30,
      volumeM3: 12.0,
      pricePerM3: 2000000,
      totalPrice: 24000000,
      paymentStatus: 'PAID',
    });
    assert.equal(updated.customerName, 'CV Maju Mebel Utama');
    assert.equal(updated.paymentStatus, 'PAID');

    queries.delete('SLS-TEST-001');
    assert.equal(queries.getAll().length, 0);
  });

  await t.test('REST API: GET /api/sales returns successful payload', async () => {
    const res = await GET();
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
  });

  await t.test('REST API: POST /api/sales enforces authentication and Level 1 RBAC', async () => {
    const salePayload: SalesFormInput = {
      saleDate: '2026-10-18',
      deliveryOrderNumber: `DO-TEST-${Date.now()}`,
      truckPlateNumber: 'KB 7777 ZZ',
      customerName: 'PT Kayu Nusantara',
      storageYard: 'TPK-Timur',
      kavlingNumber: 'KAV-01',
      woodSpecies: 'Meranti',
      pieces: 10,
      volumeM3: 3.5,
      pricePerM3: 2500000,
    };

    // 1. Unauthenticated -> 401
    const unauthReq = new Request('http://localhost:3000/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(salePayload),
    });
    const unauthRes = await POST(unauthReq);
    assert.equal(unauthRes.status, 401);

    // 2. Viewer (Level 3) -> 403
    const viewerReq = new Request('http://localhost:3000/api/sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${COOKIE_NAME}=${viewerToken}`,
      },
      body: JSON.stringify(salePayload),
    });
    const viewerRes = await POST(viewerReq);
    assert.equal(viewerRes.status, 403);

    // 2b. Level 2 (Strictly View-Only) -> 403
    const level2Req = new Request('http://localhost:3000/api/sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${COOKIE_NAME}=${level2Token}`,
      },
      body: JSON.stringify(salePayload),
    });
    const level2Res = await POST(level2Req);
    assert.equal(level2Res.status, 403);
    const level2Body = await level2Res.json();
    assert.match(level2Body.error, /Hanya Level 1/);

    // 3. Manager (Level 1) -> 200
    const managerReq = new Request('http://localhost:3000/api/sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify(salePayload),
    });
    const managerRes = await POST(managerReq);
    assert.equal(managerRes.status, 200);
    const json = await managerRes.json();
    assert.equal(json.success, true);
    assert.equal(json.data.customerName, 'PT Kayu Nusantara');

    // 3b. Overdraw rejection -> 400 Bad Request
    const overdrawReq = new Request('http://localhost:3000/api/sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify({
        ...salePayload,
        deliveryOrderNumber: `DO-OVERDRAW-${Date.now()}`,
        pieces: 500,
        volumeM3: 250.0,
      }),
    });
    const overdrawRes = await POST(overdrawReq);
    assert.equal(overdrawRes.status, 400);
    const overdrawBody = await overdrawRes.json();
    assert.equal(overdrawBody.success, false);
    assert.match(overdrawBody.error, /melebihi sisa stok kavling|tidak mencukupi/i);

    // 4. DELETE /api/sales?id=XXX with Level 2 -> 403
    const deleteLvl2Req = new Request(`http://localhost:3000/api/sales?id=${json.data.id}`, {
      method: 'DELETE',
      headers: {
        cookie: `${COOKIE_NAME}=${level2Token}`,
      },
    });
    const deleteLvl2Res = await DELETE(deleteLvl2Req);
    assert.equal(deleteLvl2Res.status, 403);

    // 5. DELETE /api/sales?id=XXX with Level 1 -> 200
    const deleteReq = new Request(`http://localhost:3000/api/sales?id=${json.data.id}`, {
      method: 'DELETE',
      headers: {
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
    });
    const deleteRes = await DELETE(deleteReq);
    assert.equal(deleteRes.status, 200);
  });
});

