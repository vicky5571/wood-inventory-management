/**
 * src/persistence/server-price-bridge.ts
 *
 * Server persistence bridge for TimberPriceEntry and ReportPeriod lifecycle.
 * Encapsulates SQLite queries and period close business logic.
 */
import type { SqliteRecordStore } from './sqlite-record-store.ts';
import {
  getAllPriceEntriesFromDb,
  savePriceEntryToDb,
  deletePriceEntryFromDb,
} from './sqlite/price-queries.ts';
import {
  getAllReportPeriodsFromDb,
  getReportPeriodByIdFromDb,
  saveReportPeriodToDb,
} from './sqlite/report-period-queries.ts';
import {
  previewPeriodClose,
  executePeriodClose,
  type PeriodCloseResult,
} from '../utils/report-period-close.ts';
import type {
  TimberPriceEntry,
  ReportPeriod,
  ReportPeriodClosePreview,
  WoodReceivingRecord,
} from '../types/index.ts';

export class ServerPriceBridge {
  private getSqliteStore: () => SqliteRecordStore;

  constructor(getSqliteStore: () => SqliteRecordStore) {
    this.getSqliteStore = getSqliteStore;
  }

  private getDb() {
    return this.getSqliteStore().getDatabase();
  }

  async getAllPriceEntries(): Promise<TimberPriceEntry[]> {
    return getAllPriceEntriesFromDb(this.getDb());
  }

  async savePriceEntry(
    entry: Omit<TimberPriceEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<TimberPriceEntry> {
    return savePriceEntryToDb(this.getDb(), entry);
  }

  async deletePriceEntry(id: string): Promise<void> {
    return deletePriceEntryFromDb(this.getDb(), id);
  }

  async getAllReportPeriods(): Promise<ReportPeriod[]> {
    return getAllReportPeriodsFromDb(this.getDb());
  }

  async saveReportPeriod(
    period: Omit<ReportPeriod, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<ReportPeriod> {
    return saveReportPeriodToDb(this.getDb(), period);
  }

  async previewReportPeriodClose(
    periodId: string,
    records: WoodReceivingRecord[]
  ): Promise<ReportPeriodClosePreview> {
    const period = getReportPeriodByIdFromDb(this.getDb(), periodId);
    if (!period) throw new Error(`ReportPeriod id="${periodId}" not found`);
    return previewPeriodClose(this.getDb(), period, records);
  }

  async closeReportPeriod(
    periodId: string,
    records: WoodReceivingRecord[],
    closedBy: string
  ): Promise<PeriodCloseResult> {
    const period = getReportPeriodByIdFromDb(this.getDb(), periodId);
    if (!period) throw new Error(`ReportPeriod id="${periodId}" not found`);
    if (period.status === 'CLOSED') throw new Error('Laporan sudah ditutup');
    return executePeriodClose(this.getDb(), period, records, closedBy);
  }

  async reopenReportPeriod(
    periodId: string,
    reopenedBy: string,
    reason: string
  ): Promise<ReportPeriod> {
    const period = getReportPeriodByIdFromDb(this.getDb(), periodId);
    if (!period) throw new Error(`ReportPeriod id="${periodId}" not found`);
    if (period.status !== 'CLOSED') {
      throw new Error('Hanya laporan CLOSED yang bisa dibuka kembali');
    }
    const now = new Date().toISOString();
    return saveReportPeriodToDb(this.getDb(), {
      ...period,
      status: 'REOPENED',
      reopenedAt: now,
      reopenedBy,
      reopenReason: reason,
    });
  }
}
