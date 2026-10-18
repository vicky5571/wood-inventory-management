/**
 * test/sales-components.test.ts
 *
 * Contract & architecture tests for SalesModal and PrintDeliveryOrderModal components:
 * Verifying freeform customer auto-suggest, live stock balance gauge,
 * overdraw stock warning, delivery order print formatting, and file size constraints.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const salesModalPath = path.resolve(process.cwd(), 'src/components/sales/SalesModal.tsx');
const printModalPath = path.resolve(process.cwd(), 'src/components/sales/PrintDeliveryOrderModal.tsx');
const typesPath = path.resolve(process.cwd(), 'src/types/index.ts');

test('Sales Subsystem UI Components Suite', async (t) => {
  await t.test('Files exist and satisfy architectural LOC constraints', () => {
    assert.ok(fs.existsSync(salesModalPath), 'SalesModal.tsx must exist');
    assert.ok(fs.existsSync(printModalPath), 'PrintDeliveryOrderModal.tsx must exist');

    const salesModalLines = fs.readFileSync(salesModalPath, 'utf-8').split('\n').length;
    const printModalLines = fs.readFileSync(printModalPath, 'utf-8').split('\n').length;

    assert.ok(salesModalLines <= 220, `SalesModal.tsx LOC (${salesModalLines}) must be <= 220 LOC`);
    assert.ok(printModalLines <= 180, `PrintDeliveryOrderModal.tsx LOC (${printModalLines}) must be <= 180 LOC`);
  });

  await t.test('SSOT defines and exports SalesModalProps and PrintDeliveryOrderModalProps', () => {
    assert.ok(fs.existsSync(typesPath), 'src/types/index.ts must exist');
    const typesContent = fs.readFileSync(typesPath, 'utf-8');

    assert.match(typesContent, /export interface SalesModalProps/, 'SSOT must export SalesModalProps');
    assert.match(typesContent, /export interface PrintDeliveryOrderModalProps/, 'SSOT must export PrintDeliveryOrderModalProps');
    assert.match(typesContent, /customerHistory:\s*string\[\]/, 'SalesModalProps must include customerHistory array');
    assert.match(typesContent, /existingSales:\s*WoodSalesRecord\[\]/, 'SalesModalProps must include existingSales');
    assert.match(typesContent, /inboundRecords:\s*WoodReceivingRecord\[\]/, 'SalesModalProps must include inboundRecords');
  });

  await t.test('SalesModal integrates cascading selectors, freeform customer datalist, and live stock gauge', () => {
    const content = fs.readFileSync(salesModalPath, 'utf-8');

    assert.match(content, /export function SalesModal/, 'Must export SalesModal component');
    assert.match(content, /role="dialog"/, 'Must specify role="dialog"');
    assert.match(content, /aria-modal="true"/, 'Must specify aria-modal="true"');

    // Cascading & Species components
    assert.match(content, /YardSelect/, 'Must integrate YardSelect');
    assert.match(content, /KavlingSelect/, 'Must integrate KavlingSelect');
    assert.match(content, /SpeciesCombobox/, 'Must integrate SpeciesCombobox');

    // Freeform customer with datalist (No master customer table required)
    assert.match(content, /list="customer-history-list"/, 'Must attach datalist attribute to customer input');
    assert.match(content, /<datalist id="customer-history-list"/, 'Must define datalist element for customer history');
    assert.match(content, /customerHistory\.map/, 'Must populate datalist from customerHistory');

    // Stock gauge & calculations
    assert.match(content, /calculateLotStockBalance/, 'Must calculate lot balance for selected yard and kavling');
    assert.match(content, /validateSalesStockAllowance/, 'Must validate stock allowance and prevent/warn overdraw');
    assert.match(content, /calculateSalesFinancials/, 'Must calculate sales financials');
    assert.match(content, /Sisa Stok:/, 'Must render remaining stock indicator badge');
  });

  await t.test('PrintDeliveryOrderModal renders bilingual header, 3-column signatures, and print styles', () => {
    const content = fs.readFileSync(printModalPath, 'utf-8');

    assert.match(content, /export function PrintDeliveryOrderModal/, 'Must export PrintDeliveryOrderModal component');
    assert.match(content, /role="dialog"/, 'Must specify role="dialog"');
    assert.match(content, /aria-modal="true"/, 'Must specify aria-modal="true"');

    // Bilingual title and company header
    assert.match(content, /TIMBERGUARD\s*\/\s*PT RIMBA MANDIRI/, 'Must include company header');
    assert.match(content, /SURAT JALAN\s*\/\s*PENGELUARAN KAYU/, 'Must include bilingual delivery order title');

    // Outbound metadata
    assert.match(content, /deliveryOrderNumber/, 'Must display deliveryOrderNumber');
    assert.match(content, /truckPlateNumber/, 'Must display truckPlateNumber');
    assert.match(content, /customerName/, 'Must display customerName');
    assert.match(content, /storageYard/, 'Must display storageYard');
    assert.match(content, /kavlingNumber/, 'Must display kavlingNumber');
    assert.match(content, /woodSpecies/, 'Must display woodSpecies');
    assert.match(content, /volumeM3/, 'Must display volumeM3');
    assert.match(content, /totalPrice/, 'Must display totalPrice');

    // 3-Column Signatures
    assert.match(content, /Penerima \(Pembeli\)/, 'Must include customer recipient signature block');
    assert.match(content, /Pengemudi\s*\/\s*司机/, 'Must include driver signature block');
    assert.match(content, /Petugas TPK\s*\/\s*发货人/, 'Must include log yard dispatcher signature block');

    // Print stylesheet
    assert.match(content, /@media print/, 'Must include media print rules');
    assert.match(content, /#printable-do/, 'Must scope print selector to delivery order container');
    assert.match(content, /window\.print\(\)/, 'Must provide print trigger');
  });
});
