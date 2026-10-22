import test from 'node:test';
import assert from 'node:assert/strict';
import { createSqliteDatabase } from '../src/persistence/sqlite/db.ts';
import { runMigrations } from '../src/persistence/sqlite/migrations.ts';
import {
  createUserRepository,
  UserNotFoundError,
  type UserRepository,
} from '../src/persistence/user-repository.ts';
import {
  AuditedUserRepository,
  createAuditedUserRepository,
} from '../src/persistence/user-repository-audited.ts';
import type {
  ActivityLogEntry,
  AuthUser,
  UserCreatedMetadata,
  UserUpdatedMetadata,
  UserRoleChangedMetadata,
  UserPermissionChangedMetadata,
  UserDeactivatedMetadata,
  UserReactivatedMetadata,
  UserPasswordChangedMetadata,
} from '../src/types/index.ts';

function createTestContext() {
  const db = createSqliteDatabase(':memory:');
  runMigrations(db);
  const rawRepo = createUserRepository('sqlite', db);
  const logs: Array<Omit<ActivityLogEntry, 'id' | 'timestamp'>> = [];

  const actor: AuthUser = {
    id: 'usr-admin-actor-01',
    email: 'admin.actor@timber.id',
    name: 'Budi Utama',
    roleLevel: 1,
    title: 'Level 1 — Executive Admin',
  };

  const logger = async (entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => {
    logs.push(entry);
  };

  const auditedRepo = new AuditedUserRepository(rawRepo, logger, actor);

  return { rawRepo, auditedRepo, logs, actor };
}

test('AuditedUserRepository Test Suite (Spec C)', async (t) => {
  await t.test('1. create emits 1 USER_CREATED entry with typed metadata and actor fields', async () => {
    const { auditedRepo, logs, actor } = createTestContext();

    const created = await auditedRepo.create({
      id: 'usr-new-01',
      email: 'newuser@timber.id',
      name: 'New User',
      roleLevel: 2,
      title: 'Level 2 Staff',
      passwordHash: 'hash-secret',
      isActive: true,
      permissions: { tallyCreate: true },
    });

    assert.equal(created.id, 'usr-new-01');
    assert.equal(logs.length, 1);

    const log = logs[0];
    assert.equal(log.action, 'USER_CREATED');
    assert.equal(log.entityId, 'usr-new-01');
    assert.equal(log.operatorName, actor.name);
    assert.equal(log.operatorRole, actor.title);

    const meta = log.metadata as unknown as UserCreatedMetadata;
    assert.equal(meta.targetUserId, 'usr-new-01');
    assert.equal(meta.targetEmail, 'newuser@timber.id');
    assert.equal(meta.targetName, 'New User');
    assert.equal(meta.initialRoleLevel, 2);
    assert.deepEqual(meta.initialPermissions, { tallyCreate: true });
  });

  await t.test('2. update with name change only emits 1 USER_UPDATED entry with changedFields', async () => {
    const { auditedRepo, logs } = createTestContext();

    await auditedRepo.create({
      id: 'usr-up-01',
      email: 'update1@timber.id',
      name: 'Old Name',
      roleLevel: 2,
      title: 'Staff',
      passwordHash: 'dummy',
      isActive: true,
    });
    logs.length = 0; // clear creation log

    await auditedRepo.update('usr-up-01', { name: 'New Name' });

    assert.equal(logs.length, 1);
    assert.equal(logs[0].action, 'USER_UPDATED');

    const meta = logs[0].metadata as unknown as UserUpdatedMetadata;
    assert.equal(meta.targetUserId, 'usr-up-01');
    assert.equal(meta.targetEmail, 'update1@timber.id');
    assert.deepEqual(meta.changedFields, [
      { field: 'name', before: 'Old Name', after: 'New Name' },
    ]);
  });

  await t.test('3. update with email and title change emits 1 USER_UPDATED with 2 changedFields', async () => {
    const { auditedRepo, logs } = createTestContext();

    await auditedRepo.create({
      id: 'usr-up-02',
      email: 'before@timber.id',
      name: 'User 2',
      roleLevel: 2,
      title: 'Junior Clerk',
      passwordHash: 'dummy',
      isActive: true,
    });
    logs.length = 0;

    await auditedRepo.update('usr-up-02', {
      email: 'after@timber.id',
      title: 'Senior Clerk',
    });

    assert.equal(logs.length, 1);
    assert.equal(logs[0].action, 'USER_UPDATED');

    const meta = logs[0].metadata as unknown as UserUpdatedMetadata;
    assert.deepEqual(meta.changedFields, [
      { field: 'email', before: 'before@timber.id', after: 'after@timber.id' },
      { field: 'title', before: 'Junior Clerk', after: 'Senior Clerk' },
    ]);
  });

  await t.test('4. update with roleLevel change emits USER_ROLE_CHANGED (NOT USER_UPDATED)', async () => {
    const { auditedRepo, logs } = createTestContext();

    await auditedRepo.create({
      id: 'usr-up-03',
      email: 'promoted@timber.id',
      name: 'Promoted User',
      roleLevel: 2,
      title: 'Staff',
      passwordHash: 'dummy',
      isActive: true,
    });
    logs.length = 0;

    await auditedRepo.update('usr-up-03', {
      roleLevel: 1,
    });

    assert.equal(logs.length, 1);
    assert.equal(logs[0].action, 'USER_ROLE_CHANGED');

    const meta = logs[0].metadata as unknown as UserRoleChangedMetadata;
    assert.equal(meta.targetUserId, 'usr-up-03');
    assert.equal(meta.targetEmail, 'promoted@timber.id');
    assert.equal(meta.before, 2);
    assert.equal(meta.after, 1);
  });

  await t.test('5. update with permission grant emits USER_PERMISSION_CHANGED', async () => {
    const { auditedRepo, logs } = createTestContext();

    await auditedRepo.create({
      id: 'usr-up-04',
      email: 'permgrant@timber.id',
      name: 'Perm User',
      roleLevel: 2,
      title: 'Staff',
      passwordHash: 'dummy',
      isActive: true,
      permissions: {},
    });
    logs.length = 0;

    await auditedRepo.update('usr-up-04', {
      permissions: { tallyCreate: true },
    });

    assert.equal(logs.length, 1);
    assert.equal(logs[0].action, 'USER_PERMISSION_CHANGED');

    const meta = logs[0].metadata as unknown as UserPermissionChangedMetadata;
    assert.equal(meta.targetUserId, 'usr-up-04');
    assert.deepEqual(meta.changes, ['granted: tallyCreate']);
  });

  await t.test('6. update with permission revoke emits USER_PERMISSION_CHANGED', async () => {
    const { auditedRepo, logs } = createTestContext();

    await auditedRepo.create({
      id: 'usr-up-05',
      email: 'permrevoke@timber.id',
      name: 'Revoke User',
      roleLevel: 2,
      title: 'Staff',
      passwordHash: 'dummy',
      isActive: true,
      permissions: { tallyCreate: true },
    });
    logs.length = 0;

    await auditedRepo.update('usr-up-05', {
      permissions: {},
    });

    assert.equal(logs.length, 1);
    assert.equal(logs[0].action, 'USER_PERMISSION_CHANGED');

    const meta = logs[0].metadata as unknown as UserPermissionChangedMetadata;
    assert.deepEqual(meta.changes, ['revoked: tallyCreate']);
  });

  await t.test('7. update with same permissions emits 0 permission entries (no-op suppressed)', async () => {
    const { auditedRepo, logs } = createTestContext();

    await auditedRepo.create({
      id: 'usr-up-06',
      email: 'sameperm@timber.id',
      name: 'Same Perm',
      roleLevel: 2,
      title: 'Staff',
      passwordHash: 'dummy',
      isActive: true,
      permissions: { tallyCreate: true },
    });
    logs.length = 0;

    await auditedRepo.update('usr-up-06', {
      permissions: { tallyCreate: true },
    });

    assert.equal(logs.length, 0);
  });

  await t.test('8. update with passwordHash emits USER_PASSWORD_CHANGED with NO passwordHash in metadata', async () => {
    const { auditedRepo, logs } = createTestContext();

    await auditedRepo.create({
      id: 'usr-up-07',
      email: 'pwd@timber.id',
      name: 'Pwd User',
      roleLevel: 2,
      title: 'Staff',
      passwordHash: 'old-hash',
      isActive: true,
    });
    logs.length = 0;

    await auditedRepo.update('usr-up-07', {
      passwordHash: 'new-hash',
    });

    assert.equal(logs.length, 1);
    assert.equal(logs[0].action, 'USER_PASSWORD_CHANGED');

    const meta = logs[0].metadata as unknown as UserPasswordChangedMetadata;
    assert.equal(meta.targetUserId, 'usr-up-07');
    assert.equal(meta.targetEmail, 'pwd@timber.id');

    // Strict security assertion: password / passwordHash MUST NEVER be present in metadata keys
    const metaKeys = Object.keys(meta);
    assert.equal(metaKeys.includes('password'), false);
    assert.equal(metaKeys.includes('passwordHash'), false);
  });

  await t.test('9. update with role + name + passwordHash in one call emits 3 separate entries', async () => {
    const { auditedRepo, logs } = createTestContext();

    await auditedRepo.create({
      id: 'usr-up-08',
      email: 'multi@timber.id',
      name: 'Multi Before',
      roleLevel: 2,
      title: 'Staff',
      passwordHash: 'old-hash',
      isActive: true,
    });
    logs.length = 0;

    await auditedRepo.update('usr-up-08', {
      roleLevel: 1,
      name: 'Multi After',
      passwordHash: 'new-hash',
    });

    assert.equal(logs.length, 3);
    const actions = logs.map((l) => l.action).sort();
    assert.deepEqual(actions, [
      'USER_PASSWORD_CHANGED',
      'USER_ROLE_CHANGED',
      'USER_UPDATED',
    ]);
  });

  await t.test('10. update(id, { isActive: true }) on inactive user emits USER_REACTIVATED', async () => {
    const { rawRepo, auditedRepo, logs } = createTestContext();

    // Create inactive user via raw repo
    await rawRepo.create({
      id: 'usr-inact-09',
      email: 'inactive@timber.id',
      name: 'Inactive User',
      roleLevel: 3,
      title: 'Viewer',
      passwordHash: 'dummy',
      isActive: false,
    });
    logs.length = 0;

    await auditedRepo.update('usr-inact-09', { isActive: true });

    assert.equal(logs.length, 1);
    assert.equal(logs[0].action, 'USER_REACTIVATED');

    const meta = logs[0].metadata as unknown as UserReactivatedMetadata;
    assert.equal(meta.targetUserId, 'usr-inact-09');
    assert.equal(meta.targetEmail, 'inactive@timber.id');
    assert.equal(meta.roleLevel, 3);
  });

  await t.test('11. update(id, { isActive: true }) when already active emits 0 entries', async () => {
    const { auditedRepo, logs } = createTestContext();

    await auditedRepo.create({
      id: 'usr-act-10',
      email: 'alreadyactive@timber.id',
      name: 'Active User',
      roleLevel: 2,
      title: 'Staff',
      passwordHash: 'dummy',
      isActive: true,
    });
    logs.length = 0;

    await auditedRepo.update('usr-act-10', { isActive: true });

    assert.equal(logs.length, 0);
  });

  await t.test('12. update(id, { name: existingName }) emits 0 entries (no-op)', async () => {
    const { auditedRepo, logs } = createTestContext();

    await auditedRepo.create({
      id: 'usr-noop-11',
      email: 'noop@timber.id',
      name: 'Same Name',
      roleLevel: 2,
      title: 'Staff',
      passwordHash: 'dummy',
      isActive: true,
    });
    logs.length = 0;

    await auditedRepo.update('usr-noop-11', { name: 'Same Name' });

    assert.equal(logs.length, 0);
  });

  await t.test('13. deactivate(id) emits 1 USER_DEACTIVATED entry with previousRoleLevel', async () => {
    const { auditedRepo, logs } = createTestContext();

    await auditedRepo.create({
      id: 'usr-deact-12',
      email: 'deact@timber.id',
      name: 'Deact User',
      roleLevel: 2,
      title: 'Staff',
      passwordHash: 'dummy',
      isActive: true,
    });
    logs.length = 0;

    await auditedRepo.deactivate('usr-deact-12');

    assert.equal(logs.length, 1);
    assert.equal(logs[0].action, 'USER_DEACTIVATED');

    const meta = logs[0].metadata as unknown as UserDeactivatedMetadata;
    assert.equal(meta.targetUserId, 'usr-deact-12');
    assert.equal(meta.targetEmail, 'deact@timber.id');
    assert.equal(meta.previousRoleLevel, 2);
  });

  await t.test('14. deactivate on non-existent id throws UserNotFoundError and emits 0 logs', async () => {
    const { auditedRepo, logs } = createTestContext();

    await assert.rejects(
      () => auditedRepo.deactivate('usr-nonexistent-404'),
      (err: Error) => err instanceof UserNotFoundError
    );

    assert.equal(logs.length, 0);
  });

  await t.test('15. read operations (findByEmail, findById, listAll) pass through with 0 logs', async () => {
    const { auditedRepo, logs } = createTestContext();

    await auditedRepo.create({
      id: 'usr-read-13',
      email: 'read@timber.id',
      name: 'Read User',
      roleLevel: 1,
      title: 'Manager',
      passwordHash: 'dummy',
      isActive: true,
    });
    logs.length = 0;

    const byEmail = await auditedRepo.findByEmail('read@timber.id');
    assert.ok(byEmail);
    const byId = await auditedRepo.findById('usr-read-13');
    assert.ok(byId);
    const all = await auditedRepo.listAll();
    assert.ok(all.length >= 1);

    assert.equal(logs.length, 0);
  });

  await t.test('16. upsertSeed on AuditedUserRepository throws and prevents unlogged seed bypass', async () => {
    const { auditedRepo } = createTestContext();

    await assert.rejects(
      () => auditedRepo.upsertSeed({
        id: 'usr-seed-14',
        email: 'seed@timber.id',
        name: 'Seed',
        roleLevel: 1,
        title: 'Seed',
        passwordHash: 'dummy',
        isActive: true,
      }),
      /upsertSeed is not permitted on AuditedUserRepository/
    );
  });

  await t.test('17. logger failure re-throws error after mutation has completed', async () => {
    const db = createSqliteDatabase(':memory:');
    runMigrations(db);
    const rawRepo = createUserRepository('sqlite', db);

    const actor: AuthUser = {
      id: 'usr-actor',
      email: 'actor@timber.id',
      name: 'Actor',
      roleLevel: 1,
      title: 'Manager',
    };

    const failingLogger = async () => {
      throw new Error('Logger disk full failure');
    };

    const repo = new AuditedUserRepository(rawRepo, failingLogger, actor);

    await assert.rejects(
      () => repo.create({
        id: 'usr-err-15',
        email: 'err@timber.id',
        name: 'Err User',
        roleLevel: 2,
        title: 'Staff',
        passwordHash: 'dummy',
        isActive: true,
      }),
      /Logger disk full failure/
    );

    // Verify mutation was committed to inner repo before logger failed
    const createdInDb = await rawRepo.findById('usr-err-15');
    assert.ok(createdInDb);
  });

  await t.test('18. createAuditedUserRepository factory instantiates wrapper with actor', () => {
    const actor: AuthUser = {
      id: 'usr-manager-01',
      email: 'manager@timber.id',
      name: 'Manager',
      roleLevel: 1,
      title: 'Manager',
    };
    const repo = createAuditedUserRepository(actor);
    assert.ok(repo instanceof AuditedUserRepository);
  });
});
