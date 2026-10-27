/**
 * src/utils/price-lookup.ts
 *
 * Pure price lookup logic — given a list of TimberPriceEntry,
 * find the best match for a WoodReceivingRecord.
 * No DB dependency — entries are passed in (already fetched).
 */
import type { TimberPriceEntry, WoodReceivingRecord } from '../types/index.ts';

export type PriceLookupResult =
  | {
      matched: true;
      entry: TimberPriceEntry;
    }
  | {
      matched: false;
      reason: string;
    };

/**
 * Find the best price entry for a record.
 * Priority: supplier-specific > global (no supplier).
 * Date range: entry.effectiveFrom <= record.receiptDate <= entry.effectiveTo (or open-ended).
 */
export function lookupPriceForRecord(
  record: WoodReceivingRecord,
  allEntries: TimberPriceEntry[]
): PriceLookupResult {
  const receiptDate = record.receiptDate;
  const recSpeciesId = (record as unknown as { speciesId?: string }).speciesId;
  const targetSpecies = (record.woodSpecies || '').trim().toLowerCase();

  const candidates = allEntries.filter((e) => {
    const speciesMatch = recSpeciesId
      ? e.speciesId === recSpeciesId
      : (e.woodSpecies || '').trim().toLowerCase() === targetSpecies;
    if (!speciesMatch) return false;
    if (e.effectiveFrom > receiptDate) return false;
    if (e.effectiveTo && e.effectiveTo < receiptDate) return false;
    return true;
  });

  if (candidates.length === 0) {
    return {
      matched: false,
      reason: `Tidak ada harga untuk "${record.woodSpecies}" pada tanggal ${receiptDate}`,
    };
  }

  // 1. Prefer supplier-specific match (by supplierId or supplierName)
  const targetSupplierName = (record.supplierName || '').trim().toLowerCase();
  const targetSupplierId = (record as unknown as { supplierId?: string }).supplierId;

  const supplierMatch = candidates
    .filter((e) => {
      const hasSupplier = Boolean(e.supplierId || e.supplierName);
      if (!hasSupplier) return false;
      if (e.supplierName && targetSupplierName && e.supplierName.trim().toLowerCase() === targetSupplierName) {
        return true;
      }
      if (e.supplierId && targetSupplierId && e.supplierId === targetSupplierId) {
        return true;
      }
      return false;
    })
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];

  // 2. Global fallback (entries without specific supplier)
  const globalMatch = candidates
    .filter((e) => !e.supplierId && !e.supplierName)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];

  const best = supplierMatch ?? globalMatch;
  if (!best) {
    return {
      matched: false,
      reason: `Tidak ada harga berlaku untuk "${record.woodSpecies}"`,
    };
  }

  return { matched: true, entry: best };
}

/**
 * Batch lookup for records. Returns two arrays:
 * - ready: records where a price was successfully matched
 * - pending: records without a matching price entry
 */
export function batchLookupPrices(
  records: WoodReceivingRecord[],
  allEntries: TimberPriceEntry[]
): {
  ready: Array<{ record: WoodReceivingRecord; entry: TimberPriceEntry }>;
  pending: Array<{ record: WoodReceivingRecord; reason: string }>;
} {
  const ready: Array<{ record: WoodReceivingRecord; entry: TimberPriceEntry }> = [];
  const pending: Array<{ record: WoodReceivingRecord; reason: string }> = [];

  for (const record of records) {
    // Skip already-priced records that are already locked
    if (Boolean(record.isLocked) && record.timberPricePerM3 !== null) {
      continue;
    }
    const result = lookupPriceForRecord(record, allEntries);
    if (result.matched) {
      ready.push({ record, entry: result.entry });
    } else {
      pending.push({ record, reason: result.reason });
    }
  }

  return { ready, pending };
}
