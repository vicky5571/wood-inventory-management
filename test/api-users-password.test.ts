import test from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../app/api/users/[id]/password/route.ts';
import { COOKIE_NAME, createSessionToken } from '../src/auth/session.ts';
import { getUserRepository, ensureSeedUsers } from '../src/persistence/user-repository.ts';
import { hashPassword } from '../src/auth/password.ts';
import type { AuthUser } from '../src/types/index.ts';

test('API /api/users/[id]/password Suite', async (t) => {
  const repo = getUserRepository();
  await ensureSeedUsers(repo);

  const adminActor: AuthUser = { id: 'usr-admin-pass', email: 'admin-pass@timber.id', name: 'Admin', roleLevel: 1, title: 'Director' };
  await repo.upsertSeed({ ...adminActor, passwordHash: 'h', isActive: true });

  const targetUser: AuthUser = { id: 'usr-target-pw', email: 'target-pw@timber.id', name: 'Target', roleLevel: 2, title: 'Staff' };
  await repo.upsertSeed({ ...targetUser, passwordHash: hashPassword('oldPassword123'), isActive: true });

  function makeReq(body: unknown): Request {
    return new Request('https://timber.test/api/users/usr-target-pw/password', {
      method: 'POST',
      headers: {
        cookie: `${COOKIE_NAME}=${createSessionToken(adminActor)}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  await t.test('rejects password < 8 chars', async () => {
    const res = await POST(makeReq({ newPassword: '123' }), { params: Promise.resolve({ id: 'usr-target-pw' }) });
    assert.equal(res.status, 400);
  });

  await t.test('resets password and response never includes passwordHash', async () => {
    const res = await POST(makeReq({ newPassword: 'brandNewPassword123' }), { params: Promise.resolve({ id: 'usr-target-pw' }) });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.passwordHash, undefined);

    const updated = await repo.findByIdIncludingInactive('usr-target-pw');
    assert.equal(updated?.passwordHash, hashPassword('brandNewPassword123'));
  });
});
