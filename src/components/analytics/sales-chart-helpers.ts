/**
 * src/components/analytics/sales-chart-helpers.ts
 *
 * Pure data transformation helpers for sales performance, inventory flow (inflow vs outflow),
 * and customer sales ranking charts powered by Chart.js.
 */

import type { WoodReceivingRecord, WoodSalesRecord } from '@/src/types/index';

export interface InventoryFlowChartData {
  labels: string[];
  inboundVolumes: number[];
  outboundVolumes: number[];
  netVolumes: number[];
}

export interface CustomerSalesChartData {
  labels: string[];
  volumes: number[];
  revenues: number[];
}

/**
 * Prepares chronological timeline data comparing daily incoming timber volume (Penerimaan)
 * against outgoing sold volume (Penjualan), and computes daily net volume balance.
 */
export function prepareInventoryFlowData(
  inbounds: WoodReceivingRecord[],
  sales: WoodSalesRecord[]
): InventoryFlowChartData {
  if ((!inbounds || inbounds.length === 0) && (!sales || sales.length === 0)) {
    return { labels: [], inboundVolumes: [], outboundVolumes: [], netVolumes: [] };
  }

  const dateMap = new Map<string, { inbound: number; outbound: number }>();

  for (const r of inbounds || []) {
    const d = r.receiptDate?.trim();
    if (!d) continue;
    const item = dateMap.get(d) || { inbound: 0, outbound: 0 };
    item.inbound += Number(r.tallyVolumeM3) || 0;
    dateMap.set(d, item);
  }

  for (const s of sales || []) {
    const d = s.saleDate?.trim();
    if (!d) continue;
    const item = dateMap.get(d) || { inbound: 0, outbound: 0 };
    item.outbound += Number(s.volumeM3) || 0;
    dateMap.set(d, item);
  }

  const sortedDates = Array.from(dateMap.keys()).sort();

  const inboundVolumes: number[] = [];
  const outboundVolumes: number[] = [];
  const netVolumes: number[] = [];

  for (const date of sortedDates) {
    const val = dateMap.get(date)!;
    const inVol = Number(val.inbound.toFixed(2));
    const outVol = Number(val.outbound.toFixed(2));
    inboundVolumes.push(inVol);
    outboundVolumes.push(outVol);
    netVolumes.push(Number((inVol - outVol).toFixed(2)));
  }

  return {
    labels: sortedDates,
    inboundVolumes,
    outboundVolumes,
    netVolumes,
  };
}

/**
 * Prepares top customer ranking breakdown by volume (m³) and gross revenue (IDR).
 */
export function prepareCustomerSalesData(
  sales: WoodSalesRecord[],
  topN = 5
): CustomerSalesChartData {
  if (!sales || sales.length === 0) {
    return { labels: [], volumes: [], revenues: [] };
  }

  const customerMap = new Map<string, { volume: number; revenue: number }>();

  for (const s of sales) {
    const name = (s.customerName || 'Lainnya').trim();
    if (!name) continue;
    const current = customerMap.get(name) || { volume: 0, revenue: 0 };
    current.volume += Number(s.volumeM3) || 0;
    current.revenue += Number(s.totalPrice) || 0;
    customerMap.set(name, current);
  }

  const sorted = Array.from(customerMap.entries())
    .sort((a, b) => b[1].volume - a[1].volume)
    .slice(0, topN);

  return {
    labels: sorted.map(([name]) => name),
    volumes: sorted.map(([_, data]) => Number(data.volume.toFixed(2))),
    revenues: sorted.map(([_, data]) => Math.round(data.revenue)),
  };
}
