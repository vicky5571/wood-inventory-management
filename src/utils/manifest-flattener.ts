/**
 * src/utils/manifest-flattener.ts
 *
 * Client projection utility that flattens multi-item receiving manifests into
 * discrete WoodReceivingRecord items conforming to v_buku_besar_flat schema.
 */

import type { ManifestFormInput, WoodReceivingRecord } from '../types/index.ts';

export function flattenManifest(
  manifest: ManifestFormInput,
  existingCreatedAt?: string
): WoodReceivingRecord[] {
  const items = manifest.items || [];
  const now = new Date().toISOString();
  const cAt = existingCreatedAt || now;
  const manifestId = manifest.id || `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const isSingle = items.length === 1;
  const totalVolume = items.reduce((acc, it) => acc + (Math.max(0, Number(it.tallyVolumeM3) || 0)), 0);
  const totalBrokerFee = Math.max(0, Number(manifest.brokerFee) || 0);
  let allocatedBrokerFeeSoFar = 0;

  return items.map((item, idx) => {
    const itemId = item.id || `item-${manifestId}-${idx + 1}`;
    const id = isSingle ? manifestId : `${manifestId}_${itemId}`;

    const deliveredPieces = Math.max(0, Number(item.deliveredPieces) || 0);
    const deliveredVolumeM3 = Math.max(0, Number(item.deliveredVolumeM3) || 0);
    const tallyPieces = Math.max(0, Number(item.tallyPieces) || 0);
    const tallyVolumeM3 = Math.max(0, Number(item.tallyVolumeM3) || 0);
    const timberPricePerM3 = Math.max(0, Number(item.timberPricePerM3) || 0);
    const timberPphRate = Math.max(0, Number(item.timberPphRate) || 0);

    const timberGrossTotal = Math.round(tallyVolumeM3 * timberPricePerM3);
    const timberPphAmount = Math.round(timberGrossTotal * (timberPphRate / 100));
    const timberNetPayable = timberGrossTotal - timberPphAmount;

    const freightRatePerM3 = Math.max(0, Number(manifest.freightRatePerM3) || 0);
    const freightGrossTotal = Math.round(tallyVolumeM3 * freightRatePerM3);
    const freightPphAmount = Math.round(freightGrossTotal * 0.02);
    const freightNetPayable = freightGrossTotal - freightPphAmount;

    let brokerFee: number;
    if (totalVolume > 0) {
      if (idx === items.length - 1) {
        brokerFee = Math.max(0, totalBrokerFee - allocatedBrokerFeeSoFar);
      } else {
        brokerFee = Math.round(totalBrokerFee * (tallyVolumeM3 / totalVolume));
        allocatedBrokerFeeSoFar += brokerFee;
      }
    } else {
      brokerFee = idx === 0 ? totalBrokerFee : 0;
    }
    const grandNetPayable = timberNetPayable + freightNetPayable + brokerFee;

    const record: WoodReceivingRecord = {
      id,
      manifest_id: manifestId,
      item_id: itemId,
      receiptDate: manifest.receiptDate || now.split('T')[0],
      docDate: manifest.docDate,
      truckPlateNumber: manifest.truckPlateNumber || '-',
      forestryDocNumber: manifest.forestryDocNumber || '-',
      receiptNumber: manifest.receiptNumber || `MAN-${manifestId}`,
      contractNumber: manifest.contractNumber || '-',
      supplierName: manifest.supplierName || 'Unknown Supplier',
      brokerId: manifest.brokerId,
      woodSpecies: item.woodSpecies || 'General Timber',
      woodLengthM: item.woodLengthM || 4.0,
      kavlingNumber: item.kavlingNumber || '',
      storageYard: item.storageYard || '',
      deliveredPieces,
      deliveredVolumeM3,
      tallyPieces,
      tallyVolumeM3,
      timberPricePerM3,
      timberGrossTotal,
      timberPphRate,
      timberPphAmount,
      timberNetPayable,
      freightRatePerM3,
      freightGrossTotal,
      freightPphAmount,
      freightNetPayable,
      brokerFee,
      grandNetPayable,
      paymentStatus: manifest.paymentStatus || 'UNPAID',
      invoiceNumber: manifest.invoiceNumber,
      paymentDate: manifest.paymentDate,
      paymentNotes: manifest.paymentNotes,
      createdAt: cAt,
      updatedAt: now,
    };

    return record;
  });
}

export function applyManifestToRecords(
  prev: WoodReceivingRecord[],
  manifest: ManifestFormInput
): { next: WoodReceivingRecord[]; flattened: WoodReceivingRecord[] } {
  const manifestId = manifest.id;
  const existingIndex = prev.findIndex((r) => r.manifest_id === manifestId || r.id === manifestId);
  const existingCreatedAt = existingIndex >= 0 ? prev[existingIndex].createdAt : undefined;
  const flattened = flattenManifest(manifest, existingCreatedAt);

  const remaining = prev.filter((r) => r.manifest_id !== manifestId && r.id !== manifestId);
  const next = existingIndex >= 0
    ? [...remaining.slice(0, existingIndex), ...flattened, ...remaining.slice(existingIndex)]
    : [...flattened, ...remaining];

  return { next, flattened };
}
