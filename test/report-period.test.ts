import test from 'node:test';
import assert from 'node:assert/strict';
import { SqliteRecordStore } from '../src/persistence/sqlite-record-store.ts';
import { ServerRecordStore } from '../src/persistence/server-record-store.ts';

test('Report Period & Price Database Integration Suite', async (t) => {
  const sqlite = new SqliteRecordStore(':memory:');
  const server = new ServerRecordStore(sqlite);

  // Initialize records
  const allRecords = await server.getAll();
  assert.ok(allRecords.length > 0, 'Seed records should exist');

  await t.test('Price Entry CRUD — can save, retrieve, and query price entries', async () => {
    const entry = await server.savePriceEntry({
      tenantId: 'default-tenant',
      woodSpecies: 'Teak / Jati (柚木)',
      pricePerM3: 4200000,
      timberPphRate: 0.5,
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-12-31',
      notes: 'Harga standar 2026',
    });

    assert.ok(entry.id);
    assert.equal(entry.pricePerM3, 4200000);

    const allPrices = await server.getAllPriceEntries();
    assert.ok(allPrices.some((p) => p.id === entry.id));
  });

  await t.test('Report Period Lifecycle — Open, Preview, Close, Lock, and Reopen', async () => {
    // 1. Create a period spanning 2026-10-01 to 2026-10-31
    const period = await server.saveReportPeriod({
      tenantId: 'default-tenant',
      name: 'Periode Oktober 2026',
      status: 'OPEN',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      notes: 'Testing closing workflow',
    });
    assert.ok(period.id);
    assert.equal(period.status, 'OPEN');

    // 2. Fetch records in range
    const records = await server.getAll();
    const inRange = records.filter(
      (r) => r.receiptDate >= period.startDate && r.receiptDate <= period.endDate
    );

    // 3. Preview Close
    const preview = await server.previewReportPeriodClose(period.id, inRange);
    assert.equal(preview.periodId, period.id);
    assert.ok(Array.isArray(preview.readyRecords));
    assert.ok(Array.isArray(preview.pendingRecords));

    // 4. Close Period
    const closeResult = await server.closeReportPeriod(period.id, inRange, 'Admin Vicky');
    assert.ok(closeResult.appliedCount >= 0);
    assert.ok(closeResult.totalVolumeM3 >= 0);

    // Verify period status is CLOSED
    const periods = await server.getAllReportPeriods();
    const closed = periods.find((p) => p.id === period.id);
    assert.ok(closed);
    assert.equal(closed.status, 'CLOSED');
    assert.equal(closed.closedBy, 'Admin Vicky');
    assert.ok(closed.closedAt);

    // Verify records in range are now locked
    const afterCloseRecords = await server.getAll();
    const closedInRange = afterCloseRecords.filter(
      (r) => r.receiptDate >= period.startDate && r.receiptDate <= period.endDate
    );
    for (const r of closedInRange) {
      assert.ok(Boolean(r.isLocked), `Record ${r.id} should be locked`);
      assert.equal(r.reportPeriodId, period.id);
    }

    // 5. Reopen Period
    const reopened = await server.reopenReportPeriod(
      period.id,
      'Admin Vicky',
      'Koreksi surat jalan dan revisi harga log'
    );
    assert.equal(reopened.status, 'REOPENED');
    assert.equal(reopened.reopenReason, 'Koreksi surat jalan dan revisi harga log');
    assert.equal(reopened.reopenedBy, 'Admin Vicky');
    assert.ok(reopened.reopenedAt);
  });
});
