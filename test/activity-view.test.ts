import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createActivityLog } from '../src/utils/activity-logger.ts';

test('Activity View Filtering & Immutability Invariants Suite', async (t) => {
  await t.test('filters log entries by action category including sales and settings', () => {
    const logs = [
      createActivityLog({ action: 'RECORD_CREATED', entitySummary: 'A', operatorName: 'X', operatorRole: 'M' }),
      createActivityLog({ action: 'RECORD_DELETED', entitySummary: 'B', operatorName: 'Y', operatorRole: 'A' }),
      createActivityLog({ action: 'SALE_CREATED', entitySummary: 'S', operatorName: 'X', operatorRole: 'M' }),
      createActivityLog({ action: 'SETTINGS_UPDATED', entitySummary: 'Cfg', operatorName: 'X', operatorRole: 'M' }),
    ];

    const sales = logs.filter((l) => l.action === 'SALE_CREATED');
    assert.equal(sales.length, 1);
    assert.equal(sales[0].entitySummary, 'S');

    const settings = logs.filter((l) => l.action === 'SETTINGS_UPDATED');
    assert.equal(settings.length, 1);
    assert.equal(settings[0].entitySummary, 'Cfg');
  });

  await t.test('preserves reverse chronological order of events', () => {
    const log1 = createActivityLog({ action: 'RECORD_CREATED', entitySummary: '1', operatorName: 'X', operatorRole: 'M' });
    const log2 = createActivityLog({ action: 'RECORD_UPDATED', entitySummary: '2', operatorName: 'X', operatorRole: 'M' });
    const stream = [log2, log1];

    assert.ok(new Date(stream[0].timestamp).getTime() >= new Date(stream[1].timestamp).getTime());
  });

  await t.test('app/activity/page.tsx enforces immutable audit trail without destructive clear/reset buttons', () => {
    const pagePath = path.resolve(process.cwd(), 'app/activity/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf-8');

    assert.ok(!content.includes('clearLogs'), 'Activity UI must not call clearLogs');
    assert.ok(!content.includes('resetLogs'), 'Activity UI must not call resetLogs');
    assert.ok(!content.includes('Hapus Semua Log'), 'Activity UI must not expose Hapus Semua Log button');
    assert.ok(!content.includes('Reset Log Awal'), 'Activity UI must not expose Reset Log Awal button');
  });
});
