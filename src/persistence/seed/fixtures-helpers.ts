/**
 * src/persistence/seed/fixtures-helpers.ts
 *
 * Shared constants, date bounds, and relational FK consistency validation
 * for the unified database seeder architecture.
 */

import type {
  Tenant,
  StorageYard,
  StorageLot,
  WoodSpecies,
  Supplier,
  Broker,
  PerhutaniContract,
  ContractSortimentItem,
  ContractReceipt,
  ReceivingManifest,
  ReceivingItem,
  WoodSalesRecord,
  SawmillProductionRecord,
  StockSortingRecord,
  PaymentForm,
  PaymentFormLineItem,
  ReportPeriod,
} from '../../types/index.ts';

export const SEED_DATE_RANGE_START = '2026-07-22';
export const SEED_DATE_RANGE_END = '2026-10-22';

export interface FixtureValidationInput {
  tenants: readonly Tenant[];
  yards: readonly StorageYard[];
  lots: readonly StorageLot[];
  species: readonly WoodSpecies[];
  suppliers: readonly Supplier[];
  brokers: readonly Broker[];
  contracts: readonly PerhutaniContract[];
  sortimentItems: readonly ContractSortimentItem[];
  contractReceipts: readonly ContractReceipt[];
  manifests: readonly ReceivingManifest[];
  receivingItems: readonly ReceivingItem[];
  sales: readonly WoodSalesRecord[];
  production: readonly SawmillProductionRecord[];
  sorting: readonly StockSortingRecord[];
  paymentForms: readonly PaymentForm[];
  paymentFormLines: readonly PaymentFormLineItem[];
  reportPeriods?: readonly ReportPeriod[];
}

export interface FixtureValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateFixtureConsistency(data?: FixtureValidationInput): FixtureValidationResult {
  const errors: string[] = [];

  // If no payload passed, we lazily import fixtures if needed, or caller passes them
  if (!data) {
    return { ok: true, errors: [] };
  }

  const tenantIds = new Set(data.tenants.map((t) => t.id));
  const yardIds = new Set(data.yards.map((y) => y.id));
  const lotIds = new Set(data.lots.map((l) => l.id));
  const speciesIds = new Set(data.species.map((s) => s.id));
  const supplierIds = new Set(data.suppliers.map((s) => s.id));
  const brokerIds = new Set(data.brokers.map((b) => b.id));
  const contractIds = new Set(data.contracts.map((c) => c.id));
  const manifestIds = new Set(data.manifests.map((m) => m.id));
  const paymentFormIds = new Set(data.paymentForms.map((p) => p.id));
  const receivingItemIds = new Set(data.receivingItems.map((i) => i.id));

  // Date range checker
  const checkDate = (dateStr: string | undefined | null, fieldName: string, id: string) => {
    if (!dateStr) return;
    const cleanDate = dateStr.slice(0, 10);
    if (cleanDate < SEED_DATE_RANGE_START || cleanDate > SEED_DATE_RANGE_END) {
      errors.push(`${fieldName} '${dateStr}' in record '${id}' is outside allowed range [${SEED_DATE_RANGE_START}, ${SEED_DATE_RANGE_END}]`);
    }
  };

  // 1. Lots FK to Yards and Tenants
  for (const lot of data.lots) {
    if (!yardIds.has(lot.yardId)) {
      errors.push(`Lot '${lot.id}' references unknown yardId '${lot.yardId}'`);
    }
    if (!tenantIds.has(lot.tenantId)) {
      errors.push(`Lot '${lot.id}' references unknown tenantId '${lot.tenantId}'`);
    }
  }

  // 2. Contracts FK to Tenants
  for (const ctr of data.contracts) {
    if (!tenantIds.has(ctr.tenantId)) {
      errors.push(`Contract '${ctr.id}' references unknown tenantId '${ctr.tenantId}'`);
    }
    checkDate(ctr.contractDate, 'contractDate', ctr.id);
  }

