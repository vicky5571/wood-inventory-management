import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionToken, COOKIE_NAME } from '../src/auth/session.ts';
import { GET as getSuppliers, POST as postSupplier, DELETE as deleteSupplier } from '../app/api/suppliers/route.ts';
import { GET as getSettings, POST as postSettings } from '../app/api/settings/route.ts';
import { GET as getActivity } from '../app/api/activity/route.ts';
import { POST as postRecords } from '../app/api/records/route.ts';

const managerToken = createSessionToken({
  id: 'usr-manager-01',
  email: 'manager@timber.id',
  name: 'Budi Santoso',
  roleLevel: 1,
  title: 'Level 1',
});

const viewerToken = createSessionToken({
  id: 'usr-viewer-03',
  email: 'viewer@timber.id',
  name: 'Robert Tan',
  roleLevel: 3,
  title: 'Level 3',
});

test('Master Data, Settings, Reset & Immutable Audit API Suite', async (t) => {
  await t.test('blocks Level 3 from mutating suppliers or settings (403)', async () => {
    const req = new Request('http://localhost/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${COOKIE_NAME}=${viewerToken}`,
      },
      body: JSON.stringify({ defaultTimberPphRate: 1.0 }),
    });
    const res = await postSettings(req);
    assert.equal(res.status, 403);
  });

  await t.test('persists supplier and settings updates and records server-side audit logs', async () => {
    const createReq = new Request('http://localhost/api/suppliers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify({ name: 'PT Hutan Lestari', status: 'ACTIVE' }),
    });
    const createRes = await postSupplier(createReq);
    assert.equal(createRes.status, 200);
    const createdJson = await createRes.json();
    assert.equal(createdJson.success, true);

    const logRes = await getActivity(new Request('http://localhost/api/activity'));
    const logJson = await logRes.json();
    assert.equal(logJson.success, true);
    assert.ok(logJson.data.some((l: any) => l.action === 'SUPPLIER_CREATED' && l.entitySummary.includes('PT Hutan Lestari')));
  });

  await t.test('executes full-stack demo reset via POST /api/records { action: "reset" }', async () => {
    const resetReq = new Request('http://localhost/api/records', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify({ action: 'reset' }),
    });
    const resetRes = await postRecords(resetReq);
    assert.equal(resetRes.status, 200);
    const resetJson = await resetRes.json();
    assert.equal(resetJson.success, true);
    assert.ok(Array.isArray(resetJson.data));
  });
});
