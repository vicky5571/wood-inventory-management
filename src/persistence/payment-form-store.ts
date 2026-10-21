/**
 * src/persistence/payment-form-store.ts
 *
 * Unified persistence facade and generation orchestrator for Weekly Payment Forms (Lembar Tagihan).
 * Provides fallback between Supabase and local SQLite storage.
 */

import { sqliteRecordStore } from './sqlite-record-store.ts';
import { serverRecordStore } from './server-record-store.ts';
import {
  ensurePaymentFormTables,
  listPaymentForms,
  getPaymentFormById,
  createPaymentForm,
  updatePaymentForm,
  updatePaymentFormStatus,
  linkRecordsToForm,
} from './sqlite/payment-form-queries.ts';
import {
  getWeekWindow,
} from '../utils/week-window.ts';
import {
  groupRecordsForPayment,
  computeFormTotals,
  buildGroupingKey,
} from '../utils/payment-form-grouping.ts';
import type {
  PaymentForm,
  PaymentFormWithLines,
  PaymentFormStatus,
  PaymentFormFilterCriteria,
  PaymentFormGenerationResult,
} from '../types/index.ts';

class PaymentFormStore {
  private getDb() {
    const db = sqliteRecordStore.getDatabase();
    ensurePaymentFormTables(db);
    return db;
  }

  public async getAll(
    tenantId: string = 'default-tenant',
    filter?: PaymentFormFilterCriteria
  ): Promise<PaymentForm[]> {
    const db = this.getDb();
    return listPaymentForms(db, tenantId, filter);
  }

  public async getById(
    id: string,
    tenantId: string = 'default-tenant'
  ): Promise<PaymentFormWithLines | null> {
    const db = this.getDb();
    return getPaymentFormById(db, id, tenantId);
  }

  public async create(form: PaymentForm): Promise<PaymentForm> {
    const db = this.getDb();
    return createPaymentForm(db, form);
  }

  public async update(
    id: string,
    updates: Partial<PaymentForm>,
    tenantId: string = 'default-tenant'
  ): Promise<PaymentFormWithLines> {
    const db = this.getDb();
    return updatePaymentForm(db, id, updates, tenantId);
  }

  public async updateStatus(
    id: string,
    status: PaymentFormStatus,
    data?: { invoiceNumber?: string; paymentDate?: string; paymentMethod?: string; notes?: string; preprintedNumber?: string; issueDate?: string },
    tenantId: string = 'default-tenant'
  ): Promise<PaymentFormWithLines> {
    const db = this.getDb();
    return updatePaymentFormStatus(db, id, status, data, tenantId);
  }

  public async voidForm(
    id: string,
    notes?: string,
    tenantId: string = 'default-tenant'
  ): Promise<PaymentFormWithLines> {
    return this.updateStatus(id, 'VOID', { notes }, tenantId);
  }

  public async generateForms(
    weekStartDate: string,
    tenantId: string = 'default-tenant'
  ): Promise<PaymentFormGenerationResult> {
    const { startDate, endDate } = getWeekWindow(weekStartDate);
    const db = this.getDb();

    const records = await serverRecordStore.getAll();
    const existingForms = await this.getAll(tenantId);
    const weekForms = existingForms.filter((f) => f.weekStartDate === startDate);

    const { groups, skipped } = groupRecordsForPayment(
      records,
      [],
      startDate,
      endDate,
      existingForms
    );

    let createdCount = 0;
    let updatedCount = 0;
    const formIds: string[] = [];

    for (const group of groups.values()) {
      const existingDraft = weekForms.find(
        (f) =>
          f.status === 'DRAFT' &&
          buildGroupingKey(f.supplierName, f.woodSpecies, f.contractNumber) === group.key
      );

      if (existingDraft) {
        const mergedRecordIds = Array.from(new Set([...existingDraft.recordIds, ...group.recordIds]));
        const mergedLines = (await this.getById(existingDraft.id, tenantId))?.lines || [];

        for (const line of group.lines) {
          if (!mergedLines.some((l) => (l.sourceRecordId || (l as unknown as { recordId?: string }).recordId) === (line.sourceRecordId || (line as unknown as { recordId?: string }).recordId))) {
            mergedLines.push(line);
          }
        }

        const totals = computeFormTotals(mergedLines);
        db.prepare(`
          UPDATE payment_forms SET
            record_ids = ?, total_amount_idr = ?, terbilang = ?,
            total_tally_volume_m3 = ?, total_tally_pieces = ?,
            total_timber_gross_idr = ?, total_timber_pph_idr = ?, total_timber_net_idr = ?,
            updated_at = ?
          WHERE id = ? AND tenant_id = ?
        `).run(
          JSON.stringify(mergedRecordIds),
          totals.totalAmountIDR,
          totals.terbilang,
          totals.totalTallyVolumeM3,
          totals.totalTallyPieces,
          totals.totalTimberGrossIDR,
          totals.totalTimberPphIDR,
          totals.totalTimberNetIDR,
          new Date().toISOString(),
          existingDraft.id,
          tenantId
        );

        linkRecordsToForm(db, existingDraft.id, mergedRecordIds, existingDraft.itemIds);
        updatedCount++;
        formIds.push(existingDraft.id);
      } else {
        const totals = computeFormTotals(group.lines);
        const newForm: PaymentForm = {
          id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          tenantId,
          preprintedNumber: '',
          issueDate: '',
          weekStartDate: startDate,
          weekEndDate: endDate,
          supplierName: group.supplierName,
          supplierId: group.supplierId,
          woodSpecies: group.woodSpecies,
          contractNumber: group.contractNumber,
          lines: group.lines,
          recordIds: group.recordIds,
          itemIds: group.itemIds,
          totalAmountIDR: totals.totalAmountIDR,
          terbilang: totals.terbilang,
          totalTallyVolumeM3: totals.totalTallyVolumeM3,
          totalTallyPieces: totals.totalTallyPieces,
          totalTimberGrossIDR: totals.totalTimberGrossIDR,
          totalTimberPphIDR: totals.totalTimberPphIDR,
          totalTimberNetIDR: totals.totalTimberNetIDR,
          status: 'DRAFT',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await this.create(newForm);
        createdCount++;
        formIds.push(newForm.id);
      }
    }

    return {
      createdCount,
      updatedCount,
      skippedCount: skipped.length,
      skippedReasons: skipped,
      formIds,
    };
  }
}

export const paymentFormStore = new PaymentFormStore();
