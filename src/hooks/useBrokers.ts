'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { WoodReceivingRecord, Broker, BrokerWithMetrics, BrokerStats } from '../types/index.ts';
import { BrokerRepository } from '../persistence/broker-repository.ts';
import { aggregateBrokerMetrics, computeBrokerStats } from '../utils/broker-metrics.ts';
import { toast } from '../utils/toast-store.ts';

const repo = new BrokerRepository();

export function useBrokers(records: WoodReceivingRecord[] = []) {
  const [rawBrokers, setRawBrokers] = useState<Broker[]>(() => repo.getAll());

  const reload = useCallback(() => {
    setRawBrokers(repo.getAll());
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/brokers')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!isMounted || !json?.success || !Array.isArray(json.data)) return;
        for (const b of json.data) {
          try {
            repo.save(b);
          } catch {}
        }
        setRawBrokers(json.data);
      })
      .catch((err) => {
        console.warn('[useBrokers] Background sync failed, using local cache:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const brokers: BrokerWithMetrics[] = useMemo(() => {
    return aggregateBrokerMetrics(rawBrokers, records);
  }, [rawBrokers, records]);

  const stats: BrokerStats = useMemo(() => {
    return computeBrokerStats(rawBrokers, records);
  }, [rawBrokers, records]);

  const addBroker = useCallback((data: Partial<Broker> & { name: string }) => {
    const saved = repo.save(data);
    reload();

    fetch('/api/brokers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saved),
    }).catch((err) => {
      console.warn('[useBrokers] Failed to sync new broker to server:', err);
    });

    toast.success('Broker Berhasil Ditambahkan (经纪人已添加)', `${saved.name} (${saved.code})`);
    return saved;
  }, [reload]);

  const updateBroker = useCallback((id: string, data: Partial<Broker>) => {
    const saved = repo.save({ ...data, id, name: data.name || '' });
    reload();

    fetch('/api/brokers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saved),
    }).catch((err) => {
      console.warn('[useBrokers] Failed to sync updated broker to server:', err);
    });

    toast.success('Broker Diperbarui (经纪人已更新)', `${saved.name} (${saved.code})`);
    return saved;
  }, [reload]);

  const restoreBroker = useCallback((id: string) => {
    const target = rawBrokers.find((b) => b.id === id);
    if (!target) return false;
    const restored = repo.save({ ...target, status: 'ACTIVE' });
    reload();

    fetch('/api/brokers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(restored),
    }).catch((err) => {
      console.warn('[useBrokers] Failed to sync restored broker:', err);
    });

    toast.success('Broker Dipulihkan (已恢复)', `${restored.name} aktif kembali`);
    return true;
  }, [rawBrokers, reload]);

  const deleteBroker = useCallback((id: string) => {
    const target = rawBrokers.find((b) => b.id === id);
    const targetName = target ? target.name : id;
    const success = repo.delete(id);

    if (success) {
      reload();
      fetch(`/api/brokers?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }).catch((err) => {
        console.warn('[useBrokers] Failed to sync deleted broker to server:', err);
      });

      toast.info('Broker Dinonaktifkan (已停用)', `${targetName} telah dinonaktifkan.`, 5000, {
        label: 'Urungkan (撤销)',
        onClick: () => {
          restoreBroker(id);
        },
      });
    }
    return success;
  }, [rawBrokers, reload, restoreBroker]);

  return {
    brokers,
    rawBrokers,
    stats,
    addBroker,
    updateBroker,
    deleteBroker,
    restoreBroker,
    refreshBrokers: reload,
  };
}
