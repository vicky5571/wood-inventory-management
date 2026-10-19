/**
 * test/record-modal-draft.test.ts
 *
 * Test suite verifying auto-draft persistence, serialization, meaningful data detection,
 * recovery banner contracts, draft hydration/clearing, and SSR / Node.js safety.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  DRAFT_KEY,
  hasMeaningfulDraftData,
  loadRecordDraft,
  saveRecordDraft,
  clearRecordDraft,
  type RecordDraftData,
} from '../src/utils/record-draft.ts';
import type { WoodReceivingRecord } from '../src/types/index.ts';

class MockLocalStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

test('Auto-Draft Persistence Test Suite for RecordModal', async (t) => {
  await t.test('DRAFT_KEY conforms to specification key name', () => {
    assert.strictEqual(DRAFT_KEY, 'wood_record_form_draft_v1');
  });

  await t.test('hasMeaningfulDraftData detects non-empty meaningful operator inputs', () => {
    // Empty or undefined inputs
    assert.strictEqual(hasMeaningfulDraftData(null), false);
    assert.strictEqual(hasMeaningfulDraftData(undefined), false);
    assert.strictEqual(hasMeaningfulDraftData({}), false);

    // Default empty record template without meaningful user entries
    assert.strictEqual(
      hasMeaningfulDraftData({
        kavlingNumber: 'KAV-01',
        storageYard: 'TPK-1',
        woodLengthM: 4.0,
        timberPphRate: 0.5,
        truckPlateNumber: '',
        forestryDocNumber: '',
        woodSpecies: '',
        tallyVolumeM3: 0,
        deliveredVolumeM3: 0,
      }),
      false
    );

    // Truck plate filled
    assert.strictEqual(hasMeaningfulDraftData({ truckPlateNumber: 'B 1234 CD' }), true);

    // Wood species filled
    assert.strictEqual(hasMeaningfulDraftData({ woodSpecies: 'Teak / Jati (柚木)' }), true);

    // Forestry doc filled
    assert.strictEqual(hasMeaningfulDraftData({ forestryDocNumber: 'SKSHHK-2026-99' }), true);

    // Supplier filled
    assert.strictEqual(hasMeaningfulDraftData({ supplierName: 'PT Rimba Lestari' }), true);

    // Tally volume filled
    assert.strictEqual(hasMeaningfulDraftData({ tallyVolumeM3: 14.85 }), true);

    // Tally pieces filled
    assert.strictEqual(hasMeaningfulDraftData({ tallyPieces: 25 }), true);

    // Timber price filled
    assert.strictEqual(hasMeaningfulDraftData({ timberPricePerM3: 4500000 }), true);
  });

  await t.test('saveRecordDraft serializes draft payload with timestamp to storage', () => {
    const mockStorage = new MockLocalStorage();
    const testDraft: Partial<WoodReceivingRecord> = {
      truckPlateNumber: 'DK 9876 AB',
      woodSpecies: 'Merbau (菠萝格)',
      tallyVolumeM3: 18.2,
      supplierName: 'CV Kayu Prima',
    };

    const saved = saveRecordDraft(testDraft, mockStorage);
    assert.strictEqual(saved, true);

    const raw = mockStorage.getItem(DRAFT_KEY);
    assert.ok(raw !== null, 'Item should be present in localStorage');

    const parsed = JSON.parse(raw!) as RecordDraftData;
    assert.ok(parsed.timestamp > 0);
    assert.strictEqual(parsed.draft.truckPlateNumber, 'DK 9876 AB');
    assert.strictEqual(parsed.draft.woodSpecies, 'Merbau (菠萝格)');
    assert.strictEqual(parsed.draft.tallyVolumeM3, 18.2);
  });

  await t.test('saveRecordDraft rejects saving when form has no meaningful data', () => {
    const mockStorage = new MockLocalStorage();
    const emptyDraft: Partial<WoodReceivingRecord> = {
      truckPlateNumber: '',
      woodSpecies: '',
      forestryDocNumber: '',
      tallyVolumeM3: 0,
    };

    const saved = saveRecordDraft(emptyDraft, mockStorage);
    assert.strictEqual(saved, false);
    assert.strictEqual(mockStorage.getItem(DRAFT_KEY), null);
  });

  await t.test('loadRecordDraft retrieves and parses valid persisted draft', () => {
    const mockStorage = new MockLocalStorage();
    const testDraft: Partial<WoodReceivingRecord> = {
      truckPlateNumber: 'L 5555 XY',
      forestryDocNumber: 'DKP-2026-001',
      woodSpecies: 'Kamper (樟木)',
      tallyPieces: 12,
      tallyVolumeM3: 8.5,
    };

    saveRecordDraft(testDraft, mockStorage);

    const loaded = loadRecordDraft(mockStorage);
    assert.ok(loaded !== null);
    assert.strictEqual(loaded?.truckPlateNumber, 'L 5555 XY');
    assert.strictEqual(loaded?.forestryDocNumber, 'DKP-2026-001');
    assert.strictEqual(loaded?.woodSpecies, 'Kamper (樟木)');
    assert.strictEqual(loaded?.tallyVolumeM3, 8.5);
  });

  await t.test('loadRecordDraft handles corrupt JSON or invalid payloads gracefully', () => {
    const mockStorage = new MockLocalStorage();
    mockStorage.setItem(DRAFT_KEY, 'invalid-json{{{');
    assert.strictEqual(loadRecordDraft(mockStorage), null);

    mockStorage.setItem(DRAFT_KEY, JSON.stringify({ draft: { tallyVolumeM3: 0 } }));
    assert.strictEqual(loadRecordDraft(mockStorage), null);
  });

  await t.test('clearRecordDraft removes draft entry from storage', () => {
    const mockStorage = new MockLocalStorage();
    saveRecordDraft({ truckPlateNumber: 'B 7777 W' }, mockStorage);
    assert.ok(mockStorage.getItem(DRAFT_KEY) !== null);

    clearRecordDraft(mockStorage);
    assert.strictEqual(mockStorage.getItem(DRAFT_KEY), null);
  });

  await t.test('graceful fallback in SSR / Node environment without global window', () => {
    // When called without storage arg in Node environment where window is undefined
    assert.strictEqual(typeof window, 'undefined');
    assert.strictEqual(loadRecordDraft(), null);
    assert.strictEqual(saveRecordDraft({ truckPlateNumber: 'B 1234 CD' }), false);
    assert.doesNotThrow(() => clearRecordDraft());
  });

  await t.test('DraftRecoveryBanner UI component contains required bilingual recovery text and buttons', () => {
    const bannerFile = path.resolve(process.cwd(), 'src/components/ledger/DraftRecoveryBanner.tsx');
    assert.ok(fs.existsSync(bannerFile), 'DraftRecoveryBanner.tsx must exist');

    const content = fs.readFileSync(bannerFile, 'utf-8');
    assert.match(content, /Draf Belum Tersimpan Ditemukan \(发现未保存草稿\): Lanjutkan pengisian terakhir\?/);
    assert.match(content, /Pulihkan Draf \(恢复\)/);
    assert.match(content, /Buang Draf \(放弃\)/);
    assert.match(content, /onRestore/);
    assert.match(content, /onDiscard/);
  });

  await t.test('RecordModal.tsx integrates draft auto-save, recovery banner, and cleanup on submit', () => {
    const modalFile = path.resolve(process.cwd(), 'src/components/ledger/RecordModal.tsx');
    assert.ok(fs.existsSync(modalFile), 'RecordModal.tsx must exist');

    const content = fs.readFileSync(modalFile, 'utf-8');
    assert.match(content, /wood_record_form_draft_v1/);
    assert.match(content, /DRAFT_KEY/);
    assert.match(content, /DraftRecoveryBanner/);
    assert.match(content, /localStorage\.removeItem\(DRAFT_KEY\)|clearRecordDraft/);
  });

  await t.test('RecordModal.tsx incorporates dev quick fill button', () => {
    const modalFile = path.resolve(process.cwd(), 'src/components/ledger/RecordModal.tsx');
    assert.ok(fs.existsSync(modalFile), 'RecordModal.tsx must exist');

    const content = fs.readFileSync(modalFile, 'utf-8');
    assert.match(content, /getQuickReceivingDraft/, 'RecordModal must import getQuickReceivingDraft');
    assert.match(content, /Isi Cepat|Dev Fill/, 'RecordModal must render Dev Quick Fill button');
  });

  await t.test('RecordModal.tsx satisfies Rules of Hooks (no hooks called after early return)', () => {
    const modalFile = path.resolve(process.cwd(), 'src/components/ledger/RecordModal.tsx');
    const content = fs.readFileSync(modalFile, 'utf-8');
    const earlyReturnIdx = content.indexOf('if (!isOpen) return null;');
    assert.ok(earlyReturnIdx !== -1, 'Early return guard must exist');

    const afterEarlyReturn = content.slice(earlyReturnIdx);
    assert.doesNotMatch(afterEarlyReturn, /\buse(Callback|Memo|State|Effect|DeferredValue)\s*\(/, 'No React hooks must be invoked after if (!isOpen) return null');
  });
});
