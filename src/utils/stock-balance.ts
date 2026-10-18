/**
 * src/utils/stock-balance.ts
 *
 * Pure stock deduction, balance aggregation, and financial calculations
 * for the Wood Inventory & Outbound Sales Management System.
 */

import type { WoodReceivingRecord, WoodSalesRecord, LotStockBalance } from '../types/index.ts';

/**
 * Calculates current stock balance for a specific storage yard and kavling lot
 * by aggregating inbound receiving tally vs outbound sales deductions.
 */
export function calculateLotStockBalance(
  inboundRecords: WoodReceivingRecord[],
  salesRecords: WoodSalesRecord[],
  yard: string,
  kavling: string
): LotStockBalance {
  const normYard = (yard || '').trim().toLowerCase();
  const normKavling = (kavling || '').trim().toLowerCase();

  const matchingInbounds = (inboundRecords || []).filter((r) => {
    const y = (r.storageYard || '').trim().toLowerCase();
    const k = (r.kavlingNumber || '').trim().toLowerCase();
    return y === normYard && k === normKavling;
  });

  const matchingSales = (salesRecords || []).filter((s) => {
    const y = (s.storageYard || '').trim().toLowerCase();
    const k = (s.kavlingNumber || '').trim().toLowerCase();
    return y === normYard && k === normKavling;
  });

  const inboundPieces = matchingInbounds.reduce((acc, r) => acc + (Number(r.tallyPieces) || 0), 0);
  const inboundVolumeM3 = Number(
    matchingInbounds.reduce((acc, r) => acc + (Number(r.tallyVolumeM3) || 0), 0).toFixed(4)
  );

  const outboundPieces = matchingSales.reduce((acc, s) => acc + (Number(s.pieces) || 0), 0);
  const outboundVolumeM3 = Number(
    matchingSales.reduce((acc, s) => acc + (Number(s.volumeM3) || 0), 0).toFixed(4)
  );

  const remainingPieces = Math.max(0, inboundPieces - outboundPieces);
  const remainingVolumeM3 = Number(Math.max(0, inboundVolumeM3 - outboundVolumeM3).toFixed(4));

  return {
    storageYard: yard,
    kavlingNumber: kavling,
    inboundPieces,
    inboundVolumeM3,
    outboundPieces,
    outboundVolumeM3,
    remainingPieces,
    remainingVolumeM3,
  };
}

/**
 * Evaluates whether a requested sale volume and piece count can be fulfilled
 * from the lot's remaining stock balance. Emits a descriptive warning if overdrawn.
 */
export function validateSalesStockAllowance(
  balance: LotStockBalance,
  requestedVolumeM3: number,
  requestedPieces: number
): { isAllowed: boolean; warning?: string } {
  const reqVol = Number(requestedVolumeM3) || 0;
  const reqPcs = Number(requestedPieces) || 0;

  if (reqVol <= 0 || reqPcs <= 0) {
    return { isAllowed: false, warning: 'Volume dan jumlah batang harus lebih dari 0.' };
  }

  if (reqVol > balance.remainingVolumeM3) {
    return {
      isAllowed: false,
      warning: `Volume melebihi sisa stok kavling (Tersedia: ${balance.remainingVolumeM3.toFixed(4)} m³, Diminta: ${reqVol.toFixed(4)} m³).`,
    };
  }

  if (reqPcs > balance.remainingPieces) {
    return {
      isAllowed: false,
      warning: `Jumlah batang melebihi sisa stok kavling (Tersedia: ${balance.remainingPieces} btg, Diminta: ${reqPcs} btg).`,
    };
  }

  return { isAllowed: true };
}

/**
 * Calculates total gross selling price from volume and price per m3.
 */
export function calculateSalesFinancials(
  volumeM3: number,
  pricePerM3: number
): { totalPrice: number } {
  const vol = Math.max(0, Number(volumeM3) || 0);
  const price = Math.max(0, Number(pricePerM3) || 0);
  return {
    totalPrice: Math.round(vol * price),
  };
}
