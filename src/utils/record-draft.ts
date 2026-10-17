/**
 * src/utils/record-draft.ts
 *
 * Auto-draft persistence layer for timber receiving record forms
 * and multi-item truck delivery manifests.
 * Manages debounced saving, serialization, meaningful data detection,
 * and safe retrieval/clearing with resilient SSR / offline fallback.
 */

import type { ManifestFormInput, WoodReceivingRecord } from '../types/index.ts';

export const DRAFT_KEY = 'wood_record_form_draft_v1';
export const MANIFEST_DRAFT_KEY = 'wood_manifest_form_draft_v1';

export interface RecordDraftData {
  draft: Partial<WoodReceivingRecord>;
  timestamp: number;
}

export interface ManifestDraftData {
  draft: Partial<ManifestFormInput>;
  timestamp: number;
}

/**
 * Resolves the active storage target with safe SSR and mock runtime fallback.
 */
function getStorage(storage?: Storage): Storage | undefined {
  if (storage) return storage;
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  try {
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      return (globalThis as any).localStorage;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/**
 * Checks if the single-item form has meaningful operator inputs beyond empty/default values.
 */
export function hasMeaningfulDraftData(
  draft: Partial<WoodReceivingRecord> | null | undefined
): boolean {
  if (!draft || typeof draft !== 'object') return false;

  const hasText = (val: unknown): boolean =>
    typeof val === 'string' && val.trim().length > 0;

  const hasPositiveNumber = (val: unknown): boolean =>
    typeof val === 'number' && !Number.isNaN(val) && val > 0;

  return Boolean(
    hasText(draft.truckPlateNumber) ||
    hasText(draft.woodSpecies) ||
    hasText(draft.forestryDocNumber) ||
    hasText(draft.contractNumber) ||
    hasText(draft.supplierName) ||
    hasPositiveNumber(draft.tallyVolumeM3) ||
    hasPositiveNumber(draft.deliveredVolumeM3) ||
    hasPositiveNumber(draft.tallyPieces) ||
    hasPositiveNumber(draft.deliveredPieces) ||
    hasPositiveNumber(draft.timberPricePerM3) ||
    hasPositiveNumber(draft.freightRatePerM3) ||
    hasPositiveNumber(draft.freightPphAmount) ||
    hasPositiveNumber(draft.brokerFee)
  );
}

/**
 * Safely loads the persisted single-item record draft from storage.
 */
export function loadRecordDraft(storage?: Storage): Partial<WoodReceivingRecord> | null {
  try {
    const store = getStorage(storage);
    if (!store) return null;

    const raw = store.getItem(DRAFT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const draft =
      parsed && typeof parsed === 'object' && 'draft' in parsed
        ? (parsed as RecordDraftData).draft
        : (parsed as Partial<WoodReceivingRecord>);

    if (draft && typeof draft === 'object' && hasMeaningfulDraftData(draft)) {
      return draft;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Safely saves the active single-item record draft to storage.
 */
export function saveRecordDraft(
  data: Partial<WoodReceivingRecord>,
  storage?: Storage
): boolean {
  try {
    const store = getStorage(storage);
    if (!store) return false;

    if (!hasMeaningfulDraftData(data)) return false;

    const payload: RecordDraftData = {
      draft: data,
      timestamp: Date.now(),
    };

    store.setItem(DRAFT_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely clears the active single-item record draft from storage.
 */
export function clearRecordDraft(storage?: Storage): void {
  try {
    const store = getStorage(storage);
    if (!store) return;
    store.removeItem(DRAFT_KEY);
  } catch {
    // Graceful fallback
  }
}

/**
 * Checks if the multi-item manifest form has meaningful operator inputs beyond empty/default values.
 */
export function hasMeaningfulManifestDraft(
  draft: Partial<ManifestFormInput> | null | undefined
): boolean {
  if (!draft || typeof draft !== 'object') return false;

  const hasText = (val: unknown): boolean =>
    typeof val === 'string' && val.trim().length > 0;

  const hasPositiveNumber = (val: unknown): boolean =>
    typeof val === 'number' && !Number.isNaN(val) && val > 0;

  const hasMeaningfulHeader = Boolean(
    hasText(draft.truckPlateNumber) ||
    hasText(draft.forestryDocNumber) ||
    hasText(draft.receiptNumber) ||
    hasText(draft.contractNumber) ||
    hasText(draft.supplierName) ||
    hasPositiveNumber(draft.freightRatePerM3) ||
    hasPositiveNumber(draft.freightPphAmount) ||
    hasPositiveNumber(draft.brokerFee) ||
    hasText(draft.invoiceNumber) ||
    hasText(draft.paymentNotes)
  );

  if (hasMeaningfulHeader) return true;

  if (Array.isArray(draft.items) && draft.items.length > 0) {
    return draft.items.some((item) => {
      if (!item || typeof item !== 'object') return false;
      return (
        hasText(item.woodSpecies) ||
        hasPositiveNumber(item.deliveredPieces) ||
        hasPositiveNumber(item.deliveredVolumeM3) ||
        hasPositiveNumber(item.tallyPieces) ||
        hasPositiveNumber(item.tallyVolumeM3) ||
        hasPositiveNumber(item.timberPricePerM3)
      );
    });
  }

  return false;
}

/**
 * Safely saves the multi-item manifest draft to storage.
 */
export function saveManifestDraft(
  draft: Partial<ManifestFormInput>,
  storage?: Storage
): void {
  try {
    const store = getStorage(storage);
    if (!store) return;

    if (!hasMeaningfulManifestDraft(draft)) return;

    const payload: ManifestDraftData = {
      draft,
      timestamp: Date.now(),
    };

    store.setItem(MANIFEST_DRAFT_KEY, JSON.stringify(payload));
  } catch {
    // Graceful fallback
  }
}

/**
 * Safely loads the persisted multi-item manifest draft from storage.
 */
export function loadManifestDraft(
  storage?: Storage
): Partial<ManifestFormInput> | null {
  try {
    const store = getStorage(storage);
    if (!store) return null;

    const raw = store.getItem(MANIFEST_DRAFT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const draft =
      parsed && typeof parsed === 'object' && 'draft' in parsed
        ? (parsed as ManifestDraftData).draft
        : (parsed as Partial<ManifestFormInput>);

    if (draft && typeof draft === 'object' && hasMeaningfulManifestDraft(draft)) {
      return draft;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Safely clears the persisted multi-item manifest draft from storage.
 */
export function clearManifestDraft(storage?: Storage): void {
  try {
    const store = getStorage(storage);
    if (!store) return;
    store.removeItem(MANIFEST_DRAFT_KEY);
  } catch {
    // Graceful fallback
  }
}
