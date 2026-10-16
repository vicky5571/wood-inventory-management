/**
 * src/utils/timber-species.ts
 *
 * Curated timber species catalogue for tropical sawmills and lumber trading.
 * Provides bilingual search indexing, deduplication, and custom species validation.
 */

export const DEFAULT_TIMBER_SPECIES: string[] = [
  'Teak / Jati (柚木)',
  'Merbau (菠萝格)',
  'Bengkirai / Balau (黄梢木)',
  'Kamper (樟木)',
  'Mahoni / Mahogany (桃花心木)',
  'Sengon / Albizia (南洋楹)',
  'Sonokeling / Rosewood (紫檀)',
  'Pinus / Pine (松木)',
  'Ulin / Ironwood (铁木)',
  'Meranti (柳安木)',
  'Keruing (克隆木)',
  'Kapur (卡普木)',
  'Kayu Karet (橡胶木)',
];

/**
 * Filter species options using bilingual case-insensitive matching.
 */
export function filterSpeciesOptions(options: string[], query: string): string[] {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return options;

  return options.filter((option) => option.toLowerCase().includes(cleanQuery));
}

/**
 * Merge curated default species with dynamic species discovered from user records.
 * Preserves uniqueness and trims whitespace.
 */
export function getMergedSpeciesList(dynamicSpecies: string[] = []): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const s of [...DEFAULT_TIMBER_SPECIES, ...dynamicSpecies]) {
    const trimmed = (s || '').trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      merged.push(trimmed);
    }
  }

  return merged;
}

/**
 * Determines whether a given species name is outside the curated master list.
 */
export function isCustomSpecies(
  value: string,
  standardList: string[] = DEFAULT_TIMBER_SPECIES
): boolean {
  const clean = value.trim().toLowerCase();
  if (!clean) return false;

  return !standardList.some((s) => s.trim().toLowerCase() === clean);
}
