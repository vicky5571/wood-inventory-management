import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as deactivateHandler } from '../app/api/users/[id]/deactivate/route.ts';
import { POST as reactivateHandler } from '../app/api/users/[id]/reactivate/route.ts';
import { COOKIE_NAME, createSessionToken } from '../src/auth/session.ts';
import { getUserRepository, ensureSeedUsers } from '../src/persistence/user-repository.ts';
import type { AuthUser } from '../src/types/index.ts';

test('API Deactivate & Reactivate Suite', async (t) => {
  const repo = getUserRepository();
  await ensureSeedUsers(repo);

  const adminActor: AuthUser = { id: 'usr-admin-deact-actor', email: 'admin-deact@timber.id', name: 'Admin', roleLevel: 1, title: 'Director' };
  await repo.upsertSeed({ ...adminActor, passwordHash: 'h', isActive: true });

  const target: AuthUser = { id: 'usr-target-deact', email: 'target-deact@timber.id', name: 'Target', roleLevel: 2, title: 'Staff' };
  await repo.upsertSeed({ ...target, passwordHash: 'h', isActive: true });

  function makeReq(url: string, actor: AuthUser, body?: unknown) {
    return new Request(url, {
      method: 'POST',
      headers: {
        cookie: `${COOKIE_NAME}=${createSessionToken(actor)}`,
        'content-type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  await t.test('deactivate blocks self-deactivate (Invariant 4)', async () => {
    const res = await deactivateHandler(
      makeReq('https://timber.test/api/users/usr-admin-deact-actor/deactivate', adminActor),
      { params: Promise.resolve({ id: 'usr-admin-deact-actor' }) }
    );
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.error, /akun sendiri/);
  });

  await t.test('deactivate successfully deactivates user', async () => {
    const res = await deactivateHandler(
      makeReq('https://timber.test/api/users/usr-target-deact/deactivate', adminActor, { reason: 'Resigned' }),
      { params: Promise.resolve({ id: 'usr-target-deact' }) }
    );
    assert.equal(res.status, 200);

    const user = await repo.findByIdIncludingInactive('usr-target-deact');
    assert.equal(user?.isActive, false);
  });

  await t.test('reactivate successfully restores user', async () => {
    const res = await reactivateHandler(
      makeReq('https://timber.test/api/users/usr-target-deact/reactivate', adminActor, { reason: 'Rehired' }),
      { params: Promise.resolve({ id: 'usr-target-deact' }) }
    );
    assert.equal(res.status, 200);

    const user = await repo.findById('usr-target-deact');
    assert.ok(user);
    assert.equal(user?.isActive, true);
  });
});
