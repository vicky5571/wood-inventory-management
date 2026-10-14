import test from 'node:test';
import assert from 'node:assert/strict';
import { authenticateUser, getUserById, PRESET_USERS } from '../src/auth/users.ts';

test('User Store & Authentication Suite', async (t) => {
  await t.test('has 3 pre-configured factory accounts for level 1, 2, and 3', () => {
    assert.equal(PRESET_USERS.length, 3);
    assert.deepEqual(PRESET_USERS.map((u) => u.roleLevel), [1, 2, 3]);
  });

  await t.test('authenticates valid manager credentials (level 1)', async () => {
    const user = await authenticateUser({ email: 'manager@timber.id', password: 'password123' });
    assert.ok(user);
    assert.equal(user.roleLevel, 1);
    assert.equal(user.email, 'manager@timber.id');
  });

  await t.test('authenticates valid admin credentials (level 2)', async () => {
    const user = await authenticateUser({ email: 'admin@timber.id', password: 'password123' });
    assert.ok(user);
    assert.equal(user.roleLevel, 2);
  });

  await t.test('authenticates valid monitor credentials (level 3)', async () => {
    const user = await authenticateUser({ email: 'viewer@timber.id', password: 'password123' });
    assert.ok(user);
    assert.equal(user.roleLevel, 3);
  });

  await t.test('rejects incorrect password', async () => {
    const user = await authenticateUser({ email: 'manager@timber.id', password: 'wrongpassword' });
    assert.equal(user, null);
  });

  await t.test('rejects nonexistent user email', async () => {
    const user = await authenticateUser({ email: 'unknown@timber.id', password: 'password123' });
    assert.equal(user, null);
  });

  await t.test('getUserById retrieves correct user profile without password', () => {
    const user = getUserById('usr-manager-01');
    assert.ok(user);
    assert.equal(user.email, 'manager@timber.id');
    assert.equal((user as any).passwordHash, undefined);
  });
});
