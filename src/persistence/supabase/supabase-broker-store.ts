import { supabaseFetch } from './supabase-client.ts';
import type { Broker } from '../../types/index.ts';

export async function fetchSupabaseBrokers(): Promise<Broker[]> {
  const rows = await supabaseFetch<any[]>('/brokers?select=*&order=name.asc');
  return rows.map((r) => ({
    id: r.id,
    tenantId: r.tenant_id,
    code: r.code,
    name: r.name,
    contactPerson: r.contact_person || undefined,
    phone: r.phone || undefined,
    address: r.address || undefined,
    taxId: r.tax_id || undefined,
    defaultCommissionPerM3: r.default_commission_per_m3 !== null && r.default_commission_per_m3 !== undefined ? Number(r.default_commission_per_m3) : undefined,
    notes: r.notes || undefined,
    status: r.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    createdAt: r.created_at || new Date().toISOString(),
    updatedAt: r.updated_at || new Date().toISOString(),
  }));
}

export async function saveSupabaseBroker(data: Partial<Broker> & { name: string }): Promise<Broker> {
  const id = data.id || `brk-${Date.now()}`;
  const now = new Date().toISOString();
  const payload = {
    id,
    tenant_id: 'default-tenant',
    code: data.code || `BRK-${Date.now().toString().slice(-3)}`,
    name: data.name.trim(),
    contact_person: data.contactPerson || null,
    phone: data.phone || null,
    address: data.address || null,
    tax_id: data.taxId || null,
    default_commission_per_m3: data.defaultCommissionPerM3 !== undefined ? data.defaultCommissionPerM3 : null,
    status: data.status || 'ACTIVE',
    notes: data.notes || null,
    updated_at: now,
  };

  const res = await supabaseFetch<any[]>('/brokers', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=representation',
    body: JSON.stringify(payload),
  });
  const r = res[0] || payload;
  return {
    id: r.id,
    tenantId: r.tenant_id,
    code: r.code,
    name: r.name,
    contactPerson: r.contact_person || undefined,
    phone: r.phone || undefined,
    address: r.address || undefined,
    taxId: r.tax_id || undefined,
    defaultCommissionPerM3: r.default_commission_per_m3 !== null && r.default_commission_per_m3 !== undefined ? Number(r.default_commission_per_m3) : undefined,
    notes: r.notes || undefined,
    status: r.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    createdAt: r.created_at || now,
    updatedAt: r.updated_at || now,
  };
}

export async function deleteSupabaseBroker(id: string): Promise<boolean> {
  // Soft-delete
  await supabaseFetch(`/brokers?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'INACTIVE', updated_at: new Date().toISOString() }),
  });
  return true;
}
