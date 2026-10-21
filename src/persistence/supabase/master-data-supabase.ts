import { supabaseFetch } from './supabase-client.ts';
import type { Supplier, WoodSpecies, AppSettings, ActivityLogEntry, ActivityActionType } from '../../types/index.ts';

export async function fetchSupabaseSuppliers(): Promise<Supplier[]> {
  const rows = await supabaseFetch<any[]>('/suppliers?select=*&order=name.asc');
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    contactPerson: r.contact_person || undefined,
    phone: r.phone || undefined,
    address: r.address || undefined,
    taxId: r.tax_id_npwp || undefined,
    notes: r.notes || undefined,
    status: r.is_active ? 'ACTIVE' : 'INACTIVE',
    createdAt: r.created_at || new Date().toISOString(),
    updatedAt: r.updated_at || new Date().toISOString(),
  }));
}

export async function saveSupabaseSupplier(data: Partial<Supplier> & { name: string }): Promise<Supplier> {
  const id = data.id || `sup-${Date.now()}`;
  const now = new Date().toISOString();
  const payload = {
    id,
    tenant_id: 'default-tenant',
    code: data.code || `SPL-${Date.now().toString().slice(-3)}`,
    name: data.name.trim(),
    contact_person: data.contactPerson || null,
    phone: data.phone || null,
    address: data.address || null,
    tax_id_npwp: data.taxId || null,
    is_active: data.status !== 'INACTIVE',
    notes: data.notes || null,
    updated_at: now,
  };

  const res = await supabaseFetch<any[]>('/suppliers', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=representation',
    body: JSON.stringify(payload),
  });
  const r = res[0] || payload;
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    contactPerson: r.contact_person || undefined,
    phone: r.phone || undefined,
    address: r.address || undefined,
    taxId: r.tax_id_npwp || undefined,
    notes: r.notes || undefined,
    status: r.is_active ? 'ACTIVE' : 'INACTIVE',
    createdAt: r.created_at || now,
    updatedAt: r.updated_at || now,
  };
}

