// test/manifest-draft.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MANIFEST_DRAFT_KEY,
  hasMeaningfulManifestDraft,
  saveManifestDraft,
  loadManifestDraft,
  clearManifestDraft,
} from '../src/utils/record-draft.ts';
import type { ManifestFormInput } from '../src/types/index.ts';

test('Manifest Draft Persistence Suite', async (t) => {
  const globalMockStorage = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => globalMockStorage.get(key) || null,
    setItem: (key: string, val: string) => globalMockStorage.set(key, val),
    removeItem: (key: string) => globalMockStorage.delete(key),
  };

  t.after(() => {
    delete (globalThis as any).localStorage;
  });

  await t.test('conforms to MANIFEST_DRAFT_KEY constant specification', () => {
    assert.strictEqual(MANIFEST_DRAFT_KEY, 'wood_manifest_form_draft_v1');
  });

  await t.test('detects meaningful draft with multiple items', () => {
    assert.strictEqual(hasMeaningfulManifestDraft({}), false);
    assert.strictEqual(hasMeaningfulManifestDraft(null), false);
    assert.strictEqual(hasMeaningfulManifestDraft(undefined), false);
    assert.strictEqual(hasMeaningfulManifestDraft({ truckPlateNumber: 'B 1234' }), true);
    assert.strictEqual(hasMeaningfulManifestDraft({ forestryDocNumber: 'SKSHHK-01' }), true);
    assert.strictEqual(hasMeaningfulManifestDraft({ freightRatePerM3: 150000 }), true);
    assert.strictEqual(
      hasMeaningfulManifestDraft({
        items: [{ woodSpecies: 'Teak' } as any],
      }),
      true
    );
    assert.strictEqual(
      hasMeaningfulManifestDraft({
        items: [{ tallyVolumeM3: 4.5 } as any],
      }),
      true
    );
    assert.strictEqual(
      hasMeaningfulManifestDraft({
        items: [{ tallyPieces: 20 } as any],
      }),
      true
    );
    assert.strictEqual(
      hasMeaningfulManifestDraft({
        items: [{ timberPricePerM3: 2500000 } as any],
      }),
      true
    );
    assert.strictEqual(
      hasMeaningfulManifestDraft({
        items: [{ woodSpecies: '', tallyVolumeM3: 0 } as any],
      }),
      false
    );
  });

  await t.test('saves, restores, and clears multi-item drafts cleanly', () => {
    const draft: Partial<ManifestFormInput> = {
      truckPlateNumber: 'B 9999 XYZ',
      supplierName: 'PT Rimba',
      items: [
        {
          id: 'item-1',
          woodSpecies: 'Teak / Jati (柚木)',
          woodLengthM: 4.0,
          kavlingNumber: 'KAV-01',
          storageYard: 'TPK-1',
          deliveredPieces: 10,
          deliveredVolumeM3: 2.0,
          tallyPieces: 10,
          tallyVolumeM3: 2.0,
          timberPricePerM3: 3000000,
          timberPphRate: 0.5,
        },
      ],
    };

    saveManifestDraft(draft);
    const restored = loadManifestDraft();
    assert.ok(restored);
    assert.strictEqual(restored.truckPlateNumber, 'B 9999 XYZ');
    assert.strictEqual(restored.items?.length, 1);
    assert.strictEqual(restored.items[0].woodSpecies, 'Teak / Jati (柚木)');

    clearManifestDraft();
    assert.strictEqual(loadManifestDraft(), null);
  });

  await t.test('does not save draft when form has no meaningful data', () => {
    clearManifestDraft();
    saveManifestDraft({});
    assert.strictEqual(loadManifestDraft(), null);
    assert.strictEqual(globalMockStorage.get(MANIFEST_DRAFT_KEY) || null, null);
  });

  await t.test('handles corrupt JSON or invalid payloads gracefully', () => {
    globalMockStorage.set(MANIFEST_DRAFT_KEY, '{invalid-json');
    assert.strictEqual(loadManifestDraft(), null);

    globalMockStorage.set(
      MANIFEST_DRAFT_KEY,
      JSON.stringify({ draft: { truckPlateNumber: '' } })
    );
    assert.strictEqual(loadManifestDraft(), null);
  });

  await t.test('graceful fallback when storage is unavailable', () => {
    const nullStorage = {
      getItem: () => {
        throw new Error('Storage access denied');
      },
      setItem: () => {
        throw new Error('Storage access denied');
      },
      removeItem: () => {
        throw new Error('Storage access denied');
      },
      clear: () => {},
      key: () => null,
      length: 0,
    };

    assert.strictEqual(loadManifestDraft(nullStorage), null);
    assert.doesNotThrow(() =>
      saveManifestDraft({ truckPlateNumber: 'B 1234' }, nullStorage)
    );
    assert.doesNotThrow(() => clearManifestDraft(nullStorage));
  });
});
