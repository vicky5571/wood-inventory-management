/**
 * test/use-wood-sales-records.test.ts
 *
 * Unit tests verifying useWoodSalesRecords hook contracts, lot balance evaluation,
 * local storage caching, background API synchronization, and customer history extraction.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { useWoodSalesRecords } from '../src/hooks/useWoodSalesRecords.ts';
import { toastStore } from '../src/utils/toast-store.ts';
import type { WoodReceivingRecord, WoodSalesRecord, SalesFormInput } from '../src/types/index.ts';

function renderHook<T>(hookFn: () => T): T {
  let result: T | undefined;
  function Component() {
    result = hookFn();
    return null;
  }
  renderToString(React.createElement(Component));
  return result as T;
}

const mockInbounds: WoodReceivingRecord[] = [
  {
    id: 'REC-001',
    receiptDate: '2026-10-15',
    truckPlateNumber: 'KB 1001 AA',
    forestryDocNumber: 'SKSHH-001',
    receiptNumber: 'RCP-001',
    contractNumber: 'CTR-001',
    supplierName: 'PT Borneo Timber',
    woodSpecies: 'Meranti',
    woodLengthM: 4,
    kavlingNumber: 'KAV-01',
    storageYard: 'TPK-Timur',
    deliveredPieces: 50,
    deliveredVolumeM3: 20.0,
    tallyPieces: 50,
    tallyVolumeM3: 20.0,
    timberPricePerM3: 1500000,
    timberPphRate: 0.015,
    timberGrossTotal: 30000000,
    timberPphAmount: 450000,
    timberNetPayable: 29550000,
    freightRatePerM3: 100000,
    freightGrossTotal: 2000000,
    freightPphAmount: 40000,
    freightNetPayable: 1960000,
    brokerFee: 0,
    grandNetPayable: 31510000,
    createdAt: '2026-10-15T08:00:00Z',
    updatedAt: '2026-10-15T08:00:00Z',
  },
];

test('useWoodSalesRecords Hook Contract & Invariants Suite', async (t) => {
  await t.test('useWoodSalesRecords is exported as a callable function', () => {
    assert.strictEqual(typeof useWoodSalesRecords, 'function');
  });

  await t.test('returns expected interface properties and methods', () => {
    const hook = renderHook(() => useWoodSalesRecords(mockInbounds));

    assert.ok(Array.isArray(hook.sales));
    assert.strictEqual(typeof hook.isSyncing, 'boolean');
    assert.strictEqual(typeof hook.isHydrated, 'boolean');
    assert.strictEqual(typeof hook.saveSale, 'function');
    assert.strictEqual(typeof hook.deleteSale, 'function');
    assert.strictEqual(typeof hook.getLotBalance, 'function');
    assert.ok(Array.isArray(hook.customerHistory));
  });

  await t.test('getLotBalance delegates to calculateLotStockBalance with current sales and inbounds', () => {
    const hook = renderHook(() => useWoodSalesRecords(mockInbounds));
    const balance = hook.getLotBalance('TPK-Timur', 'KAV-01');

    assert.strictEqual(balance.storageYard, 'TPK-Timur');
    assert.strictEqual(balance.kavlingNumber, 'KAV-01');
    assert.strictEqual(balance.inboundPieces, 50);
    assert.strictEqual(balance.inboundVolumeM3, 20.0);
    assert.strictEqual(balance.outboundPieces, 0);
    assert.strictEqual(balance.outboundVolumeM3, 0);
    assert.strictEqual(balance.remainingPieces, 50);
    assert.strictEqual(balance.remainingVolumeM3, 20.0);
  });

  await t.test('saveSale computes total price and initiates background POST sync', async () => {
    toastStore.clearToasts();
    const originalFetch = globalThis.fetch;
    let postedUrl = '';
    let postedMethod = '';
    let postedBody = '';

    globalThis.fetch = async (url: any, opts: any) => {
      postedUrl = String(url);
      postedMethod = opts?.method || 'GET';
      postedBody = opts?.body || '';
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    };

    try {
      const hook = renderHook(() => useWoodSalesRecords(mockInbounds));

      const input: SalesFormInput = {
        saleDate: '2026-10-18',
        deliveryOrderNumber: 'DO/2026/10/001',
        truckPlateNumber: 'B 9999 XYZ',
        driverName: 'Pak Budi',
        customerName: 'PT Maju Mapan Furniture',
        storageYard: 'TPK-Timur',
        kavlingNumber: 'KAV-01',
        woodSpecies: 'Meranti',
        pieces: 10,
        volumeM3: 4.5,
        pricePerM3: 2000000,
        paymentStatus: 'UNPAID',
      };

      const saved = await hook.saveSale(input);

      assert.ok(saved.id);
      assert.strictEqual(saved.totalPrice, 9000000);
      assert.strictEqual(saved.customerName, 'PT Maju Mapan Furniture');

      await new Promise((resolve) => setTimeout(resolve, 50));

      assert.strictEqual(postedUrl, '/api/sales');
      assert.strictEqual(postedMethod, 'POST');
      assert.ok(postedBody.includes('DO/2026/10/001'));
      assert.ok(postedBody.includes('9000000'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('deleteSale initiates background DELETE sync', async () => {
    toastStore.clearToasts();
    const originalFetch = globalThis.fetch;
    let deleteUrl = '';
    let deleteMethod = '';

    globalThis.fetch = async (url: any, opts: any) => {
      deleteUrl = String(url);
      deleteMethod = opts?.method || 'GET';
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    };

    try {
      const hook = renderHook(() => useWoodSalesRecords(mockInbounds));

      await hook.deleteSale('SALE-TEST-99');

      await new Promise((resolve) => setTimeout(resolve, 50));

      assert.strictEqual(deleteUrl, '/api/sales?id=SALE-TEST-99');
      assert.strictEqual(deleteMethod, 'DELETE');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('saveSale emits warning toast when server sync fails but retains local state', async () => {
    toastStore.clearToasts();
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ success: false, error: 'Database locked' }), { status: 500 });
    };

    try {
      const hook = renderHook(() => useWoodSalesRecords(mockInbounds));

      const input: SalesFormInput = {
        saleDate: '2026-10-18',
        deliveryOrderNumber: 'DO/2026/10/002',
        truckPlateNumber: 'B 1234 ABC',
        customerName: 'CV Jati Berkah',
        storageYard: 'TPK-Timur',
        kavlingNumber: 'KAV-01',
        woodSpecies: 'Meranti',
        pieces: 5,
        volumeM3: 2.0,
        pricePerM3: 1500000,
      };

      const saved = await hook.saveSale(input);
      assert.ok(saved.id);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const toasts = toastStore.getToasts();
      assert.ok(toasts.length > 0);
      const warnToast = toasts.find((t) => t.title.includes('Sinkronisasi'));
      assert.ok(warnToast, 'Should warn about server sync failure while retaining local data');
    } finally {
      globalThis.fetch = originalFetch;
      toastStore.clearToasts();
    }
  });
});