export async function deleteSupabaseSupplier(id: string): Promise<boolean> {
  await supabaseFetch(`/suppliers?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return true;
}

export async function fetchSupabaseSpecies(): Promise<WoodSpecies[]> {
  const rows = await supabaseFetch<any[]>('/wood_species?select=*&order=common_name.asc');
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    commonName: r.common_name,
    botanicalName: r.botanical_name || undefined,
    densityKgM3: Number(r.density_kg_m3) || 650.0,
    isHardwood: Boolean(r.is_hardwood),
    notes: r.notes || undefined,
    createdAt: r.created_at || new Date().toISOString(),
    updatedAt: r.updated_at || new Date().toISOString(),
  }));
}

export async function saveSupabaseSpecies(
  species: Partial<WoodSpecies> & { code: string; commonName: string }
): Promise<WoodSpecies> {
  const id = species.id || `spc-${Date.now()}`;
  const now = new Date().toISOString();
  const payload = {
    id,
    tenant_id: 'default-tenant',
    code: species.code,
    common_name: species.commonName.trim(),
    botanical_name: species.botanicalName || null,
    density_kg_m3: species.densityKgM3 ?? 650.0,
    is_hardwood: species.isHardwood ?? true,
    notes: species.notes || null,
    updated_at: now,
  };

  const res = await supabaseFetch<any[]>('/wood_species', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=representation',
    body: JSON.stringify(payload),
  });
  const r = res[0] || payload;
  return {
    id: r.id,
    code: r.code,
    commonName: r.common_name,
    botanicalName: r.botanical_name || undefined,
    densityKgM3: Number(r.density_kg_m3),
    isHardwood: Boolean(r.is_hardwood),
    notes: r.notes || undefined,
    createdAt: r.created_at || now,
    updatedAt: r.updated_at || now,
  };
}

export async function fetchSupabaseSettings(): Promise<AppSettings> {
  const rows = await supabaseFetch<any[]>('/app_settings?tenant_id=eq.default-tenant&select=*&limit=1');
  if (rows.length === 0) {
    return {
      defaultTimberPphRate: 0.5,
      defaultFreightPphRate: 2.0,
      defaultBrokerFee: 250000,
      acceptableDiscrepancyThresholdPct: 2.0,
      discrepancyAlarmVolumeM3: 1.5,
      discrepancyAlarmPercent: 2.0,
      yardName: 'TPK-01 Utama (Central Yard)',
      yardCode: 'TPK-01',
    };
  }
  const r = rows[0];
  const legacyPct = r.acceptable_discrepancy_threshold_pct != null ? Number(r.acceptable_discrepancy_threshold_pct) : 2.0;
  const alarmPercent = r.discrepancy_alarm_percent != null ? Number(r.discrepancy_alarm_percent) : legacyPct;
  const alarmVolumeM3 = r.discrepancy_alarm_volume_m3 != null ? Number(r.discrepancy_alarm_volume_m3) : 1.5;

  return {
    defaultTimberPphRate: Number(r.default_timber_pph_rate),
    defaultFreightPphRate: Number(r.default_freight_pph_rate),
    defaultBrokerFee: Number(r.default_broker_fee),
    acceptableDiscrepancyThresholdPct: legacyPct,
    discrepancyAlarmVolumeM3: alarmVolumeM3,
    discrepancyAlarmPercent: alarmPercent,
    yardName: String(r.yard_name),
    yardCode: String(r.yard_code),
  };
}

export async function saveSupabaseSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await fetchSupabaseSettings();
  const updated: AppSettings = {
    defaultTimberPphRate: patch.defaultTimberPphRate ?? current.defaultTimberPphRate,
    defaultFreightPphRate: patch.defaultFreightPphRate ?? current.defaultFreightPphRate,
    defaultBrokerFee: patch.defaultBrokerFee ?? current.defaultBrokerFee,
    acceptableDiscrepancyThresholdPct: patch.acceptableDiscrepancyThresholdPct ?? patch.discrepancyAlarmPercent ?? current.acceptableDiscrepancyThresholdPct,
    discrepancyAlarmVolumeM3: patch.discrepancyAlarmVolumeM3 ?? current.discrepancyAlarmVolumeM3,
    discrepancyAlarmPercent: patch.discrepancyAlarmPercent ?? patch.acceptableDiscrepancyThresholdPct ?? current.discrepancyAlarmPercent,
    yardName: patch.yardName ?? current.yardName,
    yardCode: patch.yardCode ?? current.yardCode,
  };
  const payload = {
    tenant_id: 'default-tenant',
    default_timber_pph_rate: updated.defaultTimberPphRate,
    default_freight_pph_rate: updated.defaultFreightPphRate,
    default_broker_fee: updated.defaultBrokerFee,
    acceptable_discrepancy_threshold_pct: updated.acceptableDiscrepancyThresholdPct ?? updated.discrepancyAlarmPercent,
    discrepancy_alarm_volume_m3: updated.discrepancyAlarmVolumeM3,
    discrepancy_alarm_percent: updated.discrepancyAlarmPercent,
    yard_name: updated.yardName,
    yard_code: updated.yardCode,
    updated_at: new Date().toISOString(),
  };

  await supabaseFetch<any[]>('/app_settings', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=representation',
    body: JSON.stringify(payload),
  });
  return updated;
}

export async function fetchSupabaseActivityLogs(actionFilter?: string, limit: number = 100): Promise<ActivityLogEntry[]> {
  let url = `/activity_logs?tenant_id=eq.default-tenant&order=timestamp.desc&limit=${Math.min(limit, 500)}`;
  if (actionFilter && actionFilter.trim()) {
    url += `&action=eq.${encodeURIComponent(actionFilter.trim())}`;
  }
  const rows = await supabaseFetch<any[]>(url);
  return rows.map((r) => ({
    id: r.id,
    action: r.action as ActivityActionType,
    entityId: r.entity_id || undefined,
    entitySummary: r.entity_summary,
    operatorName: r.operator_name,
    operatorRole: r.operator_role,
    timestamp: r.timestamp,
    metadata: r.metadata_json ? JSON.parse(r.metadata_json) : undefined,
  }));
}

export async function appendSupabaseActivityLog(
  entry: Omit<ActivityLogEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
): Promise<ActivityLogEntry> {
  const id = entry.id || `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const timestamp = entry.timestamp || new Date().toISOString();
  const payload = {
    id,
    tenant_id: 'default-tenant',
    action: entry.action,
    entity_id: entry.entityId || null,
    entity_summary: entry.entitySummary,
    operator_name: entry.operatorName,
    operator_role: entry.operatorRole,
    metadata_json: entry.metadata ? JSON.stringify(entry.metadata) : null,
    timestamp,
  };

  await supabaseFetch<any[]>('/activity_logs', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify(payload),
  });

  return {
    id,
    action: entry.action,
    entityId: entry.entityId,
    entitySummary: entry.entitySummary,
    operatorName: entry.operatorName,
    operatorRole: entry.operatorRole,
    timestamp,
    metadata: entry.metadata,
  };
}
