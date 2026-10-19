import { supabaseFetch } from './supabase-client.ts';
import type {
  WoodReceivingRecord,
  ManifestFormInput,
  RecordQueryParams,
  PaginatedResult,
  PaymentStatus,
} from '../../types/index.ts';

const ALLOWED_SORT_COLUMNS = new Set<string>([
  'receiptDate',
  'truckPlateNumber',
  'supplierName',
  'tallyVolumeM3',
  'grandNetPayable',
  'createdAt',
]);

export class SupabaseRecordStore {
  private tenantCache = new Set<string>();
  private supplierCache = new Map<string, string>();
  private speciesCache = new Map<string, string>();
  private yardCache = new Map<string, string>();
  private lotCache = new Map<string, string>();

  private async ensureTenant(tenantId = 'default-tenant'): Promise<string> {
    if (this.tenantCache.has(tenantId)) return tenantId;
    try {
      const existing = await supabaseFetch<{ id: string }[]>(
        `/tenants?id=eq.${encodeURIComponent(tenantId)}&select=id`
      );
      if (existing.length === 0) {
        await supabaseFetch('/tenants', {
          method: 'POST',
          prefer: 'resolution=ignore-duplicates',
          body: JSON.stringify({
            id: tenantId,
            name: 'Default Timber Factory',
            slug: 'default-timber-factory',
          }),
        });
      }
      this.tenantCache.add(tenantId);
    } catch {
      // Non-fatal if tenant already exists or RLS policy restricts
    }
    return tenantId;
  }

  private async resolveSupplierId(supplierName: string, tenantId = 'default-tenant'): Promise<string> {
    const cleanName = (supplierName || 'Unknown Supplier').trim();
    if (this.supplierCache.has(cleanName)) return this.supplierCache.get(cleanName)!;

    try {
      const existing = await supabaseFetch<{ id: string }[]>(
        `/suppliers?name=eq.${encodeURIComponent(cleanName)}&select=id`
      );
      if (existing.length > 0) {
        this.supplierCache.set(cleanName, existing[0].id);
        return existing[0].id;
      }

      const newId = `sup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const created = await supabaseFetch<{ id: string }[]>('/suppliers', {
        method: 'POST',
        prefer: 'return=representation',
        body: JSON.stringify({
          id: newId,
          tenant_id: tenantId,
          name: cleanName,
        }),
      });
      const resolved = created[0]?.id || newId;
      this.supplierCache.set(cleanName, resolved);
      return resolved;
    } catch {
      return `sup-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    }
  }

  private async resolveSpeciesId(speciesName: string): Promise<string> {
    const cleanName = (speciesName || 'Generic Timber').trim();
    if (this.speciesCache.has(cleanName)) return this.speciesCache.get(cleanName)!;

    try {
      const existing = await supabaseFetch<{ id: string }[]>(
        `/wood_species?common_name=eq.${encodeURIComponent(cleanName)}&select=id`
      );
      if (existing.length > 0) {
        this.speciesCache.set(cleanName, existing[0].id);
        return existing[0].id;
      }

      const newId = `spec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const code = cleanName.slice(0, 10).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'TIMBER';
      const created = await supabaseFetch<{ id: string }[]>('/wood_species', {
        method: 'POST',
        prefer: 'return=representation',
        body: JSON.stringify({
          id: newId,
          code,
          common_name: cleanName,
          botanical_name: cleanName,
          density_kg_m3: 750,
          is_hardwood: true,
        }),
      });
      const resolved = created[0]?.id || newId;
      this.speciesCache.set(cleanName, resolved);
      return resolved;
    } catch {
      return `spec-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    }
  }

  private async resolveYardId(yardName: string, tenantId = 'default-tenant'): Promise<string> {
    const cleanName = (yardName || 'TPK-General').trim();
    if (this.yardCache.has(cleanName)) return this.yardCache.get(cleanName)!;

    try {
      const existing = await supabaseFetch<{ id: string }[]>(
        `/storage_yards?name=eq.${encodeURIComponent(cleanName)}&select=id`
      );
      if (existing.length > 0) {
        this.yardCache.set(cleanName, existing[0].id);
        return existing[0].id;
      }

      const newId = `yard-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const created = await supabaseFetch<{ id: string }[]>('/storage_yards', {
        method: 'POST',
        prefer: 'return=representation',
        body: JSON.stringify({
          id: newId,
          tenant_id: tenantId,
          name: cleanName,
          location_code: cleanName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12) || 'YARD',
        }),
      });
      const resolved = created[0]?.id || newId;
      this.yardCache.set(cleanName, resolved);
      return resolved;
    } catch {
      return `yard-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    }
  }