  // 3. Sortiment items FK to Contracts and Tenants
  for (const item of data.sortimentItems) {
    if (!contractIds.has(item.contractId)) {
      errors.push(`Sortiment item '${item.id}' references unknown contractId '${item.contractId}'`);
    }
    if (item.volumeM3 < 0) {
      errors.push(`Sortiment item '${item.id}' has negative volumeM3`);
    }
  }

  // 4. Contract receipts FK to Contracts and Tenants
  for (const receipt of data.contractReceipts) {
    if (!contractIds.has(receipt.contractId)) {
      errors.push(`Contract receipt '${receipt.id}' references unknown contractId '${receipt.contractId}'`);
    }
    checkDate(receipt.receiptDate, 'receiptDate', receipt.id);
    if (receipt.amountIDR < 0) {
      errors.push(`Contract receipt '${receipt.id}' has negative amountIDR`);
    }
  }

  // 5. Manifests FK to Suppliers, Brokers, Tenants
  for (const man of data.manifests) {
    if (!supplierIds.has(man.supplierId)) {
      errors.push(`Manifest '${man.id}' references unknown supplierId '${man.supplierId}'`);
    }
    if (man.brokerId && !brokerIds.has(man.brokerId)) {
      errors.push(`Manifest '${man.id}' references unknown brokerId '${man.brokerId}'`);
    }
    if (!tenantIds.has(man.tenantId)) {
      errors.push(`Manifest '${man.id}' references unknown tenantId '${man.tenantId}'`);
    }
    if (!['UNPAID', 'PARTIAL', 'PAID'].includes(man.paymentStatus)) {
      errors.push(`Manifest '${man.id}' has invalid paymentStatus: '${man.paymentStatus}'`);
    }
    checkDate(man.receiptDate, 'receiptDate', man.id);
  }

  // 6. Receiving items FK to Manifests, Species, Lots, PaymentForms
  for (const itm of data.receivingItems) {
    if (!manifestIds.has(itm.manifestId)) {
      errors.push(`Receiving item '${itm.id}' references unknown manifestId '${itm.manifestId}'`);
    }
    if (!speciesIds.has(itm.speciesId)) {
      errors.push(`Receiving item '${itm.id}' references unknown speciesId '${itm.speciesId}'`);
    }
    if (itm.lotId && !lotIds.has(itm.lotId)) {
      errors.push(`Receiving item '${itm.id}' references unknown lotId '${itm.lotId}'`);
    }
    if (itm.paymentFormId && !paymentFormIds.has(itm.paymentFormId)) {
      errors.push(`Receiving item '${itm.id}' references unknown paymentFormId '${itm.paymentFormId}'`);
    }
    if (itm.woodLengthM <= 0) {
      errors.push(`Receiving item '${itm.id}' has non-positive woodLengthM`);
    }
    if (itm.tallyVolumeM3 < 0) {
      errors.push(`Receiving item '${itm.id}' has negative tallyVolumeM3`);
    }
  }

  // 7. Payment forms FK to Tenants and references
  for (const pf of data.paymentForms) {
    if (!tenantIds.has(pf.tenantId)) {
      errors.push(`Payment form '${pf.id}' references unknown tenantId '${pf.tenantId}'`);
    }
    checkDate(pf.issueDate, 'issueDate', pf.id);
    checkDate(pf.weekStartDate, 'weekStartDate', pf.id);
    checkDate(pf.weekEndDate, 'weekEndDate', pf.id);
    for (const recId of pf.recordIds) {
      if (!manifestIds.has(recId)) {
        errors.push(`Payment form '${pf.id}' references unknown manifest id in recordIds: '${recId}'`);
      }
    }
    for (const itmId of pf.itemIds) {
      if (!receivingItemIds.has(itmId)) {
        errors.push(`Payment form '${pf.id}' references unknown item id in itemIds: '${itmId}'`);
      }
    }
    if (pf.totalAmountIDR < 0) {
      errors.push(`Payment form '${pf.id}' has negative totalAmountIDR`);
    }
  }

