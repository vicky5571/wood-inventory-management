'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ReportPeriod, ReportPeriodClosePreview } from '../types/index.ts';

export function useReportPeriods() {
  const [periods, setPeriods] = useState<ReportPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/report-periods');
      const json = await res.json();
      if (json.success) {
        setPeriods(json.data);
      } else {
        throw new Error(json.error || 'Gagal memuat periode laporan');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat periode laporan');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createPeriod = useCallback(
    async (data: {
      name: string;
      startDate: string;
      endDate: string;
      notes?: string;
    }) => {
      const res = await fetch('/api/report-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Gagal membuat periode');
      }
      await refresh();
      return json.data as ReportPeriod;
    },
    [refresh]
  );

  const getPreview = useCallback(async (periodId: string): Promise<ReportPeriodClosePreview> => {
    const res = await fetch(`/api/report-periods/${periodId}/preview`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error ?? 'Gagal memuat preview');
    }
    return json.data;
  }, []);

  const closePeriodFn = useCallback(
    async (periodId: string) => {
      const res = await fetch(`/api/report-periods/${periodId}/close`, { method: 'PATCH' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Gagal menutup laporan');
      }
      await refresh();
      return json.data;
    },
    [refresh]
  );

  const reopenPeriod = useCallback(
    async (periodId: string, reason: string) => {
      const res = await fetch(`/api/report-periods/${periodId}/reopen`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Gagal membuka kembali laporan');
      }
      await refresh();
      return json.data as ReportPeriod;
    },
    [refresh]
  );

  const openPeriods = periods.filter((p) => p.status === 'OPEN' || p.status === 'REOPENED');
  const closedPeriods = periods.filter((p) => p.status === 'CLOSED');

  return {
    periods,
    openPeriods,
    closedPeriods,
    isLoading,
    error,
    refresh,
    createPeriod,
    getPreview,
    closePeriod: closePeriodFn,
    reopenPeriod,
  };
}
