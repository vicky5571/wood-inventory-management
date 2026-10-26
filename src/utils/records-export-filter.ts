/**
 * src/utils/records-export-filter.ts
 *
 * Date-range filtering utility for the Export/Import modal.
 * Operates on WoodReceivingRecord.receiptDate (YYYY-MM-DD strings).
 * Independent of toolbar RecordFilterCriteria state.
 */

import type { WoodReceivingRecord, DatePreset, PresetDateRange } from '../types/index.ts';

function formatDateLocal(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Returns YYYY-MM-DD string for today */
export function todayISO(): string {
  return formatDateLocal(new Date());
}

/** Returns YYYY-MM-DD for the first day of the current month */
export function thisMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Returns YYYY-MM-DD for the first day of the previous month */
export function lastMonthStart(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Returns YYYY-MM-DD for the last day of the previous month */
export function lastMonthEnd(): string {
  const d = new Date();
  d.setDate(0); // day 0 = last day of previous month
  return formatDateLocal(d);
}

/** Returns YYYY-MM-DD for Monday of the current week (ISO week: Mon=start) */
export function thisWeekStart(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return formatDateLocal(d);
}

/** Returns YYYY-MM-DD for Monday of last week */
export function lastWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -13 : 1 - day - 7;
  d.setDate(d.getDate() + diff);
  return formatDateLocal(d);
}

/** Returns YYYY-MM-DD for Sunday of last week */
export function lastWeekEnd(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -7 : -day;
  d.setDate(d.getDate() + diff);
  return formatDateLocal(d);
}

export type { DatePreset, PresetDateRange };

/** Resolves a preset label to a concrete { startDate, endDate } pair */
export function resolveDatePreset(preset: DatePreset): PresetDateRange {
  switch (preset) {
    case 'this_month':  return { startDate: thisMonthStart(), endDate: todayISO() };
    case 'last_month':  return { startDate: lastMonthStart(), endDate: lastMonthEnd() };
    case 'this_week':   return { startDate: thisWeekStart(),  endDate: todayISO() };
    case 'last_week':   return { startDate: lastWeekStart(),  endDate: lastWeekEnd() };
    case 'all':         return { startDate: undefined,        endDate: undefined };
    case 'custom':      return { startDate: undefined,        endDate: undefined };
    default:            return { startDate: undefined,        endDate: undefined };
  }
}

/**
 * Filter records by receiptDate within [startDate, endDate] (inclusive).
 * Undefined bounds = open-ended.
 * Uses lexicographic compare — safe for YYYY-MM-DD format.
 */
export function filterRecordsByDateRange(
  records: WoodReceivingRecord[],
  startDate?: string,
  endDate?: string,
): WoodReceivingRecord[] {
  if (!startDate && !endDate) return records;
  return records.filter((r) => {
    const d = r.receiptDate;
    if (!d) return false;
    if (startDate && d < startDate) return false;
    if (endDate   && d > endDate)   return false;
    return true;
  });
}
