import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { openRecordModal } from '../src/components/record-modal.ts';
import { toastStore } from '../src/utils/toast-store.ts';
import type { WoodReceivingRecord } from '../src/types/index.ts';
import { MockFormData } from './helpers/mock-dom.ts';

// Lightweight mock element for modal DOM tests
class MockElement {
  public id: string;
  private _html: string = '';
  public eventListeners: Record<string, ((e?: any) => void)[]> = {};
  public _fields: Record<string, string> = {};
  public _form?: MockElement;
  public _summary?: MockElement;
  public _btnCancel?: MockElement;

  constructor(id: string = '') {
    this.id = id;
  }

  get innerHTML(): string {
    return this._html;
  }

  set innerHTML(val: string) {
    this._html = val;
    if (val) {
      this._form = new MockElement('record-form');
      this._summary = new MockElement('live-calculation-summary');
      this._btnCancel = new MockElement('btn-modal-cancel');
    } else {
      this._form = undefined;
      this._summary = undefined;
      this._btnCancel = undefined;
    }
  }

  addEventListener(event: string, callback: (e?: any) => void) {
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(callback);
  }

  dispatchEvent(event: string, eventData: any = {}) {
    for (const h of this.eventListeners[event] || []) h(eventData);
  }

  querySelector(selector: string): any {
    if (selector === '#record-form') return this._form;
    if (selector === '#live-calculation-summary') return this._summary;
    if (selector === '#btn-modal-cancel') return this._btnCancel;
    return null;
  }
}

