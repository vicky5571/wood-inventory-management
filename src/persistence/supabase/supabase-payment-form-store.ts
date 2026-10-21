/**
 * src/persistence/supabase/supabase-payment-form-store.ts
 *
 * Supabase PostgREST client adapter for Weekly Payment Forms.
 */

import { supabaseFetch } from './supabase-client.ts';
import type {
  PaymentForm,
  PaymentFormStatus,
  PaymentFormFilterCriteria,
} from '../../types/index.ts';

function mapRowToForm(r: any): PaymentForm {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    formNumber: r.form_number,
    weekStartDate: r.week_start_date,
    weekEndDate: r.week_end_date,
    supplierName: r.supplier_name,
    supplierId: r.supplier_id || undefined,
    woodSpecies: r.wood_species,
    contractNumber: r.contract_number || '',
    recordIds: Array.isArray(r.record_ids) ? r.record_ids : JSON.parse(r.record_ids || '[]'),
    itemIds: Array.isArray(r.item_ids) ? r.item_ids : JSON.parse(r.item_ids || '[]'),
    totalTallyVolumeM3: Number(r.total_tally_volume_m3) || 0,
    totalTallyPieces: Number(r.total_tally_pieces) || 0,
    totalTimberGrossIDR: Number(r.total_timber_gross_idr) || 0,
    totalTimberPphIDR: Number(r.total_timber_pph_idr) || 0,
    totalTimberNetIDR: Number(r.total_timber_net_idr) || 0,
    status: r.status as PaymentFormStatus,
    issuedAt: r.issued_at || undefined,
    paidAt: r.paid_at || undefined,
    invoiceNumber: r.invoice_number || undefined,
    paymentDate: r.payment_date || undefined,
    paymentMethod: r.payment_method || undefined,
    notes: r.notes || undefined,
    createdAt: r.created_at || new Date().toISOString(),
    updatedAt: r.updated_at || new Date().toISOString(),
  };
}

export async function fetchSupabasePaymentForms(filter?: PaymentFormFilterCriteria): Promise<PaymentForm[]> {
  let endpoint = '/payment_forms?select=*&order=week_start_date.desc,form_number.asc';
  if (filter?.weekStartDate) {
    endpoint += `&week_start_date=eq.${filter.weekStartDate}`;
  }
  if (filter?.status && filter.status !== 'ALL') {
    endpoint += `&status=eq.${filter.status}`;
  }
  if (filter?.supplierName) {
    endpoint += `&supplier_name=ilike.*${encodeURIComponent(filter.supplierName)}*`;
  }

  const rows = await supabaseFetch<any[]>(endpoint);
  return rows.map(mapRowToForm);
}

export async function fetchSupabasePaymentFormById(id: string): Promise<PaymentForm | null> {
  const rows = await supabaseFetch<any[]>(`/payment_forms?id=eq.${id}&select=*`);
  if (!rows || rows.length === 0) return null;
  return mapRowToForm(rows[0]);
}

export async function saveSupabasePaymentForm(form: PaymentForm): Promise<PaymentForm> {
  const payload = {
    id: form.id,
    tenant_id: form.tenantId || 'default-tenant',
    form_number: form.formNumber,
    week_start_date: form.weekStartDate,
    week_end_date: form.weekEndDate,
    supplier_name: form.supplierName,
    supplier_id: form.supplierId || null,
    wood_species: form.woodSpecies,
    contract_number: form.contractNumber || '',
    record_ids: form.recordIds,
    item_ids: form.itemIds,
    total_tally_volume_m3: form.totalTallyVolumeM3,
    total_tally_pieces: form.totalTallyPieces,
    total_timber_gross_idr: form.totalTimberGrossIDR,
    total_timber_pph_idr: form.totalTimberPphIDR,
    total_timber_net_idr: form.totalTimberNetIDR,
    status: form.status,
    issued_at: form.issuedAt || null,
    paid_at: form.paidAt || null,
    invoice_number: form.invoiceNumber || null,
    payment_date: form.paymentDate || null,
    payment_method: form.paymentMethod || null,
    notes: form.notes || null,
    updated_at: new Date().toISOString(),
  };

  const res = await supabaseFetch<any[]>('/payment_forms', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=representation',
    body: JSON.stringify(payload),
  });
  return mapRowToForm(res[0] || payload);
}

export async function deleteSupabasePaymentForm(id: string): Promise<void> {
  await supabaseFetch(`/payment_forms?id=eq.${id}`, { method: 'DELETE' });
}
