import { useState, useEffect, useCallback } from 'react';
import { AppSettings, SortOrderType } from '@/types/contact';

const STORAGE_KEY = 'kitSettings';

const DEFAULT_SETTINGS: AppSettings = {
  maxDailyContacts: 5,
  cadenceSettings: {
    daily: 1,
    weekly: 7,
    monthly: 30,
    quarterly: 90,
    'twice-yearly': 180,
    yearly: 365,
  },
  aiTone: 'friendly',
  aiLength: 'medium',
  sortOrder: 'alphabetical',
};

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (e) {
        console.error('Error parsing settings:', e);
      }
    }
    setIsLoaded(true);
  }, []);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      return newSettings;
    });
  }, []);

  const updateMaxDailyContacts = useCallback((value: number) => {
    if (value >= 1 && value <= 50) {
      updateSettings({ maxDailyContacts: value });
    }
  }, [updateSettings]);

  const updateSortOrder = useCallback((value: SortOrderType) => {
    updateSettings({ sortOrder: value });
  }, [updateSettings]);

  return {
    settings,
    isLoaded,
    updateSettings,
    updateMaxDailyContacts,
    updateSortOrder,
  };
}
