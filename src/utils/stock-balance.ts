/**
 * src/utils/stock-balance.ts
 *
 * Pure stock deduction, balance aggregation, and financial calculations
 * for the Wood Inventory & Outbound Sales Management System.
 */

import type {
  WoodReceivingRecord,
  WoodSalesRecord,
  SawmillProductionRecord,
  StockSortingRecord,
  LotStockBalance,
} from '../types/index.ts';

/**
 * Calculates current stock balance for a specific storage yard and kavling lot
 * by aggregating inbound receiving tally, outbound sales deductions,
 * sawmill production consumption, and kavling stock sorting transfers.
 */
export function calculateLotStockBalance(
  inboundRecords: WoodReceivingRecord[],
  salesRecords: WoodSalesRecord[],
  yard: string,
  kavling: string,
  productionRecords?: SawmillProductionRecord[],
  sortingRecords?: StockSortingRecord[]
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

  const matchingProduction = (productionRecords || []).filter((p) => {
    const y = (p.sourceStorageYard || '').trim().toLowerCase();
    const k = (p.sourceKavlingNumber || '').trim().toLowerCase();
    return y === normYard && k === normKavling;
  });

  const matchingSortingOut = (sortingRecords || []).filter((s) => {
    const y = (s.sourceStorageYard || '').trim().toLowerCase();
    const k = (s.sourceKavlingNumber || '').trim().toLowerCase();
    return y === normYard && k === normKavling;
  });

  const matchingSortingIn = (sortingRecords || []).filter((s) => {
    const y = (s.targetStorageYard || '').trim().toLowerCase();
    const k = (s.targetKavlingNumber || '').trim().toLowerCase();
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

  const consumedPieces = matchingProduction.reduce((acc, p) => acc + (Number(p.inputPieces) || 0), 0);
  const consumedVolumeM3 = Number(
    matchingProduction.reduce((acc, p) => acc + (Number(p.inputVolumeM3) || 0), 0).toFixed(4)
  );

  const transferredOutPieces = matchingSortingOut.reduce((acc, s) => acc + (Number(s.pieces) || 0), 0);
  const transferredOutVolumeM3 = Number(
    matchingSortingOut.reduce((acc, s) => acc + (Number(s.volumeM3) || 0), 0).toFixed(4)
  );

  const transferredInPieces = matchingSortingIn.reduce((acc, s) => acc + (Number(s.pieces) || 0), 0);
  const transferredInVolumeM3 = Number(
    matchingSortingIn.reduce((acc, s) => acc + (Number(s.volumeM3) || 0), 0).toFixed(4)
  );

  const totalInPieces = inboundPieces + transferredInPieces;
  const totalOutPieces = outboundPieces + consumedPieces + transferredOutPieces;
  const remainingPieces = Math.max(0, totalInPieces - totalOutPieces);

  const totalInVolumeM3 = inboundVolumeM3 + transferredInVolumeM3;
  const totalOutVolumeM3 = outboundVolumeM3 + consumedVolumeM3 + transferredOutVolumeM3;
  const remainingVolumeM3 = Number(Math.max(0, totalInVolumeM3 - totalOutVolumeM3).toFixed(4));

  return {
    storageYard: yard,
    kavlingNumber: kavling,
    inboundPieces,
    inboundVolumeM3,
    outboundPieces,
    outboundVolumeM3,
    consumedPieces,
    consumedVolumeM3,
    transferredInPieces,
    transferredInVolumeM3,
    transferredOutPieces,
    transferredOutVolumeM3,
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

/**
 * Aggregates net stock balances for all distinct storage yard and kavling combinations
 * present in inbound receiving, outbound sales, sawmill production, and stock sorting records.
 * Returns an array sorted by remaining volume in cubic meters descending.
 */
export function aggregateAllLotBalances(
  inboundRecords: WoodReceivingRecord[],
  salesRecords: WoodSalesRecord[],
  productionRecords?: SawmillProductionRecord[],
  sortingRecords?: StockSortingRecord[]
): LotStockBalance[] {
  const safeInbounds = inboundRecords || [];
  const safeSales = salesRecords || [];
  const safeProductions = productionRecords || [];
  const safeSortings = sortingRecords || [];

  const lotMap = new Map<string, { yard: string; kavling: string }>();

  const registerLot = (rawYard?: string, rawKavling?: string) => {
    const y = (rawYard || '').trim();
    const k = (rawKavling || '').trim();
    if (!y && !k) return;
    const key = `${y.toLowerCase()}:::${k.toLowerCase()}`;
    if (!lotMap.has(key)) {
      lotMap.set(key, { yard: y, kavling: k });
    }
  };

  for (const rec of safeInbounds) registerLot(rec?.storageYard, rec?.kavlingNumber);
  for (const sale of safeSales) registerLot(sale?.storageYard, sale?.kavlingNumber);
  for (const prod of safeProductions) registerLot(prod?.sourceStorageYard, prod?.sourceKavlingNumber);
  for (const sort of safeSortings) {
    registerLot(sort?.sourceStorageYard, sort?.sourceKavlingNumber);
    registerLot(sort?.targetStorageYard, sort?.targetKavlingNumber);
  }

  const results: LotStockBalance[] = [];
  for (const { yard, kavling } of lotMap.values()) {
    results.push(
      calculateLotStockBalance(
        safeInbounds,
        safeSales,
        yard,
        kavling,
        safeProductions,
        safeSortings
      )
    );
  }

  return results.sort((a, b) => {
    if (b.remainingVolumeM3 !== a.remainingVolumeM3) {
      return b.remainingVolumeM3 - a.remainingVolumeM3;
    }
    return a.kavlingNumber.localeCompare(b.kavlingNumber);
  });
}


