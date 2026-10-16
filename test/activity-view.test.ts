import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createActivityLog } from '../src/utils/activity-logger.ts';

test('Activity View Filtering Suite', async (t) => {
  await t.test('filters log entries by action category', () => {
    const logs = [
      createActivityLog({ action: 'RECORD_CREATED', entitySummary: 'A', operatorName: 'X', operatorRole: 'M' }),
      createActivityLog({ action: 'RECORD_DELETED', entitySummary: 'B', operatorName: 'Y', operatorRole: 'A' }),
      createActivityLog({ action: 'RECORD_UPDATED', entitySummary: 'C', operatorName: 'X', operatorRole: 'M' }),
    ];

    const deletes = logs.filter((l) => l.action === 'RECORD_DELETED');
    assert.equal(deletes.length, 1);
    assert.equal(deletes[0].entitySummary, 'B');

    const creates = logs.filter((l) => l.action === 'RECORD_CREATED');
    assert.equal(creates.length, 1);
    assert.equal(creates[0].entitySummary, 'A');
  });

  await t.test('preserves reverse chronological order of events', () => {
    const log1 = createActivityLog({ action: 'RECORD_CREATED', entitySummary: '1', operatorName: 'X', operatorRole: 'M' });
    const log2 = createActivityLog({ action: 'RECORD_UPDATED', entitySummary: '2', operatorName: 'X', operatorRole: 'M' });
    const stream = [log2, log1];

    assert.ok(new Date(stream[0].timestamp).getTime() >= new Date(stream[1].timestamp).getTime());
  });
});
