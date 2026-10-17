import test from 'node:test';
import assert from 'node:assert/strict';
import { GET, POST, DELETE } from '../app/api/records/route.ts';
import { serverRecordStore } from '../src/persistence/server-record-store.ts';
import { createSessionToken, COOKIE_NAME } from '../src/auth/session.ts';
import type { ManifestFormInput } from '../src/types/index.ts';

test('Records API Multi-Item Manifest & Persistence Suite', async (t) => {
  const managerToken = createSessionToken({
    id: 'usr-mgr',
    email: 'manager@timber.id',
    name: 'Manager',
    roleLevel: 1,
    title: 'Operations Manager',
  });

  const viewerToken = createSessionToken({
    id: 'usr-view',
    email: 'viewer@timber.id',
    name: 'Viewer',
    roleLevel: 3,
    title: 'Observer',
  });

  await t.test('POST /api/records with { manifest } saves multi-item manifest atomically', async () => {
    const manifestInput: ManifestFormInput = {
      id: 'man-api-test-01',
      receiptDate: '2026-10-18',
      truckPlateNumber: 'B 5555 API',
      forestryDocNumber: 'DOC-API-MULTI-01',
      receiptNumber: 'KW-API-01',
      contractNumber: 'CTR-API-01',
      supplierName: 'PT Api Wood',
      freightRatePerM3: 150000,
      brokerFee: 100000,
      items: [
        {
          id: 'item-api-1',
          woodSpecies: 'Teak / Jati (柚木)',
          woodLengthM: 4.0,
          kavlingNumber: 'KAV-A1',
          storageYard: 'TPK-1',
          deliveredPieces: 10,
          deliveredVolumeM3: 2.0,
          tallyPieces: 10,
          tallyVolumeM3: 2.0,
          timberPricePerM3: 4000000,
          timberPphRate: 0.5,
        },
        {
          id: 'item-api-2',
          woodSpecies: 'Merbau (波罗格)',
          woodLengthM: 4.0,
          kavlingNumber: 'KAV-A2',
          storageYard: 'TPK-1',
          deliveredPieces: 8,
          deliveredVolumeM3: 1.5,
          tallyPieces: 8,
          tallyVolumeM3: 1.5,
          timberPricePerM3: 5000000,
          timberPphRate: 0.5,
        },
      ],
    };

    const req = new Request('http://localhost:3000/api/records', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify({ manifest: manifestInput }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.strictEqual(body.data.length, 2);
    assert.strictEqual(body.data[0].manifest_id, 'man-api-test-01');
    assert.strictEqual(body.data[1].manifest_id, 'man-api-test-01');

    // Test DELETE via manifestId
    const delReq = new Request('http://localhost:3000/api/records?manifestId=man-api-test-01', {
      method: 'DELETE',
      headers: { cookie: `${COOKIE_NAME}=${managerToken}` },
    });
    const delRes = await DELETE(delReq);
    assert.strictEqual(delRes.status, 200);
    const delBody = await delRes.json();
    assert.strictEqual(delBody.success, true);

    // Verify records deleted
    const all = await serverRecordStore.getAll();
    assert.ok(!all.some((r) => r.manifest_id === 'man-api-test-01'));
  });

  await t.test('POST /api/records validates manifest items array is non-empty', async () => {
    const invalidManifest = {
      manifest: {
        id: 'man-empty',
        items: [],
      },
    };

    const req = new Request('http://localhost:3000/api/records', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify(invalidManifest),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.error, /manifest must contain at least one item/);
  });

  await t.test('DELETE /api/records?manifestId with non-existent id returns 404', async () => {
    const req = new Request('http://localhost:3000/api/records?manifestId=non-existent-manifest-999', {
      method: 'DELETE',
      headers: { cookie: `${COOKIE_NAME}=${managerToken}` },
    });

    const res = await DELETE(req);
    assert.strictEqual(res.status, 404);
  });

  await t.test('DELETE /api/records?manifestId without auth returns 401', async () => {
    const req = new Request('http://localhost:3000/api/records?manifestId=man-123', {
      method: 'DELETE',
    });

    const res = await DELETE(req);
    assert.strictEqual(res.status, 401);
  });

  await t.test('DELETE /api/records?manifestId with roleLevel 3 returns 403', async () => {
    const req = new Request('http://localhost:3000/api/records?manifestId=man-123', {
      method: 'DELETE',
      headers: { cookie: `${COOKIE_NAME}=${viewerToken}` },
    });

    const res = await DELETE(req);
    assert.strictEqual(res.status, 403);
  });
});
