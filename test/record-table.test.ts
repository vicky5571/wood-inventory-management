import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('RecordTableCompactView Batch Indicator & Architecture Suite', async (t) => {
  const compactViewPath = path.resolve(process.cwd(), 'src/components/ledger/RecordTableCompactView.tsx');

  await t.test('RecordTableCompactView adheres to the <250 LOC Strangler invariant', () => {
    assert.ok(fs.existsSync(compactViewPath), 'RecordTableCompactView.tsx must exist');
    const lines = fs.readFileSync(compactViewPath, 'utf-8').split('\n');
    assert.ok(lines.length <= 250, `RecordTableCompactView.tsx must not exceed 250 LOC (currently ${lines.length})`);
  });

  await t.test('RecordTableCompactView implements batch badge indicator for items sharing manifest_id', () => {
    const content = fs.readFileSync(compactViewPath, 'utf-8');

    // Must calculate manifest item counts / map
    assert.match(content, /manifest_id/, 'Must check record manifest_id');
    // Must render Batch badge with item count
    assert.match(content, /Batch \[.*item\]/i, 'Must render Batch badge with item count indicator');
  });
});
