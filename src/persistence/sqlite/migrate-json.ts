/**
 * src/persistence/sqlite/migrate-json.ts
 *
 * JSON to SQLite Relational Data Migration Utility.
 * Migrates legacy flat wood receiving records into normalized relational entities:
 * - Tenants, Wood Species, Storage Yards & Lots, Suppliers
 * - Receiving Manifests & Receiving Items
 */

import type { DatabaseSync } from 'node:sqlite';
import type { WoodReceivingRecord } from '../../types/index.ts';

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

export function migrateJsonToSqlite(
  db: DatabaseSync,
  records: WoodReceivingRecord[],
  tenantId = 'default-tenant'
): MigrationResult {
  const slug = tenantId === 'default-tenant'
    ? 'default'
    : (tenantId.toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || 'tenant');

  db.prepare(`
    INSERT INTO tenants (id, name, slug) VALUES (?, ?, ?)
    ON CONFLICT(id) DO NOTHING;
  `).run(tenantId, 'Factory Workspace Tenant', slug);

  const upsertSupplierStmt = db.prepare(`
    INSERT INTO suppliers (id, tenant_id, code, name, contact_person, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
    ON CONFLICT(tenant_id, code) DO UPDATE SET name = excluded.name, updated_at = datetime('now')
    RETURNING id;
  `);

  const upsertSpeciesStmt = db.prepare(`
    INSERT INTO wood_species (id, tenant_id, code, common_name)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(code) DO UPDATE SET common_name = excluded.common_name, updated_at = datetime('now')
    RETURNING id;
  `);

  const upsertYardStmt = db.prepare(`
    INSERT INTO storage_yards (id, tenant_id, yard_code, name)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(tenant_id, yard_code) DO UPDATE SET name = excluded.name, updated_at = datetime('now')
    RETURNING id;
  `);

  const upsertLotStmt = db.prepare(`
    INSERT INTO storage_lots (id, tenant_id, yard_id, lot_code, status)
    VALUES (?, ?, ?, ?, 'ACTIVE')
    ON CONFLICT(tenant_id, yard_id, lot_code) DO UPDATE SET lot_code = excluded.lot_code, updated_at = datetime('now')
    RETURNING id;
  `);

  const insertManifestStmt = db.prepare(`
    INSERT INTO receiving_manifests (
      id, tenant_id, manifest_number, receipt_date, doc_date, truck_plate_number,
      forestry_doc_number, receipt_number, contract_number, supplier_id,
      freight_rate_per_m3, freight_pph_rate, broker_fee, payment_status,
      invoice_number, payment_date, payment_notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      tenant_id = excluded.tenant_id, manifest_number = excluded.manifest_number,
      receipt_date = excluded.receipt_date, doc_date = excluded.doc_date,
      truck_plate_number = excluded.truck_plate_number, forestry_doc_number = excluded.forestry_doc_number,
      receipt_number = excluded.receipt_number, contract_number = excluded.contract_number,
      supplier_id = excluded.supplier_id, freight_rate_per_m3 = excluded.freight_rate_per_m3,
      freight_pph_rate = excluded.freight_pph_rate, broker_fee = excluded.broker_fee,
      payment_status = excluded.payment_status, invoice_number = excluded.invoice_number,
      payment_date = excluded.payment_date, payment_notes = excluded.payment_notes,
      updated_at = excluded.updated_at;
  `);

  const insertItemStmt = db.prepare(`
    INSERT INTO receiving_items (
      id, manifest_id, tenant_id, item_sequence, species_id, lot_id,
      wood_length_m, delivered_pieces, delivered_volume_m3, tally_pieces,
      tally_volume_m3, timber_price_per_m3, timber_pph_rate, notes,
      created_at, updated_at
    ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      manifest_id = excluded.manifest_id, tenant_id = excluded.tenant_id,
      species_id = excluded.species_id, lot_id = excluded.lot_id,
      wood_length_m = excluded.wood_length_m, delivered_pieces = excluded.delivered_pieces,
      delivered_volume_m3 = excluded.delivered_volume_m3, tally_pieces = excluded.tally_pieces,
      tally_volume_m3 = excluded.tally_volume_m3, timber_price_per_m3 = excluded.timber_price_per_m3,
      timber_pph_rate = excluded.timber_pph_rate, updated_at = excluded.updated_at;
  `);

  // Pre-seed lookup maps with existing database records
  const supplierMap = new Map<string, string>();
  for (const s of db.prepare('SELECT id, name FROM suppliers WHERE tenant_id = ?').all(tenantId) as Array<{ id: string; name: string }>) {
    supplierMap.set(s.name, s.id);
  }

  const speciesMap = new Map<string, string>();
  for (const sp of db.prepare('SELECT id, common_name FROM wood_species').all() as Array<{ id: string; common_name: string }>) {
    speciesMap.set(sp.common_name, sp.id);
  }

  const yardMap = new Map<string, string>();
  for (const y of db.prepare('SELECT id, name FROM storage_yards WHERE tenant_id = ?').all(tenantId) as Array<{ id: string; name: string }>) {
    yardMap.set(y.name, y.id);
  }

  const lotMap = new Map<string, string>();
  for (const l of db.prepare('SELECT id, yard_id, lot_code FROM storage_lots WHERE tenant_id = ?').all(tenantId) as Array<{ id: string; yard_id: string; lot_code: string }>) {
    lotMap.set(`${l.yard_id}_${l.lot_code}`, l.id);
  }

  let manifestsCount = 0;
  let itemsCount = 0;

  db.exec('BEGIN TRANSACTION;');
  try {
    for (const rec of records) {
      // 1. Supplier
      const supplierName = (rec.supplierName || 'Unknown Supplier').trim();
      let supplierId = supplierMap.get(supplierName);
      if (!supplierId) {
        const code = toCode(supplierName, 'SUP');
        const newId = `sup-${Math.random().toString(36).slice(2, 9)}`;
        const result = upsertSupplierStmt.get(newId, tenantId, code, supplierName, 'Contact Person') as { id: string };
        supplierId = result.id;
        supplierMap.set(supplierName, supplierId);
      }

      // 2. Wood Species
      const speciesName = (rec.woodSpecies || 'General Timber').trim();
      let speciesId = speciesMap.get(speciesName);
      if (!speciesId) {
        const code = toCode(speciesName, 'SP');
        const newId = `sp-${Math.random().toString(36).slice(2, 9)}`;
        const result = upsertSpeciesStmt.get(newId, tenantId, code, speciesName) as { id: string };
        speciesId = result.id;
        speciesMap.set(speciesName, speciesId);
      }

      // 3. Storage Yard & Lot
      const yardName = (rec.storageYard || 'TPK-General').trim();
      let yardId = yardMap.get(yardName);
      if (!yardId) {
        const yardCode = toCode(yardName, 'YD');
        const newId = `yard-${Math.random().toString(36).slice(2, 9)}`;
        const result = upsertYardStmt.get(newId, tenantId, yardCode, yardName) as { id: string };
        yardId = result.id;
        yardMap.set(yardName, yardId);
      }

      const lotCode = (rec.kavlingNumber || 'KAV-GEN').trim();
      const lotKey = `${yardId}_${lotCode}`;
      let lotId = lotMap.get(lotKey);
      if (!lotId) {
        const newId = `lot-${Math.random().toString(36).slice(2, 9)}`;
        const result = upsertLotStmt.get(newId, tenantId, yardId, lotCode) as { id: string };
        lotId = result.id;
        lotMap.set(lotKey, lotId);
      }

      // 4. Manifest
      const manifestId = rec.id || `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const manifestNumber = `MAN-${manifestId}`;
      const now = new Date().toISOString();
      const freightPphRate = (rec as any).freightPphRate ?? 2.0;

      insertManifestStmt.run(
        manifestId, tenantId, manifestNumber, rec.receiptDate || now.split('T')[0], rec.docDate || null,
        rec.truckPlateNumber || '-', rec.forestryDocNumber || '-', rec.receiptNumber || manifestNumber, rec.contractNumber || '-',
        supplierId, rec.freightRatePerM3 || 0, freightPphRate, rec.brokerFee || 0,
        rec.paymentStatus || 'UNPAID', rec.invoiceNumber || null, rec.paymentDate || null,
        rec.paymentNotes || null, rec.createdAt || now, rec.updatedAt || now
      );
      manifestsCount++;

      // 5. Receiving Item
      const itemId = `item-${manifestId}`;
      insertItemStmt.run(
        itemId, manifestId, tenantId, speciesId, lotId,
        rec.woodLengthM || 4.0, rec.deliveredPieces || 0, rec.deliveredVolumeM3 || 0,
        rec.tallyPieces || 0, rec.tallyVolumeM3 || 0, rec.timberPricePerM3 || 0,
        rec.timberPphRate ?? 0.5, null, rec.createdAt || now, rec.updatedAt || now
      );
      itemsCount++;
    }

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return { manifestsCount, itemsCount };
}
