/**
 * src/utils/payment-form-number.ts
 *
 * Deterministic form numbering generator for Weekly Payment Forms.
 * Format: PAY-YYYY-W<week>-<supplierCode>-<speciesCode>-<seq>
 */

import { getWeekWindow } from './week-window.ts';

function sanitizeCode(text: string, maxLen: number, fallback: string): string {
  const cleaned = text
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  if (!cleaned) return fallback;
  return cleaned.slice(0, maxLen);
}

export interface FormNumberInput {
  weekStartDate: string;
  supplierName: string;
  supplierCode?: string;
  woodSpecies: string;
  sequence: number;
}

/**
 * Generates human-readable, sequential Payment Form Number.
 */
export function generateFormNumber(input: FormNumberInput): string {
  const { weekStartDate, supplierName, supplierCode, woodSpecies, sequence } = input;
  const { startDate } = getWeekWindow(weekStartDate);
  const [sy, sm, sd] = startDate.split('-').map(Number);

  const satDate = new Date(Date.UTC(sy, sm - 1, sd));
  const startOfYear = new Date(Date.UTC(sy, 0, 1));
  const diffDays = Math.floor((satDate.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNum = Math.floor(diffDays / 7) + 1;
  const weekPad = String(weekNum).padStart(2, '0');

  const splPart = supplierCode
    ? sanitizeCode(supplierCode, 6, 'SPL')
    : sanitizeCode(supplierName, 3, 'SPL');

  const spcPart = sanitizeCode(woodSpecies, 4, 'WOOD');
  const seqPad = String(Math.max(1, sequence)).padStart(2, '0');

  return `PAY-${sy}-W${weekPad}-${splPart}-${spcPart}-${seqPad}`;
}