  private async resolveLotId(yardName: string, lotCode: string, tenantId = 'default-tenant'): Promise<string | null> {
    const cleanLot = (lotCode || '').trim();
    if (!cleanLot) return null;
    const yardId = await this.resolveYardId(yardName, tenantId);
    const cacheKey = `${yardId}:${cleanLot}`;
    if (this.lotCache.has(cacheKey)) return this.lotCache.get(cacheKey)!;

    try {
      const existing = await supabaseFetch<{ id: string }[]>(
        `/storage_lots?yard_id=eq.${encodeURIComponent(yardId)}&lot_code=eq.${encodeURIComponent(cleanLot)}&select=id`
      );
      if (existing.length > 0) {
        this.lotCache.set(cacheKey, existing[0].id);
        return existing[0].id;
      }

      const newId = `lot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const created = await supabaseFetch<{ id: string }[]>('/storage_lots', {
        method: 'POST',
        prefer: 'return=representation',
        body: JSON.stringify({
          id: newId,
          tenant_id: tenantId,
          yard_id: yardId,
          lot_code: cleanLot,
        }),
      });
      const resolved = created[0]?.id || newId;
      this.lotCache.set(cacheKey, resolved);
      return resolved;
    } catch {
      return null;
    }
  }

  async getAll(): Promise<WoodReceivingRecord[]> {
    const records = await supabaseFetch<WoodReceivingRecord[]>(
      '/v_buku_besar_flat?select=*&order=receiptDate.desc,createdAt.desc'
    );
    return records.map(this.normalizeRecord);
  }

  async getPaginated(params: RecordQueryParams = {}): Promise<PaginatedResult<WoodReceivingRecord>> {
    const all = await this.getAll();

    let filtered = all;

    if (params.searchQuery && params.searchQuery.trim().length > 0) {
      const q = params.searchQuery.trim().toLowerCase();
      filtered = filtered.filter((r) =>
        (r.truckPlateNumber && r.truckPlateNumber.toLowerCase().includes(q)) ||
        (r.forestryDocNumber && r.forestryDocNumber.toLowerCase().includes(q)) ||
        (r.receiptNumber && r.receiptNumber.toLowerCase().includes(q)) ||
        (r.contractNumber && r.contractNumber.toLowerCase().includes(q)) ||
        (r.supplierName && r.supplierName.toLowerCase().includes(q)) ||
        (r.invoiceNumber && r.invoiceNumber.toLowerCase().includes(q))
      );
    }

    if (params.species && params.species.trim().length > 0) {
      filtered = filtered.filter((r) => r.woodSpecies === params.species!.trim());
    }

    if (params.kavling && params.kavling.trim().length > 0) {
      filtered = filtered.filter((r) => r.kavlingNumber === params.kavling!.trim());
    }

    if (params.yard && params.yard.trim().length > 0) {
      filtered = filtered.filter((r) => r.storageYard === params.yard!.trim());
    }

    const statusFilter = params.status || (params.paymentStatus && params.paymentStatus !== 'ALL' ? params.paymentStatus : undefined);
    if (statusFilter && statusFilter.trim().length > 0) {
      filtered = filtered.filter((r) => r.paymentStatus === statusFilter.trim());
    }

    if (params.startDate && params.startDate.trim().length > 0) {
      filtered = filtered.filter((r) => r.receiptDate >= params.startDate!.trim());
    }

    if (params.endDate && params.endDate.trim().length > 0) {
      filtered = filtered.filter((r) => r.receiptDate <= params.endDate!.trim());
    }

    const sortBy = params.sortBy && ALLOWED_SORT_COLUMNS.has(params.sortBy) ? params.sortBy : 'receiptDate';
    const sortOrder = String(params.sortOrder || '').toLowerCase() === 'asc' ? 1 : -1;

    filtered.sort((a: any, b: any) => {
      const aVal = a[sortBy] ?? '';
      const bVal = b[sortBy] ?? '';
      if (aVal < bVal) return -1 * sortOrder;
      if (aVal > bVal) return 1 * sortOrder;
      return 0;
    });

    const totalCount = filtered.length;
    const page = Math.max(1, Number(params.page) || 1);
    const rawPageSize = params.pageSize !== undefined ? Number(params.pageSize) : 50;
    const pageSize = rawPageSize === -1 ? -1 : Math.max(1, rawPageSize || 50);

    let data: WoodReceivingRecord[];
    let totalPages: number;

    if (pageSize === -1) {
      data = filtered;
      totalPages = 1;
    } else {
      totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
      const offset = (page - 1) * pageSize;
      data = filtered.slice(offset, offset + pageSize);
    }

    const pagination = {
      totalRecords: totalCount,
      totalCount,
      page,
      pageSize,
      totalPages,
      hasNextPage: pageSize !== -1 && page < totalPages,
      hasPreviousPage: page > 1,
      hasPrevPage: page > 1,
    };

    return {
      data,
      pagination,
      meta: pagination,
    };
  }

  async getById(id: string): Promise<WoodReceivingRecord | null> {
    const records = await supabaseFetch<WoodReceivingRecord[]>(
      `/v_buku_besar_flat?id=eq.${encodeURIComponent(id)}&select=*`
    );
    if (records.length > 0) {
      return this.normalizeRecord(records[0]);
    }

    const byManifest = await supabaseFetch<WoodReceivingRecord[]>(
      `/v_buku_besar_flat?manifest_id=eq.${encodeURIComponent(id)}&select=*`
    );
    if (byManifest.length > 0) {
      return this.normalizeRecord(byManifest[0]);
    }

    return null;
  }

  async saveManifest(manifest: ManifestFormInput, tenantId = 'default-tenant'): Promise<WoodReceivingRecord[]> {
    await this.ensureTenant(tenantId);
    const supplierId = await this.resolveSupplierId(manifest.supplierName, tenantId);
    const manifestId = manifest.id || `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const manifestNumber = `MAN-${manifestId}`;
    const now = new Date().toISOString();
    const freightPphRate = Number((manifest as any).freightPphRate ?? 2.0);

    const manifestPayload = {
      id: manifestId,
      tenant_id: tenantId,
      manifest_number: manifestNumber,
      receipt_date: manifest.receiptDate || now.split('T')[0],
      doc_date: manifest.docDate || null,
      truck_plate_number: manifest.truckPlateNumber || '-',
      forestry_doc_number: manifest.forestryDocNumber || '-',
      receipt_number: manifest.receiptNumber || manifestNumber,
      contract_number: manifest.contractNumber || '-',
      supplier_id: supplierId,
      freight_rate_per_m3: Number(manifest.freightRatePerM3) || 0,
      freight_pph_rate: freightPphRate,
      broker_fee: Number(manifest.brokerFee) || 0,
      payment_status: manifest.paymentStatus || 'UNPAID',
      invoice_number: manifest.invoiceNumber || null,
      payment_date: manifest.paymentDate || null,
      payment_notes: manifest.paymentNotes || null,
      updated_at: now,
    };

    await supabaseFetch('/receiving_manifests', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates',
      body: JSON.stringify(manifestPayload),
    });

    // Clean existing items for this manifest before rewriting
    await supabaseFetch(`/receiving_items?manifest_id=eq.${encodeURIComponent(manifestId)}`, {
      method: 'DELETE',
    });

    const items = manifest.items || [];
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const speciesId = await this.resolveSpeciesId(item.woodSpecies);
      const lotId = await this.resolveLotId(item.storageYard, item.kavlingNumber, tenantId);
      const itemId = item.id || `item-${manifestId}-${idx + 1}`;

      const itemPayload = {
        id: itemId,
        manifest_id: manifestId,
        tenant_id: tenantId,
        item_sequence: idx + 1,
        species_id: speciesId,
        lot_id: lotId,
        wood_length_m: Number(item.woodLengthM) || 4.0,
        delivered_pieces: Number(item.deliveredPieces) || 0,
        delivered_volume_m3: Number(item.deliveredVolumeM3) || 0,
        tally_pieces: Number(item.tallyPieces) || 0,
        tally_volume_m3: Number(item.tallyVolumeM3) || 0,
        timber_price_per_m3: Number(item.timberPricePerM3) || 0,
        timber_pph_rate: Number(item.timberPphRate ?? 0.5),
        notes: null,
        updated_at: now,
      };

      await supabaseFetch('/receiving_items', {
        method: 'POST',
        prefer: 'resolution=merge-duplicates',
        body: JSON.stringify(itemPayload),
      });
    }

