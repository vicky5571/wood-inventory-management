/**
 * scripts/seed-db.ts
 *
 * Idempotent SQLite Database Seeder.
 * Populates all 17 domain entities using ON CONFLICT DO UPDATE upserts
 * inside an atomic transaction. Validates FK integrity before writing.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DatabaseSync } from 'node:sqlite';
import { createSqliteDatabase } from '../src/persistence/sqlite/db.ts';
import { runMigrations } from '../src/persistence/sqlite/migrations.ts';
import { ensureSalesTable } from '../src/persistence/sqlite/sales-queries.ts';
import * as fixtures from '../src/persistence/seed/fixtures.ts';

export interface SeedResult {
  tenants: number;
  settings: number;
  species: number;
  yards: number;
  lots: number;
  suppliers: number;
  brokers: number;
  prices: number;
  contracts: number;
  sortimentItems: number;
  contractReceipts: number;
  manifests: number;
  receivingItems: number;
  paymentForms: number;
  paymentFormLines: number;
  sales: number;
  production: number;
  sorting: number;
  users: number;
  items: number; // Backward compat alias for receivingItems
}

export function seedDatabase(customDbPath?: string): SeedResult {
  // 1. Pre-seed validation
  const validation = fixtures.validateFixtureConsistency();
  if (!validation.ok) {
    throw new Error(`Fixture validation failed with ${validation.errors.length} errors:\n${validation.errors.join('\n')}`);
  }

  const db = createSqliteDatabase(customDbPath);
  runMigrations(db);
  ensureSalesTable(db);

  // 2. Execute idempotent upserts in an atomic transaction
  db.exec('BEGIN TRANSACTION;');
  try {
    // Master data
    upsertTenants(db);
    upsertSettings(db);
    upsertSpecies(db);
    upsertYards(db);
    upsertLots(db);
    upsertSuppliers(db);
    upsertBrokers(db);
    upsertPriceEntries(db);

    // Contracts
    upsertContracts(db);
    upsertSortimentItems(db);
    upsertContractReceipts(db);

    // 2-Pass Payment Forms: Pass 1 (insert without refs)
    upsertPaymentFormsPass1(db);

    // Receiving
    upsertManifests(db);
    upsertReceivingItems(db);

    // 2-Pass Payment Forms: Pass 2 (update refs) & Lines
    upsertPaymentFormsPass2(db);
    upsertPaymentFormLines(db);

    // Operational
    upsertSales(db);
    upsertProduction(db);
    upsertSorting(db);
    upsertUsers(db);

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  // 3. Fallback JSON sync for backward compatibility
  const jsonPath = path.resolve(process.cwd(), 'data/wood_records.json');
  try {
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify(fixtures.SEED_WOOD_RECORDS, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Notice: Could not write fallback JSON:', err);
  }

  // 4. Query counts
  const count = (tbl: string) =>
    (db.prepare(`SELECT COUNT(*) AS c FROM ${tbl};`).get() as { c: number }).c;

  const result: SeedResult = {
    tenants: count('tenants'),
    settings: count('app_settings'),
    species: count('wood_species'),
    yards: count('storage_yards'),
    lots: count('storage_lots'),
    suppliers: count('suppliers'),
    brokers: count('brokers'),
    prices: count('timber_price_entries'),
    contracts: count('perhutani_contracts'),
    sortimentItems: count('contract_sortiment_items'),
    contractReceipts: count('contract_receipts'),
    manifests: count('receiving_manifests'),
    receivingItems: count('receiving_items'),
    paymentForms: count('payment_forms'),
    paymentFormLines: count('payment_form_lines'),
    sales: count('sales_records'),
    production: count('sawmill_production_records'),
    sorting: count('stock_sorting_records'),
    users: count('users'),
    items: count('receiving_items'),
  };

  return result;
}

function upsertTenants(db: DatabaseSync) {
  const stmt = db.prepare(`
    INSERT INTO tenants (id, name, slug) VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, slug = excluded.slug, updated_at = datetime('now');
  `);
  for (const t of fixtures.SEED_TENANTS) stmt.run(t.id, t.name, t.slug);
}

function upsertSettings(db: DatabaseSync) {
  const s = fixtures.SEED_SETTINGS;
  db.prepare(`
    INSERT INTO app_settings (
      tenant_id, default_timber_pph_rate, default_freight_pph_rate, default_broker_fee,
      discrepancy_alarm_volume_m3, discrepancy_alarm_percent, yard_name, yard_code, company_name, updated_at
    ) VALUES ('default-tenant', ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(tenant_id) DO UPDATE SET
      default_timber_pph_rate = excluded.default_timber_pph_rate,
      default_freight_pph_rate = excluded.default_freight_pph_rate,
      default_broker_fee = excluded.default_broker_fee,
      discrepancy_alarm_volume_m3 = excluded.discrepancy_alarm_volume_m3,
      discrepancy_alarm_percent = excluded.discrepancy_alarm_percent,
      yard_name = excluded.yard_name, yard_code = excluded.yard_code,
      company_name = excluded.company_name, updated_at = datetime('now');
  `).run(
    s.defaultTimberPphRate, s.defaultFreightPphRate, s.defaultBrokerFee,
    s.discrepancyAlarmVolumeM3, s.discrepancyAlarmPercent, s.yardName, s.yardCode, s.companyName
  );
}

function upsertSpecies(db: DatabaseSync) {
  const stmt = db.prepare(`
    INSERT INTO wood_species (id, tenant_id, code, common_name, botanical_name, density_kg_m3, is_hardwood)
    VALUES (?, 'default-tenant', ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET code = excluded.code, common_name = excluded.common_name,
      botanical_name = excluded.botanical_name, density_kg_m3 = excluded.density_kg_m3,
      is_hardwood = excluded.is_hardwood, updated_at = datetime('now');
  `);
  for (const sp of fixtures.SEED_SPECIES) {
    stmt.run(sp.id, sp.code, sp.commonName, sp.botanicalName || null, sp.densityKgM3, sp.isHardwood ? 1 : 0);
  }
}

function upsertYards(db: DatabaseSync) {
  const stmt = db.prepare(`
    INSERT INTO storage_yards (id, tenant_id, yard_code, name, description) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET yard_code = excluded.yard_code, name = excluded.name,
      description = excluded.description, updated_at = datetime('now');
  `);
  for (const y of fixtures.SEED_YARDS) stmt.run(y.id, y.tenantId, y.yardCode, y.name, y.description || null);
}

function upsertLots(db: DatabaseSync) {
  const stmt = db.prepare(`
    INSERT INTO storage_lots (id, tenant_id, yard_id, lot_code, status) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET yard_id = excluded.yard_id, lot_code = excluded.lot_code,
      status = excluded.status, updated_at = datetime('now');
  `);
  for (const l of fixtures.SEED_LOTS) stmt.run(l.id, l.tenantId, l.yardId, l.lotCode, l.status);
}

function upsertSuppliers(db: DatabaseSync) {
  const stmt = db.prepare(`
    INSERT INTO suppliers (id, tenant_id, code, name, contact_person, phone, address, tax_id_npwp, is_active, notes)
    VALUES (?, 'default-tenant', ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET code = excluded.code, name = excluded.name,
      contact_person = excluded.contact_person, phone = excluded.phone, address = excluded.address,
      tax_id_npwp = excluded.tax_id_npwp, is_active = excluded.is_active, notes = excluded.notes,
      updated_at = datetime('now');
  `);
  for (const s of fixtures.SEED_SUPPLIERS) {
    stmt.run(s.id, s.code, s.name, s.contactPerson || null, s.phone || null, s.address || null, s.taxId || null, s.status === 'ACTIVE' ? 1 : 0, s.notes || null);
  }
}

function upsertBrokers(db: DatabaseSync) {
  const stmt = db.prepare(`
    INSERT INTO brokers (id, tenant_id, code, name, contact_person, phone, address, tax_id, default_commission_per_m3, notes, status)
    VALUES (?, 'default-tenant', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET code = excluded.code, name = excluded.name,
      contact_person = excluded.contact_person, phone = excluded.phone, address = excluded.address,
      tax_id = excluded.tax_id, default_commission_per_m3 = excluded.default_commission_per_m3,
      notes = excluded.notes, status = excluded.status, updated_at = datetime('now');
  `);
  for (const b of fixtures.SEED_BROKERS) {
    stmt.run(b.id, b.code, b.name, b.contactPerson || null, b.phone || null, b.address || null, b.taxId || null, b.defaultCommissionPerM3 ?? null, b.notes || null, b.status);
  }
}

function upsertPriceEntries(db: DatabaseSync) {
  const stmt = db.prepare(`
    INSERT INTO timber_price_entries (
      id, tenant_id, species_id, wood_species_name, supplier_id, supplier_name,
      effective_from, effective_to, price_per_m3, timber_pph_rate,
      notes, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      species_id = excluded.species_id,
      wood_species_name = excluded.wood_species_name,
      supplier_id = excluded.supplier_id,
      supplier_name = excluded.supplier_name,
      effective_from = excluded.effective_from,
      effective_to = excluded.effective_to,
      price_per_m3 = excluded.price_per_m3,
      timber_pph_rate = excluded.timber_pph_rate,
      notes = excluded.notes,
      updated_at = datetime('now');
  `);
  for (const p of fixtures.SEED_TIMBER_PRICES) {
    stmt.run(
      p.id,
      p.tenantId,
      p.speciesId,
      p.woodSpecies,
      p.supplierId || null,
      p.supplierName || null,
      p.effectiveFrom,
      p.effectiveTo || null,
      p.pricePerM3,
      p.timberPphRate,
      p.notes || null,
      p.createdBy || null,
      p.createdAt,
      p.updatedAt
    );
  }
}

function upsertContracts(db: DatabaseSync) {
  const stmt = db.prepare(`
    INSERT INTO perhutani_contracts (
      id, tenant_id, contract_number, contract_date, effective_start_date, effective_end_date,
      kph_origin, po_number, total_contract_value_idr, total_purchased_volume_m3, total_purchased_pieces, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET contract_number = excluded.contract_number, contract_date = excluded.contract_date,
      effective_start_date = excluded.effective_start_date, effective_end_date = excluded.effective_end_date,
      kph_origin = excluded.kph_origin, po_number = excluded.po_number,
      total_contract_value_idr = excluded.total_contract_value_idr,
      total_purchased_volume_m3 = excluded.total_purchased_volume_m3,
      total_purchased_pieces = excluded.total_purchased_pieces, status = excluded.status,
      notes = excluded.notes, updated_at = datetime('now');
  `);
  for (const c of fixtures.SEED_CONTRACTS) {
    stmt.run(c.id, c.tenantId, c.contractNumber, c.contractDate, c.effectiveStartDate, c.effectiveEndDate, c.kphOrigin, c.poNumber || null, c.totalContractValueIDR, c.totalPurchasedVolumeM3, c.totalPurchasedPieces, c.status, c.notes || null);
  }
}

function upsertSortimentItems(db: DatabaseSync) {
  const stmt = db.prepare(`
    INSERT INTO contract_sortiment_items (
      id, contract_id, tenant_id, item_sequence, wood_species, grade, wood_length_m,
      volume_m3, pieces, price_per_m3, subtotal_idr, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET contract_id = excluded.contract_id, item_sequence = excluded.item_sequence,
      wood_species = excluded.wood_species, grade = excluded.grade, wood_length_m = excluded.wood_length_m,
      volume_m3 = excluded.volume_m3, pieces = excluded.pieces, price_per_m3 = excluded.price_per_m3,
      subtotal_idr = excluded.subtotal_idr, notes = excluded.notes;
  `);
  for (const i of fixtures.SEED_SORTIMENT_ITEMS) {
    stmt.run(i.id, i.contractId, i.tenantId, i.itemSequence, i.woodSpecies, i.grade, i.woodLengthM ?? null, i.volumeM3, i.pieces ?? null, i.pricePerM3, i.subtotalIDR, i.notes || null);
  }
}

function upsertContractReceipts(db: DatabaseSync) {
  const stmt = db.prepare(`
    INSERT INTO contract_receipts (
      id, contract_id, tenant_id, receipt_number, receipt_date, amount_idr, covered_volume_m3, covered_pieces, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET contract_id = excluded.contract_id, receipt_number = excluded.receipt_number,
      receipt_date = excluded.receipt_date, amount_idr = excluded.amount_idr,
      covered_volume_m3 = excluded.covered_volume_m3, covered_pieces = excluded.covered_pieces,
      notes = excluded.notes, updated_at = datetime('now');
  `);
  for (const r of fixtures.SEED_CONTRACT_RECEIPTS) {
    stmt.run(r.id, r.contractId, r.tenantId, r.receiptNumber, r.receiptDate, r.amountIDR, r.coveredVolumeM3, r.coveredPieces ?? null, r.notes || null);
  }
}

function upsertPaymentFormsPass1(db: DatabaseSync) {
  const stmt = db.prepare(`
    INSERT INTO payment_forms (
      id, tenant_id, preprinted_number, issue_date, week_start_date, week_end_date,
      supplier_name, supplier_id, wood_species, contract_number, record_ids, item_ids,
      total_amount_idr, terbilang, total_tally_volume_m3, total_tally_pieces,
      total_timber_gross_idr, total_timber_pph_idr, total_timber_net_idr, status,
      issued_at, paid_at, invoice_number, payment_date, payment_method, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', '[]', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      preprinted_number = excluded.preprinted_number, issue_date = excluded.issue_date,
      week_start_date = excluded.week_start_date, week_end_date = excluded.week_end_date,
      supplier_name = excluded.supplier_name, supplier_id = excluded.supplier_id,
      wood_species = excluded.wood_species, contract_number = excluded.contract_number,
      total_amount_idr = excluded.total_amount_idr, terbilang = excluded.terbilang,
      total_tally_volume_m3 = excluded.total_tally_volume_m3, total_tally_pieces = excluded.total_tally_pieces,
      total_timber_gross_idr = excluded.total_timber_gross_idr, total_timber_pph_idr = excluded.total_timber_pph_idr,
      total_timber_net_idr = excluded.total_timber_net_idr, status = excluded.status,
      issued_at = excluded.issued_at, paid_at = excluded.paid_at,
      invoice_number = excluded.invoice_number, payment_date = excluded.payment_date,
      payment_method = excluded.payment_method, notes = excluded.notes, updated_at = datetime('now');
  `);
  for (const p of fixtures.SEED_PAYMENT_FORMS) {
    stmt.run(
      p.id, p.tenantId, p.preprintedNumber, p.issueDate, p.weekStartDate, p.weekEndDate,
      p.supplierName, p.supplierId || null, p.woodSpecies, p.contractNumber,
      p.totalAmountIDR, p.terbilang, p.totalTallyVolumeM3, p.totalTallyPieces,
      p.totalTimberGrossIDR, p.totalTimberPphIDR, p.totalTimberNetIDR, p.status,
      p.issuedAt || null, p.paidAt || null, p.invoiceNumber || null,
      p.paymentDate || null, p.paymentMethod || null, p.notes || null
    );
  }
}

function upsertManifests(db: DatabaseSync) {
  const stmt = db.prepare(`
    INSERT INTO receiving_manifests (
      id, tenant_id, manifest_number, receipt_date, doc_date, truck_plate_number,
      forestry_doc_number, receipt_number, contract_number, supplier_id, broker_id,
      freight_rate_per_m3, freight_pph_rate, broker_fee, payment_status,
      invoice_number, payment_date, payment_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      manifest_number = excluded.manifest_number, receipt_date = excluded.receipt_date,
      doc_date = excluded.doc_date, truck_plate_number = excluded.truck_plate_number,
      forestry_doc_number = excluded.forestry_doc_number, receipt_number = excluded.receipt_number,
      contract_number = excluded.contract_number, supplier_id = excluded.supplier_id,
      broker_id = excluded.broker_id, freight_rate_per_m3 = excluded.freight_rate_per_m3,
      freight_pph_rate = excluded.freight_pph_rate, broker_fee = excluded.broker_fee,
      payment_status = excluded.payment_status, invoice_number = excluded.invoice_number,
      payment_date = excluded.payment_date, payment_notes = excluded.payment_notes,
      updated_at = datetime('now');
  `);
  for (const m of fixtures.SEED_MANIFESTS) {
    stmt.run(
      m.id, m.tenantId, m.manifestNumber, m.receiptDate, m.docDate || null,
      m.truckPlateNumber, m.forestryDocNumber, m.receiptNumber, m.contractNumber,
      m.supplierId, m.brokerId || null, m.freightRatePerM3, m.freightPphRate,
      m.brokerFee, m.paymentStatus, m.invoiceNumber || null,
      m.paymentDate || null, m.paymentNotes || null
    );
  }
}

function upsertReceivingItems(db: DatabaseSync) {
  const stmt = db.prepare(`
    INSERT INTO receiving_items (
      id, manifest_id, tenant_id, item_sequence, species_id, lot_id, wood_length_m,
      delivered_pieces, delivered_volume_m3, tally_pieces, tally_volume_m3,
      timber_price_per_m3, timber_pph_rate, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      manifest_id = excluded.manifest_id, item_sequence = excluded.item_sequence,
      species_id = excluded.species_id, lot_id = excluded.lot_id,
      wood_length_m = excluded.wood_length_m, delivered_pieces = excluded.delivered_pieces,
      delivered_volume_m3 = excluded.delivered_volume_m3, tally_pieces = excluded.tally_pieces,
      tally_volume_m3 = excluded.tally_volume_m3, timber_price_per_m3 = excluded.timber_price_per_m3,
      timber_pph_rate = excluded.timber_pph_rate, notes = excluded.notes,
      updated_at = datetime('now');
  `);
  for (const item of fixtures.SEED_RECEIVING_ITEMS) {
    stmt.run(
      item.id, item.manifestId, item.tenantId, item.itemSequence, item.speciesId,
      item.lotId || null, item.woodLengthM, item.deliveredPieces, item.deliveredVolumeM3,
      item.tallyPieces, item.tallyVolumeM3, item.timberPricePerM3 ?? null,
      item.timberPphRate, item.notes || null
    );
  }
}

function upsertPaymentFormsPass2(db: DatabaseSync) {
  const stmt = db.prepare(`
    UPDATE payment_forms SET record_ids = ?, item_ids = ?, updated_at = datetime('now') WHERE id = ?;
  `);
  for (const p of fixtures.SEED_PAYMENT_FORMS) {
    stmt.run(JSON.stringify(p.recordIds), JSON.stringify(p.itemIds), p.id);
  }
}

function upsertPaymentFormLines(db: DatabaseSync) {
  const stmt = db.prepare(`
    INSERT INTO payment_form_lines (
      id, payment_form_id, tenant_id, item_sequence, kategori, konten, tujuan,
      harga_satuan_idr, jumlah, unit, total_idr, source_record_id, source_item_id, notes
    ) VALUES (?, ?, 'default-tenant', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      payment_form_id = excluded.payment_form_id, item_sequence = excluded.item_sequence,
      kategori = excluded.kategori, konten = excluded.konten, tujuan = excluded.tujuan,
      harga_satuan_idr = excluded.harga_satuan_idr, jumlah = excluded.jumlah,
      unit = excluded.unit, total_idr = excluded.total_idr,
      source_record_id = excluded.source_record_id, source_item_id = excluded.source_item_id,
      notes = excluded.notes, updated_at = datetime('now');
  `);
  for (const line of fixtures.SEED_PAYMENT_FORM_LINES) {
    stmt.run(
      line.id, line.paymentFormId, line.itemSequence, line.kategori, line.konten,
      line.tujuan, line.hargaSatuanIDR, line.jumlah, line.unit, line.totalIDR,
      line.sourceRecordId || null, line.sourceItemId || null, line.notes || null
    );
  }
}

function upsertSales(db: DatabaseSync) {
  const stmt = db.prepare(`
    INSERT INTO sales_records (
      id, sale_date, delivery_order_number, truck_plate_number, driver_name, customer_name,
      storage_yard, kavling_number, wood_species, pieces, volume_m3, price_per_m3,
      total_price, payment_status, invoice_number, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      sale_date = excluded.sale_date, delivery_order_number = excluded.delivery_order_number,
      truck_plate_number = excluded.truck_plate_number, driver_name = excluded.driver_name,
      customer_name = excluded.customer_name, storage_yard = excluded.storage_yard,
      kavling_number = excluded.kavling_number, wood_species = excluded.wood_species,
      pieces = excluded.pieces, volume_m3 = excluded.volume_m3,
      price_per_m3 = excluded.price_per_m3, total_price = excluded.total_price,
      payment_status = excluded.payment_status, invoice_number = excluded.invoice_number,
      notes = excluded.notes, updated_at = datetime('now');
  `);
  for (const s of fixtures.SEED_SALES) {
    stmt.run(
      s.id, s.saleDate, s.deliveryOrderNumber, s.truckPlateNumber, s.driverName || null,
      s.customerName, s.storageYard, s.kavlingNumber, s.woodSpecies, s.pieces, s.volumeM3,
      s.pricePerM3, s.totalPrice, s.paymentStatus, s.invoiceNumber || null, s.notes || null
    );
  }
}

function upsertProduction(db: DatabaseSync) {
  const stmt = db.prepare(`
    INSERT INTO sawmill_production_records (
      id, tenant_id, production_date, shift, source_storage_yard, source_kavling_number,
      input_species, input_volume_m3, input_pieces, output_product, output_volume_m3,
      output_pieces, operator_name, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      production_date = excluded.production_date, shift = excluded.shift,
      source_storage_yard = excluded.source_storage_yard,
      source_kavling_number = excluded.source_kavling_number,
      input_species = excluded.input_species, input_volume_m3 = excluded.input_volume_m3,
      input_pieces = excluded.input_pieces, output_product = excluded.output_product,
      output_volume_m3 = excluded.output_volume_m3, output_pieces = excluded.output_pieces,
      operator_name = excluded.operator_name, notes = excluded.notes,
      updated_at = datetime('now');
  `);
  for (const p of fixtures.SEED_PRODUCTION) {
    stmt.run(
      p.id, p.tenantId, p.productionDate, p.shift || null, p.sourceStorageYard,
      p.sourceKavlingNumber, p.inputSpecies, p.inputVolumeM3, p.inputPieces,
      p.outputProduct, p.outputVolumeM3, p.outputPieces, p.operatorName, p.notes || null
    );
  }
}

function upsertSorting(db: DatabaseSync) {
  const stmt = db.prepare(`
    INSERT INTO stock_sorting_records (
      id, tenant_id, sorting_date, species, source_storage_yard, source_kavling_number,
      target_storage_yard, target_kavling_number, volume_m3, pieces, reason, operator_name, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      sorting_date = excluded.sorting_date, species = excluded.species,
      source_storage_yard = excluded.source_storage_yard,
      source_kavling_number = excluded.source_kavling_number,
      target_storage_yard = excluded.target_storage_yard,
      target_kavling_number = excluded.target_kavling_number,
      volume_m3 = excluded.volume_m3, pieces = excluded.pieces,
      reason = excluded.reason, operator_name = excluded.operator_name,
      notes = excluded.notes, updated_at = datetime('now');
  `);
  for (const s of fixtures.SEED_SORTING) {
    stmt.run(
      s.id, s.tenantId, s.sortingDate, s.species, s.sourceStorageYard,
      s.sourceKavlingNumber, s.targetStorageYard, s.targetKavlingNumber,
      s.volumeM3, s.pieces, s.reason, s.operatorName, s.notes || null
    );
  }
}

function upsertUsers(db: DatabaseSync) {
  const stmt = db.prepare(`
    INSERT INTO users (id, email, name, role_level, title, permissions, password_hash, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      name = excluded.name,
      role_level = excluded.role_level,
      title = excluded.title,
      permissions = excluded.permissions,
      password_hash = excluded.password_hash,
      is_active = excluded.is_active,
      updated_at = datetime('now');
  `);
  for (const u of fixtures.SEED_USERS) {
    const permissionsJson = u.permissions ? JSON.stringify(u.permissions) : null;
    stmt.run(
      u.id,
      u.email,
      u.name,
      u.roleLevel,
      u.title,
      permissionsJson,
      u.passwordHash,
      u.isActive ? 1 : 0
    );
  }
}

// Direct CLI invocation
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log('🌱 Seeding Wood Inventory Database (SQLite)...');
  const start = Date.now();
  const stats = seedDatabase();
  const elapsed = Date.now() - start;

  console.log(`✅ Database seeded successfully in ${elapsed}ms:`);
  console.log(`   - Tenants:                  ${stats.tenants}`);
  console.log(`   - App Settings:             ${stats.settings}`);
  console.log(`   - Storage Yards:            ${stats.yards}`);
  console.log(`   - Storage Lots (Kavling):   ${stats.lots}`);
  console.log(`   - Wood Species:             ${stats.species}`);
  console.log(`   - Suppliers:                ${stats.suppliers}`);
  console.log(`   - Brokers:                  ${stats.brokers}`);
  console.log(`   - Timber Prices:            ${stats.prices}`);
  console.log(`   - Users:                    ${stats.users}`);
  console.log(`   - Perhutani Contracts:      ${stats.contracts}`);
  console.log(`   - Contract Sortiment Items: ${stats.sortimentItems}`);
  console.log(`   - Contract Receipts:        ${stats.contractReceipts}`);
  console.log(`   - Inbound Manifests:        ${stats.manifests}`);
  console.log(`   - Receiving Items:          ${stats.receivingItems}`);
  console.log(`   - Payment Forms:            ${stats.paymentForms}`);
  console.log(`   - Payment Form Lines:       ${stats.paymentFormLines}`);
  console.log(`   - Outbound Sales:           ${stats.sales}`);
  console.log(`   - Sawmill Production:       ${stats.production}`);
  console.log(`   - Stock Sorting:            ${stats.sorting}`);
}
