import test from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../app/api/auth/me/route.ts';
import { COOKIE_NAME, createSessionToken } from '../src/auth/session.ts';
import { getUserRepository } from '../src/persistence/user-repository.ts';
import type { AuthUser } from '../src/types/index.ts';

function createMeRequest(cookieValue?: string): Request {
  const headers = new Headers();
  if (cookieValue !== undefined) {
    headers.set('cookie', `${COOKIE_NAME}=${cookieValue}`);
  }
  return new Request('https://timber.test/api/auth/me', { headers });
}

function uniqueTag(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

test('API /api/auth/me Freshness & Invalidation Suite (Spec B)', async (t) => {
  const repo = getUserRepository();

  await t.test('1. GET without cookie returns 401 with reason: NO_TOKEN and humanized error', async () => {
    const req = createMeRequest(undefined);
    const res = await GET(req);
    assert.equal(res.status, 401);

    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.reason, 'NO_TOKEN');
    assert.equal(body.error, 'Belum masuk.');
  });

  await t.test('2. GET with valid session + active user returns 200 with DB user data', async () => {
    const activeUser: AuthUser = {
      id: 'usr-manager-01',
      email: 'manager@timber.id',
      name: 'Budi Santoso',
      roleLevel: 1,
      title: 'Level 1 — Operations Manager',
    };
    const token = createSessionToken(activeUser, 3600);
    const req = createMeRequest(token);
    const res = await GET(req);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.user);
    assert.equal(body.user.id, 'usr-manager-01');
    assert.equal(body.user.email, 'manager@timber.id');
    assert.equal(body.user.roleLevel, 1);
  });

  await t.test('3. GET after user deactivated in DB returns 401 with reason: USER_INACTIVE', async () => {
    const tag = uniqueTag();
    const deactId = `usr-me-deact-${tag}`;
    const email = `deact-me-${tag}@timber.test`;

    await repo.create({
      id: deactId,
      email,
      name: 'Deactivate Me',
      roleLevel: 2,
      title: 'Level 2 — Staff',
      passwordHash: 'dummy',
      isActive: true,
    });

    const token = createSessionToken({
      id: deactId,
      email,
      name: 'Deactivate Me',
      roleLevel: 2,
      title: 'Level 2 — Staff',
    }, 3600);

    // Initial check: active
    const resActive = await GET(createMeRequest(token));
    assert.equal(resActive.status, 200);

    // Admin deactivates user
    await repo.deactivate(deactId);

    // Immediate next call: returns 401 with USER_INACTIVE
    const resDeact = await GET(createMeRequest(token));
    assert.equal(resDeact.status, 401);
    const body = await resDeact.json();
    assert.equal(body.success, false);
    assert.equal(body.reason, 'USER_INACTIVE');
    assert.equal(body.error, 'Akun telah dinonaktifkan.');
  });

  await t.test('4. GET after user role changed in DB returns 200 with new role (staleness override)', async () => {
    const tag = uniqueTag();
    const roleId = `usr-me-role-${tag}`;
    const email = `role-change-${tag}@timber.test`;

    await repo.create({
      id: roleId,
      email,
      name: 'Role Change User',
      roleLevel: 2,
      title: 'Level 2 — Staff',
      passwordHash: 'dummy',
      isActive: true,
    });

    // Token issued with Level 2
    const token = createSessionToken({
      id: roleId,
      email,
      name: 'Role Change User',
      roleLevel: 2,
      title: 'Level 2 — Staff',
    }, 3600);

    // Admin promotes user in DB to Level 1
    await repo.update(roleId, { roleLevel: 1, title: 'Level 1 — Executive' });

    const res = await GET(createMeRequest(token));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.user.roleLevel, 1, 'Fresh DB lookup roleLevel 1 overrides token snapshot');
    assert.equal(body.user.title, 'Level 1 — Executive');
  });

  await t.test('5. GET after permission granted in DB returns 200 with new permissions', async () => {
    const tag = uniqueTag();
    const permId = `usr-me-perm-${tag}`;
    const email = `perm-change-${tag}@timber.test`;

    await repo.create({
      id: permId,
      email,
      name: 'Perm User',
      roleLevel: 2,
      title: 'Level 2 — Staff',
      passwordHash: 'dummy',
      isActive: true,
      permissions: {},
    });

    // Token issued without permissions
    const token = createSessionToken({
      id: permId,
      email,
      name: 'Perm User',
      roleLevel: 2,
      title: 'Level 2 — Staff',
    }, 3600);

    // Admin grants tallyCreate
    await repo.update(permId, { permissions: { tallyCreate: true } });

    const res = await GET(createMeRequest(token));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.user.permissions?.tallyCreate, true);
  });
});

