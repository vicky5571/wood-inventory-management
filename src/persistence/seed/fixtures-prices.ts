/**
 * src/persistence/seed/fixtures-prices.ts
 *
 * Timber price database seed fixtures.
 * Covers standard baseline prices for all 8 wood species, plus
 * contract-specific price agreements for key suppliers (e.g. Perhutani).
 */

import type { TimberPriceEntry } from '../../types/index.ts';

export const SEED_TIMBER_PRICES: readonly TimberPriceEntry[] = [
  // 1. Jati (Teak) - Global Standard
  {
    id: 'TPE-JATI-STD-2026',
    tenantId: 'default-tenant',
    speciesId: 'SPC-JATI',
    woodSpecies: 'Teak / Jati (柚木)',
    effectiveFrom: '2026-01-01',
    pricePerM3: 4500000,
    timberPphRate: 0.5,
    notes: 'Tarif patokan standar log Jati umum 2026',
    createdBy: 'Sistem (Seeder)',
    createdAt: '2026-07-22T00:00:00.000Z',
    updatedAt: '2026-07-22T00:00:00.000Z',
  },
  // 2. Jati (Teak) - Specific Perum Perhutani KPH Randublatung
  {
    id: 'TPE-JATI-RBL-2026',
    tenantId: 'default-tenant',
    speciesId: 'SPC-JATI',
    woodSpecies: 'Teak / Jati (柚木)',
    supplierId: 'SPL-001',
    supplierName: 'Perum Perhutani KPH Randublatung',
    effectiveFrom: '2026-07-01',
    pricePerM3: 4800000,
    timberPphRate: 0.5,
    notes: 'Kontrak lelang kayu Jati AIII KPH Randublatung Q3-Q4 2026',
    createdBy: 'Sistem (Seeder)',
    createdAt: '2026-07-22T00:00:00.000Z',
    updatedAt: '2026-07-22T00:00:00.000Z',
  },
  // 3. Jati (Teak) - Specific Perum Perhutani KPH Mantingan
  {
    id: 'TPE-JATI-MNT-2026',
    tenantId: 'default-tenant',
    speciesId: 'SPC-JATI',
    woodSpecies: 'Teak / Jati (柚木)',
    supplierId: 'SPL-002',
    supplierName: 'Perum Perhutani KPH Mantingan',
    effectiveFrom: '2026-07-01',
    pricePerM3: 4700000,
    timberPphRate: 0.5,
    notes: 'Kontrak kayu Jati Mantingan bersertifikat FSC Q3-Q4 2026',
    createdBy: 'Sistem (Seeder)',
    createdAt: '2026-07-22T00:00:00.000Z',
    updatedAt: '2026-07-22T00:00:00.000Z',
  },
  // 4. Merbau - Global Standard
  {
    id: 'TPE-MRB-STD-2026',
    tenantId: 'default-tenant',
    speciesId: 'SPC-MRB',
    woodSpecies: 'Merbau (菠萝格)',
    effectiveFrom: '2026-01-01',
    pricePerM3: 3800000,
    timberPphRate: 0.5,
    notes: 'Patokan standar log Merbau Papua / Maluku 2026',
    createdBy: 'Sistem (Seeder)',
    createdAt: '2026-07-22T00:00:00.000Z',
    updatedAt: '2026-07-22T00:00:00.000Z',
  },
  // 5. Merbau - Specific PT Hutan Lestari Nusantara
  {
    id: 'TPE-MRB-HLN-2026',
    tenantId: 'default-tenant',
    speciesId: 'SPC-MRB',
    woodSpecies: 'Merbau (菠萝格)',
    supplierId: 'SPL-004',
    supplierName: 'PT Hutan Lestari Nusantara',
    effectiveFrom: '2026-07-01',
    pricePerM3: 3950000,
    timberPphRate: 0.5,
    notes: 'Kontrak pasokan Merbau log luar pulau Q3-Q4 2026',
    createdBy: 'Sistem (Seeder)',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
  // 6. Mahoni - Global Standard
  {
    id: 'TPE-MHN-STD-2026',
    tenantId: 'default-tenant',
    speciesId: 'SPC-MHN',
    woodSpecies: 'Mahoni / Mahogany (桃花心木)',
    effectiveFrom: '2026-01-01',
    pricePerM3: 2800000,
    timberPphRate: 0.5,
    notes: 'Patokan harga kayu Mahoni perkebunan rakyat',
    createdBy: 'Sistem (Seeder)',
    createdAt: '2026-07-22T00:00:00.000Z',
    updatedAt: '2026-07-22T00:00:00.000Z',
  },
  // 7. Meranti - Global Standard
  {
    id: 'TPE-MER-STD-2026',
    tenantId: 'default-tenant',
    speciesId: 'SPC-MER',
    woodSpecies: 'Meranti (柳安木)',
    effectiveFrom: '2026-01-01',
    pricePerM3: 2600000,
    timberPphRate: 0.5,
    notes: 'Patokan harga kayu Meranti merah komersial',
    createdBy: 'Sistem (Seeder)',
    createdAt: '2026-07-22T00:00:00.000Z',
    updatedAt: '2026-07-22T00:00:00.000Z',
  },
  // 8. Keruing - Global Standard
  {
    id: 'TPE-KRG-STD-2026',
    tenantId: 'default-tenant',
    speciesId: 'SPC-KRG',
    woodSpecies: 'Keruing (克隆木)',
    effectiveFrom: '2026-01-01',
    pricePerM3: 2400000,
    timberPphRate: 0.5,
    notes: 'Patokan harga kayu Keruing konstruksi',
    createdBy: 'Sistem (Seeder)',
    createdAt: '2026-07-22T00:00:00.000Z',
    updatedAt: '2026-07-22T00:00:00.000Z',
  },
  // 9. Pinus - Global Standard
  {
    id: 'TPE-PNS-STD-2026',
    tenantId: 'default-tenant',
    speciesId: 'SPC-PNS',
    woodSpecies: 'Pinus / Pine (松木)',
    effectiveFrom: '2026-01-01',
    pricePerM3: 1600000,
    timberPphRate: 0.5,
    notes: 'Patokan kayu jarum Pinus Merkusii',
    createdBy: 'Sistem (Seeder)',
    createdAt: '2026-07-22T00:00:00.000Z',
    updatedAt: '2026-07-22T00:00:00.000Z',
  },
  // 10. Sengon - Global Standard
  {
    id: 'TPE-SGN-STD-2026',
    tenantId: 'default-tenant',
    speciesId: 'SPC-SGN',
    woodSpecies: 'Sengon / Albizia (南洋楹)',
    effectiveFrom: '2026-01-01',
    pricePerM3: 950000,
    timberPphRate: 0.5,
    notes: 'Patokan kayu lunak Sengon / Albasia',
    createdBy: 'Sistem (Seeder)',
    createdAt: '2026-07-22T00:00:00.000Z',
    updatedAt: '2026-07-22T00:00:00.000Z',
  },
  // 11. Jabon - Global Standard
  {
    id: 'TPE-JBN-STD-2026',
    tenantId: 'default-tenant',
    speciesId: 'SPC-JBN',
    woodSpecies: 'Jabon (白楝)',
    effectiveFrom: '2026-01-01',
    pricePerM3: 850000,
    timberPphRate: 0.5,
    notes: 'Patokan kayu Jabon industri veneer/blockboard',
    createdBy: 'Sistem (Seeder)',
    createdAt: '2026-07-22T00:00:00.000Z',
    updatedAt: '2026-07-22T00:00:00.000Z',
  },
] as const;
