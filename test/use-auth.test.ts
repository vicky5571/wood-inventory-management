import test from 'node:test';
import assert from 'node:assert/strict';
import { computePermissions } from '../src/hooks/useAuth.ts';

test('useAuth Permissions Logic Suite', async (t) => {
  await t.test('Level 1 user has full write and view permissions', () => {
    const perms = computePermissions(1);
    assert.equal(perms.canWrite, true);
    assert.equal(perms.canViewAll, true);
    assert.equal(perms.isMonitorOnly, false);
  });

  await t.test('Level 2 user has view permissions without write', () => {
    const perms = computePermissions(2);
    assert.equal(perms.canWrite, false);
    assert.equal(perms.canViewAll, true);
    assert.equal(perms.isMonitorOnly, false);
  });

  await t.test('Level 3 user has monitor only permissions', () => {
    const perms = computePermissions(3);
    assert.equal(perms.canWrite, false);
    assert.equal(perms.canViewAll, false);
    assert.equal(perms.isMonitorOnly, true);
  });

  await t.test('Null user has no permissions', () => {
    const perms = computePermissions(null);
    assert.equal(perms.canWrite, false);
    assert.equal(perms.canViewAll, false);
    assert.equal(perms.isMonitorOnly, false);
  });
});
