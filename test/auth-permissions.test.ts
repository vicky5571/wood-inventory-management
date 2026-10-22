import test from 'node:test';
import assert from 'node:assert/strict';
import { computePermissions } from '../src/hooks/useAuth.ts';
import type { AuthUser } from '../src/types/index.ts';

test('computePermissions logic and tallyCreate capability suite', async (t) => {
  await t.test('Level 1 without permissions field -> canCreateTally: true and full write', () => {
    const user: AuthUser = {
      id: 'usr-1',
      email: 'owner@timber.id',
      name: 'Owner',
      roleLevel: 1,
      title: 'Level 1 Owner',
    };
    const perms = computePermissions(user);
    assert.equal(perms.canWrite, true);
    assert.equal(perms.canViewAll, true);
    assert.equal(perms.isMonitorOnly, false);
    assert.equal(perms.canCreateTally, true);
  });

  await t.test('Level 2 without permissions field -> canCreateTally: false', () => {
    const user: AuthUser = {
      id: 'usr-2',
      email: 'admin@timber.id',
      name: 'Admin',
      roleLevel: 2,
      title: 'Level 2 Admin',
    };
    const perms = computePermissions(user);
    assert.equal(perms.canWrite, false);
    assert.equal(perms.canViewAll, true);
    assert.equal(perms.isMonitorOnly, false);
    assert.equal(perms.canCreateTally, false);
  });

  await t.test('Level 2 with empty permissions object -> canCreateTally: false', () => {
    const user: AuthUser = {
      id: 'usr-2',
      email: 'admin@timber.id',
      name: 'Admin',
      roleLevel: 2,
      title: 'Level 2 Admin',
      permissions: {},
    };
    const perms = computePermissions(user);
    assert.equal(perms.canCreateTally, false);
  });

  await t.test('Level 2 with permissions.tallyCreate: true -> canCreateTally: true', () => {
    const user: AuthUser = {
      id: 'usr-4',
      email: 'gudang@timber.id',
      name: 'Operator Gudang',
      roleLevel: 2,
      title: 'Level 2 — Operator Gudang',
      permissions: { tallyCreate: true },
    };
    const perms = computePermissions(user);
    assert.equal(perms.canWrite, false);
    assert.equal(perms.canViewAll, true);
    assert.equal(perms.isMonitorOnly, false);
    assert.equal(perms.canCreateTally, true);
  });

  await t.test('Level 2 with permissions.tallyCreate: false -> canCreateTally: false', () => {
    const user: AuthUser = {
      id: 'usr-2',
      email: 'admin@timber.id',
      name: 'Admin',
      roleLevel: 2,
      title: 'Level 2 Admin',
      permissions: { tallyCreate: false },
    };
    const perms = computePermissions(user);
    assert.equal(perms.canCreateTally, false);
  });

  await t.test('Level 3 with permissions.tallyCreate: true -> canCreateTally: true', () => {
    const user: AuthUser = {
      id: 'usr-3',
      email: 'viewer@timber.id',
      name: 'Viewer',
      roleLevel: 3,
      title: 'Level 3 Viewer',
      permissions: { tallyCreate: true },
    };
    const perms = computePermissions(user);
    assert.equal(perms.canWrite, false);
    assert.equal(perms.canViewAll, false);
    assert.equal(perms.isMonitorOnly, true);
    assert.equal(perms.canCreateTally, true);
  });

  await t.test('null user -> canCreateTally: false and all false', () => {
    const perms = computePermissions(null);
    assert.equal(perms.canWrite, false);
    assert.equal(perms.canViewAll, false);
    assert.equal(perms.isMonitorOnly, false);
    assert.equal(perms.canCreateTally, false);
  });

  await t.test('undefined user -> canCreateTally: false and all false', () => {
    const perms = computePermissions(undefined);
    assert.equal(perms.canWrite, false);
    assert.equal(perms.canViewAll, false);
    assert.equal(perms.isMonitorOnly, false);
    assert.equal(perms.canCreateTally, false);
  });
});

