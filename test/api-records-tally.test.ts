import test from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../app/api/records/tally/route.ts';
import { createSessionToken, COOKIE_NAME } from '../src/auth/session.ts';
import type { ManifestFormInput } from '../src/types/index.ts';

test('POST /api/records/tally Authorization & Persistence Suite', async (t) => {
  const managerToken = createSessionToken({
    id: 'usr-mgr',
    email: 'manager@timber.id',
    name: 'Manager',
    roleLevel: 1,
    title: 'Operations Manager',
  });

  const warehouseToken = createSessionToken({
    id: 'usr-warehouse-04',
    email: 'gudang@timber.id',
    name: 'Operator Gudang',
    roleLevel: 2,
    title: 'Level 2 — Operator Gudang',
    permissions: { tallyCreate: true },
  });

  const level2Token = createSessionToken({
    id: 'usr-admin-02',
    email: 'admin@timber.id',
    name: 'Admin',
    roleLevel: 2,
    title: 'Level 2 Admin',
  });

  const viewerToken = createSessionToken({
    id: 'usr-viewer-03',
    email: 'viewer@timber.id',
    name: 'Viewer',
    roleLevel: 3,
    title: 'Level 3 Viewer',
  });

  const sampleManifest: ManifestFormInput = {
    id: `man-tally-test-${Date.now()}`,
    receiptDate: '2026-10-22',
    truckPlateNumber: 'B 9999 TLY',
    forestryDocNumber: 'SKSHH-TLY-01',
    receiptNumber: 'RCP-TLY-01',
    contractNumber: 'CTR-TLY-01',
    supplierName: 'PT Wana Lestari Abadi',
    freightRatePerM3: 0,
    brokerFee: 0,
    paymentStatus: 'UNPAID',
    items: [
      {
        id: `item-tly-${Date.now()}`,
        woodSpecies: 'Teak / Jati (柚木)',
        woodLengthM: 4.0,
        storageYard: 'TPK-Timur',
        kavlingNumber: 'KAV-01',
        deliveredPieces: 10,
        deliveredVolumeM3: 2.0,
        tallyPieces: 10,
        tallyVolumeM3: 2.0,
        timberPricePerM3: 1500000,
        timberPphRate: 0.015,
      },
    ],
  };

  await t.test('POST /api/records/tally without session returns 401', async () => {
    const req = new Request('http://localhost:3000/api/records/tally', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleManifest),
    });

    const res = await POST(req);
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.success, false);
  });

  await t.test('POST /api/records/tally with Level 1 session saves manifest and returns 201', async () => {
    const req = new Request('http://localhost:3000/api/records/tally', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify(sampleManifest),
    });

    const res = await POST(req);
    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data);
  });

  await t.test('POST /api/records/tally with Level 2 + tallyCreate: true saves manifest and returns 201', async () => {
    const warehouseManifest: ManifestFormInput = {
      ...sampleManifest,
      id: `man-gudang-${Date.now()}`,
      truckPlateNumber: 'B 7777 GDG',
    };
    const req = new Request('http://localhost:3000/api/records/tally', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${COOKIE_NAME}=${warehouseToken}`,
      },
      body: JSON.stringify(warehouseManifest),
    });

    const res = await POST(req);
    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data);
  });

  await t.test('POST /api/records/tally with Level 2 without permissions returns 403', async () => {
    const req = new Request('http://localhost:3000/api/records/tally', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${COOKIE_NAME}=${level2Token}`,
      },
      body: JSON.stringify(sampleManifest),
    });

    const res = await POST(req);
    assert.equal(res.status, 403);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.match(json.error, /Akses ditolak/i);
  });

  await t.test('POST /api/records/tally with Level 3 session returns 403', async () => {
    const req = new Request('http://localhost:3000/api/records/tally', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${COOKIE_NAME}=${viewerToken}`,
      },
      body: JSON.stringify(sampleManifest),
    });

    const res = await POST(req);
    assert.equal(res.status, 403);
    const json = await res.json();
    assert.equal(json.success, false);
  });

  await t.test('POST /api/records/tally with Level 1 session + malformed JSON returns 400', async () => {
    const req = new Request('http://localhost:3000/api/records/tally', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: 'invalid-json{',
    });

    const res = await POST(req);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
  });
});

