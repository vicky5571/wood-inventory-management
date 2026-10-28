/**
 * scripts/seed-supabase.ts
 *
 * Automated Database Seeding Engine for Supabase Cloud Database.
 * Loads canonical fixtures from src/persistence/seed/fixtures.ts and upserts all 17
 * domain entities into PostgREST with resolution=merge-duplicates.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSupabaseConfigured, supabaseFetch } from '../src/persistence/supabase/supabase-client.ts';
import * as fixtures from '../src/persistence/seed/fixtures.ts';

export interface SupabaseSeedResult {
  tenants: number;
  settings: number;
  species: number;
  yards: number;
  lots: number;
  suppliers: number;
  brokers: number;
  contracts: number;
  sortimentItems: number;
  contractReceipts: number;
  paymentForms: number;
  manifests: number;
  receivingItems: number;
  paymentFormLines: number;
  sales: number;
  production: number;
  sorting: number;
  users: number;
  prices: number;
  reportPeriods: number;
}

export async function seedSupabaseDatabase(): Promise<SupabaseSeedResult> {
  // 1. Fixture validation before any network request
  const validation = fixtures.validateFixtureConsistency();
  if (!validation.ok) {
    throw new Error(`Fixture validation failed with ${validation.errors.length} errors:\n${validation.errors.join('\n')}`);
  }

  if (!isSupabaseConfigured()) {
    throw new Error('Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY) are missing.');
  }

  const upsert = async (table: string, rows: readonly unknown[], conflictTarget = 'id') => {
    if (rows.length === 0) return 0;
    try {
      await supabaseFetch(`/${table}?on_conflict=${conflictTarget}`, {
        method: 'POST',
        prefer: 'resolution=merge-duplicates',
        body: JSON.stringify(rows),
      });
      return rows.length;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('404') || msg.includes('PGRST205')) {
        console.warn(`   ⚠️ Table '${table}' does not exist on Supabase remote (404/PGRST205). Run migrations to create it.`);
        return 0;
      }
      if (msg.includes('PGRST204') && msg.includes('broker_id')) {
        console.warn(`   ⚠️ Column 'broker_id' not found on remote 'receiving_manifests'. Retrying without broker_id.`);
        const stripped = (rows as Record<string, unknown>[]).map((r) => {
          const { broker_id: _, ...rest } = r;
          return rest;
        });
        await supabaseFetch(`/${table}?on_conflict=${conflictTarget}`, {
          method: 'POST',
          prefer: 'resolution=merge-duplicates',
          body: JSON.stringify(stripped),
        });
        return stripped.length;
      }
      if (msg.includes('23502') && msg.includes('timber_price_per_m3')) {
        console.warn(`   ⚠️ Column 'timber_price_per_m3' has NOT NULL constraint on remote (run 20261021000003_nullable_pricing.sql). Falling back to 0 for pending items.`);
        const fallbackRows = (rows as Record<string, unknown>[]).map((r) => ({
          ...r,
          timber_price_per_m3: r.timber_price_per_m3 === null ? 0 : r.timber_price_per_m3,
        }));
        await supabaseFetch(`/${table}?on_conflict=${conflictTarget}`, {
          method: 'POST',
          prefer: 'resolution=merge-duplicates',
          body: JSON.stringify(fallbackRows),
        });
        return fallbackRows.length;
      }
      throw new Error(`Failed upserting into Supabase table '${table}': ${msg}`);
    }
  };

  // Clean up legacy seeder demo records if present from previous architecture
  try {
    await supabaseFetch('/receiving_items?id=like.itm-*', { method: 'DELETE' });
    await supabaseFetch('/receiving_manifests?id=like.rec-*', { method: 'DELETE' });
    await supabaseFetch('/sales_records?id=like.sls-*', { method: 'DELETE' });
    await supabaseFetch('/storage_lots?id=like.lot-*', { method: 'DELETE' });
    await supabaseFetch('/storage_yards?id=like.yard-*', { method: 'DELETE' });
    await supabaseFetch('/wood_species?id=like.sp-*', { method: 'DELETE' });
    await supabaseFetch('/suppliers?id=like.spl-*', { method: 'DELETE' });
    await supabaseFetch('/suppliers?id=like.sup-*', { method: 'DELETE' });
  } catch {}

  // 1. Tenants
  await upsert('tenants', fixtures.SEED_TENANTS.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
  })));

  // 2. App Settings
  const s = fixtures.SEED_SETTINGS;
  await upsert('app_settings', [{
    tenant_id: 'default-tenant',
    default_timber_pph_rate: s.defaultTimberPphRate,
    default_freight_pph_rate: s.defaultFreightPphRate,
    default_broker_fee: s.defaultBrokerFee,
    discrepancy_alarm_volume_m3: s.discrepancyAlarmVolumeM3,
    discrepancy_alarm_percent: s.discrepancyAlarmPercent,
    yard_name: s.yardName,
    yard_code: s.yardCode,
    company_name: s.companyName,
  }], 'tenant_id');

  // 3. Wood Species
  await upsert('wood_species', fixtures.SEED_SPECIES.map((sp) => ({
    id: sp.id,
    tenant_id: 'default-tenant',
    code: sp.code,
    common_name: sp.commonName,
    botanical_name: sp.botanicalName || null,
    density_kg_m3: sp.densityKgM3,
    is_hardwood: sp.isHardwood,
  })));

  // 4. Storage Yards
  await upsert('storage_yards', fixtures.SEED_YARDS.map((y) => ({
    id: y.id,
    tenant_id: y.tenantId,
    yard_code: y.yardCode,
    name: y.name,
    description: y.description || null,
  })));

  // 5. Storage Lots
  await upsert('storage_lots', fixtures.SEED_LOTS.map((l) => ({
    id: l.id,
    tenant_id: l.tenantId,
    yard_id: l.yardId,
    lot_code: l.lotCode,
    status: l.status,
  })));

  // 6. Suppliers
  await upsert('suppliers', fixtures.SEED_SUPPLIERS.map((sup) => ({
    id: sup.id,
    tenant_id: 'default-tenant',
    code: sup.code,
    name: sup.name,
    contact_person: sup.contactPerson || null,
    phone: sup.phone || null,
    address: sup.address || null,
    tax_id_npwp: sup.taxId || null,
    is_active: sup.status === 'ACTIVE',
    notes: sup.notes || null,
  })));

  // 7. Brokers
  await upsert('brokers', fixtures.SEED_BROKERS.map((b) => ({
    id: b.id,
    tenant_id: 'default-tenant',
    code: b.code,
    name: b.name,
    contact_person: b.contactPerson || null,
    phone: b.phone || null,
    address: b.address || null,
    tax_id: b.taxId || null,
    default_commission_per_m3: b.defaultCommissionPerM3 ?? null,
    notes: b.notes || null,
    status: b.status,
  })));

  // 8. Perhutani Contracts
  await upsert('perhutani_contracts', fixtures.SEED_CONTRACTS.map((c) => ({
    id: c.id,
    tenant_id: c.tenantId,
    contract_number: c.contractNumber,
    contract_date: c.contractDate,
    effective_start_date: c.effectiveStartDate,
    effective_end_date: c.effectiveEndDate,
    kph_origin: c.kphOrigin,
    po_number: c.poNumber || null,
    total_contract_value_idr: c.totalContractValueIDR,
    total_purchased_volume_m3: c.totalPurchasedVolumeM3,
    total_purchased_pieces: c.totalPurchasedPieces,
    status: c.status,
    notes: c.notes || null,
  })));

  // 9. Contract Sortiment Items
  await upsert('contract_sortiment_items', fixtures.SEED_SORTIMENT_ITEMS.map((item) => ({
    id: item.id,
    contract_id: item.contractId,
    tenant_id: item.tenantId,
    item_sequence: item.itemSequence,
    wood_species: item.woodSpecies,
    grade: item.grade,
    wood_length_m: item.woodLengthM ?? null,
    volume_m3: item.volumeM3,
    pieces: item.pieces ?? null,
    price_per_m3: item.pricePerM3,
    subtotal_idr: item.subtotalIDR,
    notes: item.notes || null,
  })));

  // 10. Contract Receipts
  await upsert('contract_receipts', fixtures.SEED_CONTRACT_RECEIPTS.map((r) => ({
    id: r.id,
    contract_id: r.contractId,
    tenant_id: r.tenantId,
    receipt_number: r.receiptNumber,
    receipt_date: r.receiptDate,
    amount_idr: r.amountIDR,
    covered_volume_m3: r.coveredVolumeM3,
    covered_pieces: r.coveredPieces ?? null,
    notes: r.notes || null,
  })));

  // 11. Payment Forms (Pass 1: empty references)
  await upsert('payment_forms', fixtures.SEED_PAYMENT_FORMS.map((p) => ({
    id: p.id,
    tenant_id: p.tenantId,
    preprinted_number: p.preprintedNumber,
    issue_date: p.issueDate,
    week_start_date: p.weekStartDate,
    week_end_date: p.weekEndDate,
    supplier_name: p.supplierName,
    supplier_id: p.supplierId || null,
    wood_species: p.woodSpecies,
    contract_number: p.contractNumber,
    record_ids: '[]',
    item_ids: '[]',
    total_amount_idr: p.totalAmountIDR,
    terbilang: p.terbilang,
    total_tally_volume_m3: p.totalTallyVolumeM3,
    total_tally_pieces: p.totalTallyPieces,
    total_timber_gross_idr: p.totalTimberGrossIDR,
    total_timber_pph_idr: p.totalTimberPphIDR,
    total_timber_net_idr: p.totalTimberNetIDR,
    status: p.status,
    issued_at: p.issuedAt || null,
    paid_at: p.paidAt || null,
    invoice_number: p.invoiceNumber || null,
    payment_date: p.paymentDate || null,
    payment_method: p.paymentMethod || null,
    notes: p.notes || null,
  })));

  // 12. Receiving Manifests
  await upsert('receiving_manifests', fixtures.SEED_MANIFESTS.map((m) => ({
    id: m.id,
    tenant_id: m.tenantId,
    manifest_number: m.manifestNumber,
    receipt_date: m.receiptDate,
    doc_date: m.docDate || null,
    truck_plate_number: m.truckPlateNumber,
    forestry_doc_number: m.forestryDocNumber,
    receipt_number: m.receiptNumber,
    contract_number: m.contractNumber,
    supplier_id: m.supplierId,
    broker_id: m.brokerId || null,
    freight_rate_per_m3: m.freightRatePerM3,
    freight_pph_rate: m.freightPphRate,
    broker_fee: m.brokerFee,
    payment_status: m.paymentStatus,
    invoice_number: m.invoiceNumber || null,
    payment_date: m.paymentDate || null,
    payment_notes: m.paymentNotes || null,
  })));

  // 13. Receiving Items
  await upsert('receiving_items', fixtures.SEED_RECEIVING_ITEMS.map((item) => ({
    id: item.id,
    manifest_id: item.manifestId,
    tenant_id: item.tenantId,
    item_sequence: item.itemSequence,
    species_id: item.speciesId,
    lot_id: item.lotId || null,
    wood_length_m: item.woodLengthM,
    delivered_pieces: item.deliveredPieces,
    delivered_volume_m3: item.deliveredVolumeM3,
    tally_pieces: item.tallyPieces,
    tally_volume_m3: item.tallyVolumeM3,
    timber_price_per_m3: item.timberPricePerM3 ?? null,
    timber_pph_rate: item.timberPphRate,
    notes: item.notes || null,
  })));

  // 14. Payment Forms (Pass 2: update references)
  for (const p of fixtures.SEED_PAYMENT_FORMS) {
    try {
      await supabaseFetch(`/payment_forms?id=eq.${p.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          record_ids: JSON.stringify(p.recordIds),
          item_ids: JSON.stringify(p.itemIds),
        }),
      });
    } catch {}
  }

  // 15. Payment Form Lines
  await upsert('payment_form_lines', fixtures.SEED_PAYMENT_FORM_LINES.map((line) => ({
    id: line.id,
    payment_form_id: line.paymentFormId,
    tenant_id: 'default-tenant',
    item_sequence: line.itemSequence,
    kategori: line.kategori,
    konten: line.konten,
    tujuan: line.tujuan,
    harga_satuan_idr: line.hargaSatuanIDR,
    jumlah: line.jumlah,
    unit: line.unit,
    total_idr: line.totalIDR,
    source_record_id: line.sourceRecordId || null,
    source_item_id: line.sourceItemId || null,
    notes: line.notes || null,
  })));

  // 16. Outbound Wood Sales
  await upsert('sales_records', fixtures.SEED_SALES.map((sale) => ({
    id: sale.id,
    sale_date: sale.saleDate,
    delivery_order_number: sale.deliveryOrderNumber,
    truck_plate_number: sale.truckPlateNumber,
    driver_name: sale.driverName || null,
    customer_name: sale.customerName,
    storage_yard: sale.storageYard,
    kavling_number: sale.kavlingNumber,
    wood_species: sale.woodSpecies,
    pieces: Number(sale.pieces),
    volume_m3: Number(sale.volumeM3),
    price_per_m3: Number(sale.pricePerM3),
    total_price: Number(sale.totalPrice),
    payment_status: sale.paymentStatus || 'UNPAID',
    invoice_number: sale.invoiceNumber || null,
    notes: sale.notes || null,
  })));

  // 17. Sawmill Production
  await upsert('sawmill_production_records', fixtures.SEED_PRODUCTION.map((p) => ({
    id: p.id,
    tenant_id: p.tenantId,
    production_date: p.productionDate,
    shift: p.shift || null,
    source_storage_yard: p.sourceStorageYard,
    source_kavling_number: p.sourceKavlingNumber,
    input_species: p.inputSpecies,
    input_volume_m3: p.inputVolumeM3,
    input_pieces: p.inputPieces,
    output_product: p.outputProduct,
    output_volume_m3: p.outputVolumeM3,
    output_pieces: p.outputPieces,
    operator_name: p.operatorName,
    notes: p.notes || null,
  })));

  // 18. Stock Sorting
  await upsert('stock_sorting_records', fixtures.SEED_SORTING.map((sort) => ({
    id: sort.id,
    tenant_id: sort.tenantId,
    sorting_date: sort.sortingDate,
    species: sort.species,
    source_storage_yard: sort.sourceStorageYard,
    source_kavling_number: sort.sourceKavlingNumber,
    target_storage_yard: sort.targetStorageYard,
    target_kavling_number: sort.targetKavlingNumber,
    volume_m3: sort.volumeM3,
    pieces: sort.pieces,
    reason: sort.reason,
    operator_name: sort.operatorName,
    notes: sort.notes || null,
  })));

  await upsert('users', fixtures.SEED_USERS.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role_level: u.roleLevel,
    title: u.title,
    permissions: u.permissions ?? null,
    password_hash: u.passwordHash,
    is_active: u.isActive,
  })));

  await upsert('timber_price_entries', fixtures.SEED_TIMBER_PRICES.map((p) => ({
    id: p.id,
    tenant_id: p.tenantId,
    wood_species: p.woodSpecies,
    supplier_id: p.supplierId || null,
    supplier_name: p.supplierName || null,
    effective_from: p.effectiveFrom,
    effective_to: p.effectiveTo || null,
    price_per_m3: p.pricePerM3,
    timber_pph_rate: p.timberPphRate,
    notes: p.notes || null,
    created_by: p.createdBy || null,
  })));

  await upsert('report_periods', fixtures.SEED_REPORT_PERIODS.map((r) => ({
    id: r.id,
    tenant_id: r.tenantId,
    name: r.name,
    status: r.status,
    start_date: r.startDate,
    end_date: r.endDate,
    closed_at: r.closedAt || null,
    closed_by: r.closedBy || null,
    total_records: r.totalRecords ?? null,
    total_volume_m3: r.totalVolumeM3 ?? null,
    total_net_payable_idr: r.totalNetPayableIDR ?? null,
    price_snapshot_ids: r.priceSnapshotIds ? JSON.stringify(r.priceSnapshotIds) : null,
    reopened_at: r.reopenedAt || null,
    reopened_by: r.reopenedBy || null,
    reopen_reason: r.reopenReason || null,
    notes: r.notes || null,
    created_by: r.createdBy || null,
  })));

  return {
    tenants: fixtures.SEED_TENANTS.length,
    settings: 1,
    species: fixtures.SEED_SPECIES.length,
    yards: fixtures.SEED_YARDS.length,
    lots: fixtures.SEED_LOTS.length,
    suppliers: fixtures.SEED_SUPPLIERS.length,
    brokers: fixtures.SEED_BROKERS.length,
    users: fixtures.SEED_USERS.length,
    prices: fixtures.SEED_TIMBER_PRICES.length,
    reportPeriods: fixtures.SEED_REPORT_PERIODS.length,
    contracts: fixtures.SEED_CONTRACTS.length,
    sortimentItems: fixtures.SEED_SORTIMENT_ITEMS.length,
    contractReceipts: fixtures.SEED_CONTRACT_RECEIPTS.length,
    paymentForms: fixtures.SEED_PAYMENT_FORMS.length,
    manifests: fixtures.SEED_MANIFESTS.length,
    receivingItems: fixtures.SEED_RECEIVING_ITEMS.length,
    paymentFormLines: fixtures.SEED_PAYMENT_FORM_LINES.length,
    sales: fixtures.SEED_SALES.length,
    production: fixtures.SEED_PRODUCTION.length,
    sorting: fixtures.SEED_SORTING.length,
  };
}

// Auto-run if executed directly via node scripts/seed-supabase.ts
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Load .env.local if present
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [k, ...v] = trimmed.split('=');
          process.env[k.trim()] = v.join('=').trim();
        }
      }
    }
  } catch {}

  console.log('🌱 Seeding Supabase Database...');
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn('⚠️  NEXT_PUBLIC_SUPABASE_URL not configured in environment. Skipping Supabase seed.');
    process.exit(0);
  }

  seedSupabaseDatabase()
    .then((stats) => {
      console.log('✅ Successfully seeded Supabase database:');
      console.table(stats);
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Failed to seed Supabase database:', err);
      process.exit(1);
    });
}
