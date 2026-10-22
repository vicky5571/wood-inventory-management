import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from '../src/persistence/sqlite/migrations.ts';
import { appendActivityLogToDb, listUserActivityLogsFromDb } from '../src/persistence/sqlite/activity-queries.ts';
import { serverRecordStore } from '../src/persistence/server-record-store.ts';

test('User Activity Queries Scoping Suite', async (t) => {
  const db = new DatabaseSync(':memory:');
  runMigrations(db);

  const targetUserId = 'usr-target-audit-01';
  const otherUserId = 'usr-other-02';

  appendActivityLogToDb(db, {
    action: 'USER_CREATED',
    entityId: targetUserId,
    entitySummary: 'Created user target',
    operatorName: 'Admin',
    operatorRole: 'Director',
  });

  appendActivityLogToDb(db, {
    action: 'USER_ROLE_CHANGED',
    entityId: targetUserId,
    entitySummary: 'Promoted target user',
    operatorName: 'Admin',
    operatorRole: 'Director',
  });

  appendActivityLogToDb(db, {
    action: 'RECORD_CREATED',
    entityId: targetUserId,
    entitySummary: 'Target user created record',
    operatorName: 'Target',
    operatorRole: 'Staff',
  });

  appendActivityLogToDb(db, {
    action: 'USER_DEACTIVATED',
    entityId: otherUserId,
    entitySummary: 'Other user deactivated',
    operatorName: 'Admin',
    operatorRole: 'Director',
  });

  await t.test('listUserActivityLogsFromDb returns only USER_* actions matching entityId', () => {
    const logs = listUserActivityLogsFromDb(db, targetUserId, 50);
    assert.equal(logs.length, 2);
    assert.ok(logs.every((l) => l.entityId === targetUserId));
    assert.ok(logs.every((l) => l.action.startsWith('USER_')));
  });

  await t.test('serverRecordStore.getUserActivityLogs delegates successfully', async () => {
    const logs = await serverRecordStore.getUserActivityLogs(targetUserId, 10);
    assert.ok(Array.isArray(logs));
  });
});
