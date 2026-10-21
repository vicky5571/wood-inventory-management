import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GET as getList, POST as createForm } from '../app/api/payment-forms/route.ts';
import { GET as getDetail, PUT as updateForm, DELETE as voidForm } from '../app/api/payment-forms/[id]/route.ts';
import { POST as generateForms } from '../app/api/payment-forms/generate/route.ts';
import { PATCH as updateStatus } from '../app/api/payment-forms/[id]/status/route.ts';
import { createSessionToken, COOKIE_NAME } from '../src/auth/session.ts';

function createMockRequest(url: string, method: string = 'GET', body?: any, roleLevel: 1 | 2 | 3 = 1): Request {
  const token = createSessionToken({
    id: 'usr-1',
    email: 'admin@timber.com',
    name: 'Admin Test',
    roleLevel,
    title: 'Superadmin',
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

test('Payment Forms API Endpoints Suite', async (t) => {
  await t.test('GET /api/payment-forms returns list of payment forms for authenticated user', async () => {
    const req = createMockRequest('http://localhost:3000/api/payment-forms');
    const res = await getList(req);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
  });

  await t.test('POST /api/payment-forms creates a new DRAFT payment form', async () => {
    const payload = {
      weekStartDate: '2026-10-17',
      weekEndDate: '2026-10-23',
      supplierName: 'PT Mandiri Sejahtera',
      woodSpecies: 'Jati',
      contractNumber: 'CTR-999',
      totalTallyVolumeM3: 12.5,
      totalTallyPieces: 25,
      totalTimberGrossIDR: 25000000,
      totalTimberPphIDR: 62500,
      totalTimberNetIDR: 24937500,
    };

    const req = createMockRequest('http://localhost:3000/api/payment-forms', 'POST', payload, 1);
    const res = await createForm(req);
    assert.equal(res.status, 201);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.supplierName, 'PT Mandiri Sejahtera');
    assert.equal(json.data.status, 'DRAFT');

    // Retrieve via GET [id]
    const detailReq = createMockRequest(`http://localhost:3000/api/payment-forms/${json.data.id}`);
    const detailRes = await getDetail(detailReq, { params: Promise.resolve({ id: json.data.id }) });
    assert.equal(detailRes.status, 200);
    const detailJson = await detailRes.json();
    assert.equal(detailJson.data.id, json.data.id);
  });

  await t.test('POST /api/payment-forms/generate runs grouping and returns generation result', async () => {
    const req = createMockRequest('http://localhost:3000/api/payment-forms/generate', 'POST', {
      weekStartDate: '2026-10-17',
    }, 1);

    const res = await generateForms(req);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(typeof json.data.createdCount === 'number');
    assert.ok(typeof json.data.updatedCount === 'number');
    assert.ok(typeof json.data.skippedCount === 'number');
    assert.ok(Array.isArray(json.data.skippedReasons));
  });

  await t.test('PUT /api/payment-forms/[id] updates draft form fields and line items', async () => {
    const createReq = createMockRequest('http://localhost:3000/api/payment-forms', 'POST', {
      weekStartDate: '2026-10-17',
      supplierName: 'PT Edit Test',
      woodSpecies: 'Meranti',
    }, 1);
    const createRes = await createForm(createReq);
    const formId = (await createRes.json()).data.id;

    const putReq = createMockRequest(`http://localhost:3000/api/payment-forms/${formId}`, 'PUT', {
      preprintedNumber: '018999',
      issueDate: '2026-10-22',
      notes: 'Catatan edit draft',
      lines: [
        {
          id: 'line-1',
          itemSequence: 1,
          kategori: 'Pembelian Kayu',
          konten: 'SKSHHK-001 - Meranti',
          tujuan: 'PT Edit Test',
          hargaSatuanIDR: 2000000,
          jumlah: 5,
          unit: 'm³',
          totalIDR: 10000000,
        },
      ],
    }, 1);

    const putRes = await updateForm(putReq, { params: Promise.resolve({ id: formId }) });
    assert.equal(putRes.status, 200);
    const putJson = await putRes.json();
    assert.equal(putJson.data.preprintedNumber, '018999');
    assert.equal(putJson.data.issueDate, '2026-10-22');
    assert.equal(putJson.data.lines.length, 1);
    assert.equal(putJson.data.lines[0].kategori, 'Pembelian Kayu');
  });

  await t.test('PATCH /api/payment-forms/[id]/status transitions DRAFT -> ISSUED -> PAID', async () => {
    // 1. Create a draft
    const createReq = createMockRequest('http://localhost:3000/api/payment-forms', 'POST', {
      weekStartDate: '2026-10-17',
      supplierName: 'CV Rimba Lestari',
      woodSpecies: 'Mahoni',
      totalTimberNetIDR: 10000000,
    }, 1);
    const createRes = await createForm(createReq);
    const formId = (await createRes.json()).data.id;

    // 2. Transition to ISSUED fails without preprintedNumber and issueDate
    const failIssueReq = createMockRequest(`http://localhost:3000/api/payment-forms/${formId}/status`, 'PATCH', {
      status: 'ISSUED',
    }, 1);
    const failIssueRes = await updateStatus(failIssueReq, { params: Promise.resolve({ id: formId }) });
    assert.equal(failIssueRes.status, 400);

    // 3. Transition to ISSUED succeeds with preprintedNumber and issueDate
    const issueReq = createMockRequest(`http://localhost:3000/api/payment-forms/${formId}/status`, 'PATCH', {
      status: 'ISSUED',
      preprintedNumber: '018532',
      issueDate: '2026-10-22',
    }, 1);
    const issueRes = await updateStatus(issueReq, { params: Promise.resolve({ id: formId }) });
    assert.equal(issueRes.status, 200);
    const issueJson = await issueRes.json();
    assert.equal(issueJson.data.status, 'ISSUED');
    assert.equal(issueJson.data.preprintedNumber, '018532');

    // 4. Transition to PAID
    const paidReq = createMockRequest(`http://localhost:3000/api/payment-forms/${formId}/status`, 'PATCH', {
      status: 'PAID',
      invoiceNumber: 'INV-2026-001',
      paymentDate: '2026-10-22',
      paymentMethod: 'Transfer BCA',
    }, 1);
    const paidRes = await updateStatus(paidReq, { params: Promise.resolve({ id: formId }) });
    assert.equal(paidRes.status, 200);
    const paidJson = await paidRes.json();
    assert.equal(paidJson.data.status, 'PAID');
    assert.equal(paidJson.data.invoiceNumber, 'INV-2026-001');
  });

  await t.test('DELETE /api/payment-forms/[id] marks form as VOID', async () => {
    const createReq = createMockRequest('http://localhost:3000/api/payment-forms', 'POST', {
      weekStartDate: '2026-10-17',
      supplierName: 'PT Void Target',
      woodSpecies: 'Pinus',
    }, 1);
    const createRes = await createForm(createReq);
    const formId = (await createRes.json()).data.id;

    const delReq = createMockRequest(`http://localhost:3000/api/payment-forms/${formId}`, 'DELETE', undefined, 1);
    const delRes = await voidForm(delReq, { params: Promise.resolve({ id: formId }) });
    assert.equal(delRes.status, 200);

    const json = await delRes.json();
    assert.equal(json.data.status, 'VOID');
  });
});
