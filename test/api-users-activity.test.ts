import test from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../app/api/users/[id]/activity/route.ts';
import { COOKIE_NAME, createSessionToken } from '../src/auth/session.ts';
import { getUserRepository, ensureSeedUsers } from '../src/persistence/user-repository.ts';
import type { AuthUser } from '../src/types/index.ts';

test('API /api/users/[id]/activity Suite', async (t) => {
  const repo = getUserRepository();
  await ensureSeedUsers(repo);

  const adminActor: AuthUser = { id: 'usr-manager-01', email: 'manager@timber.id', name: 'Budi Santoso', roleLevel: 1, title: 'Operations Manager' };
  const staffActor: AuthUser = { id: 'usr-admin-02', email: 'admin@timber.id', name: 'Siti Rahmawati', roleLevel: 2, title: 'Level 2' };

  await t.test('returns 403 if actor is not Level 1', async () => {
    const req = new Request('https://timber.test/api/users/usr-1/activity', {
      headers: { cookie: `${COOKIE_NAME}=${createSessionToken(staffActor)}` },
    });
    const res = await GET(req, { params: Promise.resolve({ id: 'usr-1' }) });
    assert.equal(res.status, 403);
  });

  await t.test('returns 200 with activity list for Level 1', async () => {
    const req = new Request('https://timber.test/api/users/usr-1/activity', {
      headers: { cookie: `${COOKIE_NAME}=${createSessionToken(adminActor)}` },
    });
    const res = await GET(req, { params: Promise.resolve({ id: 'usr-1' }) });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
  });
});
