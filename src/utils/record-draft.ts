/**
 * src/utils/record-draft.ts
 *
 * Auto-draft persistence layer for timber receiving record forms.
 * Manages debounced saving, serialization, meaningful data detection,
 * and safe retrieval/clearing with resilient SSR / offline fallback.
 */

import type { WoodReceivingRecord } from '../types/index.ts';

export const DRAFT_KEY = 'wood_record_form_draft_v1';

export interface RecordDraftData {
  draft: Partial<WoodReceivingRecord>;
  timestamp: number;
}

/**
 * Checks if the form has meaningful operator inputs beyond empty/default values.
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
 * Safely loads the persisted record draft from localStorage.
 */
export function loadRecordDraft(storage?: Storage): Partial<WoodReceivingRecord> | null {
  try {
    const store =
      storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
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
 * Safely saves the active record draft to localStorage.
 */
export function saveRecordDraft(
  data: Partial<WoodReceivingRecord>,
  storage?: Storage
): boolean {
  try {
    const store =
      storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
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
 * Safely clears the active record draft from localStorage.
 */
export function clearRecordDraft(storage?: Storage): void {
  try {
    const store =
      storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (!store) return;
    store.removeItem(DRAFT_KEY);
  } catch {
    // Graceful fallback
  }
}
