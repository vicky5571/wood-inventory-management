/**
 * src/persistence/sqlite/migrate-json.ts
 *
 * JSON to SQLite Relational Data Migration Utility.
 * Migrates flat records and multi-item manifests into normalized relational entities:
 * - Tenants, Wood Species, Storage Yards & Lots, Suppliers
 * - Receiving Manifests & Receiving Items
 */

import type { DatabaseSync } from 'node:sqlite';
import type { WoodReceivingRecord, ManifestFormInput } from '../../types/index.ts';

export interface MigrationResult {
  manifestsCount: number;
  itemsCount: number;
}

export const toCode = (name: string, prefix: string, maxLen = 20): string => {
  const clean = name.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length <= maxLen) {
    return `${prefix}-${clean || 'GEN'}`;
  }
  let hash = 2166136261;
  for (let i = 0; i < clean.length; i++) {
    hash ^= clean.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const checksum = (hash >>> 0).toString(16).padStart(4, '0').slice(0, 4).toUpperCase();
  return `${prefix}-${clean.slice(0, Math.max(0, maxLen - 4))}${checksum}`;
};

function ensureTenant(db: DatabaseSync, tenantId: string): void {
  const slug = tenantId === 'default-tenant'
    ? 'default'
    : (tenantId.toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || 'tenant');

  db.prepare(`
    INSERT INTO tenants (id, name, slug) VALUES (?, ?, ?)
    ON CONFLICT(id) DO NOTHING;
  `).run(tenantId, 'Factory Workspace Tenant', slug);
}

function resolveSupplierId(db: DatabaseSync, tenantId: string, rawName: string): string {
  const name = (rawName || 'Unknown Supplier').trim();
  const row = db.prepare('SELECT id FROM suppliers WHERE tenant_id = ? AND name = ?;').get(tenantId, name) as { id: string } | undefined;
  if (row) return row.id;

  const code = toCode(name, 'SUP');
  const newId = `sup-${Math.random().toString(36).slice(2, 9)}`;
  const res = db.prepare(`
    INSERT INTO suppliers (id, tenant_id, code, name, contact_person, is_active)
    VALUES (?, ?, ?, ?, 'Contact Person', 1)
    ON CONFLICT(tenant_id, code) DO UPDATE SET name = excluded.name, updated_at = datetime('now')
    RETURNING id;
  `).get(newId, tenantId, code, name) as { id: string };
  return res.id;
}

function resolveSpeciesId(db: DatabaseSync, tenantId: string, rawName: string): string {
  const name = (rawName || 'General Timber').trim();
  const row = db.prepare('SELECT id FROM wood_species WHERE common_name = ?;').get(name) as { id: string } | undefined;
  if (row) return row.id;

  const code = toCode(name, 'SP');
  const newId = `sp-${Math.random().toString(36).slice(2, 9)}`;
  const res = db.prepare(`
    INSERT INTO wood_species (id, tenant_id, code, common_name)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(code) DO UPDATE SET common_name = excluded.common_name, updated_at = datetime('now')
    RETURNING id;
  `).get(newId, tenantId, code, name) as { id: string };
  return res.id;
}

