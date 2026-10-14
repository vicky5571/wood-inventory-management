import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as loginHandler } from '../app/api/auth/login/route.ts';
import { POST as logoutHandler } from '../app/api/auth/logout/route.ts';
import { GET as meHandler } from '../app/api/auth/me/route.ts';
import { createSessionToken, COOKIE_NAME } from '../src/auth/session.ts';

test('Auth API Route Handlers Suite', async (t) => {
  await t.test('POST /api/auth/login success sets session cookie', async () => {
    const req = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'manager@timber.id', password: 'password123' }),
    });

    const res = await loginHandler(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.user.roleLevel, 1);

    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie);
    assert.ok(setCookie.includes(`${COOKIE_NAME}=`));
    assert.ok(setCookie.includes('HttpOnly'));
  });

  await t.test('POST /api/auth/login failure returns 401', async () => {
    const req = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'manager@timber.id', password: 'badpassword' }),
    });

    const res = await loginHandler(req);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  await t.test('POST /api/auth/logout clears cookie', async () => {
    const req = new Request('http://localhost:3000/api/auth/logout', { method: 'POST' });
    const res = await logoutHandler();
    assert.equal(res.status, 200);
    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie);
    assert.ok(setCookie.includes('Max-Age=0'));
  });

  await t.test('GET /api/auth/me returns user for valid cookie in request', async () => {
    const token = createSessionToken({
      id: 'usr-admin-02',
      email: 'admin@timber.id',
      name: 'Siti Rahmawati',
      roleLevel: 2,
      title: 'Auditor',
    });

    const req = new Request('http://localhost:3000/api/auth/me', {
      headers: { cookie: `${COOKIE_NAME}=${token}` },
    });

    const res = await meHandler(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.user.roleLevel, 2);
  });

  await t.test('GET /api/auth/me returns 401 when cookie is missing', async () => {
    const req = new Request('http://localhost:3000/api/auth/me');
    const res = await meHandler(req);
    assert.equal(res.status, 401);
  });
});
