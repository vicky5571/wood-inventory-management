/**
 * test/api-production-sorting.test.ts
 *
 * REST API tests for Sawmill Production and Stock Sorting endpoints.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { GET as getProduction, POST as createProduction } from '../app/api/production/route.ts';
import {
  GET as getProductionById,
  PUT as updateProductionById,
  DELETE as deleteProductionById,
} from '../app/api/production/[id]/route.ts';
import { GET as getSorting, POST as createSorting } from '../app/api/sorting/route.ts';
import {
  GET as getSortingById,
  PUT as updateSortingById,
  DELETE as deleteSortingById,
} from '../app/api/sorting/[id]/route.ts';
import { createSessionToken, COOKIE_NAME } from '../src/auth/session.ts';

const userProfiles: Record<1 | 2 | 3, { id: string; email: string; name: string; title: string }> = {
  1: { id: 'usr-manager-01', email: 'manager@timber.id', name: 'Manager', title: 'Level 1' },
  2: { id: 'usr-admin-02', email: 'admin@timber.id', name: 'Admin', title: 'Level 2' },
  3: { id: 'usr-viewer-03', email: 'viewer@timber.id', name: 'Viewer', title: 'Level 3' },
};

function createMockRequest(url: string, method = 'GET', body?: unknown, roleLevel: 1 | 2 | 3 = 1): Request {
  const profile = userProfiles[roleLevel];
  const token = createSessionToken({
    id: profile.id,
    email: profile.email,
    name: profile.name,
    roleLevel,
    title: profile.title,
  });

  const headers = new Headers({
    cookie: `${COOKIE_NAME}=${token}`,
  });

  if (body) {
    headers.set('content-type', 'application/json');
    return new Request(url, {
      method,
      headers,
      body: JSON.stringify(body),
    });
  }

  return new Request(url, {
    method,
    headers,
  });
}

test('Sawmill Production & Stock Sorting REST API Suite', async (t) => {
  let createdProdId = '';
  let createdSortId = '';

  await t.test('GET /api/production returns list of production records', async () => {
    const res = await getProduction();
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
  });

  await t.test('POST /api/production rejects unauthenticated requests', async () => {
    const req = new Request('http://localhost:3000/api/production', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await createProduction(req);
    assert.equal(res.status, 401);
  });

  await t.test('POST /api/production rejects Level 3 viewers', async () => {
    const req = createMockRequest('http://localhost:3000/api/production', 'POST', {
      productionDate: '2026-10-21',
      sourceStorageYard: 'TPK-Timur',
      sourceKavlingNumber: 'KAV-01',
      inputSpecies: 'Jati',
      inputVolumeM3: 5.0,
      inputPieces: 10,
      outputProduct: 'Papan 2x20x400cm',
      outputVolumeM3: 3.5,
      outputPieces: 12,
      operatorName: 'Budi',
    }, 3);
    const res = await createProduction(req);
    assert.equal(res.status, 403);
  });

  await t.test('POST /api/production validates output cannot exceed input volume', async () => {
    const req = createMockRequest('http://localhost:3000/api/production', 'POST', {
      productionDate: '2026-10-21',
      sourceStorageYard: 'TPK-Timur',
      sourceKavlingNumber: 'KAV-01',
      inputSpecies: 'Jati',
      inputVolumeM3: 5.0,
      inputPieces: 10,
      outputProduct: 'Papan 2x20x400cm',
      outputVolumeM3: 6.5,
      outputPieces: 20,
      operatorName: 'Budi',
    }, 2);
    const res = await createProduction(req);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.match(json.error, /melebihi volume input/);
  });

  await t.test('POST /api/production succeeds with valid data', async () => {
    const req = createMockRequest('http://localhost:3000/api/production', 'POST', {
      productionDate: '2026-10-21',
      shift: 'PAGI',
      sourceStorageYard: 'TPK-Timur',
      sourceKavlingNumber: 'KAV-01',
      inputSpecies: 'Jati',
      inputVolumeM3: 6.0,
      inputPieces: 12,
      outputProduct: 'Papan 2x20x400cm',
      outputVolumeM3: 4.2,
      outputPieces: 16,
      operatorName: 'Pak Budi',
    }, 2);
    const res = await createProduction(req);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.id);
    assert.equal(json.data.yieldPercent, 70.0);
    assert.equal(json.data.wasteVolumeM3, 1.8);
    createdProdId = json.data.id;
  });

  await t.test('PUT /api/production/[id] updates production record', async () => {
    const req = createMockRequest(`http://localhost:3000/api/production/${createdProdId}`, 'PUT', {
      outputVolumeM3: 4.8,
      outputPieces: 18,
    }, 2);
    const res = await updateProductionById(req, { params: Promise.resolve({ id: createdProdId }) });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.outputVolumeM3, 4.8);
    assert.equal(json.data.yieldPercent, 80.0);
  });

  await t.test('DELETE /api/production/[id] requires Level 1', async () => {
    const reqLvl2 = createMockRequest(`http://localhost:3000/api/production/${createdProdId}`, 'DELETE', undefined, 2);
    const resLvl2 = await deleteProductionById(reqLvl2, { params: Promise.resolve({ id: createdProdId }) });
    assert.equal(resLvl2.status, 403);

    const reqLvl1 = createMockRequest(`http://localhost:3000/api/production/${createdProdId}`, 'DELETE', undefined, 1);
    const resLvl1 = await deleteProductionById(reqLvl1, { params: Promise.resolve({ id: createdProdId }) });
    assert.equal(resLvl1.status, 200);
  });

  await t.test('POST /api/sorting rejects self-transfer to same lot', async () => {
    const req = createMockRequest('http://localhost:3000/api/sorting', 'POST', {
      sortingDate: '2026-10-21',
      species: 'Jati',
      sourceStorageYard: 'TPK-Timur',
      sourceKavlingNumber: 'KAV-01',
      targetStorageYard: 'TPK-Timur',
      targetKavlingNumber: 'KAV-01',
      volumeM3: 3.0,
      pieces: 6,
      reason: 'Self transfer test',
      operatorName: 'Pak Budi',
    }, 2);
    const res = await createSorting(req);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.match(json.error, /tidak boleh sama/);
  });

  await t.test('POST /api/sorting succeeds with valid dual kavlings', async () => {
    const req = createMockRequest('http://localhost:3000/api/sorting', 'POST', {
      sortingDate: '2026-10-21',
      species: 'Jati',
      sourceStorageYard: 'TPK-Timur',
      sourceKavlingNumber: 'KAV-01',
      targetStorageYard: 'TPK-Timur',
      targetKavlingNumber: 'KAV-02',
      volumeM3: 3.5,
      pieces: 7,
      reason: 'Regrade kualitas B',
      operatorName: 'Pak Joko',
    }, 2);
    const res = await createSorting(req);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.id);
    createdSortId = json.data.id;
  });

  await t.test('DELETE /api/sorting/[id] deletes sorting record with Level 1', async () => {
    const req = createMockRequest(`http://localhost:3000/api/sorting/${createdSortId}`, 'DELETE', undefined, 1);
    const res = await deleteSortingById(req, { params: Promise.resolve({ id: createdSortId }) });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
  });
});
