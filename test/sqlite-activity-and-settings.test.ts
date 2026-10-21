import test from 'node:test';
import assert from 'node:assert/strict';
import { createSqliteDatabase } from '../src/persistence/sqlite/db.ts';
import { runMigrations } from '../src/persistence/sqlite/migrations.ts';
import {
  listActivityLogsFromDb,
  appendActivityLogToDb,
  getSettingsFromDb,
  saveSettingsToDb,
} from '../src/persistence/sqlite/activity-queries.ts';

test('SQLite Activity Logs & App Settings Persistence Suite', async (t) => {
  const db = createSqliteDatabase(':memory:');
  runMigrations(db);
  t.after(() => db.close());

  await t.test('returns default settings and persists partial updates', () => {
    const initial = getSettingsFromDb(db);
    assert.equal(initial.defaultTimberPphRate, 0.5);
    assert.equal(initial.acceptableDiscrepancyThresholdPct, 2.0);
    assert.equal(initial.discrepancyAlarmVolumeM3, 1.5);
    assert.equal(initial.discrepancyAlarmPercent, 2.0);

    const updated = saveSettingsToDb(db, {
      defaultTimberPphRate: 1.5,
      yardName: 'TPK-02 Selatan',
      discrepancyAlarmVolumeM3: 2.5,
      discrepancyAlarmPercent: 3.5,
    });
    assert.equal(updated.defaultTimberPphRate, 1.5);
    assert.equal(updated.yardName, 'TPK-02 Selatan');
    assert.equal(updated.defaultFreightPphRate, 2.0);
    assert.equal(updated.discrepancyAlarmVolumeM3, 2.5);
    assert.equal(updated.discrepancyAlarmPercent, 3.5);
  });

  await t.test('appends immutable activity logs and filters by action', () => {
    appendActivityLogToDb(db, {
      action: 'RECORD_CREATED',
      entityId: 'rec-01',
      entitySummary: 'Truk KB 1234 XY • Meranti (12.5 m³)',
      operatorName: 'Budi Santoso',
      operatorRole: 'Level 1',
    });
    appendActivityLogToDb(db, {
      action: 'SALE_CREATED',
      entityId: 'sale-01',
      entitySummary: 'DO/2026/001 • PT Kayu Jaya (5.0 m³)',
      operatorName: 'Budi Santoso',
      operatorRole: 'Level 1',
    });

    const all = listActivityLogsFromDb(db);
    assert.equal(all.length, 2);

    const salesOnly = listActivityLogsFromDb(db, 'SALE_CREATED');
    assert.equal(salesOnly.length, 1);
    assert.equal(salesOnly[0].entityId, 'sale-01');
  });
});
