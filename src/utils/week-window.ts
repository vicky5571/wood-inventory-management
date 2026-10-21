/**
 * src/utils/week-window.ts
 *
 * Operational Saturday-Friday Weekly Window Calculation for Timber Payment Forms.
 * Fixed to Asia/Jakarta (WIB / UTC+7) without daylight savings time.
 */

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Normalizes input date to UTC Date object representing WIB date boundaries.
 */
function toWibUtcDate(input: Date | string): Date {
  if (typeof input === 'string') {
    // If YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      const [year, month, day] = input.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day));
    }
    const parsed = new Date(input);
    if (!isNaN(parsed.getTime())) {
      // Add 7 hours to convert UTC to WIB local day
      const wibMs = parsed.getTime() + 7 * 60 * 60 * 1000;
      const wibDate = new Date(wibMs);
      return new Date(Date.UTC(wibDate.getUTCFullYear(), wibDate.getUTCMonth(), wibDate.getUTCDate()));
    }
  } else if (input instanceof Date && !isNaN(input.getTime())) {
    const wibMs = input.getTime() + 7 * 60 * 60 * 1000;
    const wibDate = new Date(wibMs);
    return new Date(Date.UTC(wibDate.getUTCFullYear(), wibDate.getUTCMonth(), wibDate.getUTCDate()));
  }
  const now = new Date();
  const wibMs = now.getTime() + 7 * 60 * 60 * 1000;
  const wibDate = new Date(wibMs);
  return new Date(Date.UTC(wibDate.getUTCFullYear(), wibDate.getUTCMonth(), wibDate.getUTCDate()));
}

function formatDateIso(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns the Saturday-to-Friday window containing the specified date.
 * - Saturday 00:00 WIB is startDate
 * - Following Friday 23:59 WIB is endDate
 */
export function getWeekWindow(anyDate: Date | string): { startDate: string; endDate: string } {
  const d = toWibUtcDate(anyDate);
  const dayOfWeek = d.getUTCDay(); // 0=Sun, 6=Sat
  const daysSinceSaturday = (dayOfWeek + 1) % 7; // Sat=0, Sun=1, ... Fri=6

  const saturday = new Date(d.getTime() - daysSinceSaturday * 24 * 60 * 60 * 1000);
  const friday = new Date(saturday.getTime() + 6 * 24 * 60 * 60 * 1000);

  return {
    startDate: formatDateIso(saturday),
    endDate: formatDateIso(friday),
  };
}

/**
 * Returns the Saturday date string for the week containing any date.
 */
export function getSaturdayOfWeek(anyDate: Date | string): string {
  return getWeekWindow(anyDate).startDate;
}

/**
 * Validates if a date string (YYYY-MM-DD) falls on a Saturday.
 */
export function isSaturday(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCDay() === 6;
}

/**
 * Formats a Saturday date into human readable week interval with week number.
 * Example: "17 Oct - 23 Oct 2026 (W42)"
 */
export function formatWeekLabel(startDate: string): string {
  const { startDate: satStr, endDate: friStr } = getWeekWindow(startDate);
  const [sy, sm, sd] = satStr.split('-').map(Number);
  const [fy, fm, fd] = friStr.split('-').map(Number);

  const satDate = new Date(Date.UTC(sy, sm - 1, sd));
  const startOfYear = new Date(Date.UTC(sy, 0, 1));
  const diffDays = Math.floor((satDate.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNum = Math.floor(diffDays / 7) + 1;
  const weekPad = String(weekNum).padStart(2, '0');

  const sMonth = MONTH_NAMES[sm - 1] || 'Oct';
  const fMonth = MONTH_NAMES[fm - 1] || 'Oct';

  if (sy === fy) {
    return `${sd} ${sMonth} - ${fd} ${fMonth} ${sy} (W${weekPad})`;
  }
  return `${sd} ${sMonth} ${sy} - ${fd} ${fMonth} ${fy} (W${weekPad})`;
}

/**
 * Generates a list of recent operational weeks, starting from current week going backwards.
 */
export function listRecentWeeks(
  count: number = 8,
  refDate: Date | string = new Date()
): Array<{ startDate: string; endDate: string; label: string }> {
  const currentSatStr = getSaturdayOfWeek(refDate);
  const [y, m, d] = currentSatStr.split('-').map(Number);
  const currentSat = new Date(Date.UTC(y, m - 1, d));

  const result: Array<{ startDate: string; endDate: string; label: string }> = [];
  for (let i = 0; i < count; i++) {
    const sat = new Date(currentSat.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const startStr = formatDateIso(sat);
    const fri = new Date(sat.getTime() + 6 * 24 * 60 * 60 * 1000);
    const endStr = formatDateIso(fri);
    result.push({
      startDate: startStr,
      endDate: endStr,
      label: formatWeekLabel(startStr),
    });
  }
  return result;
}
