/**
 * src/persistence/supabase/supabase-contract-store.ts
 *
 * Supabase PostgREST client implementation for Perhutani Contracts,
 * line items, and receipts.
 */

import { supabaseFetch } from './supabase-client.ts';
import type {
  PerhutaniContract,
  ContractSortimentItem,
  ContractReceipt,
  ContractStatus,
} from '../../types/index.ts';

interface SupabaseContractRow {
  id: string;
  tenant_id: string;
  contract_number: string;
  contract_date: string;
  effective_start_date: string;
  effective_end_date: string;
  kph_origin: string;
  po_number: string | null;
  total_contract_value_idr: number;
  total_purchased_volume_m3: number;
  total_purchased_pieces: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface SupabaseSortimentRow {
  id: string;
  contract_id: string;
  tenant_id: string;
  item_sequence: number;
  wood_species: string;
  grade: string;
  wood_length_m: number | null;
  volume_m3: number;
  pieces: number | null;
  price_per_m3: number;
  subtotal_idr: number;
  notes: string | null;
}

interface SupabaseReceiptRow {
  id: string;
  contract_id: string;
  tenant_id: string;
  receipt_number: string;
  receipt_date: string;
  amount_idr: number;
  covered_volume_m3: number;
  covered_pieces: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToContract(row: SupabaseContractRow): PerhutaniContract {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    contractNumber: row.contract_number,
    contractDate: row.contract_date,
    effectiveStartDate: row.effective_start_date,
    effectiveEndDate: row.effective_end_date,
    kphOrigin: row.kph_origin,
    poNumber: row.po_number || undefined,
    totalContractValueIDR: Number(row.total_contract_value_idr),
    totalPurchasedVolumeM3: Number(row.total_purchased_volume_m3),
    totalPurchasedPieces: Number(row.total_purchased_pieces),
    status: (row.status as ContractStatus) || 'ACTIVE',
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToSortiment(row: SupabaseSortimentRow): ContractSortimentItem {
  return {
    id: row.id,
    contractId: row.contract_id,
    tenantId: row.tenant_id,
    itemSequence: Number(row.item_sequence),
    woodSpecies: row.wood_species,
    grade: row.grade,
    woodLengthM: row.wood_length_m !== null ? Number(row.wood_length_m) : undefined,
    volumeM3: Number(row.volume_m3),
    pieces: row.pieces !== null ? Number(row.pieces) : undefined,
    pricePerM3: Number(row.price_per_m3),
    subtotalIDR: Number(row.subtotal_idr),
    notes: row.notes || undefined,
  };
}

function mapRowToReceipt(row: SupabaseReceiptRow): ContractReceipt {
  return {
    id: row.id,
    contractId: row.contract_id,
    tenantId: row.tenant_id,
    receiptNumber: row.receipt_number,
    receiptDate: row.receipt_date,
    amountIDR: Number(row.amount_idr),
    coveredVolumeM3: Number(row.covered_volume_m3),
    coveredPieces: row.covered_pieces !== null ? Number(row.covered_pieces) : undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseContractStore {
  async getAll(tenantId: string = 'default-tenant'): Promise<PerhutaniContract[]> {
    const rows = await supabaseFetch<SupabaseContractRow[]>(
      `/perhutani_contracts?tenant_id=eq.${encodeURIComponent(tenantId)}&select=*&order=contract_date.desc,created_at.desc`
    );
    return rows.map(mapRowToContract);
  }

  async getById(id: string): Promise<PerhutaniContract | null> {
    const rows = await supabaseFetch<SupabaseContractRow[]>(
      `/perhutani_contracts?id=eq.${encodeURIComponent(id)}&select=*`
    );
    return rows.length > 0 ? mapRowToContract(rows[0]) : null;
  }

  async getItems(contractId: string): Promise<ContractSortimentItem[]> {
    const rows = await supabaseFetch<SupabaseSortimentRow[]>(
      `/contract_sortiment_items?contract_id=eq.${encodeURIComponent(contractId)}&select=*&order=item_sequence.asc`
    );
    return rows.map(mapRowToSortiment);
  }

  async getReceipts(contractId: string): Promise<ContractReceipt[]> {
    const rows = await supabaseFetch<SupabaseReceiptRow[]>(
      `/contract_receipts?contract_id=eq.${encodeURIComponent(contractId)}&select=*&order=receipt_date.asc`
    );
    return rows.map(mapRowToReceipt);
  }

  async getAllReceipts(tenantId: string = 'default-tenant'): Promise<ContractReceipt[]> {
    const rows = await supabaseFetch<SupabaseReceiptRow[]>(
      `/contract_receipts?tenant_id=eq.${encodeURIComponent(tenantId)}&select=*&order=receipt_date.asc`
    );
    return rows.map(mapRowToReceipt);
  }

  async saveContract(contract: PerhutaniContract, items: ContractSortimentItem[]): Promise<PerhutaniContract> {
    const contractPayload = {
      id: contract.id,
      tenant_id: contract.tenantId || 'default-tenant',
      contract_number: contract.contractNumber,
      contract_date: contract.contractDate,
      effective_start_date: contract.effectiveStartDate,
      effective_end_date: contract.effectiveEndDate,
      kph_origin: contract.kphOrigin,
      po_number: contract.poNumber || null,
      total_contract_value_idr: contract.totalContractValueIDR,
      total_purchased_volume_m3: contract.totalPurchasedVolumeM3,
      total_purchased_pieces: contract.totalPurchasedPieces,
      status: contract.status,
      notes: contract.notes || null,
      updated_at: new Date().toISOString(),
    };

    const inserted = await supabaseFetch<SupabaseContractRow[]>('/perhutani_contracts', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=representation',
      body: JSON.stringify(contractPayload),
    });

    if (items.length > 0) {
      await supabaseFetch(`/contract_sortiment_items?contract_id=eq.${encodeURIComponent(contract.id)}`, {
        method: 'DELETE',
      });

      const sortimentPayloads = items.map((item, idx) => ({
        id: item.id || `SORT-${contract.id}-${idx + 1}`,
        contract_id: contract.id,
        tenant_id: contract.tenantId || 'default-tenant',
        item_sequence: item.itemSequence || idx + 1,
        wood_species: item.woodSpecies,
        grade: item.grade,
        wood_length_m: item.woodLengthM ?? null,
        volume_m3: item.volumeM3,
        pieces: item.pieces ?? null,
        price_per_m3: item.pricePerM3,
        subtotal_idr: item.subtotalIDR,
        notes: item.notes || null,
      }));

      await supabaseFetch('/contract_sortiment_items', {
        method: 'POST',
        prefer: 'resolution=merge-duplicates',
        body: JSON.stringify(sortimentPayloads),
      });
    }

    return mapRowToContract(inserted[0]);
  }

  async deleteContract(id: string): Promise<boolean> {
    await supabaseFetch(`/perhutani_contracts?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return true;
  }

  async saveReceipt(receipt: ContractReceipt): Promise<ContractReceipt> {
    const payload = {
      id: receipt.id,
      contract_id: receipt.contractId,
      tenant_id: receipt.tenantId || 'default-tenant',
      receipt_number: receipt.receiptNumber,
      receipt_date: receipt.receiptDate,
      amount_idr: receipt.amountIDR,
      covered_volume_m3: receipt.coveredVolumeM3,
      covered_pieces: receipt.coveredPieces ?? null,
      notes: receipt.notes || null,
      updated_at: new Date().toISOString(),
    };

    const inserted = await supabaseFetch<SupabaseReceiptRow[]>('/contract_receipts', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=representation',
      body: JSON.stringify(payload),
    });

    return mapRowToReceipt(inserted[0]);
  }

  async deleteReceipt(receiptId: string): Promise<boolean> {
    await supabaseFetch(`/contract_receipts?id=eq.${encodeURIComponent(receiptId)}`, {
      method: 'DELETE',
    });
    return true;
  }
}
