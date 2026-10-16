/**
 * test/print-receiving-slip.test.ts
 *
 * Unit and contract tests for the Printable Receiving Slip (Tanda Terima Kayu Masuk)
 * modal component, RecordTable print action trigger, and Ledger integration.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Printable Wood Receiving Slip Suite', async (t) => {
  const modalPath = path.resolve(process.cwd(), 'src/components/ledger/PrintReceivingSlipModal.tsx');
  const tablePath = path.resolve(process.cwd(), 'src/components/ledger/RecordTable.tsx');
  const ledgerPath = path.resolve(process.cwd(), 'app/ledger/page.tsx');
  const typesPath = path.resolve(process.cwd(), 'src/types/index.ts');

  await t.test('PrintReceivingSlipModal.tsx exists and stays strictly within the 250 LOC ceiling', () => {
    assert.ok(fs.existsSync(modalPath), 'src/components/ledger/PrintReceivingSlipModal.tsx must exist');
    const content = fs.readFileSync(modalPath, 'utf-8');
    const lines = content.split('\n');
    assert.ok(
      lines.length < 250,
      `PrintReceivingSlipModal.tsx LOC (${lines.length}) must be strictly < 250 LOC`
    );
  });

  await t.test('SSOT exports PrintReceivingSlipModalProps and modal re-exports it', () => {
    assert.ok(fs.existsSync(typesPath), 'src/types/index.ts must exist');
    const typesContent = fs.readFileSync(typesPath, 'utf-8');
    assert.match(typesContent, /export interface PrintReceivingSlipModalProps/, 'SSOT must export PrintReceivingSlipModalProps');
    assert.match(typesContent, /isOpen:\s*boolean/);
    assert.match(typesContent, /record:\s*WoodReceivingRecord\s*\|\s*null/);
    assert.match(typesContent, /onClose:\s*\(\)\s*=>\s*void/);

    const modalContent = fs.readFileSync(modalPath, 'utf-8');
    assert.match(modalContent, /export (function|const) PrintReceivingSlipModal/, 'Must export PrintReceivingSlipModal');
    assert.match(modalContent, /import type \{.*PrintReceivingSlipModalProps.*\} from ['"]@\/src\/types['"]/, 'Must import PrintReceivingSlipModalProps from SSOT');
    assert.match(modalContent, /export type \{ PrintReceivingSlipModalProps \}/, 'Must re-export PrintReceivingSlipModalProps from SSOT');
  });

  await t.test('PrintReceivingSlipModal implements receipt layout, bilingual headers, and print styles', () => {
    const content = fs.readFileSync(modalPath, 'utf-8');
    // Backdrop and ARIA
    assert.match(content, /z-50/, 'Must have z-50 backdrop');
    assert.match(content, /role=["']dialog["']/, 'Must specify role="dialog"');
    assert.match(content, /aria-modal=["']true["']/, 'Must specify aria-modal="true"');
    assert.match(content, /Escape/, 'Must handle Escape key to close modal');

    // Headers
    assert.match(content, /TIMBERGUARD\s*\/\s*PT RIMBA MANDIRI/, 'Must include company header');
    assert.match(
      content,
      /SURAT TANDA TERIMA KAYU MASUK\s*\(木材进厂检尺验收单\)/,
      'Must include bilingual title'
    );

    // Metadata & Wood Specs
    assert.match(content, /Tanggal Penerimaan/, 'Must display Tanggal Penerimaan');
    assert.match(content, /No\.\s*Kwitansi/, 'Must display No. Kwitansi');
    assert.match(content, /No\.\s*Polisi/, 'Must display No. Polisi');
    assert.match(content, /SKSHHK|DKP/, 'Must display forestry permit document');
    assert.match(content, /No\.\s*Kontrak/, 'Must display No. Kontrak');
    assert.match(content, /Supplier/, 'Must display Supplier');
    assert.match(content, /Jenis Kayu/, 'Must display Jenis Kayu');
    assert.match(content, /No\.\s*Kavling|TPK/, 'Must display Kavling / TPK');

    // Quantities & Verification
    assert.match(content, /Batang|Pieces/, 'Must display piece counts');
    assert.match(content, /Volume|m³/, 'Must display volume m³');
    assert.match(content, /Selisih|Discrepancy/, 'Must display discrepancy comparison');

    // Financials
    assert.match(content, /Net.*Kayu|Pembayaran Kayu/, 'Must display net timber payable');
    assert.match(content, /Net.*Ongkir|Ongkos Kirim/, 'Must display net freight payable');
    assert.match(content, /Grand Total|Total Bayar/, 'Must display grand total payable');

    // 3-Column Signatures
    assert.match(content, /Sopir\s*\/\s*Pengangkut\s*\(司机\)/, 'Must include driver signature block');
    assert.match(content, /Petugas Tally\s*\(检尺员\)/, 'Must include tally scaler signature block');
    assert.match(content, /Kepala Pabrik\s*\/\s*Lapangan\s*\(主管\/厂长\)/, 'Must include manager signature block');

    // Print CSS and Action Triggers
    assert.match(content, /@media\s+print/, 'Must include print media stylesheet styles');
    assert.match(content, /no-print/, 'Must include no-print class for controls');
    assert.match(content, /window\.print\(\)/, 'Must trigger window.print()');
  });

  await t.test('RecordTable.tsx incorporates onPrint prop and Printer action trigger within 250 LOC ceiling', () => {
    assert.ok(fs.existsSync(tablePath), 'src/components/ledger/RecordTable.tsx must exist');
    const content = fs.readFileSync(tablePath, 'utf-8');
    const lines = content.split('\n');
    assert.ok(
      lines.length < 250,
      `RecordTable.tsx LOC (${lines.length}) must remain strictly < 250 LOC`
    );

    assert.match(content, /onPrint\?:\s*\(record:\s*WoodReceivingRecord\)\s*=>\s*void/, 'Must declare onPrint prop');
    assert.match(content, /Printer/, 'Must import and use Printer icon from lucide-react');
    assert.match(content, /title=["']Cetak Tanda Terima \(打印进厂单\)["']/, 'Must set print button title attribute');
    assert.match(content, /onPrint\?\.\(r\)/, 'Must trigger onPrint with target record on click');
  });

  await t.test('app/ledger/page.tsx wires onPrint to PrintReceivingSlipModal within 250 LOC ceiling', () => {
    assert.ok(fs.existsSync(ledgerPath), 'app/ledger/page.tsx must exist');
    const content = fs.readFileSync(ledgerPath, 'utf-8');
    const lines = content.split('\n');
    assert.ok(
      lines.length < 250,
      `app/ledger/page.tsx LOC (${lines.length}) must remain strictly < 250 LOC`
    );

    assert.match(content, /PrintReceivingSlipModal/, 'Ledger page must import PrintReceivingSlipModal');
    assert.match(content, /printingRecord/, 'Must maintain printingRecord state');
    assert.match(content, /setPrintingRecord/, 'Must have setPrintingRecord state setter');
    assert.match(content, /onPrint=\{.*setPrintingRecord/, 'Must pass onPrint callback to RecordTable');
    assert.match(content, /<PrintReceivingSlipModal/, 'Must mount PrintReceivingSlipModal component');
  });
});
