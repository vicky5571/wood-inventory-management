/**
 * src/utils/discrepancy-validation.ts
 *
 * Input validation for timber receiving and manifest forms.
 * Rejects negative values for tally and delivered measurements
 * to prevent silent ledger corruption.
 */

export interface DiscrepancyValidationInput {
  tallyVolumeM3?: number;
  deliveredVolumeM3?: number;
  tallyPieces?: number;
  deliveredPieces?: number;
}

export interface DiscrepancyValidationResult {
  ok: boolean;
  errors: Record<string, string>;
}

export function validateDiscrepancyInputs(
  input: DiscrepancyValidationInput
): DiscrepancyValidationResult {
  const errors: Record<string, string> = {};

  if (input.tallyVolumeM3 !== undefined && Number(input.tallyVolumeM3) < 0) {
    errors.tallyVolumeM3 = 'Volume tally tidak boleh bernilai negatif (检尺体积不能为负数)';
  }

  if (input.deliveredVolumeM3 !== undefined && Number(input.deliveredVolumeM3) < 0) {
    errors.deliveredVolumeM3 = 'Volume surat jalan tidak boleh bernilai negatif (送货体积不能为负数)';
  }

  if (input.tallyPieces !== undefined && Number(input.tallyPieces) < 0) {
    errors.tallyPieces = 'Jumlah batang tally tidak boleh bernilai negatif (检尺根数不能为负数)';
  }

  if (input.deliveredPieces !== undefined && Number(input.deliveredPieces) < 0) {
    errors.deliveredPieces = 'Jumlah batang surat jalan tidak boleh bernilai negatif (送货根数不能为负数)';
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
  };
}
