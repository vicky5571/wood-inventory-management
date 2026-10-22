import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionToken, COOKIE_NAME } from '../src/auth/session.ts';
import { GET as getBrokers, POST as postBroker, DELETE as deleteBroker } from '../app/api/brokers/route.ts';
import { GET as getBrokerById, PUT as putBrokerById, DELETE as deleteBrokerById } from '../app/api/brokers/[id]/route.ts';
import { GET as getActivity } from '../app/api/activity/route.ts';

const managerToken = createSessionToken({
  id: 'usr-manager-01',
  email: 'manager@timber.id',
  name: 'Budi Santoso',
  roleLevel: 1,
  title: 'Level 1',
});

const auditorToken = createSessionToken({
  id: 'usr-admin-02',
  email: 'admin@timber.id',
  name: 'Siti Rahmawati',
  roleLevel: 2,
  title: 'Level 2',
});

const viewerToken = createSessionToken({
  id: 'usr-viewer-03',
  email: 'viewer@timber.id',
  name: 'Robert Tan',
  roleLevel: 3,
  title: 'Level 3',
});

test('Brokers REST API Suite', async (t) => {
  await t.test('GET /api/brokers returns broker list for any client', async () => {
    const res = await getBrokers(new Request('http://localhost/api/brokers'));
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length >= 3);
  });

  await t.test('POST /api/brokers rejects unauthenticated requests with 401', async () => {
    const req = new Request('http://localhost/api/brokers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Broker Unauthorized' }),
    });
    const res = await postBroker(req);
    assert.equal(res.status, 401);
  });

  await t.test('POST /api/brokers rejects non-Level 1 roles with 403', async () => {
    for (const token of [auditorToken, viewerToken]) {
      const req = new Request('http://localhost/api/brokers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${COOKIE_NAME}=${token}`,
        },
        body: JSON.stringify({ name: 'Broker Forbidden' }),
      });
      const res = await postBroker(req);
      assert.equal(res.status, 403);
    }
  });

  await t.test('POST /api/brokers validates non-empty name and non-negative commission', async () => {
    // Empty name
    const req1 = new Request('http://localhost/api/brokers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify({ name: '   ' }),
    });
    const res1 = await postBroker(req1);
    assert.equal(res1.status, 400);

    // Negative commission
    const req2 = new Request('http://localhost/api/brokers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify({ name: 'Broker Valid', defaultCommissionPerM3: -5000 }),
    });
    const res2 = await postBroker(req2);
    assert.equal(res2.status, 400);
  });

  let createdBrokerId = '';

  await t.test('POST /api/brokers creates broker and logs activity', async () => {
    const req = new Request('http://localhost/api/brokers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify({
        name: 'Pak Bambang Sukses',
        phone: '0812-9988-1122',
        defaultCommissionPerM3: 65000,
        status: 'ACTIVE',
      }),
    });
    const res = await postBroker(req);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.id);
    assert.equal(json.data.name, 'Pak Bambang Sukses');
    assert.equal(json.data.defaultCommissionPerM3, 65000);
    createdBrokerId = json.data.id;

    const logRes = await getActivity(new Request('http://localhost/api/activity'));
    const logJson = await logRes.json();
    assert.ok(logJson.data.some((l: any) => l.action === 'BROKER_CREATED' && l.entitySummary.includes('Pak Bambang Sukses')));
  });

  await t.test('GET /api/brokers/[id] returns individual broker', async () => {
    const res = await getBrokerById(new Request(`http://localhost/api/brokers/${createdBrokerId}`), {
      params: Promise.resolve({ id: createdBrokerId }),
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.id, createdBrokerId);
    assert.equal(json.data.name, 'Pak Bambang Sukses');
  });

  await t.test('PUT /api/brokers/[id] updates broker and logs activity', async () => {
    const req = new Request(`http://localhost/api/brokers/${createdBrokerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify({
        name: 'Pak Bambang Sukses Abadi',
        defaultCommissionPerM3: 70000,
      }),
    });
    const res = await putBrokerById(req, {
      params: Promise.resolve({ id: createdBrokerId }),
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.name, 'Pak Bambang Sukses Abadi');
    assert.equal(json.data.defaultCommissionPerM3, 70000);
  });

  await t.test('DELETE /api/brokers?id=... soft-deletes broker', async () => {
    const req = new Request(`http://localhost/api/brokers?id=${encodeURIComponent(createdBrokerId)}`, {
      method: 'DELETE',
      headers: {
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
    });
    const res = await deleteBroker(req);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);

    const getRes = await getBrokerById(new Request(`http://localhost/api/brokers/${createdBrokerId}`), {
      params: Promise.resolve({ id: createdBrokerId }),
    });
    const getJson = await getRes.json();
    assert.equal(getJson.data.status, 'INACTIVE');
  });
});
