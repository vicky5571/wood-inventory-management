import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('RecordTableMobileView & Ledger Mobile Synergy Suite', async (t) => {
  const mobileViewPath = path.resolve(process.cwd(), 'src/components/ledger/RecordTableMobileView.tsx');
  const recordTablePath = path.resolve(process.cwd(), 'src/components/ledger/RecordTable.tsx');

  await t.test('RecordTableMobileView.tsx exists and adheres to < 180 LOC constraint', () => {
    assert.ok(fs.existsSync(mobileViewPath), 'RecordTableMobileView.tsx must exist');
    const lines = fs.readFileSync(mobileViewPath, 'utf-8').split('\n');
    assert.ok(lines.length <= 180, `RecordTableMobileView.tsx must not exceed 180 LOC (currently ${lines.length})`);
  });

  await t.test('RecordTableMobileView.tsx defines interface and renders key card elements with RBAC guard', () => {
    const content = fs.readFileSync(mobileViewPath, 'utf-8');
    assert.match(content, /export interface RecordTableMobileViewProps/, 'Must export RecordTableMobileViewProps');
    assert.match(content, /export function RecordTableMobileView/, 'Must export RecordTableMobileView component');
    assert.match(content, /canWrite/, 'Must respect canWrite prop for actions');
    assert.match(content, /onEdit/, 'Must support onEdit action');
    assert.match(content, /onDelete/, 'Must support onDelete action');
    assert.match(content, /onPrint/, 'Must support onPrint action');
    assert.match(content, /truck_plate_number|truckPlateNumber/, 'Must render truck plate number');
    assert.match(content, /payment_status|paymentStatus/, 'Must render payment status badge');
  });

  await t.test('RecordTable.tsx adheres to < 220 LOC constraint and integrates mobile view & shortcut banner', () => {
    assert.ok(fs.existsSync(recordTablePath), 'RecordTable.tsx must exist');
    const lines = fs.readFileSync(recordTablePath, 'utf-8').split('\n');
    assert.ok(lines.length <= 220, `RecordTable.tsx must not exceed 220 LOC (currently ${lines.length})`);

    const content = fs.readFileSync(recordTablePath, 'utf-8');
    assert.match(content, /RecordTableMobileView/, 'Must import and mount RecordTableMobileView');
    assert.match(content, /'mobile'/, 'Must support mobile viewMode');
    assert.match(content, /\/tally/, 'Must render shortcut link to /tally');
    assert.match(content, /Mode Tally Lapangan|Buka Tally/, 'Must render tally quick-action banner');
  });
});

