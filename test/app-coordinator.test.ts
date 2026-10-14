import test from 'node:test';
import assert from 'node:assert/strict';
import { AppCoordinator } from '../src/app.js';
import { MemoryStorageAdapter } from '../src/persistence/storage.ts';
import { WoodRecordRepository } from '../src/persistence/record-repository.ts';
import { SEED_WOOD_RECORDS } from '../src/persistence/seed-data.ts';
import type { WoodReceivingRecord } from '../src/types/index.ts';
import { MockDOMElement, MockDOMDocument, MockFormData } from './helpers/mock-dom.ts';

test('AppCoordinator Application Coordinator & E2E Integration Suite', async (t) => {
  const origDoc = globalThis.document;
  const origConfirm = globalThis.confirm;
  const origBlob = globalThis.Blob;
  const origURL = globalThis.URL;
  const origFormData = globalThis.FormData;

  const mockDoc = new MockDOMDocument();
  // @ts-ignore
  globalThis.document = mockDoc;
  // @ts-ignore
  globalThis.confirm = () => true;
  // @ts-ignore
  globalThis.FormData = MockFormData;

  t.after(() => {
    globalThis.document = origDoc;
    globalThis.confirm = origConfirm;
    globalThis.Blob = origBlob;
    globalThis.URL = origURL;
    globalThis.FormData = origFormData;
  });

  await t.test('initializes and renders KPI dashboard, species bar, toolbar, and record table', async () => {
    const storage = new MemoryStorageAdapter();
    const repo = new WoodRecordRepository(storage);
    const coordinator = new AppCoordinator(repo);

    await coordinator.init();

    const kpiSection = mockDoc.getElementById('kpi-section')!;
    const speciesSection = mockDoc.getElementById('species-chart-section')!;
    const toolbarSection = mockDoc.getElementById('toolbar-section')!;
    const tableSection = mockDoc.getElementById('table-section')!;

    assert.ok(kpiSection.innerHTML.includes('Total Volume Tally (检尺立方)'));
    assert.ok(kpiSection.innerHTML.includes('Total Pengeluaran (总应付金额)'));
    assert.ok(kpiSection.innerHTML.includes('Kavling Aktif'));
    assert.ok(speciesSection.innerHTML.includes('DISTRIBUSI SPESIES KAYU'));
    assert.ok(toolbarSection.innerHTML.includes('Semua Spesies (所有材种)'));
    assert.ok(toolbarSection.innerHTML.includes('Export CSV'));
    assert.ok(tableSection.innerHTML.includes('SKSHHK-2026-001'));
    assert.ok(tableSection.innerHTML.includes('Teak / Jati (柚木)'));
  });

  await t.test('filter change triggers refreshTableAndMetrics without destroying toolbar DOM', async () => {
    const storage = new MemoryStorageAdapter();
    const repo = new WoodRecordRepository(storage);
    const coordinator = new AppCoordinator(repo);

    await coordinator.init();

    const toolbarSection = mockDoc.getElementById('toolbar-section')!;
    const tableSection = mockDoc.getElementById('table-section')!;
    const initialToolbarHtml = toolbarSection.innerHTML;

    // Trigger filter through search input
    const searchInput = toolbarSection.querySelector('#filter-search');
    assert.ok(searchInput, 'Search input should exist in toolbar');
    searchInput.value = 'SKSHHK-2026-001';
    searchInput.dispatchEvent('input');

    // Yield macro/microtasks for async filter handling
    await new Promise((r) => setTimeout(r, 10));

    // Table should now be filtered
    assert.ok(tableSection.innerHTML.includes('SKSHHK-2026-001'));
    // Toolbar HTML should not have been wiped or re-rendered
    assert.strictEqual(toolbarSection.innerHTML, initialToolbarHtml);
  });

  await t.test('refresh updates table and KPI after repository mutations', async () => {
    const storage = new MemoryStorageAdapter();
    const repo = new WoodRecordRepository(storage);
    const coordinator = new AppCoordinator(repo);

    await coordinator.init();

    const customRecord: WoodReceivingRecord = {
      ...SEED_WOOD_RECORDS[0],
      id: 'custom-e2e-1',
      truckPlateNumber: 'B 1111 E2E',
      forestryDocNumber: 'DOC-E2E-UNIQUE',
      woodSpecies: 'Mahoni E2E',
    };
    await repo.save(customRecord);

    await coordinator.refresh();

    const tableSection = mockDoc.getElementById('table-section')!;
    assert.ok(tableSection.innerHTML.includes('DOC-E2E-UNIQUE'));
    assert.ok(tableSection.innerHTML.includes('Mahoni E2E'));
  });

  await t.test('exportCsv sanitizes RFC 4180 quotes and cleans up object URL', async () => {
    const storage = new MemoryStorageAdapter();
    const repo = new WoodRecordRepository(storage);
    const coordinator = new AppCoordinator(repo);

    let downloadedContent: string = '';
    let revokedUrl: string = '';

    // @ts-ignore
    globalThis.Blob = class {
      public content: string;
      constructor(parts: any[]) {
        this.content = parts.join('');
      }
    };
    // @ts-ignore
    globalThis.URL = {
      createObjectURL: (blob: any) => {
        downloadedContent = blob.content;
        return 'blob:mock-url-123';
      },
      revokeObjectURL: (url: string) => {
        revokedUrl = url;
      },
    };

    const link = mockDoc.createElement('a');
    mockDoc.createElement = (tag: string) => {
      if (tag.toLowerCase() === 'a') return link;
      return new MockDOMElement('', tag.toUpperCase());
    };

    const recordsWithQuotes: WoodReceivingRecord[] = [
      {
        ...SEED_WOOD_RECORDS[0],
        supplierName: 'PT "Kayu" Sejahtera',
      },
    ];

    coordinator.exportCsv(recordsWithQuotes);

    // RFC 4180: quotes escaped as ""
    assert.ok(downloadedContent.includes('"PT ""Kayu"" Sejahtera"'));

    // Wait for setTimeout cleanup of object URL
    await new Promise((r) => setTimeout(r, 150));
    assert.strictEqual(revokedUrl, 'blob:mock-url-123');
  });

  await t.test('handles new entry button click to open modal', async () => {
    const storage = new MemoryStorageAdapter();
    const repo = new WoodRecordRepository(storage);
    const coordinator = new AppCoordinator(repo);

    await coordinator.init();

    const btnNewEntry = mockDoc.getElementById('btn-new-entry')!;
    const modalContainer = mockDoc.getElementById('modal-container')!;

    btnNewEntry.click();

    assert.ok(modalContainer.innerHTML.includes('Input Penerimaan Kayu Baru (新增木材入库)'));
  });
});
