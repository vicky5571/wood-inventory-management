import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createSqliteDatabase } from '../src/persistence/sqlite/db.ts';
import { runMigrations } from '../src/persistence/sqlite/migrations.ts';
import {
  createUserRepository,
  ensureSeedUsers,
  UserRepository,
} from '../src/persistence/user-repository.ts';
import {
  createSessionToken,
  getAuthenticatedUser,
  COOKIE_NAME,
} from '../src/auth/session.ts';

describe('UserRepository Seeder Suite', () => {
  let repo: UserRepository;
  let db: ReturnType<typeof createSqliteDatabase>;

  beforeEach(() => {
    db = createSqliteDatabase(':memory:');
    runMigrations(db);
    repo = createUserRepository('sqlite', db);
  });

  it('empty DB + ensureSeedUsers inserts 4 users', async () => {
    const initialList = await repo.listAll({ includeInactive: true });
    assert.equal(initialList.length, 0);

    await ensureSeedUsers(repo);

    const seededList = await repo.listAll({ includeInactive: true });
    assert.equal(seededList.length, 4);
  });

  it('each seeded user has isActive: true', async () => {
    await ensureSeedUsers(repo);
    const users = await repo.listAll({ includeInactive: true });
    for (const u of users) {
      assert.equal(u.isActive, true);
    }
  });

  it('seeded gudang@timber.id has permissions.tallyCreate: true', async () => {
    await ensureSeedUsers(repo);
    const gudang = await repo.findByEmail('gudang@timber.id');
    assert.ok(gudang);
    assert.equal(gudang?.roleLevel, 2);
    assert.equal(gudang?.permissions?.tallyCreate, true);
  });

  it('ensureSeedUsers called twice is idempotent and does not duplicate', async () => {
    await ensureSeedUsers(repo);
    assert.equal((await repo.listAll({ includeInactive: true })).length, 4);

    await ensureSeedUsers(repo);
    assert.equal((await repo.listAll({ includeInactive: true })).length, 4);
  });

  it('non-empty DB + ensureSeedUsers is a no-op (preserves admin additions/modifications)', async () => {
    await repo.create({
      id: 'custom-admin-01',
      email: 'custom@timber.id',
      name: 'Custom User',
      roleLevel: 1,
      title: 'Level 1',
      passwordHash: 'customhash',
      isActive: true,
    });

    const before = await repo.listAll({ includeInactive: true });
    assert.equal(before.length, 1);

    await ensureSeedUsers(repo);

    const after = await repo.listAll({ includeInactive: true });
    assert.equal(after.length, 1);
    assert.equal(after[0].id, 'custom-admin-01');
  });

  it('fresh DB + ensureSeedUsers emits ZERO activity_logs with action LIKE USER_%', async () => {
    await ensureSeedUsers(repo);
    const userAuditRows = db.prepare(`
      SELECT * FROM activity_logs WHERE action LIKE 'USER_%'
    `).all();
    assert.equal(userAuditRows.length, 0);
  });

  it('getAuthenticatedUser lookup emits ZERO activity_logs with action LIKE USER_%', async () => {
    await ensureSeedUsers(repo);
    const token = createSessionToken({
      id: 'usr-manager-01',
      email: 'manager@timber.id',
      name: 'Manager',
      roleLevel: 1,
      title: 'Manager',
    }, 3600);

    const req = new Request('https://timber.test/api/records', {
      headers: { cookie: `${COOKIE_NAME}=${token}` },
    });
    const user = await getAuthenticatedUser(req);
    assert.ok(user);

    const userAuditRows = db.prepare(`
      SELECT * FROM activity_logs WHERE action LIKE 'USER_%'
    `).all();
    assert.equal(userAuditRows.length, 0);
  });
});
