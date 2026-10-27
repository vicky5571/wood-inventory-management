/**
 * src/utils/report-period-close.ts
 *
 * Business logic for previewing and closing a ReportPeriod.
 * Matches and applies prices to unpriced records in the period's date range,
 * locks them, and writes audit/summary statistics to the period.
 */
import type { DatabaseSync } from 'node:sqlite';
import type {
  ReportPeriod,
  WoodReceivingRecord,
  ReportPeriodClosePreview,
} from '../types/index.ts';
import { getAllPriceEntriesFromDb } from '../persistence/sqlite/price-queries.ts';
import { batchLookupPrices } from './price-lookup.ts';
import { computeRecordCalculations } from './timber-calc.ts';

export interface PeriodCloseResult {
  appliedCount: number;
  skippedCount: number;
  totalVolumeM3: number;
  totalNetPayableIDR: number;
  usedPriceEntryIds: string[];
}

/**
 * Preview only — no writes. Returns what WOULD happen if period were closed.
 */
export function previewPeriodClose(
  db: DatabaseSync,
  period: ReportPeriod,
  records: WoodReceivingRecord[] // Filtered to period date range
): ReportPeriodClosePreview {
  const allEntries = getAllPriceEntriesFromDb(db);
  const unpricedRecords = records.filter(
    (r) => r.timberPricePerM3 === null && !Boolean(r.isLocked)
  );
  const { ready, pending } = batchLookupPrices(unpricedRecords, allEntries);

  let totalVol = 0;
  let totalNet = 0;

  const readyItems = ready.map(({ record, entry }) => {
    const calcs = computeRecordCalculations({
      tallyVolumeM3: record.tallyVolumeM3,
      deliveredVolumeM3: record.deliveredVolumeM3,
      tallyPieces: record.tallyPieces,
      deliveredPieces: record.deliveredPieces,
      timberPricePerM3: entry.pricePerM3,
      timberPphRate: entry.timberPphRate,
      freightRatePerM3: record.freightRatePerM3,
      freightPphAmount: record.freightPphAmount,
      brokerFee: record.brokerFee,
    });
    const estNet = calcs.grandNetPayable ?? 0;
    totalVol = Number((totalVol + record.tallyVolumeM3).toFixed(4));
    totalNet = Number((totalNet + estNet).toFixed(2));

    return {
      recordId: record.id,
      truckPlateNumber: record.truckPlateNumber,
      woodSpecies: record.woodSpecies,
      supplierName: record.supplierName,
      tallyVolumeM3: record.tallyVolumeM3,
      matchedPriceEntryId: entry.id,
      matchedPricePerM3: entry.pricePerM3,
      estimatedNetPayableIDR: estNet,
    };
  });

  return {
    periodId: period.id,
    readyRecords: readyItems,
    pendingRecords: pending.map(({ record, reason }) => ({
      recordId: record.id,
      truckPlateNumber: record.truckPlateNumber,
      woodSpecies: record.woodSpecies,
      supplierName: record.supplierName,
      reason,
    })),
    totalReadyVolumeM3: totalVol,
    totalEstimatedNetIDR: totalNet,
  };
}

/**
 * Execute period close — writes prices to records, locks them, and updates period stats.
 */
export function executePeriodClose(
  db: DatabaseSync,
  period: ReportPeriod,
  records: WoodReceivingRecord[],
  closedBy: string
): PeriodCloseResult {
  const allEntries = getAllPriceEntriesFromDb(db);
  const unpricedRecords = records.filter(
    (r) => r.timberPricePerM3 === null && !Boolean(r.isLocked)
  );
  const { ready } = batchLookupPrices(unpricedRecords, allEntries);

  const now = new Date().toISOString();
  let totalVol = 0;
  let totalNet = 0;
  const usedIds = new Set<string>();

  db.exec('BEGIN TRANSACTION;');
  try {
    const updateStmt = db.prepare(`
      UPDATE receiving_items SET
        timber_price_per_m3 = ?,
        timber_pph_rate     = ?,
        report_period_id    = ?,
        price_entry_id      = ?,
        is_locked           = 1,
        updated_at          = ?
      WHERE id = ? OR (manifest_id = ? AND (SELECT COUNT(*) FROM receiving_items ri WHERE ri.manifest_id = ?) = 1);
    `);

    for (const { record, entry } of ready) {
      const calcs = computeRecordCalculations({
        tallyVolumeM3: record.tallyVolumeM3,
        deliveredVolumeM3: record.deliveredVolumeM3,
        tallyPieces: record.tallyPieces,
        deliveredPieces: record.deliveredPieces,
        timberPricePerM3: entry.pricePerM3,
        timberPphRate: entry.timberPphRate,
        freightRatePerM3: record.freightRatePerM3,
        freightPphAmount: record.freightPphAmount,
        brokerFee: record.brokerFee,
      });

      const targetId = (record as unknown as { item_id?: string }).item_id ?? record.id;
      updateStmt.run(
        entry.pricePerM3,
        entry.timberPphRate,
        period.id,
        entry.id,
        now,
        targetId,
        targetId,
        targetId
      );

      totalVol = Number((totalVol + record.tallyVolumeM3).toFixed(4));
      totalNet = Number((totalNet + (calcs.grandNetPayable ?? 0)).toFixed(2));
      usedIds.add(entry.id);
    }

    // Also include volume & net for records that were already priced
    for (const record of records) {
      if (record.timberPricePerM3 !== null && !ready.some((r) => r.record.id === record.id)) {
        totalVol = Number((totalVol + record.tallyVolumeM3).toFixed(4));
        totalNet = Number((totalNet + (record.grandNetPayable ?? 0)).toFixed(2));
      }
    }

    // Lock all records in range (including already-priced ones) and set report_period_id
    db.prepare(`
      UPDATE receiving_items SET
        is_locked = 1,
        report_period_id = ?,
        updated_at = ?
      WHERE report_period_id IS NULL
        AND EXISTS (
          SELECT 1 FROM receiving_manifests m
          WHERE m.id = receiving_items.manifest_id
            AND m.receipt_date >= ?
            AND m.receipt_date <= ?
        );
    `).run(period.id, now, period.startDate, period.endDate);

    // Update period status and totals
    db.prepare(`
      UPDATE report_periods SET
        status                = 'CLOSED',
        closed_at             = ?,
        closed_by             = ?,
        total_records         = ?,
        total_volume_m3       = ?,
        total_net_payable_idr = ?,
        price_snapshot_ids    = ?,
        updated_at            = ?
      WHERE id = ?;
    `).run(
      now,
      closedBy,
      records.length,
      totalVol,
      totalNet,
      JSON.stringify([...usedIds]),
      now,
      period.id
    );

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return {
    appliedCount: ready.length,
    skippedCount: unpricedRecords.length - ready.length,
    totalVolumeM3: totalVol,
    totalNetPayableIDR: totalNet,
    usedPriceEntryIds: [...usedIds],
  };
}
