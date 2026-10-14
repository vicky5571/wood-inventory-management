/**
 * src/utils/calculator.js
 *
 * Pure volumetric, imperial/metric, and inventory calculation helpers
 * for Wood & Timber inventory management.
 */

const MM_TO_METERS = 0.001;
const MM_TO_INCHES = 1 / 25.4;
const MM_TO_FEET = 1 / 304.8;

/**
 * Calculates cubic meters (m³) for a lumber dimension set and quantity.
 * Formula: (thickness_mm * width_mm * length_mm) / 1,000,000,000 * quantity
 *
 * @param {number} thicknessMm Thickness in millimeters
 * @param {number} widthMm Width in millimeters
 * @param {number} lengthMm Length in millimeters
 * @param {number} [quantity=1] Number of pieces (default: 1)
 * @returns {number} Total cubic meters rounded to 4 decimal places
 */
export function calculateCubicMeters(thicknessMm, widthMm, lengthMm, quantity = 1) {
  if (thicknessMm < 0 || widthMm < 0 || lengthMm < 0 || quantity < 0) {
    throw new RangeError('Dimensions and quantity must be non-negative values');
  }

  const volumePerPiece = (thicknessMm * MM_TO_METERS) * (widthMm * MM_TO_METERS) * (lengthMm * MM_TO_METERS);
  const totalVolume = volumePerPiece * quantity;

  return Number(totalVolume.toFixed(4));
}

/**
 * Calculates board feet (BF) for imperial or converted metric dimensions.
 * Formula: (Thickness(in) * Width(in) * Length(ft)) / 12 * quantity
 *
 * @param {number} thicknessInches Nominal thickness in inches
 * @param {number} widthInches Nominal width in inches
 * @param {number} lengthFeet Nominal length in feet
 * @param {number} [quantity=1] Number of pieces (default: 1)
 * @returns {number} Board feet value rounded to 2 decimal places
 */
export function calculateBoardFeet(thicknessInches, widthInches, lengthFeet, quantity = 1) {
  if (thicknessInches < 0 || widthInches < 0 || lengthFeet < 0 || quantity < 0) {
    throw new RangeError('Dimensions and quantity must be non-negative values');
  }

  const bfPerPiece = (thicknessInches * widthInches * lengthFeet) / 12;
  const totalBf = bfPerPiece * quantity;

  return Number(totalBf.toFixed(2));
}

/**
 * Converts metric lumber specifications directly to Board Feet and Cubic Meters.
 *
 * @param {number} thicknessMm Metric thickness
 * @param {number} widthMm Metric width
 * @param {number} lengthMm Metric length
 * @param {number} [quantity=1] Number of pieces
 * @returns {{cubicMetersPerPiece: number, totalCubicMeters: number, boardFeetPerPiece: number, totalBoardFeet: number}}
 */
export function computeVolumetricMetrics(thicknessMm, widthMm, lengthMm, quantity = 1) {
  const m3PerPiece = calculateCubicMeters(thicknessMm, widthMm, lengthMm, 1);
  const totalM3 = calculateCubicMeters(thicknessMm, widthMm, lengthMm, quantity);

  const tIn = thicknessMm * MM_TO_INCHES;
  const wIn = widthMm * MM_TO_INCHES;
  const lFt = lengthMm * MM_TO_FEET;

  const bfPerPiece = calculateBoardFeet(tIn, wIn, lFt, 1);
  const totalBf = calculateBoardFeet(tIn, wIn, lFt, quantity);

  return {
    cubicMetersPerPiece: m3PerPiece,
    totalCubicMeters: totalM3,
    boardFeetPerPiece: bfPerPiece,
    totalBoardFeet: totalBf,
  };
}

/**
 * Generates a normalized standard SKU for a wood inventory item.
 * Format: [SPECIES]-[THICKNESS]X[WIDTH]X[LENGTH]-[GRADE]
 *
 * @example generateWoodSku('TEAK', 50, 200, 2400, 'FAS') => "TEAK-50X200X2400-FAS"
 * @param {string} speciesCode
 * @param {number} thicknessMm
 * @param {number} widthMm
 * @param {number} lengthMm
 * @param {string} grade
 * @returns {string}
 */
export function generateWoodSku(speciesCode, thicknessMm, widthMm, lengthMm, grade) {
  const cleanCode = speciesCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const cleanGrade = grade.trim().toUpperCase().replace(/\s+/g, '');

  return `${cleanCode}-${Math.round(thicknessMm)}X${Math.round(widthMm)}X${Math.round(lengthMm)}-${cleanGrade}`;
}

/**
 * Estimates gross weight in kilograms given volume (m³) and species density (kg/m³).
 *
 * @param {number} volumeM3 Total cubic meters
 * @param {number} densityKgM3 Nominal density at equilibrium moisture content
 * @returns {number} Total estimated weight in kg rounded to 2 decimal places
 */
export function estimateBatchWeight(volumeM3, densityKgM3) {
  if (volumeM3 < 0 || densityKgM3 < 0) {
    throw new RangeError('Volume and density must be non-negative');
  }
  return Number((volumeM3 * densityKgM3).toFixed(2));
}
