import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Admin User Management Components Suite', async (t) => {
  const tablePath = path.resolve(process.cwd(), 'src/components/users/UserListTable.tsx');
  const createModalPath = path.resolve(process.cwd(), 'src/components/users/UserCreateModal.tsx');
  const promoteModalPath = path.resolve(process.cwd(), 'src/components/users/PromoteToLevel1ConfirmModal.tsx');
  const editModalPath = path.resolve(process.cwd(), 'src/components/users/UserEditModal.tsx');
  const pwModalPath = path.resolve(process.cwd(), 'src/components/users/PasswordResetModal.tsx');
  const deactModalPath = path.resolve(process.cwd(), 'src/components/users/DeactivateConfirmModal.tsx');
  const drawerPath = path.resolve(process.cwd(), 'src/components/users/UserAuditDrawer.tsx');

  // Phase 8: UserListTable
  await t.test('UserListTable exists and stays under 220 LOC', () => {
    assert.ok(fs.existsSync(tablePath));
    const lines = fs.readFileSync(tablePath, 'utf-8').split('\n');
    assert.ok(lines.length <= 220, `UserListTable.tsx exceeded LOC: ${lines.length}`);
  });

  await t.test('UserListTable exports interface and renders columns', () => {
    const content = fs.readFileSync(tablePath, 'utf-8');
    assert.match(content, /export interface UserListTableProps/);
    assert.match(content, /export function UserListTable/);
    assert.match(content, /tallyCreate/);
    assert.match(content, /Nonaktif|Aktif/);
  });

  // Phase 9: UserCreateModal
  await t.test('UserCreateModal exists and respects < 230 LOC', () => {
    assert.ok(fs.existsSync(createModalPath));
    const lines = fs.readFileSync(createModalPath, 'utf-8').split('\n');
    assert.ok(lines.length <= 230, `UserCreateModal.tsx exceeded LOC: ${lines.length}`);
  });

  await t.test('UserCreateModal conditions tallyCreate on roleLevel 2', () => {
    const content = fs.readFileSync(createModalPath, 'utf-8');
    assert.match(content, /roleLevel\s*===?\s*2/);
    assert.match(content, /password/);
  });

  // Phase 10: PromoteToLevel1ConfirmModal & UserEditModal
  await t.test('PromoteToLevel1ConfirmModal exists and respects < 100 LOC', () => {
    assert.ok(fs.existsSync(promoteModalPath));
    const lines = fs.readFileSync(promoteModalPath, 'utf-8').split('\n');
    assert.ok(lines.length <= 100, `PromoteToLevel1ConfirmModal.tsx exceeded LOC: ${lines.length}`);
  });

  await t.test('UserEditModal exists and respects < 230 LOC', () => {
    assert.ok(fs.existsSync(editModalPath));
    const lines = fs.readFileSync(editModalPath, 'utf-8').split('\n');
    assert.ok(lines.length <= 230, `UserEditModal.tsx exceeded LOC: ${lines.length}`);
  });

  // Phase 11: PasswordResetModal & DeactivateConfirmModal
  await t.test('PasswordResetModal exists and respects < 130 LOC', () => {
    assert.ok(fs.existsSync(pwModalPath));
    const lines = fs.readFileSync(pwModalPath, 'utf-8').split('\n');
    assert.ok(lines.length <= 130, `PasswordResetModal.tsx exceeded LOC: ${lines.length}`);
  });

  await t.test('DeactivateConfirmModal exists and requires typing DEACTIVATE', () => {
    assert.ok(fs.existsSync(deactModalPath));
    const content = fs.readFileSync(deactModalPath, 'utf-8');
    assert.match(content, /DEACTIVATE/);
  });

  // Phase 12: UserAuditDrawer
  await t.test('UserAuditDrawer exists and respects < 200 LOC', () => {
    assert.ok(fs.existsSync(drawerPath));
    const lines = fs.readFileSync(drawerPath, 'utf-8').split('\n');
    assert.ok(lines.length <= 200, `UserAuditDrawer.tsx exceeded LOC: ${lines.length}`);
  });
});