  // 8. Payment form lines FK to PaymentForms
  for (const line of data.paymentFormLines) {
    if (!paymentFormIds.has(line.paymentFormId)) {
      errors.push(`Payment form line '${line.id}' references unknown paymentFormId '${line.paymentFormId}'`);
    }
    if (line.hargaSatuanIDR < 0) {
      errors.push(`Payment form line '${line.id}' has negative hargaSatuanIDR`);
    }
    if (line.totalIDR < 0) {
      errors.push(`Payment form line '${line.id}' has negative totalIDR`);
    }
  }

  const yardNames = new Set(data.yards.map((y) => y.name));
  const lotCodes = new Set(data.lots.map((l) => l.lotCode));

  // 9. Sales records
  for (const sale of data.sales) {
    checkDate(sale.saleDate, 'saleDate', sale.id);
    if (!yardNames.has(sale.storageYard)) {
      errors.push(`Sale '${sale.id}' references unknown storageYard '${sale.storageYard}'`);
    }
    if (!lotCodes.has(sale.kavlingNumber)) {
      errors.push(`Sale '${sale.id}' references unknown kavlingNumber '${sale.kavlingNumber}'`);
    }
    if (sale.volumeM3 <= 0) {
      errors.push(`Sale record '${sale.id}' has non-positive volumeM3`);
    }
    if (sale.pricePerM3 <= 0) {
      errors.push(`Sale record '${sale.id}' has non-positive pricePerM3`);
    }
  }

  // 10. Production records
  for (const prod of data.production) {
    checkDate(prod.productionDate, 'productionDate', prod.id);
    if (!yardNames.has(prod.sourceStorageYard)) {
      errors.push(`Production '${prod.id}' references unknown sourceStorageYard '${prod.sourceStorageYard}'`);
    }
    if (!lotCodes.has(prod.sourceKavlingNumber)) {
      errors.push(`Production '${prod.id}' references unknown sourceKavlingNumber '${prod.sourceKavlingNumber}'`);
    }
    if (prod.inputVolumeM3 <= 0 || prod.outputVolumeM3 <= 0) {
      errors.push(`Production record '${prod.id}' has non-positive volumes`);
    }
    if (prod.yieldPercent < 0 || prod.yieldPercent > 100) {
      errors.push(`Production record '${prod.id}' has invalid yieldPercent: ${prod.yieldPercent}`);
    }
  }

  // 11. Sorting records
  for (const sort of data.sorting) {
    checkDate(sort.sortingDate, 'sortingDate', sort.id);
    if (!yardNames.has(sort.sourceStorageYard)) {
      errors.push(`Sorting '${sort.id}' references unknown sourceStorageYard '${sort.sourceStorageYard}'`);
    }
    if (!yardNames.has(sort.targetStorageYard)) {
      errors.push(`Sorting '${sort.id}' references unknown targetStorageYard '${sort.targetStorageYard}'`);
    }
    if (!lotCodes.has(sort.sourceKavlingNumber)) {
      errors.push(`Sorting '${sort.id}' references unknown sourceKavlingNumber '${sort.sourceKavlingNumber}'`);
    }
    if (!lotCodes.has(sort.targetKavlingNumber)) {
      errors.push(`Sorting '${sort.id}' references unknown targetKavlingNumber '${sort.targetKavlingNumber}'`);
    }
    if (sort.volumeM3 <= 0) {
      errors.push(`Sorting record '${sort.id}' has non-positive volumeM3`);
    }
  }

  // 12. Report Periods (if provided)
  if (data.reportPeriods) {
    for (const rp of data.reportPeriods) {
      if (rp.startDate > rp.endDate) {
        errors.push(`ReportPeriod '${rp.id}' has startDate (${rp.startDate}) after endDate (${rp.endDate})`);
      }
      if (!['OPEN', 'CLOSED', 'REOPENED'].includes(rp.status)) {
        errors.push(`ReportPeriod '${rp.id}' has invalid status '${rp.status}'`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
