/**
 * src/utils/payment-form-grouping.ts
 *
 * Deterministic grouping and line extraction engine for Weekly Payment Forms (Lembar Tagihan).
 * Consolidates receiving records within a Saturday-Friday window by (supplier, species, contract).
 */

import type {
  WoodReceivingRecord,
  ReceivingItem,
  PaymentForm,
  PaymentFormLineItem,
  PaymentFormGroup,
  PaymentFormGenerationResult,
} from '../types/index.ts';

import { calculateTimberPayment } from './timber-calc.ts';
import { terbilang } from './terbilang.ts';

export type { PaymentFormGroup };

export function buildGroupingKey(
  supplierName: string,
  woodSpecies: string,
  contractNumber: string = '',
  contractId?: string
): string {
  const sNorm = (supplierName || '').trim().toLowerCase();
  const spNorm = (woodSpecies || '').trim().toLowerCase();
  const cNorm = contractId ? `id:${contractId}` : ((contractNumber || '').trim().toLowerCase() || '_');
  return `${sNorm}||${spNorm}||${cNorm}`;
}

/**
 * Extracts a PaymentFormLineItem from a WoodReceivingRecord or ReceivingItem
 * formatted for the 6-column physical form.
 */
export function extractLineItem(
  record: WoodReceivingRecord,
  item?: ReceivingItem,
  paymentFormId: string = '',
  sequence: number = 1
): PaymentFormLineItem {
  const tallyVol = item ? item.tallyVolumeM3 : record.tallyVolumeM3;
  const tallyPcs = item ? item.tallyPieces : record.tallyPieces;
  const price = item ? (item.timberPricePerM3 ?? 0) : (record.timberPricePerM3 ?? 0);
  const pphRate = item ? (item.timberPphRate ?? 0.25) : (record.timberPphRate ?? 0.25);

  const timber = calculateTimberPayment(tallyVol, price, pphRate);
  const gross = Math.round(timber.gross ?? (price * tallyVol));
  const pph = Math.round(timber.pphAmount ?? 0);
  const net = Math.round(timber.netPayable ?? (gross - pph));

  const docNumber = record.forestryDocNumber || '—';
  const species = record.woodSpecies || 'Kayu';

  return {
    id: `line-${item?.id || record.id}`,
    paymentFormId,
    itemSequence: sequence,
    kategori: 'Pembelian Kayu',
    konten: `${docNumber} - ${species}`,
    tujuan: record.supplierName || '—',
    hargaSatuanIDR: price,
    jumlah: tallyVol,
    unit: 'm³',
    totalIDR: net,
    sourceRecordId: record.id,
    sourceItemId: item?.id,
    recordId: record.id,
    itemId: item?.id,
    tallyPieces: tallyPcs,
    tallyVolumeM3: tallyVol,
    timberPricePerM3: price,
    timberGrossIDR: gross,
    timberPphIDR: pph,
    timberNetIDR: net,
    notes: item?.notes || record.paymentNotes,
  };
}

/**
 * Computes snapshot aggregates for an array of line items.
 */
export function computeFormTotals(lines: PaymentFormLineItem[]): {
  totalAmountIDR: number;
  terbilang: string;
  totalTallyVolumeM3: number;
  totalTallyPieces: number;
  totalTimberGrossIDR: number;
  totalTimberPphIDR: number;
  totalTimberNetIDR: number;
} {
  let totalAmountIDR = 0;
  let totalTallyVolumeM3 = 0;
  let totalTallyPieces = 0;
  let totalTimberGrossIDR = 0;
  let totalTimberPphIDR = 0;
  let totalTimberNetIDR = 0;

  for (const line of lines) {
    const lineTotal = line.totalIDR ?? (line.hargaSatuanIDR * line.jumlah);
    totalAmountIDR += lineTotal;
    if (line.unit === 'm³') {
      totalTallyVolumeM3 += line.jumlah;
    }
    totalTallyPieces += line.tallyPieces || (line.unit === 'batang' ? line.jumlah : 0);
    totalTimberGrossIDR += line.timberGrossIDR ?? Math.round(line.hargaSatuanIDR * line.jumlah);
    totalTimberPphIDR += line.timberPphIDR ?? 0;
    totalTimberNetIDR += line.timberNetIDR ?? lineTotal;
  }

  if (totalTimberPphIDR === 0 && totalTimberGrossIDR > totalAmountIDR) {
    totalTimberPphIDR = totalTimberGrossIDR - totalAmountIDR;
  }
  if (totalTimberNetIDR === 0) {
    totalTimberNetIDR = totalAmountIDR;
  }

  return {
    totalAmountIDR,
    terbilang: terbilang(totalAmountIDR),
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

  const formsById = new Map<string, PaymentForm>();
  for (const form of existingForms) {
    formsById.set(form.id, form);
  }

  for (const record of records) {
    if (record.receiptDate < weekStartDate || record.receiptDate > weekEndDate) {
      skipped.push({
        recordId: record.id,
        reason: 'OUT_OF_WINDOW',
      });
      continue;
    }

    if (record.timberPricePerM3 == null) {
      skipped.push({
        recordId: record.id,
        reason: 'PENDING_PRICE',
      });
      continue;
    }

    if (record.paymentFormId) {
      const linkedForm = formsById.get(record.paymentFormId);
      if (linkedForm && linkedForm.status !== 'DRAFT') {
        skipped.push({
          recordId: record.id,
          reason: 'ALREADY_IN_LOCKED_FORM',
          lockedFormNumber: linkedForm.preprintedNumber || (linkedForm as unknown as { formNumber?: string }).formNumber,
        });
        continue;
      }
    }

    const supplierName = record.supplierName || 'Unknown Supplier';
    const woodSpecies = record.woodSpecies || 'Kayu Campur';
    const contractNumber = record.contractNumber || '';
    const contractId = record.contractId;
    const groupKey = buildGroupingKey(supplierName, woodSpecies, contractNumber, contractId);

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

    if (!group.recordIds.includes(record.id)) {
      group.recordIds.push(record.id);
      group.lines.push(extractLineItem(record, undefined, '', group.lines.length + 1));
    }
  }

  return { groups, skipped };
}
