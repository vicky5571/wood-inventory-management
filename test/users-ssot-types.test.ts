import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  ManagedUser,
  CreateUserPayload,
  UpdateUserPayload,
  ResetPasswordPayload,
  DeactivateUserPayload,
  ReactivateUserPayload,
  UsersApiResponse,
  UserApiResponse,
} from '../src/types/index.ts';

test('SSOT Admin User Management Types Suite', async (t) => {
  await t.test('ManagedUser structure conforms to AuthUser without passwordHash', () => {
    const user: ManagedUser = {
      id: 'usr-1',
      email: 'admin@timber.id',
      name: 'Admin',
      roleLevel: 1,
      title: 'Director',
      isActive: true,
      createdAt: '2026-10-22T00:00:00Z',
      updatedAt: '2026-10-22T00:00:00Z',
    };
    assert.equal(user.id, 'usr-1');
    assert.equal(user.isActive, true);
    // @ts-expect-error passwordHash should not exist on ManagedUser
    assert.equal(user.passwordHash, undefined);
  });

  await t.test('CreateUserPayload accepts required fields and optional permissions', () => {
    const payload: CreateUserPayload = {
      email: 'test@timber.id',
      name: 'Test User',
      title: 'Staff',
      roleLevel: 2,
      password: 'password123',
      permissions: { tallyCreate: true },
    };
    assert.equal(payload.roleLevel, 2);
  });

  await t.test('UpdateUserPayload allows partial updates without id, isActive, or password', () => {
    const patch: UpdateUserPayload = {
      name: 'Updated Name',
      roleLevel: 2,
    };
    // @ts-expect-error id is immutable and cannot be patched
    patch.id = 'usr-2';
    // @ts-expect-error isActive must use dedicated deactivate/reactivate endpoints
    patch.isActive = false;
    assert.equal(patch.name, 'Updated Name');
  });
});
