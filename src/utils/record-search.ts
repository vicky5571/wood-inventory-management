/**
 * src/utils/record-search.ts
 *
 * High-performance pure search matcher for timber receiving records.
 * Uses lazy short-circuit evaluation to eliminate GC memory churn and excludes
 * calendar date strings to prevent false positive substring collisions.
 */

import type { WoodReceivingRecord } from '../types/index.ts';

function fieldContains(field: string | undefined | null, needle: string): boolean {
  return typeof field === 'string' && field.toLowerCase().includes(needle);
}

/**
 * Checks whether an invoiceNumber explicitly matches a non-empty search query.
 */
export function isInvoiceSearchMatch(record: WoodReceivingRecord, rawQuery: string): boolean {
  const q = (rawQuery || '').trim().toLowerCase();
  if (!q) return false;
  return fieldContains(record.invoiceNumber, q);
}

/**
 * Checks if a record matches the user-provided search term.
 * Evaluates fields lazily with zero temporary array allocations.
 */
export function recordMatchesSearchQuery(record: WoodReceivingRecord, rawQuery: string): boolean {
  const q = (rawQuery || '').trim().toLowerCase();
  if (!q) return true;

  return (
    fieldContains(record.truckPlateNumber, q) ||
    fieldContains(record.forestryDocNumber, q) ||
    fieldContains(record.receiptNumber, q) ||
    fieldContains(record.contractNumber, q) ||
    fieldContains(record.supplierName, q) ||
    fieldContains(record.woodSpecies, q) ||
    fieldContains(record.kavlingNumber, q) ||
    fieldContains(record.storageYard, q) ||
    fieldContains(record.invoiceNumber, q)
  );
}
