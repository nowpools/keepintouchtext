import { useState, useEffect, useCallback } from 'react';
import { SortOrderType, SocialPlatform, SocialPlatformSettings, CadenceSettings } from '@/types/contact';

const STORAGE_KEY = 'kitSettings';

const DEFAULT_SOCIAL_PLATFORMS: SocialPlatformSettings = {
  linkedin: false,
  x: false,
  youtube: false,
  facebook: false,
  instagram: false,
  tiktok: false,
  github: false,
  threads: false,
  snapchat: false,
  pinterest: false,
  reddit: false,
  discord: false,
  twitch: false,
  whatsapp: false,
  telegram: false,
};

// Extended settings to support null for maxDailyContacts
export interface ExtendedAppSettings {
  maxDailyContacts: number | null;
  cadenceSettings: CadenceSettings;
  aiTone: 'casual' | 'professional' | 'friendly';
  aiLength: 'short' | 'medium' | 'long';
  sortOrder: SortOrderType;
  visibleSocialPlatforms: SocialPlatformSettings;
}

const DEFAULT_SETTINGS: ExtendedAppSettings = {
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
  visibleSocialPlatforms: DEFAULT_SOCIAL_PLATFORMS,
};

export function useAppSettings() {
  const [settings, setSettings] = useState<ExtendedAppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Handle migration - preserve null if explicitly set
        const mergedSettings = { ...DEFAULT_SETTINGS, ...parsed };
        // Ensure visibleSocialPlatforms is properly merged
        mergedSettings.visibleSocialPlatforms = {
          ...DEFAULT_SOCIAL_PLATFORMS,
          ...parsed.visibleSocialPlatforms,
        };
        setSettings(mergedSettings);
      } catch (e) {
        console.error('Error parsing settings:', e);
      }
    }
    setIsLoaded(true);
  }, []);

  const updateSettings = useCallback((updates: Partial<ExtendedAppSettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      return newSettings;
    });
  }, []);

  const updateMaxDailyContacts = useCallback((value: number | null) => {
    if (value === null || (value >= 1 && value <= 50)) {
      updateSettings({ maxDailyContacts: value });
    }
  }, [updateSettings]);

  const updateSortOrder = useCallback((value: SortOrderType) => {
    updateSettings({ sortOrder: value });
  }, [updateSettings]);

  const toggleSocialPlatform = useCallback((platform: SocialPlatform) => {
    setSettings(prev => {
      const newSettings = {
        ...prev,
        visibleSocialPlatforms: {
          ...prev.visibleSocialPlatforms,
          [platform]: !prev.visibleSocialPlatforms[platform],
        },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      return newSettings;
    });
  }, []);

  return {
    settings,
    isLoaded,
    updateSettings,
    updateMaxDailyContacts,
    updateSortOrder,
    toggleSocialPlatform,
  };
}
