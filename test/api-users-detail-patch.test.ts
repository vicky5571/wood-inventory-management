import test from 'node:test';
import assert from 'node:assert/strict';
import { GET, PATCH } from '../app/api/users/[id]/route.ts';
import { COOKIE_NAME, createSessionToken } from '../src/auth/session.ts';
import { getUserRepository, ensureSeedUsers } from '../src/persistence/user-repository.ts';
import type { AuthUser } from '../src/types/index.ts';

function createReq(url: string, user: AuthUser, body?: unknown, method = 'GET'): Request {
  const headers = new Headers();
  headers.set('cookie', `${COOKIE_NAME}=${createSessionToken(user)}`);
  if (body) headers.set('content-type', 'application/json');
  return new Request(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
}

test('API /api/users/[id] Detail & Patch Suite', async (t) => {
  const repo = getUserRepository();
  await ensureSeedUsers(repo);

  const adminActor: AuthUser = { id: 'usr-admin-actor', email: 'admin-actor@timber.id', name: 'Admin Actor', roleLevel: 1, title: 'Director' };
  await repo.upsertSeed({ ...adminActor, passwordHash: 'h', isActive: true });

  const targetUser: AuthUser = { id: 'usr-target-patch', email: 'target-patch@timber.id', name: 'Target User', roleLevel: 2, title: 'Staff' };
  await repo.upsertSeed({ ...targetUser, passwordHash: 'h', isActive: true, permissions: { tallyCreate: true } });

  await t.test('GET returns user details without passwordHash', async () => {
    const res = await GET(createReq('https://timber.test/api/users/usr-target-patch', adminActor), { params: Promise.resolve({ id: 'usr-target-patch' }) });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.id, 'usr-target-patch');
    assert.equal(body.data.passwordHash, undefined);
  });

  await t.test('PATCH rejects forbidden fields (isActive, passwordHash)', async () => {
    const res = await PATCH(createReq('https://timber.test/api/users/usr-target-patch', adminActor, { isActive: false }, 'PATCH'), { params: Promise.resolve({ id: 'usr-target-patch' }) });
    assert.equal(res.status, 400);
  });

  await t.test('PATCH blocks self-demote (Invariant 4)', async () => {
    const res = await PATCH(createReq('https://timber.test/api/users/usr-admin-actor', adminActor, { roleLevel: 2 }, 'PATCH'), { params: Promise.resolve({ id: 'usr-admin-actor' }) });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.error, /role sendiri/);
  });

  await t.test('PATCH auto-resets permissions on role change (Invariant 5)', async () => {
    const res = await PATCH(createReq('https://timber.test/api/users/usr-target-patch', adminActor, { roleLevel: 3 }, 'PATCH'), { params: Promise.resolve({ id: 'usr-target-patch' }) });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.roleLevel, 3);
    assert.deepEqual(body.data.permissions, {});
  });
});
