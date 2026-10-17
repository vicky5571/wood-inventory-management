/**
 * test/record-table-view.test.ts
 *
 * Contract and integration test suite for RecordTable decomposition:
 * RecordTable (coordinator & view switcher), RecordTableCompactView, and RecordTableExcelView.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('RecordTable Architectural & View Invariants Suite', async (t) => {
  const coordinatorPath = path.resolve(process.cwd(), 'src/components/ledger/RecordTable.tsx');
  const compactPath = path.resolve(process.cwd(), 'src/components/ledger/RecordTableCompactView.tsx');
  const excelPath = path.resolve(process.cwd(), 'src/components/ledger/RecordTableExcelView.tsx');

  await t.test('all table component files exist and obey 250 LOC ceiling (Strangler Pattern)', () => {
    assert.ok(fs.existsSync(coordinatorPath), 'RecordTable.tsx must exist');
    assert.ok(fs.existsSync(compactPath), 'RecordTableCompactView.tsx must exist');
    assert.ok(fs.existsSync(excelPath), 'RecordTableExcelView.tsx must exist');

    const coordinatorLines = fs.readFileSync(coordinatorPath, 'utf-8').split('\n');
    const compactLines = fs.readFileSync(compactPath, 'utf-8').split('\n');
    const excelLines = fs.readFileSync(excelPath, 'utf-8').split('\n');

    assert.ok(coordinatorLines.length <= 250, `RecordTable.tsx (${coordinatorLines.length}) exceeds 250 LOC`);
    assert.ok(compactLines.length <= 250, `RecordTableCompactView.tsx (${compactLines.length}) exceeds 250 LOC`);
    assert.ok(excelLines.length <= 250, `RecordTableExcelView.tsx (${excelLines.length}) exceeds 250 LOC`);
  });

  await t.test('RecordTable.tsx implements view switcher state between compact and excel view modes', () => {
    const content = fs.readFileSync(coordinatorPath, 'utf-8');
    assert.match(content, /'compact'|'excel'/, 'Must define compact and excel view states');
    assert.match(content, /RecordTableCompactView/, 'Must import and render RecordTableCompactView');
    assert.match(content, /RecordTableExcelView/, 'Must import and render RecordTableExcelView');
  });

  await t.test('RecordTableExcelView.tsx implements 2-tier grouped headers matching factory Excel', () => {
    const content = fs.readFileSync(excelPath, 'utf-8');
    // Grouped 2-tier headers
    assert.match(content, /Pembayaran Kayu|木材货款/, 'Must contain Pembayaran Kayu grouped header');
    assert.match(content, /Pembayaran Ongkos Kirim|运费支付/, 'Must contain Pembayaran Ongkos Kirim grouped header');
    assert.match(content, /Pengiriman|送货/, 'Must contain Pengiriman grouped header');
    assert.match(content, /Pemeriksaan|检尺/, 'Must contain Pemeriksaan / Tally grouped header');
    assert.match(content, /colSpan=\{4\}/, 'Must span 4 columns for timber and freight payment groups');
    assert.match(content, /rowSpan=\{2\}/, 'Must span 2 rows for un-grouped manifest columns');

    // Granular columns in Excel table
    assert.match(content, /docDate/, 'Must display docDate');
    assert.match(content, /receiptNumber/, 'Must display receiptNumber');
    assert.match(content, /storageYard/, 'Must display storageYard');
    assert.match(content, /woodLengthM/, 'Must display woodLengthM');
    assert.match(content, /timberPricePerM3/, 'Must display timberPricePerM3');
    assert.match(content, /timberGrossTotal/, 'Must display timberGrossTotal');
    assert.match(content, /timberPphAmount/, 'Must display timberPphAmount');
    assert.match(content, /freightRatePerM3/, 'Must display freightRatePerM3');
    assert.match(content, /freightGrossTotal/, 'Must display freightGrossTotal');
    assert.match(content, /freightPphAmount/, 'Must display freightPphAmount');
    assert.match(content, /brokerFee/, 'Must display brokerFee');

    // Grand total footer row
    assert.match(content, /<tfoot/, 'Must render tfoot summary row');
    assert.match(content, /Grand Total|总计/, 'Must label grand total summary');
  });
});
