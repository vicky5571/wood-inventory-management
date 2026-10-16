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

import type { WoodSpecies } from '../types/index.ts';

export const TIMBER_SPECIES_CATALOGUE: WoodSpecies[] = [
  {
    id: 'sp-teak',
    code: 'TEAK',
    commonName: 'Teak / Jati (柚木)',
    botanicalName: 'Tectona grandis',
    densityKgM3: 650,
    isHardwood: true,
    notes: 'Premium tropical hardwood with exceptional weather and decay resistance.',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'sp-merbau',
    code: 'MRB',
    commonName: 'Merbau (菠萝格)',
    botanicalName: 'Intsia bijuga',
    densityKgM3: 830,
    isHardwood: true,
    notes: 'High structural durability, commonly used in flooring and heavy construction.',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'sp-bengkirai',
    code: 'BGK',
    commonName: 'Bengkirai / Balau (黄梢木)',
    botanicalName: 'Shorea laevis',
    densityKgM3: 910,
    isHardwood: true,
    notes: 'Dense outdoor decking timber with superior hardness.',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'sp-kamper',
    code: 'KMP',
    commonName: 'Kamper (樟木)',
    botanicalName: 'Dryobalanops aromatica',
    densityKgM3: 750,
    isHardwood: true,
    notes: 'Aromatic timber prized for window and door framing.',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'sp-mahoni',
    code: 'MHN',
    commonName: 'Mahoni / Mahogany (桃花心木)',
    botanicalName: 'Swietenia macrophylla',
    densityKgM3: 560,
    isHardwood: true,
    notes: 'Fine reddish-brown grain favored in furniture manufacturing.',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'sp-sengon',
    code: 'SGN',
    commonName: 'Sengon / Albizia (南洋楹)',
    botanicalName: 'Falcataria moluccana',
    densityKgM3: 350,
    isHardwood: false,
    notes: 'Fast-growing lightweight timber ideal for core blockboard and packing crates.',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'sp-sonokeling',
    code: 'SNK',
    commonName: 'Sonokeling / Rosewood (紫檀)',
    botanicalName: 'Dalbergia latifolia',
    densityKgM3: 850,
    isHardwood: true,
    notes: 'Exotic dark purplish wood for high-end musical instruments and veneers.',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'sp-ulin',
    code: 'ULN',
    commonName: 'Ulin / Ironwood (铁木)',
    botanicalName: 'Eusideroxylon zwageri',
    densityKgM3: 1040,
    isHardwood: true,
    notes: 'Extremely dense water-resistant timber used in marine piles and roof shingles.',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
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
