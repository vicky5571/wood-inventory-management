import test from 'node:test';
import assert from 'node:assert/strict';
import { PATCH } from '../app/api/records/[id]/price/route.ts';
import { serverRecordStore } from '../src/persistence/server-record-store.ts';
import { createSessionToken, COOKIE_NAME } from '../src/auth/session.ts';
import type { WoodReceivingRecord } from '../src/types/index.ts';

test('API PATCH /api/records/[id]/price Suite', async (t) => {
  const managerToken = createSessionToken({
    id: 'usr-manager-01',
    email: 'manager@timber.id',
    name: 'Manager',
    roleLevel: 1,
    title: 'Operations Manager',
  });

  const level2Token = createSessionToken({
    id: 'usr-admin-02',
    email: 'admin@timber.id',
    name: 'Auditor Level 2',
    roleLevel: 2,
    title: 'Level 2 Auditor',
  });

  // Seed a record with null price
  const seedRecord: WoodReceivingRecord = {
    id: 'rec-patch-price-01',
    receiptDate: '2026-10-21',
    truckPlateNumber: 'B 7777 PRC',
    forestryDocNumber: 'DOC-PRC-01',
    receiptNumber: 'REC-PRC-01',
    supplierName: 'PT Timber Price',
    woodSpecies: 'Teak / Jati (柚木)',
    woodLengthM: 4.0,
    kavlingNumber: 'KAV-P1',
    storageYard: 'TPK-01',
    deliveredPieces: 10,
    deliveredVolumeM3: 2.0,
    tallyPieces: 10,
    tallyVolumeM3: 2.0,
    timberPricePerM3: null,
    timberGrossTotal: null,
    timberPphRate: 0.5,
    timberPphAmount: null,
    timberNetPayable: null,
    freightRatePerM3: 100000,
    freightGrossTotal: 200000,
    freightPphAmount: 4000,
    freightNetPayable: 196000,
    brokerFee: 50000,
    grandNetPayable: null,
    paymentStatus: 'UNPAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await serverRecordStore.save(seedRecord);

  await t.test('rejects unauthenticated request with 401', async () => {
    const req = new Request('http://localhost:3000/api/records/rec-patch-price-01/price', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timberPricePerM3: 2500000 }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'rec-patch-price-01' }) });
    assert.strictEqual(res.status, 401);
  });

  await t.test('rejects level 2 user with 403', async () => {
    const req = new Request('http://localhost:3000/api/records/rec-patch-price-01/price', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${COOKIE_NAME}=${level2Token}`,
      },
      body: JSON.stringify({ timberPricePerM3: 2500000 }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'rec-patch-price-01' }) });
    assert.strictEqual(res.status, 403);
  });

  await t.test('rejects negative price with 400', async () => {
    const req = new Request('http://localhost:3000/api/records/rec-patch-price-01/price', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify({ timberPricePerM3: -1000 }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'rec-patch-price-01' }) });
    assert.strictEqual(res.status, 400);
  });

  await t.test('returns 404 for nonexistent record', async () => {
    const req = new Request('http://localhost:3000/api/records/non-existent-rec/price', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify({ timberPricePerM3: 2500000 }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'non-existent-rec' }) });
    assert.strictEqual(res.status, 404);
  });

  await t.test('successfully updates price and recalculates financial fields', async () => {
    const req = new Request('http://localhost:3000/api/records/rec-patch-price-01/price', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify({ timberPricePerM3: 3000000 }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'rec-patch-price-01' }) });
    assert.strictEqual(res.status, 200);

    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.timberPricePerM3, 3000000);
    // 2.0 m³ * 3,000,000 = 6,000,000 gross
    assert.strictEqual(json.data.timberGrossTotal, 6000000);
    // 0.5% PPh = 30,000
    assert.strictEqual(json.data.timberPphAmount, 30000);
    // Net timber = 5,970,000
    assert.strictEqual(json.data.timberNetPayable, 5970000);
    // Grand net = 5,970,000 (timber net) + 196,000 (freight net) + 50,000 (broker) = 6,216,000
    assert.strictEqual(json.data.grandNetPayable, 6216000);
  });

  await t.test('successfully clears price to null and null-propagates totals', async () => {
    const req = new Request('http://localhost:3000/api/records/rec-patch-price-01/price', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${COOKIE_NAME}=${managerToken}`,
      },
      body: JSON.stringify({ timberPricePerM3: null }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'rec-patch-price-01' }) });
    assert.strictEqual(res.status, 200);

    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.timberPricePerM3, null);
    assert.strictEqual(json.data.timberGrossTotal, null);
    assert.strictEqual(json.data.timberNetPayable, null);
    assert.strictEqual(json.data.grandNetPayable, null);
  });
});
