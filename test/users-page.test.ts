import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('UsersPage Coordinator Suite', async (t) => {
  const pagePath = path.resolve(process.cwd(), 'app/users/page.tsx');

  await t.test('UsersPage exists and strictly respects < 250 LOC God File invariant', () => {
    assert.ok(fs.existsSync(pagePath));
    const lines = fs.readFileSync(pagePath, 'utf-8').split('\n');
    assert.ok(lines.length <= 250, `UsersPage exceeded 250 LOC (currently ${lines.length})`);
  });

  await t.test('UsersPage integrates useAuth and modals', () => {
    const content = fs.readFileSync(pagePath, 'utf-8');
    assert.match(content, /useAuth/);
    assert.match(content, /UserListTable/);
    assert.match(content, /UserCreateModal/);
    assert.match(content, /UserEditModal/);
    assert.match(content, /PasswordResetModal/);
    assert.match(content, /DeactivateConfirmModal/);
    assert.match(content, /UserAuditDrawer/);
  });
});
