/**
 * src/utils/dev-quick-fill.ts
 *
 * Development helper generators for sample Indonesian timber domain data.
 * Used by UI modals to rapidly populate valid test records in dev/staging.
 */

import type {
  WoodReceivingRecord,
  ManifestItemInput,
  SalesFormInput,
  Supplier,
} from '../types/index.ts';

export function getQuickReceivingDraft(availableSpecies?: string[]): {
  form: Partial<WoodReceivingRecord>;
  items: ManifestItemInput[];
} {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const randCode = Math.floor(1000 + Math.random() * 9000);
  const species1 = availableSpecies?.[0] || 'Meranti';
  const species2 = availableSpecies?.[1] || 'Keruing';

  return {
    form: {
      receiptDate: dateStr,
      docDate: dateStr,
      truckPlateNumber: `KT ${Math.floor(1000 + Math.random() * 9000)} BW`,
      forestryDocNumber: `SKSHHK-${now.getFullYear()}-X${randCode}`,
      receiptNumber: `KW-${randCode}`,
      contractNumber: `KTR-${now.getFullYear()}-${Math.floor(10 + Math.random() * 90)}`,
      supplierName: 'PT Rimba Borneo Mandiri',
      kavlingNumber: 'KAV-01',
      storageYard: 'TPK-Timur',
      freightRatePerM3: 150000,
      freightPphAmount: 37500,
      brokerFee: 50000,
      paymentStatus: 'UNPAID',
      invoiceNumber: `INV-IN-${now.getFullYear()}-${randCode}`,
      paymentNotes: 'Pembayaran termin 14 hari dev test',
    },
    items: [
      {
        id: `item-${Date.now()}-1`,
        woodSpecies: species1,
        woodLengthM: 4.0,
        kavlingNumber: 'KAV-01',
        storageYard: 'TPK-Timur',
        deliveredPieces: 25,
        deliveredVolumeM3: 12.5,
        tallyPieces: 25,
        tallyVolumeM3: 12.5,
        timberPricePerM3: 2200000,
        timberPphRate: 0.5,
      },
      {
        id: `item-${Date.now()}-2`,
        woodSpecies: species2,
        woodLengthM: 4.0,
        kavlingNumber: 'KAV-02',
        storageYard: 'TPK-Timur',
        deliveredPieces: 15,
        deliveredVolumeM3: 7.5,
        tallyPieces: 15,
        tallyVolumeM3: 7.5,
        timberPricePerM3: 2450000,
        timberPphRate: 0.5,
      },
    ],
  };
}

export function getQuickSalesDraft(customerHistory?: string[]): SalesFormInput {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const customer = customerHistory && customerHistory.length > 0
    ? customerHistory[0]
    : 'PT Maju Mapan Furniture';

  return {
    saleDate: dateStr,
    deliveryOrderNumber: `DO/${now.getFullYear()}/${randNum}`,
    truckPlateNumber: `B ${Math.floor(1000 + Math.random() * 9000)} TKL`,
    driverName: 'Bambang Santoso',
    customerName: customer,
    storageYard: 'TPK-Timur',
    kavlingNumber: 'KAV-01',
    woodSpecies: 'Meranti',
    pieces: 10,
    volumeM3: 4.5,
    pricePerM3: 2500000,
    paymentStatus: 'UNPAID',
    invoiceNumber: `INV-SLS-${randNum}`,
    notes: 'Penjualan kayu log untuk industri mebel lokal (dev auto-fill)',
  };
}

export function getQuickSupplierDraft(): Partial<Supplier> & { name: string } {
  const randId = Math.floor(100 + Math.random() * 900);
  return {
    name: `PT Rimba Lestari Mandiri ${randId}`,
    code: `SUP-RLM${randId}`,
    contactPerson: 'Hendra Setiawan',
    phone: '0812-3456-7890',
    address: 'Kawasan Industri HPH Km 15, Samarinda, Kalimantan Timur',
    taxId: '01.234.567.8-901.000',
    notes: 'Pemasok kayu bulat Meranti & Bengkirai legal tersertifikasi SVLK (dev test)',
    status: 'ACTIVE',
  };
}
