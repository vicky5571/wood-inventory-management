/**
 * src/utils/payment-form-grouping.ts
 *
 * Deterministic grouping and line extraction engine for Weekly Payment Forms.
 * Consolidates receiving records within a Saturday-Friday window by (supplier, species, contract).
 */

import type {
  WoodReceivingRecord,
  ReceivingItem,
  PaymentForm,
  PaymentFormLineItem,
  PaymentFormGenerationResult,
} from '../types/index.ts';

import { calculateTimberPayment } from './timber-calc.ts';

export interface PaymentFormGroup {
  key: string;
  supplierName: string;
  supplierId?: string;
  woodSpecies: string;
  contractNumber: string;
  lines: PaymentFormLineItem[];
  recordIds: string[];
  itemIds: string[];
}

export function buildGroupingKey(
  supplierName: string,
  woodSpecies: string,
  contractNumber: string = ''
): string {
  const sNorm = (supplierName || '').trim().toLowerCase();
  const spNorm = (woodSpecies || '').trim().toLowerCase();
  const cNorm = (contractNumber || '').trim().toLowerCase() || '_';
  return `${sNorm}||${spNorm}||${cNorm}`;
}

/**
 * Extracts a PaymentFormLineItem from a WoodReceivingRecord or ReceivingItem.
 */
export function extractLineItem(
  record: WoodReceivingRecord,
  item?: ReceivingItem
): PaymentFormLineItem {
  const tallyVol = item ? item.tallyVolumeM3 : record.tallyVolumeM3;
  const tallyPcs = item ? item.tallyPieces : record.tallyPieces;
  const price = item ? (item.timberPricePerM3 ?? 0) : (record.timberPricePerM3 ?? 0);
  const pphRate = item ? (item.timberPphRate ?? 0.25) : (record.timberPphRate ?? 0.25);

  const timber = calculateTimberPayment(tallyVol, price, pphRate);
  const gross = Math.round(timber.gross ?? 0);
  const pph = Math.round(timber.pphAmount ?? 0);
  const net = Math.round(timber.netPayable ?? 0);

  return {
    recordId: record.id,
    itemId: item?.id,
    receiptDate: record.receiptDate,
    truckPlateNumber: record.truckPlateNumber,
    forestryDocNumber: record.forestryDocNumber,
    receiptNumber: record.receiptNumber,
    kavlingNumber: record.kavlingNumber,
    tallyVolumeM3: tallyVol,
    tallyPieces: tallyPcs,
    timberPricePerM3: price,
    timberGrossIDR: gross,
    timberPphIDR: pph,
    timberNetIDR: net,
  };
}

/**
 * Computes snapshot aggregates for an array of line items.
 */
export function computeFormTotals(lines: PaymentFormLineItem[]): {
  totalTallyVolumeM3: number;
  totalTallyPieces: number;
  totalTimberGrossIDR: number;
  totalTimberPphIDR: number;
  totalTimberNetIDR: number;
} {
  let totalTallyVolumeM3 = 0;
  let totalTallyPieces = 0;
  let totalTimberGrossIDR = 0;
  let totalTimberPphIDR = 0;
  let totalTimberNetIDR = 0;

  for (const line of lines) {
    totalTallyVolumeM3 += line.tallyVolumeM3;
    totalTallyPieces += line.tallyPieces;
    totalTimberGrossIDR += line.timberGrossIDR;
    totalTimberPphIDR += line.timberPphIDR;
    totalTimberNetIDR += line.timberNetIDR;
  }

  return {
    totalTallyVolumeM3: Number(totalTallyVolumeM3.toFixed(4)),
    totalTallyPieces,
    totalTimberGrossIDR,
    totalTimberPphIDR,
    totalTimberNetIDR,
  };
}

/**
 * Pure grouping engine: categorizes records into payment form groups while tracking skipped reasons.
 */
export function groupRecordsForPayment(
  records: WoodReceivingRecord[],
  items: ReceivingItem[] = [],
  weekStartDate: string,
  weekEndDate: string,
  existingForms: PaymentForm[] = [],
  suppliersMap?: Map<string, string>
): {
  groups: Map<string, PaymentFormGroup>;
  skipped: PaymentFormGenerationResult['skippedReasons'];
} {
  const groups = new Map<string, PaymentFormGroup>();
  const skipped: PaymentFormGenerationResult['skippedReasons'] = [];

  // Build lookup maps for fast locked-form checks
  const formsById = new Map<string, PaymentForm>();
  for (const form of existingForms) {
    formsById.set(form.id, form);
  }

  for (const record of records) {
    // 1. Date window check
    if (record.receiptDate < weekStartDate || record.receiptDate > weekEndDate) {
      skipped.push({
        recordId: record.id,
        reason: 'OUT_OF_WINDOW',
      });
      continue;
    }

    // 2. Pending pricing check
    if (record.timberPricePerM3 == null) {
      skipped.push({
        recordId: record.id,
        reason: 'PENDING_PRICE',
      });
      continue;
    }

    // 3. Existing locked form check
    if (record.paymentFormId) {
      const linkedForm = formsById.get(record.paymentFormId);
      if (linkedForm && linkedForm.status !== 'DRAFT') {
        skipped.push({
          recordId: record.id,
          reason: 'ALREADY_IN_LOCKED_FORM',
          lockedFormNumber: linkedForm.formNumber,
        });
        continue;
      }
    }

    // 4. Grouping key
    const supplierName = record.supplierName || 'Unknown Supplier';
    const woodSpecies = record.woodSpecies || 'Kayu Campur';
    const contractNumber = record.contractNumber || '';
    const groupKey = buildGroupingKey(supplierName, woodSpecies, contractNumber);

    let group = groups.get(groupKey);
    if (!group) {
      group = {
        key: groupKey,
        supplierName,
        supplierId: suppliersMap?.get(supplierName.trim().toLowerCase()),
        woodSpecies,
        contractNumber,
        lines: [],
        recordIds: [],
        itemIds: [],
      };
      groups.set(groupKey, group);
    }

    // Check if item already exists in this group lines
    if (!group.recordIds.includes(record.id)) {
      group.recordIds.push(record.id);
      group.lines.push(extractLineItem(record));
    }
  }

  return { groups, skipped };
}