function resolveLotId(db: DatabaseSync, tenantId: string, rawYardName: string, rawLotCode: string): string {
  const yardName = (rawYardName || 'TPK-General').trim();
  let yardRow = db.prepare('SELECT id FROM storage_yards WHERE tenant_id = ? AND name = ?;').get(tenantId, yardName) as { id: string } | undefined;
  let yardId = yardRow?.id;
  if (!yardId) {
    const yardCode = toCode(yardName, 'YD');
    const newId = `yard-${Math.random().toString(36).slice(2, 9)}`;
    const res = db.prepare(`
      INSERT INTO storage_yards (id, tenant_id, yard_code, name)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(tenant_id, yard_code) DO UPDATE SET name = excluded.name, updated_at = datetime('now')
      RETURNING id;
    `).get(newId, tenantId, yardCode, yardName) as { id: string };
    yardId = res.id;
  }

  const lotCode = (rawLotCode || 'KAV-GEN').trim();
  let lotRow = db.prepare('SELECT id FROM storage_lots WHERE tenant_id = ? AND yard_id = ? AND lot_code = ?;').get(tenantId, yardId, lotCode) as { id: string } | undefined;
  if (lotRow) return lotRow.id;

  const newId = `lot-${Math.random().toString(36).slice(2, 9)}`;
  const res = db.prepare(`
    INSERT INTO storage_lots (id, tenant_id, yard_id, lot_code, status)
    VALUES (?, ?, ?, ?, 'ACTIVE')
    ON CONFLICT(tenant_id, yard_id, lot_code) DO UPDATE SET lot_code = excluded.lot_code, updated_at = datetime('now')
    RETURNING id;
  `).get(newId, tenantId, yardId, lotCode) as { id: string };
  return res.id;
}