test('Interactive Add/Edit Modal (openRecordModal) Test Suite', async (t) => {
  const originalFormData = globalThis.FormData;
  // @ts-ignore
  globalThis.FormData = MockFormData;

  t.after(() => {
    globalThis.FormData = originalFormData;
  });

  const sampleRecord: WoodReceivingRecord = {
    id: 'rec-test-001',
    receiptDate: '2026-10-14',
    truckPlateNumber: 'B 9999 XYZ',
    forestryDocNumber: 'SKSHHK-2026-TEST',
    receiptNumber: 'KW-8888',
    contractNumber: 'CTR-TEST-01',
    supplierName: 'PT Kayu Bersama',
    woodSpecies: 'Teak / Jati (柚木)',
    woodLengthM: 4.5,
    kavlingNumber: 'KAV-99',
    storageYard: 'TPK-2',
    deliveredPieces: 20,
    deliveredVolumeM3: 15.0,
    tallyPieces: 22,
    tallyVolumeM3: 16.5,
    timberPricePerM3: 5000000,
    timberGrossTotal: 82500000,
    timberPphRate: 0.5,
    timberPphAmount: 412500,
    timberNetPayable: 82087500,
    freightRatePerM3: 300000,
    freightGrossTotal: 4950000,
    freightPphAmount: 99000,
    freightNetPayable: 4851000,
    brokerFee: 500000,
    grandNetPayable: 87438500,
    createdAt: '2026-10-14T10:00:00.000Z',
    updatedAt: '2026-10-14T10:00:00.000Z',
  };

  await t.test('renders modal in Add mode when initialRecord is null', () => {
    const container = new MockElement('container');
    openRecordModal(container as any, null, () => {});

    assert.ok(container.innerHTML.includes('Input Penerimaan Kayu Baru (新增木材入库)'));
    assert.ok(container.innerHTML.includes('KAV-01'));
    assert.ok(container.innerHTML.includes('TPK-1'));
  });

  await t.test('renders modal in Edit mode with escaped existing record values', () => {
    const container = new MockElement('container');
    openRecordModal(container as any, sampleRecord, () => {});

    assert.ok(container.innerHTML.includes('Edit Penerimaan Kayu (编辑入库)'));
    assert.ok(container.innerHTML.includes('B 9999 XYZ'));
    assert.ok(container.innerHTML.includes('SKSHHK-2026-TEST'));
    assert.ok(container.innerHTML.includes('PT Kayu Bersama'));
    assert.ok(container.innerHTML.includes('KAV-99'));
    assert.ok(container.innerHTML.includes('TPK-2'));
  });

  await t.test('escapes HTML special characters to prevent XSS injection', () => {
    const unsafeRecord: WoodReceivingRecord = {
      ...sampleRecord,
      supplierName: '<script>alert("xss")</script>',
      truckPlateNumber: 'B 1234 " autofocus="true',
    };
    const container = new MockElement('container');
    openRecordModal(container as any, unsafeRecord, () => {});

    assert.ok(container.innerHTML.includes('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'));
    assert.ok(container.innerHTML.includes('B 1234 &quot; autofocus=&quot;true'));
    assert.ok(!container.innerHTML.includes('<script>alert("xss")</script>'));
  });

  await t.test('cancel button clears container innerHTML', () => {
    const container = new MockElement('container');
    openRecordModal(container as any, null, () => {});

    assert.ok(container.innerHTML.length > 0);
    container._btnCancel!.dispatchEvent('click');
    assert.strictEqual(container.innerHTML, '');
  });

  await t.test('live preview dynamically updates calculations on input event', () => {
    const container = new MockElement('container');
    openRecordModal(container as any, null, () => {});

    container._form!._fields = {
      tallyVolumeM3: '10.0',
      deliveredVolumeM3: '9.5',
      tallyPieces: '20',
      deliveredPieces: '20',
      timberPricePerM3: '4000000',
      timberPphRate: '0.5',
      freightRatePerM3: '200000',
      freightPphAmount: '40000',
      brokerFee: '100000',
    };

    container._form!.dispatchEvent('input');

    assert.ok(container._summary!.innerHTML.includes('Selisih Vol: <strong>+0.50 m³</strong>'));
    assert.ok(container._summary!.innerHTML.includes('Net Kayu: <strong>Rp'));
    assert.ok(container._summary!.innerHTML.includes('Total Yang Harus Dibayar:'));
  });

  await t.test('form submit computes and triggers onSave with full WoodReceivingRecord', () => {
    const container = new MockElement('container');
    let savedRecord: WoodReceivingRecord | null = null;

    openRecordModal(container as any, null, (record: WoodReceivingRecord) => {
      savedRecord = record;
    });

    container._form!._fields = {
      receiptDate: '2026-10-15',
      truckPlateNumber: 'DK 1234 AB',
      forestryDocNumber: 'DKP-2026-99',
      contractNumber: 'CTR-999',
      supplierName: 'UD Rimba Mas',
      woodSpecies: 'Merbau',
      woodLengthM: '4.0',
      kavlingNumber: 'KAV-02',
      storageYard: 'TPK-1',
      deliveredPieces: '15',
      deliveredVolumeM3: '10.0',
      tallyPieces: '15',
      tallyVolumeM3: '10.0',
      timberPricePerM3: '6000000',
      timberPphRate: '0.5',
      freightRatePerM3: '500000',
      freightPphAmount: '100000',
      brokerFee: '250000',
    };

    let prevented = false;
    container._form!.dispatchEvent('submit', {
      preventDefault: () => {
        prevented = true;
      },
    });

    assert.ok(prevented, 'Form submit should call preventDefault');
    assert.ok(savedRecord !== null, 'onSave should have been called');
    assert.strictEqual((savedRecord as any).supplierName, 'UD Rimba Mas');
    assert.strictEqual((savedRecord as any).woodSpecies, 'Merbau');
    assert.strictEqual((savedRecord as any).timberGrossTotal, 60000000);
    assert.strictEqual((savedRecord as any).timberPphAmount, 300000);
    assert.strictEqual((savedRecord as any).timberNetPayable, 59700000);
    assert.strictEqual((savedRecord as any).freightGrossTotal, 5000000);
    assert.strictEqual((savedRecord as any).freightNetPayable, 4900000);
    assert.strictEqual((savedRecord as any).grandNetPayable, 64850000);
    assert.strictEqual(container.innerHTML, '', 'Modal container should be cleared after submit');

    const toasts = toastStore.getToasts();
    assert.ok(toasts.length > 0, 'Toast notification should be triggered upon save');
    assert.strictEqual(toasts[0].type, 'success');
    assert.ok(toasts[0].title.includes('Berhasil Disimpan'));
    assert.ok(toasts[0].description?.includes('Truk DK 1234 AB'));
  });
});

test('RecordModal Multi-Item Integration Suite', async (t) => {
  const modalPath = path.join(process.cwd(), 'src/components/ledger/RecordModal.tsx');
  const cardPath = path.join(process.cwd(), 'src/components/ledger/RecordReconciliationCard.tsx');
  const content = fs.readFileSync(modalPath, 'utf-8');
  const cardContent = fs.readFileSync(cardPath, 'utf-8');

  await t.test('RecordModal integrates ManifestItemsTable and multi-item calculation', () => {
    assert.match(content, /ManifestItemsTable/);
    assert.match(content, /computeManifestCalculations/);
  });

  await t.test('RecordModal adheres strictly to <250 LOC rule', () => {
    const lines = content.split('\n').length;
    assert.ok(lines <= 250, `RecordModal.tsx must remain under 250 lines (currently ${lines})`);
  });

  await t.test('RecordModal integrates multi-item draft persistence functions', () => {
    assert.match(content, /loadManifestDraft/);
    assert.match(content, /saveManifestDraft/);
    assert.match(content, /clearManifestDraft/);
  });

  await t.test('RecordReconciliationCard supports ManifestCalculationOutput', () => {
    assert.match(cardContent, /ManifestCalculationOutput/);
  });
});

