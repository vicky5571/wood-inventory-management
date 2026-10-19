'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AppSettings } from '../types/index.ts';

const STORAGE_KEY = 'wood_app_settings_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  defaultTimberPphRate: 0.5,
  defaultFreightPphRate: 2.0,
  defaultBrokerFee: 250000,
  acceptableDiscrepancyThresholdPct: 2.0,
  yardName: 'TPK-01 Utama (Central Yard)',
  yardCode: 'TPK-01',
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      }
    } catch (e) {
      console.warn('Failed to parse settings:', e);
    }
    setIsHydrated(true);

    let isMounted = true;
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!isMounted || !json?.success || !json.data) return;
        setSettings(json.data);
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(json.data));
        } catch {}
      })
      .catch((err) => {
        console.warn('[useSettings] Background sync failed, using local cache:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const saveSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated: AppSettings = { ...prev, ...newSettings };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save settings:', e);
      }

      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch((err) => {
        console.warn('[useSettings] Failed to sync settings update to server:', err);
      });

      return updated;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch {}

    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(DEFAULT_SETTINGS),
    }).catch((err) => {
      console.warn('[useSettings] Failed to sync reset settings to server:', err);
    });
  }, []);

  return {
    settings,
    isHydrated,
    saveSettings,
    resetSettings,
  };
}