    const records = await supabaseFetch<WoodReceivingRecord[]>(
      `/v_buku_besar_flat?manifest_id=eq.${encodeURIComponent(manifestId)}&select=*`
    );

    return records.map(this.normalizeRecord);
  }

  async save(record: WoodReceivingRecord): Promise<WoodReceivingRecord> {
    const items = [
      {
        id: record.item_id || `item-${record.id}`,
        woodSpecies: record.woodSpecies,
        woodLengthM: record.woodLengthM,
        kavlingNumber: record.kavlingNumber,
        storageYard: record.storageYard,
        deliveredPieces: record.deliveredPieces,
        deliveredVolumeM3: record.deliveredVolumeM3,
        tallyPieces: record.tallyPieces,
        tallyVolumeM3: record.tallyVolumeM3,
        timberPricePerM3: record.timberPricePerM3,
        timberPphRate: record.timberPphRate,
      },
    ];

    const manifestInput: ManifestFormInput = {
      id: record.manifest_id || record.id,
      receiptDate: record.receiptDate,
      docDate: record.docDate,
      truckPlateNumber: record.truckPlateNumber,
      forestryDocNumber: record.forestryDocNumber,
      receiptNumber: record.receiptNumber,
      contractNumber: record.contractNumber,
      supplierName: record.supplierName,
      freightRatePerM3: record.freightRatePerM3,
      brokerFee: record.brokerFee,
      paymentStatus: record.paymentStatus,
      invoiceNumber: record.invoiceNumber,
      paymentDate: record.paymentDate,
      paymentNotes: record.paymentNotes,
      items,
    };

    const saved = await this.saveManifest(manifestInput);
    return saved[0] || record;
  }

  async delete(id: string): Promise<boolean> {
    return this.deleteManifest(id);
  }

  async deleteManifest(manifestId: string): Promise<boolean> {
    await supabaseFetch(`/receiving_manifests?id=eq.${encodeURIComponent(manifestId)}`, {
      method: 'DELETE',
    });
    return true;
  }

  private normalizeRecord(r: any): WoodReceivingRecord {
    return {
      ...r,
      woodLengthM: Number(r.woodLengthM ?? 4.0),
      deliveredPieces: Number(r.deliveredPieces ?? 0),
      deliveredVolumeM3: Number(r.deliveredVolumeM3 ?? 0),
      tallyPieces: Number(r.tallyPieces ?? 0),
      tallyVolumeM3: Number(r.tallyVolumeM3 ?? 0),
      timberPricePerM3: Number(r.timberPricePerM3 ?? 0),
      timberGrossTotal: Number(r.timberGrossTotal ?? 0),
      timberPphRate: Number(r.timberPphRate ?? 0.5),
      timberPphAmount: Number(r.timberPphAmount ?? 0),
      timberNetPayable: Number(r.timberNetPayable ?? 0),
      freightRatePerM3: Number(r.freightRatePerM3 ?? 0),
      freightGrossTotal: Number(r.freightGrossTotal ?? 0),
      freightPphAmount: Number(r.freightPphAmount ?? 0),
      freightNetPayable: Number(r.freightNetPayable ?? 0),
      brokerFee: Number(r.brokerFee ?? 0),
      grandNetPayable: Number(r.grandNetPayable ?? 0),
      paymentStatus: (r.paymentStatus as PaymentStatus) || 'UNPAID',
    };
  }
}
