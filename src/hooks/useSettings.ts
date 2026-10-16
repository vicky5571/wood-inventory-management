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
          setIsHydrated(true);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to parse settings:', e);
    }
    setSettings(DEFAULT_SETTINGS);
    setIsHydrated(true);
  }, []);

  const saveSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated: AppSettings = { ...prev, ...newSettings };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save settings:', e);
      }
      return updated;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch {}
  }, []);

  return {
    settings,
    isHydrated,
    saveSettings,
    resetSettings,
  };
}
