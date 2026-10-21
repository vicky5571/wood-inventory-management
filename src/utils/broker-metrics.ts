/**
 * src/utils/broker-metrics.ts
 *
 * Pure domain calculations and metrics aggregation for Broker Master Data.
 * Computes deal count, total commission, volume facilitated, average commission/m³,
 * primary suppliers ranking, and YTD KPI statistics.
 */

import type { Broker, BrokerWithMetrics, BrokerStats, WoodReceivingRecord } from '../types/index.ts';

export function aggregateBrokerMetrics(
  brokers: Broker[],
  records: WoodReceivingRecord[]
): BrokerWithMetrics[] {
  // Pre-index records by brokerId for O(records + brokers) performance
  const recordsByBroker = new Map<string, WoodReceivingRecord[]>();

  for (const r of records) {
    if (!r.brokerId) continue;
    const existing = recordsByBroker.get(r.brokerId);
    if (existing) {
      existing.push(r);
    } else {
      recordsByBroker.set(r.brokerId, [r]);
    }
  }

  return brokers.map((broker) => {
    const linkedRecords = recordsByBroker.get(broker.id) || [];
    const totalDeals = linkedRecords.length;

    let totalCommissionIDR = 0;
    let totalVolumeM3Facilitated = 0;
    let maxReceiptDate = '';

    const supplierCounts = new Map<string, number>();

    for (const rec of linkedRecords) {
      totalCommissionIDR += rec.brokerFee || 0;
      totalVolumeM3Facilitated += rec.tallyVolumeM3 || 0;

      if (rec.receiptDate && (!maxReceiptDate || rec.receiptDate > maxReceiptDate)) {
        maxReceiptDate = rec.receiptDate;
      }

      if (rec.supplierName) {
        supplierCounts.set(rec.supplierName, (supplierCounts.get(rec.supplierName) || 0) + 1);
      }
    }

    const averageCommissionPerM3 =
      totalVolumeM3Facilitated > 0
        ? Math.round(totalCommissionIDR / totalVolumeM3Facilitated)
        : 0;

    // Rank primary suppliers by deal count DESC, then alphabetically
    const primarySuppliers = Array.from(supplierCounts.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      })
      .slice(0, 3)
      .map(([name]) => name);

    return {
      ...broker,
      totalDeals,
      totalCommissionIDR,
      totalVolumeM3Facilitated: Number(totalVolumeM3Facilitated.toFixed(4)),
      averageCommissionPerM3,
      primarySuppliers,
      lastDealDate: maxReceiptDate || '-',
    };
  });
}

export function computeBrokerStats(
  brokers: Broker[],
  records: WoodReceivingRecord[]
): BrokerStats {
  const currentYearStr = String(new Date().getFullYear());
  const activeCount = brokers.filter((b) => b.status === 'ACTIVE').length;

  let totalCommissionYtdIDR = 0;
  let totalVolumeFacilitatedYtdM3 = 0;

  for (const rec of records) {
    if (!rec.brokerId) continue;
    if (rec.receiptDate && rec.receiptDate.startsWith(currentYearStr)) {
      totalCommissionYtdIDR += rec.brokerFee || 0;
      totalVolumeFacilitatedYtdM3 += rec.tallyVolumeM3 || 0;
    }
  }

  return {
    totalBrokers: brokers.length,
    activeCount,
    totalCommissionYtdIDR,
    totalVolumeFacilitatedYtdM3: Number(totalVolumeFacilitatedYtdM3.toFixed(4)),
  };
}
