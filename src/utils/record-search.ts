/**
 * src/utils/record-search.ts
 *
 * High-performance pure search matcher for timber receiving records.
 * Uses lazy short-circuit evaluation to eliminate GC memory churn and excludes
 * calendar date strings to prevent false positive substring collisions.
 */

import type { WoodReceivingRecord, RecordFilterCriteria } from '../types/index.ts';

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

/**
 * Applies multi-criteria filtering across records.
 */
export function filterWoodRecords(
  records: WoodReceivingRecord[],
  filters: RecordFilterCriteria
): WoodReceivingRecord[] {
  return records.filter((r) => {
    if (filters.species && r.woodSpecies !== filters.species) return false;
    if (filters.kavling && r.kavlingNumber !== filters.kavling) return false;
    if (filters.startDate && r.receiptDate < filters.startDate) return false;
    if (filters.endDate && r.receiptDate > filters.endDate) return false;
    if (filters.paymentStatus && filters.paymentStatus !== 'ALL') {
      const status = r.paymentStatus || 'UNPAID';
      if (filters.paymentStatus === 'UNPAID' && status === 'PAID') return false;
      if (filters.paymentStatus === 'PAID' && r.paymentStatus !== 'PAID') return false;
      if (filters.paymentStatus === 'PARTIAL' && r.paymentStatus !== 'PARTIAL') return false;
    }
    if (filters.searchQuery && !recordMatchesSearchQuery(r, filters.searchQuery)) {
      return false;
    }
    return true;
  });
}
