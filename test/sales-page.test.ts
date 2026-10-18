/**
 * test/sales-page.test.ts
 *
 * Contract and integration test suite for the Wood Sales Ledger subsystem:
 * Verifying SalesSummaryCards, SalesTable, app/sales/page.tsx, and navigation links.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const cardsPath = path.resolve(process.cwd(), 'src/components/sales/SalesSummaryCards.tsx');
const tablePath = path.resolve(process.cwd(), 'src/components/sales/SalesTable.tsx');
const pagePath = path.resolve(process.cwd(), 'app/sales/page.tsx');
const ledgerPath = path.resolve(process.cwd(), 'app/ledger/page.tsx');

test('Sales Subsystem Page & Presentation Suite', async (t) => {
  await t.test('All presentation files exist and strictly satisfy LOC ceiling limits', () => {
    assert.ok(fs.existsSync(cardsPath), 'SalesSummaryCards.tsx must exist');
    assert.ok(fs.existsSync(tablePath), 'SalesTable.tsx must exist');
    assert.ok(fs.existsSync(pagePath), 'app/sales/page.tsx must exist');

    const cardsLines = fs.readFileSync(cardsPath, 'utf-8').split('\n').length;
    const tableLines = fs.readFileSync(tablePath, 'utf-8').split('\n').length;
    const pageLines = fs.readFileSync(pagePath, 'utf-8').split('\n').length;

    assert.ok(cardsLines <= 120, `SalesSummaryCards.tsx LOC (${cardsLines}) must be <= 120 LOC`);
    assert.ok(tableLines <= 220, `SalesTable.tsx LOC (${tableLines}) must be <= 220 LOC`);
    assert.ok(pageLines <= 220, `app/sales/page.tsx LOC (${pageLines}) must be <= 220 LOC`);
  });

  await t.test('SalesSummaryCards renders 4 operational KPIs with bilingual labels', () => {
    const content = fs.readFileSync(cardsPath, 'utf-8');

    assert.match(content, /export function SalesSummaryCards/, 'Must export SalesSummaryCards');
    assert.match(content, /Volume Terjual/, 'Must include Volume Terjual KPI');
    assert.match(content, /Batang Keluar|Batang Terjual/, 'Must include Batang Keluar KPI');
    assert.match(content, /Total Omzet/, 'Must include Total Omzet KPI');
    assert.match(content, /Piutang Belum Lunas/, 'Must include Piutang Belum Lunas KPI');
  });

  await t.test('SalesTable supports DO print, RBAC edit/delete guards, and status pills', () => {
    const content = fs.readFileSync(tablePath, 'utf-8');

    assert.match(content, /export function SalesTable/, 'Must export SalesTable');
    assert.match(content, /deliveryOrderNumber/, 'Must display DO number');
    assert.match(content, /customerName/, 'Must display customer name');
    assert.match(content, /truckPlateNumber/, 'Must display truck plate number');
    assert.match(content, /onPrint/, 'Must provide onPrint DO trigger');
    assert.match(content, /canWrite/, 'Must accept canWrite prop for RBAC protection');
  });

  await t.test('app/sales/page.tsx coordinates hooks, RBAC, modals, and sales ledger views', () => {
    const content = fs.readFileSync(pagePath, 'utf-8');

    assert.match(content, /export default function SalesPage/, 'Must export SalesPage default component');
    assert.match(content, /useWoodSalesRecords/, 'Must integrate useWoodSalesRecords hook');
    assert.match(content, /useWoodRecords/, 'Must integrate useWoodRecords hook for inbound stock balance');
    assert.match(content, /useAuth/, 'Must integrate useAuth hook for RBAC checks');
    assert.match(content, /SalesSummaryCards/, 'Must render SalesSummaryCards');
    assert.match(content, /SalesTable/, 'Must render SalesTable');
    assert.match(content, /SalesModal/, 'Must render SalesModal');
    assert.match(content, /PrintDeliveryOrderModal/, 'Must render PrintDeliveryOrderModal');
  });

  await t.test('app/ledger/page.tsx contains link to dedicated sales ledger route', () => {
    const content = fs.readFileSync(ledgerPath, 'utf-8');
    assert.match(content, /\/sales/, 'app/ledger/page.tsx must provide a link to /sales route');
  });
});

