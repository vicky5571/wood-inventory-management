import test from 'node:test';
import assert from 'node:assert/strict';
import { AppCoordinator } from '../src/app.ts';
import { MemoryStorageAdapter } from '../src/persistence/storage.ts';
import { WoodRecordRepository } from '../src/persistence/record-repository.ts';
import { SEED_WOOD_RECORDS } from '../src/persistence/seed-data.ts';
import type { WoodReceivingRecord } from '../src/types/index.ts';

// Comprehensive mock element for testing coordinator and DOM wiring in Node.js
class MockDOMElement {
  public id: string;
  public tagName: string;
  private _html: string = '';
  public eventListeners: Record<string, ((e?: any) => void)[]> = {};
  public attributes: Record<string, string> = {};
  public value: string = '';
  public children: MockDOMElement[] = [];
  public _fields: Record<string, string> = {};

  get innerHTML(): string {
    return this._html;
  }

  set innerHTML(val: string) {
    this._html = val;
    this.children = [];
    const idRegex = /<([a-zA-Z0-9]+)[^>]*id="([^"]+)"[^>]*>/g;
    let match;
    while ((match = idRegex.exec(val)) !== null) {
      const child = new MockDOMElement(match[2], match[1].toUpperCase());
      this.children.push(child);
    }
  }

  constructor(id: string = '', tagName: string = 'DIV') {
    this.id = id;
    this.tagName = tagName;
  }

  addEventListener(event: string, callback: (e?: any) => void) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  dispatchEvent(event: string, eventData: any = {}) {
    const handlers = this.eventListeners[event] || [];
    for (const h of handlers) {
      h(eventData);
    }
  }

  setAttribute(name: string, val: string) {
    this.attributes[name] = val;
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }

  click() {
    this.dispatchEvent('click');
  }

  appendChild(child: any) {
    this.children.push(child);
  }

  removeChild(child: any) {
    this.children = this.children.filter((c) => c !== child);
  }

  querySelector(selector: string): any {
    const results = this.querySelectorAll(selector);
    return results.length > 0 ? results[0] : null;
  }

  querySelectorAll(selector: string): any[] {
    const found: MockDOMElement[] = [];

    if (selector.startsWith('#')) {
      const targetId = selector.slice(1);
      if (this.id === targetId) return [this];
      const match = this.children.find((c) => c.id === targetId);
      if (match) return [match];
    } else if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      // check if html contains class and extract data-id if button
      const regex = new RegExp(`class="[^"]*${cls}[^"]*"[^>]*data-id="([^"]+)"`, 'g');
      let match;
      while ((match = regex.exec(this._html)) !== null) {
        const el = new MockDOMElement('', 'BUTTON');
        el.setAttribute('data-id', match[1]);
        found.push(el);
      }
    }
    return found;
  }
}

class MockDOMDocument {
  private elements = new Map<string, MockDOMElement>();
  public body = new MockDOMElement('body', 'BODY');

  constructor() {
    this.register('kpi-section');
    this.register('species-chart-section');
    this.register('toolbar-section');
    this.register('table-section');
    this.register('modal-container');
    this.register('btn-new-entry', 'BUTTON');
  }

  register(id: string, tagName: string = 'DIV'): MockDOMElement {
    const el = new MockDOMElement(id, tagName);
    this.elements.set(id, el);
    return el;
  }

  getElementById(id: string): MockDOMElement | null {
    return this.elements.get(id) || null;
  }

  createElement(tag: string): MockDOMElement {
    return new MockDOMElement('', tag.toUpperCase());
  }

  addEventListener(_event: string, _callback: any) {}
}

class MockFormData {
  private map = new Map<string, string>();
  constructor(form?: any) {
    if (form && form._fields) {
      for (const [k, v] of Object.entries(form._fields)) {
        this.map.set(k, String(v));
      }
    }
  }
  get(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  set(key: string, value: string) {
    this.map.set(key, value);
  }
}

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

    // Assert KPI metrics rendered
    assert.ok(kpiSection.innerHTML.includes('Total Volume Tally (检尺立方)'));
    assert.ok(kpiSection.innerHTML.includes('Total Pengeluaran (总应付金额)'));
    assert.ok(kpiSection.innerHTML.includes('Kavling Aktif'));

    // Assert species bar rendered
    assert.ok(speciesSection.innerHTML.includes('DISTRIBUSI SPESIES KAYU'));

    // Assert toolbar rendered
    assert.ok(toolbarSection.innerHTML.includes('Semua Spesies (所有材种)'));
    assert.ok(toolbarSection.innerHTML.includes('Export CSV'));

    // Assert data table rendered with seed data
    assert.ok(tableSection.innerHTML.includes('SKSHHK-2026-001'));
    assert.ok(tableSection.innerHTML.includes('Teak / Jati (柚木)'));
  });

  await t.test('refresh updates table and KPI after repository mutations', async () => {
    const storage = new MemoryStorageAdapter();
    const repo = new WoodRecordRepository(storage);
    const coordinator = new AppCoordinator(repo);

    await coordinator.init();

    // Add a custom record directly to repo
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

  await t.test('exportCsv builds valid CSV formatted records without error', () => {
    const storage = new MemoryStorageAdapter();
    const repo = new WoodRecordRepository(storage);
    const coordinator = new AppCoordinator(repo);

    let downloadedContent: string = '';

    // Mock Blob and URL
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
        return 'blob:mock-url';
      },
      revokeObjectURL: () => {},
    };

    const link = mockDoc.createElement('a');
    mockDoc.createElement = (tag: string) => {
      if (tag.toLowerCase() === 'a') return link;
      return new MockDOMElement('', tag.toUpperCase());
    };

    coordinator.exportCsv(SEED_WOOD_RECORDS);

    assert.ok(downloadedContent.includes('Penerimaan (到货日期),No. Polisi (车牌号)'));
    assert.ok(downloadedContent.includes('SKSHHK-2026-001'));
    assert.ok(downloadedContent.includes('Teak / Jati (柚木)'));
  });

  await t.test('handles new entry button click to open modal', async () => {
    const storage = new MemoryStorageAdapter();
    const repo = new WoodRecordRepository(storage);
    const coordinator = new AppCoordinator(repo);

    await coordinator.init();

    const btnNewEntry = mockDoc.getElementById('btn-new-entry')!;
    const modalContainer = mockDoc.getElementById('modal-container')!;

    // Clicking New Entry button should trigger openRecordModal
    btnNewEntry.click();

    assert.ok(modalContainer.innerHTML.includes('Input Penerimaan Kayu Baru (新增木材入库)'));
  });
});
