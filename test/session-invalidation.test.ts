import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COOKIE_NAME,
  createSessionToken,
  verifySessionToken,
  getAuthenticatedUser,
  getAuthenticatedUserDetailed,
} from '../src/auth/session.ts';
import { getUserRepository } from '../src/persistence/user-repository.ts';
import type { AuthUser } from '../src/types/index.ts';

function createRequestWithCookie(cookieValue?: string): Request {
  const headers = new Headers();
  if (cookieValue !== undefined) {
    headers.set('cookie', `${COOKIE_NAME}=${cookieValue}`);
  }
  return new Request('https://timber.test/api/records', { headers });
}

function uniqueTag(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

test('Session Invalidation & Fresh User Lookup Suite (Spec B)', async (t) => {
  const repo = getUserRepository();

  // Baseline active user from seed
  const managerUser: AuthUser = {
    id: 'usr-manager-01',
    email: 'manager@timber.id',
    name: 'Budi Santoso',
    roleLevel: 1,
    title: 'Level 1 — Operations Manager',
  };

  await t.test('1. verifySessionToken behavior remains unchanged (HMAC + exp only, zero DB)', () => {
    // Valid token
    const token = createSessionToken(managerUser, 3600);
    const verified = verifySessionToken(token);
    assert.ok(verified);
    assert.equal(verified?.id, 'usr-manager-01');
    assert.equal(verified?.email, 'manager@timber.id');

    // verifySessionToken on a user ID that does not exist in DB still decodes payload (stateless)
    const ghostUser: AuthUser = {
      id: 'usr-ghost-99',
      email: 'ghost@timber.id',
      name: 'Ghost User',
      roleLevel: 2,
      title: 'Level 2 — Ghost',
    };
    const ghostToken = createSessionToken(ghostUser, 3600);
    const verifiedGhost = verifySessionToken(ghostToken);
    assert.ok(verifiedGhost);
    assert.equal(verifiedGhost?.id, 'usr-ghost-99');
  });

  await t.test('2. getAuthenticatedUser with no cookie returns null', async () => {
    const req = createRequestWithCookie(undefined);
    const user = await getAuthenticatedUser(req);
    assert.equal(user, null);
  });

  await t.test('3. getAuthenticatedUser with malformed token returns null', async () => {
    const req = createRequestWithCookie('bad-token-without-dot');
    const user = await getAuthenticatedUser(req);
    assert.equal(user, null);
  });

  await t.test('4. getAuthenticatedUser with invalid HMAC returns null', async () => {
    const token = createSessionToken(managerUser, 3600);
    const [payloadB64, sig] = token.split('.');
    const tampered = `${payloadB64}.${sig.slice(0, -4)}ffff`;
    const req = createRequestWithCookie(tampered);
    const user = await getAuthenticatedUser(req);
    assert.equal(user, null);
  });

  await t.test('5. getAuthenticatedUser with expired token returns null', async () => {
    const expiredToken = createSessionToken(managerUser, -60);
    const req = createRequestWithCookie(expiredToken);
    const user = await getAuthenticatedUser(req);
    assert.equal(user, null);
  });

  await t.test('6. getAuthenticatedUser with valid JWT but userId not in DB returns null', async () => {
    const nonExistentUser: AuthUser = {
      id: 'usr-nonexistent-999',
      email: 'nonexistent@timber.id',
      name: 'Non Existent',
      roleLevel: 2,
      title: 'Level 2 — Unknown',
    };
    const token = createSessionToken(nonExistentUser, 3600);
    const req = createRequestWithCookie(token);
    const user = await getAuthenticatedUser(req);
    assert.equal(user, null);
  });

  await t.test('7. getAuthenticatedUser with valid JWT + inactive user returns null (fresh lookup wins)', async () => {
    const tag = uniqueTag();
    const inactiveId = `usr-temp-inactive-${tag}`;
    const email = `temp-inactive-${tag}@timber.test`;

    await repo.create({
      id: inactiveId,
      email,
      name: 'Inactive Operator',
      roleLevel: 2,
      title: 'Level 2 — Operator',
      passwordHash: 'dummy',
      isActive: false,
    });

    const userSnapshot: AuthUser = {
      id: inactiveId,
      email,
      name: 'Inactive Operator',
      roleLevel: 2,
      title: 'Level 2 — Operator',
    };
    const token = createSessionToken(userSnapshot, 3600);
    const req = createRequestWithCookie(token);

    // Stateless verification would pass:
    assert.ok(verifySessionToken(token));

    // Fresh lookup must return null:
    const user = await getAuthenticatedUser(req);
    assert.equal(user, null);
  });

  await t.test('8. getAuthenticatedUser with valid JWT + active user returns DB record', async () => {
    const token = createSessionToken(managerUser, 3600);
    const req = createRequestWithCookie(token);
    const user = await getAuthenticatedUser(req);
    assert.ok(user);
    assert.equal(user?.id, 'usr-manager-01');
    assert.equal(user?.email, 'manager@timber.id');
    // Internal fields stripped
    assert.equal((user as unknown as { passwordHash?: string })?.passwordHash, undefined);
    assert.equal((user as unknown as { isActive?: boolean })?.isActive, undefined);
  });

  await t.test('9. Staleness override: user role promoted in DB overrides JWT snapshot', async () => {
    const tag = uniqueTag();
    const promoId = `usr-temp-promo-${tag}`;
    const email = `promo-${tag}@timber.test`;

    await repo.create({
      id: promoId,
      email,
      name: 'Promo User',
      roleLevel: 2,
      title: 'Level 2 — Staff',
      passwordHash: 'dummy',
      isActive: true,
    });

    // Issue token while Level 2
    const token = createSessionToken({
      id: promoId,
      email,
      name: 'Promo User',
      roleLevel: 2,
      title: 'Level 2 — Staff',
    }, 3600);

    // Mutate DB to Level 1
    await repo.update(promoId, { roleLevel: 1, title: 'Level 1 — Executive' });

    const req = createRequestWithCookie(token);
    const user = await getAuthenticatedUser(req);
    assert.ok(user);
    assert.equal(user?.roleLevel, 1, 'Database roleLevel 1 must override JWT payload roleLevel 2');
    assert.equal(user?.title, 'Level 1 — Executive');
  });

  await t.test('10. Staleness override: grant tallyCreate in DB overrides JWT without permission', async () => {
    const tag = uniqueTag();
    const permUserId = `usr-temp-perm-${tag}`;
    const email = `perm-${tag}@timber.test`;

    await repo.create({
      id: permUserId,
      email,
      name: 'Permission User',
      roleLevel: 2,
      title: 'Level 2 — Staff',
      passwordHash: 'dummy',
      isActive: true,
      permissions: {},
    });

    // Token issued WITHOUT tallyCreate
    const token = createSessionToken({
      id: permUserId,
      email,
      name: 'Permission User',
      roleLevel: 2,
      title: 'Level 2 — Staff',
    }, 3600);

    // Admin grants tallyCreate in DB
    await repo.update(permUserId, { permissions: { tallyCreate: true } });

    const req = createRequestWithCookie(token);
    const user = await getAuthenticatedUser(req);
    assert.ok(user);
    assert.equal(user?.permissions?.tallyCreate, true, 'Granted permission must reflect immediately');
  });

  await t.test('11. Staleness override: revoke tallyCreate in DB overrides JWT with permission', async () => {
    const tag = uniqueTag();
    const revokeUserId = `usr-temp-revoke-${tag}`;
    const email = `revoke-${tag}@timber.test`;

    await repo.create({
      id: revokeUserId,
      email,
      name: 'Revoke User',
      roleLevel: 2,
      title: 'Level 2 — Staff',
      passwordHash: 'dummy',
      isActive: true,
      permissions: { tallyCreate: true },
    });

    // Token issued WITH tallyCreate
    const token = createSessionToken({
      id: revokeUserId,
      email,
      name: 'Revoke User',
      roleLevel: 2,
      title: 'Level 2 — Staff',
      permissions: { tallyCreate: true },
    }, 3600);

    // Admin revokes tallyCreate in DB
    await repo.update(revokeUserId, { permissions: {} });

    const req = createRequestWithCookie(token);
    const user = await getAuthenticatedUser(req);
    assert.ok(user);
    assert.notEqual(user?.permissions?.tallyCreate, true, 'Revoked permission must reflect immediately');
  });

  await t.test('12. getAuthenticatedUserDetailed returns correct reason for each failure mode', async () => {
    // NO_TOKEN
    const resNoToken = await getAuthenticatedUserDetailed(createRequestWithCookie(undefined));
    assert.equal(resNoToken.user, null);
    assert.equal(resNoToken.reason, 'NO_TOKEN');

    // TOKEN_MALFORMED
    const resMalformed = await getAuthenticatedUserDetailed(createRequestWithCookie('not-a-token'));
    assert.equal(resMalformed.user, null);
    assert.equal(resMalformed.reason, 'TOKEN_MALFORMED');

    // TOKEN_INVALID
    const token = createSessionToken(managerUser, 3600);
    const [payloadB64, sig] = token.split('.');
    const tampered = `${payloadB64}.${sig.slice(0, -4)}0000`;
    const resInvalid = await getAuthenticatedUserDetailed(createRequestWithCookie(tampered));
    assert.equal(resInvalid.user, null);
    assert.equal(resInvalid.reason, 'TOKEN_INVALID');

    // TOKEN_EXPIRED
    const expiredToken = createSessionToken(managerUser, -10);
    const resExpired = await getAuthenticatedUserDetailed(createRequestWithCookie(expiredToken));
    assert.equal(resExpired.user, null);
    assert.equal(resExpired.reason, 'TOKEN_EXPIRED');

    // USER_NOT_FOUND
    const nonExistentUser: AuthUser = {
      id: 'usr-ghost-404',
      email: 'ghost404@timber.id',
      name: 'Ghost 404',
      roleLevel: 2,
      title: 'Level 2',
    };
    const resNotFound = await getAuthenticatedUserDetailed(createRequestWithCookie(createSessionToken(nonExistentUser, 3600)));
    assert.equal(resNotFound.user, null);
    assert.equal(resNotFound.reason, 'USER_NOT_FOUND');

    // USER_INACTIVE
    const tag = uniqueTag();
    const inactId = `usr-inact-${tag}`;
    const email = `inact-${tag}@timber.test`;
    await repo.create({
      id: inactId,
      email,
      name: 'Inactive User',
      roleLevel: 2,
      title: 'Level 2',
      passwordHash: 'dummy',
      isActive: false,
    });
    const inactiveUserToken = createSessionToken({
      id: inactId,
      email,
      name: 'Inactive User',
      roleLevel: 2,
      title: 'Level 2',
    }, 3600);
    const resInactive = await getAuthenticatedUserDetailed(createRequestWithCookie(inactiveUserToken));
    assert.equal(resInactive.user, null);
    assert.equal(resInactive.reason, 'USER_INACTIVE');
  });

  await t.test('13. getAuthenticatedUserDetailed for success returns { user, reason: undefined }', async () => {
    const token = createSessionToken(managerUser, 3600);
    const resSuccess = await getAuthenticatedUserDetailed(createRequestWithCookie(token));
    assert.ok(resSuccess.user);
    assert.equal(resSuccess.user?.id, 'usr-manager-01');
    assert.equal(resSuccess.reason, undefined);
  });

  await t.test('14. ADR-0012 regression: warehouse operator (gudang@timber.id) tally permission revocation', async () => {
    // gudang@timber.id is seeded with permissions: { tallyCreate: true }
    const gudangUser: AuthUser = {
      id: 'usr-warehouse-04',
      email: 'gudang@timber.id',
      name: 'Operator Gudang',
      roleLevel: 2,
      title: 'Level 2 — Operator Gudang',
      permissions: { tallyCreate: true },
    };
    const token = createSessionToken(gudangUser, 3600);
    const req = createRequestWithCookie(token);

    // Initial check: returns tallyCreate: true
    const active = await getAuthenticatedUser(req);
    assert.ok(active);
    assert.equal(active?.permissions?.tallyCreate, true);

    // Temporarily revoke permission in DB
    await repo.update('usr-warehouse-04', { permissions: {} });

    // Next request immediately reflects revocation:
    const revoked = await getAuthenticatedUser(req);
    assert.ok(revoked);
    assert.notEqual(revoked?.permissions?.tallyCreate, true);

    // Restore original permission
    await repo.update('usr-warehouse-04', { permissions: { tallyCreate: true } });
    const restored = await getAuthenticatedUser(req);
    assert.equal(restored?.permissions?.tallyCreate, true);
  });
});

