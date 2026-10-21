/**
 * src/persistence/supabase/supabase-production-store.ts
 *
 * Supabase PostgREST persistence store for sawmill production records.
 */

import { supabaseFetch } from './supabase-client.ts';
import type {
  SawmillProductionRecord,
  SawmillProductionFormInput,
  ProductionShift,
} from '../../types/index.ts';
import { computeProductionYield } from '../../utils/production-calc.ts';

interface SupabaseProductionRow {
  id: string;
  tenant_id: string;
  production_date: string;
  shift: string | null;
  source_storage_yard: string;
  source_kavling_number: string;
  input_species: string;
  input_volume_m3: number;
  input_pieces: number;
  output_product: string;
  output_volume_m3: number;
  output_pieces: number;
  operator_name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToProductionRecord(row: SupabaseProductionRow): SawmillProductionRecord {
  const { yieldPercent, wasteVolumeM3 } = computeProductionYield(
    Number(row.input_volume_m3),
    Number(row.output_volume_m3)
  );

  return {
    id: row.id,
    tenantId: row.tenant_id,
    productionDate: row.production_date,
    shift: (row.shift as ProductionShift) || undefined,
    sourceStorageYard: row.source_storage_yard,
    sourceKavlingNumber: row.source_kavling_number,
    inputSpecies: row.input_species,
    inputVolumeM3: Number(row.input_volume_m3),
    inputPieces: Number(row.input_pieces),
    outputProduct: row.output_product,
    outputVolumeM3: Number(row.output_volume_m3),
    outputPieces: Number(row.output_pieces),
    yieldPercent,
    wasteVolumeM3,
    operatorName: row.operator_name,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseProductionStore {
  async getAll(tenantId = 'default-tenant'): Promise<SawmillProductionRecord[]> {
    const rows = await supabaseFetch<SupabaseProductionRow[]>(
      `/sawmill_production_records?tenant_id=eq.${encodeURIComponent(tenantId)}&select=*&order=production_date.desc,created_at.desc`
    );
    return rows.map(mapRowToProductionRecord);
  }

  async getById(id: string, tenantId = 'default-tenant'): Promise<SawmillProductionRecord | null> {
    const rows = await supabaseFetch<SupabaseProductionRow[]>(
      `/sawmill_production_records?id=eq.${encodeURIComponent(id)}&tenant_id=eq.${encodeURIComponent(tenantId)}&select=*`
    );
    return rows.length > 0 ? mapRowToProductionRecord(rows[0]) : null;
  }

  async save(input: SawmillProductionFormInput, tenantId = 'default-tenant'): Promise<SawmillProductionRecord> {
    const id = input.id || `PRD-${Date.now()}`;
    const now = new Date().toISOString();

    const rowPayload = {
      id,
      tenant_id: tenantId,
      production_date: input.productionDate,
      shift: input.shift || null,
      source_storage_yard: input.sourceStorageYard,
      source_kavling_number: input.sourceKavlingNumber,
      input_species: input.inputSpecies,
      input_volume_m3: Number(input.inputVolumeM3),
      input_pieces: Number(input.inputPieces),
      output_product: input.outputProduct,
      output_volume_m3: Number(input.outputVolumeM3),
      output_pieces: Number(input.outputPieces),
      operator_name: input.operatorName,
      notes: input.notes || null,
      updated_at: now,
    };

    const inserted = await supabaseFetch<SupabaseProductionRow[]>(
      '/sawmill_production_records',
      {
        method: 'POST',
        prefer: 'resolution=merge-duplicates,return=representation',
        body: JSON.stringify(rowPayload),
      }
    );

    return mapRowToProductionRecord(inserted[0]);
  }

  async delete(id: string, tenantId = 'default-tenant'): Promise<void> {
    await supabaseFetch<void>(
      `/sawmill_production_records?id=eq.${encodeURIComponent(id)}&tenant_id=eq.${encodeURIComponent(tenantId)}`,
      { method: 'DELETE' }
    );
  }
}
