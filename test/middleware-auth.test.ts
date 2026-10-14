import test from 'node:test';
import assert from 'node:assert/strict';
import { middleware } from '../middleware.ts';
import { createSessionToken, COOKIE_NAME } from '../src/auth/session.ts';
import { NextRequest } from 'next/server.js';

test('Middleware Route Guard Suite', async (t) => {
  await t.test('unauthenticated visitor to / is redirected to /login', () => {
    const req = new NextRequest('http://localhost:3000/');
    const res = middleware(req);
    assert.ok(res);
    assert.equal(res.status, 307);
    assert.equal(new URL(res.headers.get('location')!).pathname, '/login');
  });

  await t.test('authenticated visitor to / is allowed through', () => {
    const token = createSessionToken({
      id: 'usr-1',
      email: 'manager@timber.id',
      name: 'Manager',
      roleLevel: 1,
      title: 'Manager',
    });
    const req = new NextRequest('http://localhost:3000/');
    req.cookies.set(COOKIE_NAME, token);
    const res = middleware(req);
    // When allowed through, location header is not set
    assert.equal(res.headers.get('location'), null);
  });

  await t.test('authenticated visitor to /login is redirected to /', () => {
    const token = createSessionToken({
      id: 'usr-1',
      email: 'manager@timber.id',
      name: 'Manager',
      roleLevel: 1,
      title: 'Manager',
    });
    const req = new NextRequest('http://localhost:3000/login');
    req.cookies.set(COOKIE_NAME, token);
    const res = middleware(req);
    assert.ok(res);
    assert.equal(res.status, 307);
    assert.equal(new URL(res.headers.get('location')!).pathname, '/');
  });

  await t.test('unauthenticated visitor to /login is allowed through', () => {
    const req = new NextRequest('http://localhost:3000/login');
    const res = middleware(req);
    assert.equal(res.headers.get('location'), null);
  });
});
