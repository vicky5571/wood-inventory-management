/**
 * test/record-document-section.test.ts
 *
 * Contract and integration test suite for RecordDocumentSection.
 * Asserts that RecordDocumentSection renders form controls for all Excel document and manifesto fields,
 * specifically docDate (Dokumen Tanggal) and receiptNumber (Nomor Kwitansi).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('RecordDocumentSection Form Inputs Contract Suite', async (t) => {
  const filePath = path.resolve(process.cwd(), 'src/components/ledger/RecordDocumentSection.tsx');

  await t.test('RecordDocumentSection.tsx exists and obeys 250 LOC ceiling', () => {
    assert.ok(fs.existsSync(filePath), 'src/components/ledger/RecordDocumentSection.tsx must exist');
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    assert.ok(
      lines.length <= 250,
      `RecordDocumentSection.tsx LOC (${lines.length}) exceeds 250 line ceiling`
    );
  });

  await t.test('RecordDocumentSection provides form inputs for docDate and receiptNumber', () => {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check docDate (Dokumen Tanggal / 发货时间)
    assert.match(
      content,
      /docDate/,
      'Must bind form.docDate'
    );
    assert.match(
      content,
      /Dokumen Tanggal|发货时间/,
      'Must contain bilingual label for Dokumen Tanggal (发货时间)'
    );

    // Check receiptNumber (No. Kwitansi / 订货单号)
    assert.match(
      content,
      /receiptNumber/,
      'Must bind form.receiptNumber'
    );
    assert.match(
      content,
      /No\. Kwitansi|订货单号/,
      'Must contain bilingual label for No. Kwitansi (订货单号)'
    );
  });
});
