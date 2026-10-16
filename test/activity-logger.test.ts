import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createActivityLog,
  formatActivityDescription,
} from '../src/utils/activity-logger.ts';

test('Activity Logger & Audit Trail Suite', async (t) => {
  await t.test('generates valid activity log entries with deterministic timestamp and id', () => {
    const log = createActivityLog({
      action: 'RECORD_CREATED',
      entityId: 'rec-100',
      entitySummary: 'Truk B 9283 TDA (Teak, 14.65 m³)',
      operatorName: 'Budi Santoso',
      operatorRole: 'Manager',
    });

    assert.ok(log.id.startsWith('act-'));
    assert.equal(log.action, 'RECORD_CREATED');
    assert.equal(log.operatorName, 'Budi Santoso');
    assert.ok(log.timestamp);
  });

  await t.test('formats bilingual description correctly for all actions', () => {
    const desc = formatActivityDescription('RECORD_DELETED', 'Truk L 8172 UX');
    assert.match(desc, /dihapus/i);
  });
});
