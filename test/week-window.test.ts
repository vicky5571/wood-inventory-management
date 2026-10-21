import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getWeekWindow,
  formatWeekLabel,
  isSaturday,
  getSaturdayOfWeek,
  listRecentWeeks,
} from '../src/utils/week-window.ts';

test('Week Window Utility Test Suite', async (t) => {
  await t.test('Saturday date returns itself as startDate and following Friday as endDate', () => {
    // 2026-10-17 is Saturday
    const window = getWeekWindow('2026-10-17');
    assert.equal(window.startDate, '2026-10-17');
    assert.equal(window.endDate, '2026-10-23');
  });

  await t.test('Friday date returns previous Saturday as startDate and itself as endDate', () => {
    // 2026-10-23 is Friday
    const window = getWeekWindow('2026-10-23');
    assert.equal(window.startDate, '2026-10-17');
    assert.equal(window.endDate, '2026-10-23');
  });

  await t.test('Wednesday date in middle of week returns Saturday-Friday window', () => {
    // 2026-10-21 is Wednesday
    const window = getWeekWindow('2026-10-21');
    assert.equal(window.startDate, '2026-10-17');
    assert.equal(window.endDate, '2026-10-23');
  });

  await t.test('Sunday returns preceding Saturday as startDate', () => {
    // 2026-10-18 is Sunday
    const window = getWeekWindow('2026-10-18');
    assert.equal(window.startDate, '2026-10-17');
    assert.equal(window.endDate, '2026-10-23');
  });

  await t.test('Handles Date object inputs with WIB (UTC+7) timezone consideration', () => {
    // 2026-10-17 01:00 UTC = 2026-10-17 08:00 WIB
    const d = new Date('2026-10-17T01:00:00Z');
    const window = getWeekWindow(d);
    assert.equal(window.startDate, '2026-10-17');
    assert.equal(window.endDate, '2026-10-23');
  });

  await t.test('isSaturday correctly validates Saturday dates', () => {
    assert.equal(isSaturday('2026-10-17'), true);
    assert.equal(isSaturday('2026-10-18'), false);
    assert.equal(isSaturday('2026-10-23'), false);
    assert.equal(isSaturday('invalid'), false);
  });

  await t.test('getSaturdayOfWeek returns Saturday for any date', () => {
    assert.equal(getSaturdayOfWeek('2026-10-21'), '2026-10-17');
    assert.equal(getSaturdayOfWeek('2026-10-17'), '2026-10-17');
    assert.equal(getSaturdayOfWeek('2026-10-23'), '2026-10-17');
  });

  await t.test('formatWeekLabel produces human-readable interval with week number', () => {
    const label = formatWeekLabel('2026-10-17');
    assert.match(label, /17 Oct.*23 Oct.*2026/i);
    assert.match(label, /W\d{2}/);
  });

  await t.test('listRecentWeeks returns requested number of weekly intervals', () => {
    const weeks = listRecentWeeks(5, '2026-10-21');
    assert.equal(weeks.length, 5);
    // First one is current week
    assert.equal(weeks[0].startDate, '2026-10-17');
    assert.equal(weeks[0].endDate, '2026-10-23');
    // Second one is prior week
    assert.equal(weeks[1].startDate, '2026-10-10');
    assert.equal(weeks[1].endDate, '2026-10-16');
  });
});