function saveManifestCore(
  db: DatabaseSync,
  manifest: ManifestFormInput,
  tenantId: string,
  createdAt?: string,
  updatedAt?: string
): string {
  const supplierId = resolveSupplierId(db, tenantId, manifest.supplierName);
  const manifestId = manifest.id || `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const manifestNumber = `MAN-${manifestId}`;
  const now = new Date().toISOString();
  const cAt = createdAt || now;
  const uAt = updatedAt || now;
  const freightPphRate = (manifest as { freightPphRate?: number }).freightPphRate ?? 2.0;

  db.prepare(`
    INSERT INTO receiving_manifests (
      id, tenant_id, manifest_number, receipt_date, doc_date, truck_plate_number,
      forestry_doc_number, receipt_number, contract_number, supplier_id, broker_id,
      freight_rate_per_m3, freight_pph_rate, broker_fee, payment_status,
      invoice_number, payment_date, payment_notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      tenant_id = excluded.tenant_id, manifest_number = excluded.manifest_number,
      receipt_date = excluded.receipt_date, doc_date = excluded.doc_date,
      truck_plate_number = excluded.truck_plate_number, forestry_doc_number = excluded.forestry_doc_number,
      receipt_number = excluded.receipt_number, contract_number = excluded.contract_number,
      supplier_id = excluded.supplier_id, broker_id = excluded.broker_id,
      freight_rate_per_m3 = excluded.freight_rate_per_m3, freight_pph_rate = excluded.freight_pph_rate,
      broker_fee = excluded.broker_fee, payment_status = excluded.payment_status,
      invoice_number = excluded.invoice_number, payment_date = excluded.payment_date,
      payment_notes = excluded.payment_notes, updated_at = excluded.updated_at;
  `).run(
    manifestId, tenantId, manifestNumber, manifest.receiptDate || now.split('T')[0], manifest.docDate || null,
    manifest.truckPlateNumber || '-', manifest.forestryDocNumber || '-', manifest.receiptNumber || manifestNumber,
    manifest.contractNumber || '-', supplierId, manifest.brokerId || null, manifest.freightRatePerM3 || 0,
    freightPphRate, manifest.brokerFee || 0, manifest.paymentStatus || 'UNPAID', manifest.invoiceNumber || null,
    manifest.paymentDate || null, manifest.paymentNotes || null, cAt, uAt
  );

  db.prepare('DELETE FROM receiving_items WHERE manifest_id = ?;').run(manifestId);

  const insertItemStmt = db.prepare(`
    INSERT INTO receiving_items (
      id, manifest_id, tenant_id, item_sequence, species_id, lot_id,
      wood_length_m, delivered_pieces, delivered_volume_m3, tally_pieces,
      tally_volume_m3, timber_price_per_m3, timber_pph_rate, notes,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      manifest_id = excluded.manifest_id,
      tenant_id = excluded.tenant_id,
      item_sequence = excluded.item_sequence,
      species_id = excluded.species_id,
      lot_id = excluded.lot_id,
      wood_length_m = excluded.wood_length_m,
      delivered_pieces = excluded.delivered_pieces,
      delivered_volume_m3 = excluded.delivered_volume_m3,
      tally_pieces = excluded.tally_pieces,
      tally_volume_m3 = excluded.tally_volume_m3,
      timber_price_per_m3 = excluded.timber_price_per_m3,
      timber_pph_rate = excluded.timber_pph_rate,
      notes = excluded.notes,
      updated_at = excluded.updated_at;
  `);

  const items = manifest.items || [];
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const speciesId = resolveSpeciesId(db, tenantId, item.woodSpecies);
    const lotId = resolveLotId(db, tenantId, item.storageYard, item.kavlingNumber);
    const itemId = item.id || `item-${manifestId}-${idx + 1}`;
    const isPriceNull =
      item.timberPricePerM3 === null ||
      item.timberPricePerM3 === undefined ||
      (typeof item.timberPricePerM3 === 'string' && (item.timberPricePerM3 as string).trim() === '');
    const priceVal = isPriceNull ? null : Number(item.timberPricePerM3);

    insertItemStmt.run(
      itemId, manifestId, tenantId, idx + 1, speciesId, lotId,
      item.woodLengthM || 4.0, item.deliveredPieces || 0, item.deliveredVolumeM3 || 0,
      item.tallyPieces || 0, item.tallyVolumeM3 || 0, priceVal,
      item.timberPphRate ?? 0.5, cAt, uAt
    );
  }

  return manifestId;
}

export function saveManifestToSqlite(
  db: DatabaseSync,
  manifest: ManifestFormInput,
  tenantId = 'default-tenant'
): string {
  ensureTenant(db, tenantId);
  db.exec('BEGIN TRANSACTION;');
  try {
    const manifestId = saveManifestCore(db, manifest, tenantId);
    db.exec('COMMIT;');
    return manifestId;
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

export function migrateJsonToSqlite(
  db: DatabaseSync,
  records: WoodReceivingRecord[],
  tenantId = 'default-tenant'
): MigrationResult {
  ensureTenant(db, tenantId);
  let manifestsCount = 0;
  let itemsCount = 0;

  db.exec('BEGIN TRANSACTION;');
  try {
    for (const rec of records) {
      const manifest: ManifestFormInput = {
        id: rec.id || `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        receiptDate: rec.receiptDate,
        docDate: rec.docDate,
        truckPlateNumber: rec.truckPlateNumber,
        forestryDocNumber: rec.forestryDocNumber,
        receiptNumber: rec.receiptNumber,
        contractNumber: rec.contractNumber,
        supplierName: rec.supplierName,
        freightRatePerM3: rec.freightRatePerM3,
        brokerFee: rec.brokerFee,
        paymentStatus: rec.paymentStatus,
        invoiceNumber: rec.invoiceNumber,
        paymentDate: rec.paymentDate,
        paymentNotes: rec.paymentNotes,
        items: [
          {
            id: `item-${rec.id}`,
            woodSpecies: rec.woodSpecies,
            woodLengthM: rec.woodLengthM,
            kavlingNumber: rec.kavlingNumber,
            storageYard: rec.storageYard,
            deliveredPieces: rec.deliveredPieces,
            deliveredVolumeM3: rec.deliveredVolumeM3,
            tallyPieces: rec.tallyPieces,
            tallyVolumeM3: rec.tallyVolumeM3,
            timberPricePerM3: rec.timberPricePerM3,
            timberPphRate: rec.timberPphRate,
          },
        ],
      };
      saveManifestCore(db, manifest, tenantId, rec.createdAt, rec.updatedAt);
      manifestsCount++;
      itemsCount += manifest.items.length;
    }
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return { manifestsCount, itemsCount };
}
