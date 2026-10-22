import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createSqliteDatabase } from '../src/persistence/sqlite/db.ts';
import { runMigrations } from '../src/persistence/sqlite/migrations.ts';
import {
  createUserRepository,
  UserNotFoundError,
  DuplicateEmailError,
  UserRepository,
} from '../src/persistence/user-repository.ts';

describe('UserRepository DAO Suite', () => {
  let repo: UserRepository;
  let db: ReturnType<typeof createSqliteDatabase>;

  beforeEach(() => {
    db = createSqliteDatabase(':memory:');
    runMigrations(db);
    repo = createUserRepository('sqlite', db);
  });

  it('create inserts user with createdAt/updatedAt auto-stamped', async () => {
    const user = await repo.create({
      id: 'usr-test-01',
      email: 'test@timber.id',
      name: 'Test User',
      roleLevel: 2,
      title: 'Level 2 — Test',
      passwordHash: 'hash123',
      isActive: true,
      permissions: { tallyCreate: true },
    });

    assert.equal(user.id, 'usr-test-01');
    assert.equal(user.email, 'test@timber.id');
    assert.equal(user.isActive, true);
    assert.ok(user.createdAt);
    assert.ok(user.updatedAt);
    assert.deepEqual(user.permissions, { tallyCreate: true });
  });

  it('findByEmail returns active user with password hash and permissions', async () => {
    await repo.create({
      id: 'usr-test-02',
      email: 'active@timber.id',
      name: 'Active User',
      roleLevel: 1,
      title: 'Level 1 — Owner',
      passwordHash: 'hashActive',
      isActive: true,
      permissions: { tallyCreate: true },
    });

    const found = await repo.findByEmail('active@timber.id');
    assert.ok(found);
    assert.equal(found?.id, 'usr-test-02');
    assert.equal(found?.passwordHash, 'hashActive');
    assert.deepEqual(found?.permissions, { tallyCreate: true });
  });

  it('findByEmail returns null for inactive user', async () => {
    await repo.create({
      id: 'usr-inactive',
      email: 'inactive@timber.id',
      name: 'Inactive User',
      roleLevel: 3,
      title: 'Level 3',
      passwordHash: 'hashInactive',
      isActive: false,
    });

    const found = await repo.findByEmail('inactive@timber.id');
    assert.equal(found, null);
  });

  it('findByEmail returns null for non-existent email', async () => {
    const found = await repo.findByEmail('ghost@timber.id');
    assert.equal(found, null);
  });

  it('findByEmail is case-insensitive on email', async () => {
    await repo.create({
      id: 'usr-case',
      email: 'cased@timber.id',
      name: 'Case Test',
      roleLevel: 2,
      title: 'Staff',
      passwordHash: 'hashCase',
      isActive: true,
    });

    const found = await repo.findByEmail('CASED@TIMBER.ID');
    assert.ok(found);
    assert.equal(found?.id, 'usr-case');
  });

  it('findById returns active user, null for inactive, null for non-existent', async () => {
    await repo.create({
      id: 'usr-id-active',
      email: 'id-act@timber.id',
      name: 'ID Active',
      roleLevel: 2,
      title: 'Staff',
      passwordHash: 'hash',
      isActive: true,
    });
    await repo.create({
      id: 'usr-id-inact',
      email: 'id-inact@timber.id',
      name: 'ID Inactive',
      roleLevel: 2,
      title: 'Staff',
      passwordHash: 'hash',
      isActive: false,
    });

    const activeUser = await repo.findById('usr-id-active');
    assert.ok(activeUser);
    assert.equal(activeUser?.id, 'usr-id-active');

    const inactUser = await repo.findById('usr-id-inact');
    assert.equal(inactUser, null);

    const nonExistent = await repo.findById('usr-404');
    assert.equal(nonExistent, null);
  });

  it('listAll() returns active only and listAll({ includeInactive: true }) returns all', async () => {
    await repo.create({
      id: 'u1',
      email: 'u1@timber.id',
      name: 'U1',
      roleLevel: 1,
      title: 'L1',
      passwordHash: 'h',
      isActive: true,
    });
    await repo.create({
      id: 'u2',
      email: 'u2@timber.id',
      name: 'U2',
      roleLevel: 2,
      title: 'L2',
      passwordHash: 'h',
      isActive: false,
    });

    const activeList = await repo.listAll();
    assert.equal(activeList.length, 1);
    assert.equal(activeList[0].id, 'u1');

    const fullList = await repo.listAll({ includeInactive: true });
    assert.equal(fullList.length, 2);
  });

  it('create with duplicate email on active user throws DuplicateEmailError', async () => {
    await repo.create({
      id: 'u-dup-1',
      email: 'dup@timber.id',
      name: 'Dup 1',
      roleLevel: 2,
      title: 'L2',
      passwordHash: 'h',
      isActive: true,
    });

    await assert.rejects(
      () =>
        repo.create({
          id: 'u-dup-2',
          email: 'dup@timber.id',
          name: 'Dup 2',
          roleLevel: 2,
          title: 'L2',
          passwordHash: 'h',
          isActive: true,
        }),
      DuplicateEmailError
    );
  });

  it('create with email reused from soft-deleted user succeeds', async () => {
    await repo.create({
      id: 'u-old',
      email: 'reuse@timber.id',
      name: 'Old User',
      roleLevel: 2,
      title: 'Old',
      passwordHash: 'h',
      isActive: false,
    });

    const newUser = await repo.create({
      id: 'u-new',
      email: 'reuse@timber.id',
      name: 'New User',
      roleLevel: 2,
      title: 'New',
      passwordHash: 'h2',
      isActive: true,
    });

    assert.equal(newUser.id, 'u-new');
    assert.equal(newUser.email, 'reuse@timber.id');
  });

  it('update modifies specified fields and bumps updatedAt while keeping createdAt unchanged', async () => {
    const created = await repo.create({
      id: 'u-upd',
      email: 'upd@timber.id',
      name: 'Original Name',
      roleLevel: 2,
      title: 'Original Title',
      passwordHash: 'hashOrig',
      isActive: true,
    });

    const originalCreatedAt = created.createdAt;
    const updated = await repo.update('u-upd', {
      name: 'Updated Name',
      title: 'Updated Title',
    });

    assert.equal(updated.name, 'Updated Name');
    assert.equal(updated.title, 'Updated Title');
    assert.equal(updated.createdAt, originalCreatedAt);
    assert.ok(updated.updatedAt);
  });

  it('update on non-existent id throws UserNotFoundError', async () => {
    await assert.rejects(
      () => repo.update('non-existent', { name: 'Ghost' }),
      UserNotFoundError
    );
  });

  it('deactivate sets isActive = false and subsequent findById returns null', async () => {
    await repo.create({
      id: 'u-deact',
      email: 'deact@timber.id',
      name: 'To Deactivate',
      roleLevel: 2,
      title: 'Title',
      passwordHash: 'hash',
      isActive: true,
    });

    await repo.deactivate('u-deact');
    const lookup = await repo.findById('u-deact');
    assert.equal(lookup, null);

    const full = await repo.listAll({ includeInactive: true });
    const user = full.find((u) => u.id === 'u-deact');
    assert.equal(user?.isActive, false);
  });

  it('deactivate is idempotent', async () => {
    await repo.create({
      id: 'u-idem',
      email: 'idem@timber.id',
      name: 'Idem',
      roleLevel: 2,
      title: 'Title',
      passwordHash: 'hash',
      isActive: true,
    });

    await repo.deactivate('u-idem');
    await assert.doesNotReject(() => repo.deactivate('u-idem'));
  });

  it('upsertSeed inserts with new id and updates with existing id', async () => {
    await repo.upsertSeed({
      id: 'seed-1',
      email: 'seed@timber.id',
      name: 'Initial Seed',
      roleLevel: 1,
      title: 'Owner',
      passwordHash: 'h1',
      isActive: true,
    });

    let found = await repo.findById('seed-1');
    assert.equal(found?.name, 'Initial Seed');

    await repo.upsertSeed({
      id: 'seed-1',
      email: 'seed@timber.id',
      name: 'Updated Seed',
      roleLevel: 1,
      title: 'Owner',
      passwordHash: 'h2',
      isActive: true,
    });

    found = await repo.findById('seed-1');
    assert.equal(found?.name, 'Updated Seed');
    assert.equal(found?.passwordHash, 'h2');
  });

  it('JSON round-trip: permissions object is preserved', async () => {
    await repo.create({
      id: 'u-perm',
      email: 'perm@timber.id',
      name: 'Perm User',
      roleLevel: 2,
      title: 'Operator',
      passwordHash: 'hash',
      isActive: true,
      permissions: { tallyCreate: true },
    });

    const user = await repo.findById('u-perm');
    assert.deepEqual(user?.permissions, { tallyCreate: true });
  });

  it('JSON round-trip: null/undefined permissions returns undefined', async () => {
    await repo.create({
      id: 'u-noperm',
      email: 'noperm@timber.id',
      name: 'No Perm',
      roleLevel: 1,
      title: 'Owner',
      passwordHash: 'hash',
      isActive: true,
    });

    const user = await repo.findById('u-noperm');
    assert.equal(user?.permissions, undefined);
  });

  it('Malformed JSON in DB returns permissions: {} and does not throw', async () => {
    db.exec(`
      INSERT INTO users (id, email, name, role_level, title, permissions, password_hash, is_active, created_at, updated_at)
      VALUES ('u-malformed', 'bad@timber.id', 'Bad JSON', 2, 'Staff', 'INVALID{JSON', 'hash', 1, datetime('now'), datetime('now'));
    `);

    const user = await repo.findById('u-malformed');
    assert.ok(user);
    assert.deepEqual(user?.permissions, {});
  });
});
