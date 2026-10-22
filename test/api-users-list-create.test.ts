import test from 'node:test';
import assert from 'node:assert/strict';
import { GET, POST } from '../app/api/users/route.ts';
import { COOKIE_NAME, createSessionToken } from '../src/auth/session.ts';
import { getUserRepository, ensureSeedUsers } from '../src/persistence/user-repository.ts';
import type { AuthUser } from '../src/types/index.ts';

function createAuthReq(url: string, user?: AuthUser, body?: unknown, method = 'GET'): Request {
  const headers = new Headers();
  if (user) {
    headers.set('cookie', `${COOKIE_NAME}=${createSessionToken(user)}`);
  }
  if (body) {
    headers.set('content-type', 'application/json');
  }
  return new Request(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

const adminUser: AuthUser = { id: 'usr-manager-01', email: 'manager@timber.id', name: 'Budi Santoso', roleLevel: 1, title: 'Operations Manager' };
const staffUser: AuthUser = { id: 'usr-admin-02', email: 'admin@timber.id', name: 'Siti Rahmawati', roleLevel: 2, title: 'Level 2' };

test('API /api/users List and Create Suite', async (t) => {
  await ensureSeedUsers(getUserRepository());
  await t.test('GET /api/users returns 401 when unauthorized', async () => {
    const res = await GET(createAuthReq('https://timber.test/api/users'));
    assert.equal(res.status, 401);
  });

  await t.test('GET /api/users returns 403 when user is Level 2', async () => {
    const res = await GET(createAuthReq('https://timber.test/api/users', staffUser));
    assert.equal(res.status, 403);
  });

  await t.test('GET /api/users returns 200 with user list without passwordHash', async () => {
    const res = await GET(createAuthReq('https://timber.test/api/users', adminUser));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.every((u: Record<string, unknown>) => u.passwordHash === undefined));
  });

  await t.test('POST /api/users rejects password shorter than 8 chars', async () => {
    const res = await POST(createAuthReq('https://timber.test/api/users', adminUser, {
      email: 'short@timber.id',
      name: 'Short Pass',
      title: 'Staff',
      roleLevel: 2,
      password: 'short',
    }, 'POST'));
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /8 karakter/);
  });

  await t.test('POST /api/users creates user and returns 201 without passwordHash', async () => {
    const email = `created-${Date.now()}@timber.id`;
    const res = await POST(createAuthReq('https://timber.test/api/users', adminUser, {
      email,
      name: 'New Person',
      title: 'Operator',
      roleLevel: 2,
      password: 'strongPassword123',
      permissions: { tallyCreate: true },
    }, 'POST'));
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.email, email);
    assert.equal(body.data.passwordHash, undefined);
  });
});
