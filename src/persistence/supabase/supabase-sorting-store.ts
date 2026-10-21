/**
 * src/persistence/supabase/supabase-sorting-store.ts
 *
 * Supabase PostgREST persistence store for stock sorting records.
 */

import { supabaseFetch } from './supabase-client.ts';
import type {
  StockSortingRecord,
  StockSortingFormInput,
} from '../../types/index.ts';

interface SupabaseSortingRow {
  id: string;
  tenant_id: string;
  sorting_date: string;
  species: string;
  source_storage_yard: string;
  source_kavling_number: string;
  target_storage_yard: string;
  target_kavling_number: string;
  volume_m3: number;
  pieces: number;
  reason: string;
  operator_name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToSortingRecord(row: SupabaseSortingRow): StockSortingRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    sortingDate: row.sorting_date,
    species: row.species,
    sourceStorageYard: row.source_storage_yard,
    sourceKavlingNumber: row.source_kavling_number,
    targetStorageYard: row.target_storage_yard,
    targetKavlingNumber: row.target_kavling_number,
    volumeM3: Number(row.volume_m3),
    pieces: Number(row.pieces),
    reason: row.reason,
    operatorName: row.operator_name,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseSortingStore {
  async getAll(tenantId = 'default-tenant'): Promise<StockSortingRecord[]> {
    const rows = await supabaseFetch<SupabaseSortingRow[]>(
      `/stock_sorting_records?tenant_id=eq.${encodeURIComponent(tenantId)}&select=*&order=sorting_date.desc,created_at.desc`
    );
    return rows.map(mapRowToSortingRecord);
  }

  async getById(id: string, tenantId = 'default-tenant'): Promise<StockSortingRecord | null> {
    const rows = await supabaseFetch<SupabaseSortingRow[]>(
      `/stock_sorting_records?id=eq.${encodeURIComponent(id)}&tenant_id=eq.${encodeURIComponent(tenantId)}&select=*`
    );
    return rows.length > 0 ? mapRowToSortingRecord(rows[0]) : null;
  }

  async save(input: StockSortingFormInput, tenantId = 'default-tenant'): Promise<StockSortingRecord> {
    const id = input.id || `SRT-${Date.now()}`;
    const now = new Date().toISOString();

    const rowPayload = {
      id,
      tenant_id: tenantId,
      sorting_date: input.sortingDate,
      species: input.species,
      source_storage_yard: input.sourceStorageYard,
      source_kavling_number: input.sourceKavlingNumber,
      target_storage_yard: input.targetStorageYard,
      target_kavling_number: input.targetKavlingNumber,
      volume_m3: Number(input.volumeM3),
      pieces: Number(input.pieces),
      reason: input.reason,
      operator_name: input.operatorName,
      notes: input.notes || null,
      updated_at: now,
    };

    const inserted = await supabaseFetch<SupabaseSortingRow[]>(
      '/stock_sorting_records',
      {
        method: 'POST',
        prefer: 'resolution=merge-duplicates,return=representation',
        body: JSON.stringify(rowPayload),
      }
    );

    return mapRowToSortingRecord(inserted[0]);
  }

  async delete(id: string, tenantId = 'default-tenant'): Promise<void> {
    await supabaseFetch<void>(
      `/stock_sorting_records?id=eq.${encodeURIComponent(id)}&tenant_id=eq.${encodeURIComponent(tenantId)}`,
      { method: 'DELETE' }
    );
  }
}
