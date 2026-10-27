/**
 * src/utils/contract-calc.ts
 *
 * Pure calculation engine for Perhutani Procurement Contracts:
 * Sortimen aggregations, fulfillment progress, payment reconciliation,
 * and date expiry/status derivations.
 */

import type {
  PerhutaniContract,
  ContractSortimentItem,
  ContractSortimentInput,
  ContractReceipt,
  ContractFulfillmentSummary,
  ContractStatus,
  WoodReceivingRecord,
} from '../types/index.ts';

/**
 * Computes aggregate totals for a contract from its line items.
 */
export function computeContractTotals(
  items: (ContractSortimentItem | ContractSortimentInput)[]
): {
  totalValueIDR: number;
  totalVolumeM3: number;
  totalPieces: number;
} {
  const safeItems = items || [];
  let totalVolumeM3 = 0;
  let totalPieces = 0;
  let totalValueIDR = 0;

  for (const item of safeItems) {
    const vol = Number(item.volumeM3) || 0;
    const pcs = Number(item.pieces) || 0;
    const price = Number(item.pricePerM3) || 0;

    totalVolumeM3 += vol;
    totalPieces += pcs;
    totalValueIDR += Math.round(vol * price);
  }

  return {
    totalVolumeM3: Number(totalVolumeM3.toFixed(4)),
    totalPieces,
    totalValueIDR,
  };
}

/**
 * Calculates calendar days between two dates (UTC midnight).
 * Positive if targetDate is in future, negative if in past.
 */
export function calculateDaysDifference(today: Date, targetDateStr: string): number {
  if (!targetDateStr) return 0;
  const [year, month, day] = targetDateStr.split('-').map(Number);
  if (!year || !month || !day) return 0;

  const targetUtc = Date.UTC(year, month - 1, day);
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((targetUtc - todayUtc) / msPerDay);
}

/**
 * Derives contract operational status based on fulfillment volume and expiry dates.
 */
export function deriveContractStatus(
  contract: PerhutaniContract,
  summary: Pick<ContractFulfillmentSummary, 'remainingVolumeM3' | 'daysUntilExpiry'>
): ContractStatus {
  if (contract.status === 'DRAFT' || contract.status === 'CANCELLED') {
    return contract.status;
  }
  if (summary.remainingVolumeM3 <= 0) {
    return 'FULFILLED';
  }
  if (summary.daysUntilExpiry < 0) {
    return 'EXPIRED';
  }
  return contract.status || 'ACTIVE';
}

/**
 * Computes live contract fulfillment metrics by cross-referencing:
 * - Purchased contract header & items
 * - WoodReceivingRecords with matching contractNumber
 * - ContractReceipt payments
 */
export function computeFulfillmentSummary(
  contract: PerhutaniContract,
  items: ContractSortimentItem[],
  receipts: ContractReceipt[],
  receivingRecords: WoodReceivingRecord[],
  today: Date = new Date()
): ContractFulfillmentSummary {
  const normContractNo = (contract.contractNumber || '').trim().toLowerCase();

  const matchingRecords = (receivingRecords || []).filter((r) => {
    if (r.contractId && contract.id) {
      return r.contractId === contract.id;
    }
    return (r.contractNumber || '').trim().toLowerCase() === normContractNo;
  });

  const receivedVolumeM3 = Number(
    matchingRecords
      .reduce((acc, r) => acc + (Number(r.tallyVolumeM3) || 0), 0)
      .toFixed(4)
  );

  const receivedPieces = matchingRecords.reduce(
    (acc, r) => acc + (Number(r.tallyPieces) || 0),
    0
  );

  const purchasedVolumeM3 = Number((contract.totalPurchasedVolumeM3 || 0).toFixed(4));
  const purchasedPieces = contract.totalPurchasedPieces || 0;

  const remainingVolumeM3 = Number(
    Math.max(0, purchasedVolumeM3 - receivedVolumeM3).toFixed(4)
  );
  const remainingPieces = Math.max(0, purchasedPieces - receivedPieces);

  const totalPaidIDR = (receipts || []).reduce(
    (acc, r) => acc + (Number(r.amountIDR) || 0),
    0
  );
  const totalContractValueIDR = contract.totalContractValueIDR || 0;
  const outstandingIDR = Math.max(0, totalContractValueIDR - totalPaidIDR);

  const fulfillmentPercent =
    purchasedVolumeM3 > 0
      ? Number(((receivedVolumeM3 / purchasedVolumeM3) * 100).toFixed(1))
      : 0;

  const daysUntilExpiry = calculateDaysDifference(today, contract.effectiveEndDate);
  const isNearExpiry = daysUntilExpiry >= 0 && daysUntilExpiry <= 30 && remainingVolumeM3 > 0;
  const isOverdue = daysUntilExpiry < 0 && remainingVolumeM3 > 0;

  const status = deriveContractStatus(contract, { remainingVolumeM3, daysUntilExpiry });

  return {
    contractId: contract.id,
    contractNumber: contract.contractNumber,
    purchasedVolumeM3,
    purchasedPieces,
    receivedVolumeM3,
    receivedPieces,
    remainingVolumeM3,
    remainingPieces,
    totalPaidIDR,
    totalContractValueIDR,
    outstandingIDR,
    fulfillmentPercent,
    daysUntilExpiry,
    isNearExpiry,
    isOverdue,
    status,
  };
}
