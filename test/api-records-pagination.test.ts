import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

const tempRecordsPath = path.join(
  os.tmpdir(),
  `test_api_pagination_${Date.now()}_${Math.random().toString(36).slice(2)}.json`
);
process.env.WOOD_RECORDS_PATH = tempRecordsPath;

import { GET } from '../app/api/records/route.ts';

test('API Records Pagination & Backward Compatibility Suite', async (t) => {
  t.after(async () => {
    delete process.env.WOOD_RECORDS_PATH;
    try {
      await fs.rm(tempRecordsPath, { force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  const getBaselineCount = async (): Promise<number> => {
    const res = await GET(new Request('http://localhost:3000/api/records'));
    const body = await res.json();
    return body.data.length;
  };

  await t.test('GET /api/records?page=1&pageSize=2 returns first 2 records and pagination meta', async () => {
    const totalRecords = await getBaselineCount();
    const expectedPages = Math.ceil(totalRecords / 2);

    const req = new Request('http://localhost:3000/api/records?page=1&pageSize=2');
    const res = await GET(req);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.strictEqual(body.data.length, Math.min(2, totalRecords));

    assert.ok(body.pagination, 'pagination object must be present when pagination params are provided');
    assert.strictEqual(body.pagination.page, 1);
    assert.strictEqual(body.pagination.pageSize, 2);
    assert.strictEqual(body.pagination.totalRecords, totalRecords);
    assert.strictEqual(body.pagination.totalPages, expectedPages);
    assert.strictEqual(body.pagination.hasNextPage, totalRecords > 2);
    assert.strictEqual(body.pagination.hasPreviousPage, false);
  });

  await t.test('GET /api/records?page=2&pageSize=2 returns distinct next 2 records', async () => {
    const totalRecords = await getBaselineCount();
    const expectedPages = Math.ceil(totalRecords / 2);

    const req1 = new Request('http://localhost:3000/api/records?page=1&pageSize=2');
    const res1 = await GET(req1);
    const body1 = await res1.json();

    const req2 = new Request('http://localhost:3000/api/records?page=2&pageSize=2');
    const res2 = await GET(req2);
    assert.strictEqual(res2.status, 200);

    const body2 = await res2.json();
    assert.strictEqual(body2.success, true);
    assert.strictEqual(body2.data.length, Math.min(2, Math.max(0, totalRecords - 2)));

    assert.ok(body2.pagination);
    assert.strictEqual(body2.pagination.page, 2);
    assert.strictEqual(body2.pagination.pageSize, 2);
    assert.strictEqual(body2.pagination.totalRecords, totalRecords);
    assert.strictEqual(body2.pagination.totalPages, expectedPages);
    assert.strictEqual(body2.pagination.hasNextPage, totalRecords > 4);
    assert.strictEqual(body2.pagination.hasPreviousPage, true);

    // Verify non-overlapping slices
    const page1Ids = new Set(body1.data.map((r: { id: string }) => r.id));
    for (const item of body2.data) {
      assert.ok(!page1Ids.has(item.id), `Record ID ${item.id} should not appear on both page 1 and page 2`);
    }
  });

  await t.test('GET /api/records guards negative or zero page boundary', async () => {
    const totalRecords = await getBaselineCount();
    const req = new Request('http://localhost:3000/api/records?page=-5&pageSize=2');
    const res = await GET(req);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.pagination.page, 1);
    assert.strictEqual(body.pagination.totalRecords, totalRecords);
  });

  await t.test('GET /api/records?species= filters records by species', async () => {
    const species = 'Teak / Jati (柚木)';
    const req = new Request(`http://localhost:3000/api/records?species=${encodeURIComponent(species)}`);
    const res = await GET(req);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.strictEqual(body.data.length, 1);
    assert.strictEqual(body.data[0].woodSpecies, species);

    assert.ok(body.pagination);
    assert.strictEqual(body.pagination.totalRecords, 1);
    assert.strictEqual(body.pagination.totalPages, 1);
  });

  await t.test('GET /api/records without query params returns data without pagination metadata (backward compatibility)', async () => {
    const totalRecords = await getBaselineCount();
    const req = new Request('http://localhost:3000/api/records');
    const res = await GET(req);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.strictEqual(body.data.length, totalRecords);
    assert.strictEqual(body.pagination, undefined, 'pagination field must NOT be present in unpaginated response');
    assert.ok(body.timestamp);
  });

  await t.test('GET() without request argument returns unpaginated records (backward compatibility with zero-arg caller)', async () => {
    const totalRecords = await getBaselineCount();
    const res = await GET();
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.strictEqual(body.data.length, totalRecords);
    assert.strictEqual(body.pagination, undefined);
    assert.ok(body.timestamp);
  });

  await t.test('GET /api/records?query= and ?searchQuery= search alias', async () => {
    const reqQuery = new Request('http://localhost:3000/api/records?query=B%209283');
    const resQuery = await GET(reqQuery);
    const bodyQuery = await resQuery.json();
    assert.strictEqual(bodyQuery.success, true);
    assert.strictEqual(bodyQuery.data.length, 1);
    assert.strictEqual(bodyQuery.data[0].truckPlateNumber, 'B 9283 TDA');

    const reqSearch = new Request('http://localhost:3000/api/records?searchQuery=B%209283');
    const resSearch = await GET(reqSearch);
    const bodySearch = await resSearch.json();
    assert.strictEqual(bodySearch.success, true);
    assert.strictEqual(bodySearch.data.length, 1);
    assert.strictEqual(bodySearch.data[0].truckPlateNumber, 'B 9283 TDA');
  });

  await t.test('GET /api/records?paymentStatus= filters by payment status', async () => {
    const req = new Request('http://localhost:3000/api/records?paymentStatus=UNPAID');
    const res = await GET(req);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length > 0);
    for (const record of body.data) {
      assert.strictEqual(record.paymentStatus || 'UNPAID', 'UNPAID');
    }
  });

  await t.test('GET /api/records?sortBy=tallyVolumeM3&sortOrder=ASC sorts records ascending', async () => {
    const req = new Request('http://localhost:3000/api/records?sortBy=tallyVolumeM3&sortOrder=ASC');
    const res = await GET(req);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 2);

    for (let i = 1; i < body.data.length; i++) {
      assert.ok(
        body.data[i].tallyVolumeM3 >= body.data[i - 1].tallyVolumeM3,
        `Expected tallyVolumeM3 ${body.data[i].tallyVolumeM3} >= ${body.data[i - 1].tallyVolumeM3}`
      );
    }
  });

  await t.test('GET /api/records?pageSize=-1 returns all records in a single page', async () => {
    const totalRecords = await getBaselineCount();
    const req = new Request('http://localhost:3000/api/records?pageSize=-1');
    const res = await GET(req);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.length, totalRecords);
    assert.strictEqual(body.pagination.pageSize, -1);
    assert.strictEqual(body.pagination.totalPages, 1);
  });
});
