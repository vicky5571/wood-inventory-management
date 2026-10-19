'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ActivityLogEntry, ActivityActionType } from '../types/index.ts';
import { createActivityLog } from '../utils/activity-logger.ts';

const STORAGE_KEY = 'wood_activity_log_v1';

const INITIAL_LOGS: ActivityLogEntry[] = [
  {
    id: 'act-init-1',
    action: 'RECORD_CREATED',
    entitySummary: 'Truk B 9283 TDA • Teak / Jati (14.65 m³)',
    operatorName: 'Budi Santoso',
    operatorRole: 'Kepala Operasional Gudang',
    timestamp: '2026-10-01T08:30:00.000Z',
  },
  {
    id: 'act-init-2',
    action: 'RECORD_CREATED',
    entitySummary: 'Truk L 8172 UX • Merbau (17.85 m³)',
    operatorName: 'Budi Santoso',
    operatorRole: 'Kepala Operasional Gudang',
    timestamp: '2026-10-03T10:15:00.000Z',
  },
  {
    id: 'act-init-3',
    action: 'RECORD_CREATED',
    entitySummary: 'Truk AD 1459 CF • Mahoni (12.80 m³)',
    operatorName: 'Budi Santoso',
    operatorRole: 'Kepala Operasional Gudang',
    timestamp: '2026-10-05T13:40:00.000Z',
  },
  {
    id: 'act-init-4',
    action: 'RECORD_CREATED',
    entitySummary: 'Truk K 9102 HC • Sengon / Albasia (9.80 m³)',
    operatorName: 'Budi Santoso',
    operatorRole: 'Kepala Operasional Gudang',
    timestamp: '2026-10-08T09:00:00.000Z',
  },
];

export function useActivityLog() {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLogs(parsed);
          setIsHydrated(true);
        }
      }
    } catch (e) {
      console.warn('Failed to parse activity logs:', e);
    }

    if (!isHydrated) {
      setLogs(INITIAL_LOGS);
      setIsHydrated(true);
    }

    let isMounted = true;
    fetch('/api/activity')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!isMounted || !json?.success || !Array.isArray(json.data)) return;
        if (json.data.length > 0) {
          setLogs(json.data);
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(json.data));
          } catch {}
        }
      })
      .catch((err) => {
        console.warn('[useActivityLog] Background sync failed, using local cache:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const persist = useCallback((nextLogs: ActivityLogEntry[]) => {
    setLogs(nextLogs);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLogs));
    } catch (e) {
      console.error('Failed to persist activity logs:', e);
    }
  }, []);

  const addLog = useCallback(
    (params: {
      action: ActivityActionType;
      entityId?: string;
      entitySummary: string;
      operatorName?: string;
      operatorRole?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const newEntry = createActivityLog({
        action: params.action,
        entityId: params.entityId,
        entitySummary: params.entitySummary,
        operatorName: params.operatorName || 'System Operator',
        operatorRole: params.operatorRole || 'Operator',
        metadata: params.metadata,
      });

      setLogs((prev) => {
        const updated = [newEntry, ...prev];
        persist(updated);
        return updated;
      });

      fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry),
      }).catch((err) => {
        console.warn('[useActivityLog] Failed to append server activity log:', err);
      });
    },
    [persist]
  );

  const clearLogs = useCallback(() => {
    persist([]);
  }, [persist]);

  const resetLogs = useCallback(() => {
    persist(INITIAL_LOGS);
  }, [persist]);

  return {
    logs,
    isHydrated,
    addLog,
    clearLogs,
    resetLogs,
  };
}
