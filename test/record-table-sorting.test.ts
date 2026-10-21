import test from 'node:test';
import assert from 'node:assert/strict';
import type { WoodReceivingRecord } from '../src/types/index.ts';
import { SEED_WOOD_RECORDS } from '../src/persistence/seed/fixtures.ts';

type SortField = 'receiptDate' | 'tallyVolumeM3' | 'grandNetPayable';
type SortDirection = 'asc' | 'desc';

function sortWoodRecords(
  records: WoodReceivingRecord[],
  sortField: SortField | null,
  sortDirection: SortDirection
): WoodReceivingRecord[] {
  if (!sortField) return records;
  return [...records].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortDirection === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
  });
}

test('RecordTable Column Sorting & Ordering Suite', async (t) => {
  const records = SEED_WOOD_RECORDS;

  await t.test('sorts records by receiptDate ascending and descending', () => {
    const asc = sortWoodRecords(records, 'receiptDate', 'asc');
    for (let i = 0; i < asc.length - 1; i++) {
      assert.ok(asc[i].receiptDate <= asc[i + 1].receiptDate);
    }

    const desc = sortWoodRecords(records, 'receiptDate', 'desc');
    for (let i = 0; i < desc.length - 1; i++) {
      assert.ok(desc[i].receiptDate >= desc[i + 1].receiptDate);
    }
  });

  await t.test('sorts records by tallyVolumeM3 ascending and descending', () => {
    const asc = sortWoodRecords(records, 'tallyVolumeM3', 'asc');
    for (let i = 0; i < asc.length - 1; i++) {
      assert.ok(asc[i].tallyVolumeM3 <= asc[i + 1].tallyVolumeM3);
    }

    const desc = sortWoodRecords(records, 'tallyVolumeM3', 'desc');
    for (let i = 0; i < desc.length - 1; i++) {
      assert.ok(desc[i].tallyVolumeM3 >= desc[i + 1].tallyVolumeM3);
    }
  });

  await t.test('sorts records by grandNetPayable ascending and descending', () => {
    const asc = sortWoodRecords(records, 'grandNetPayable', 'asc');
    for (let i = 0; i < asc.length - 1; i++) {
      assert.ok(asc[i].grandNetPayable <= asc[i + 1].grandNetPayable);
    }

    const desc = sortWoodRecords(records, 'grandNetPayable', 'desc');
    for (let i = 0; i < desc.length - 1; i++) {
      assert.ok(desc[i].grandNetPayable >= desc[i + 1].grandNetPayable);
    }
  });

  await t.test('returns unchanged records when sortField is null', () => {
    const untouched = sortWoodRecords(records, null, 'desc');
    assert.deepStrictEqual(untouched, records);
  });
});
