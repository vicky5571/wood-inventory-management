import test from 'node:test';
import assert from 'node:assert/strict';
import { middleware, config } from '../middleware.ts';
import { createSessionToken, COOKIE_NAME } from '../src/auth/session.ts';
import { NextRequest } from 'next/server.js';

test('Middleware API Route Protection Suite', async (t) => {
  await t.test('unauthenticated calls to /api/records return status 401 with Unauthorized json', async () => {
    const req = new NextRequest('http://localhost:3000/api/records');
    const res = middleware(req);
    assert.ok(res);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.deepEqual(body, { success: false, error: 'Unauthorized' });
  });

  await t.test('unauthenticated calls to /api/auth/login return status 200 (allowed)', () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login');
    const res = middleware(req);
    assert.ok(res);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('location'), null);
  });

  await t.test('authenticated calls with valid wood_session cookie return status 200 (allowed)', () => {
    const token = createSessionToken({
      id: 'usr-1',
      email: 'manager@timber.id',
      name: 'Manager',
      roleLevel: 1,
      title: 'Manager',
    });
    const req = new NextRequest('http://localhost:3000/api/records');
    req.cookies.set(COOKIE_NAME, token);
    const res = middleware(req);
    assert.ok(res);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('location'), null);
  });

  await t.test('calls with invalid token to /api/records return status 401', async () => {
    const req = new NextRequest('http://localhost:3000/api/records');
    req.cookies.set(COOKIE_NAME, 'invalid-tampered-token');
    const res = middleware(req);
    assert.ok(res);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.deepEqual(body, { success: false, error: 'Unauthorized' });
  });

  await t.test('middleware matcher does not exclude api routes', () => {
    const matcher = config?.matcher;
    assert.ok(Array.isArray(matcher));
    const pattern = matcher[0];
    assert.ok(!pattern.includes('(?!api|'), 'Matcher should not exclude api routes');
  });
});
