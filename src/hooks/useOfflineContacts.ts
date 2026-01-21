import { useState, useEffect, useCallback } from 'react';
import { DailyContact } from '@/types/contact';

const CACHE_KEY = 'today_due_contacts_cache';
const CACHE_TIMESTAMP_KEY = 'today_due_contacts_cache_timestamp';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedData {
  contacts: DailyContact[];
  timestamp: number;
}

export function useOfflineContacts() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [cachedContacts, setCachedContacts] = useState<DailyContact[] | null>(null);
  const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load cached data on mount
  useEffect(() => {
    loadCachedData();
  }, []);

  const loadCachedData = useCallback(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

      if (cached && timestamp) {
        const parsedTimestamp = parseInt(timestamp, 10);
        const age = Date.now() - parsedTimestamp;

        // Only use cache if it's not too old
        if (age < CACHE_MAX_AGE_MS) {
          const parsedContacts = JSON.parse(cached) as DailyContact[];
          
          // Restore Date objects
          const contactsWithDates = parsedContacts.map(c => ({
            ...c,
            lastContacted: c.lastContacted ? new Date(c.lastContacted) : null,
            nextDue: new Date(c.nextDue),
            followUpOverride: c.followUpOverride ? new Date(c.followUpOverride) : null,
          }));

          setCachedContacts(contactsWithDates);
          setCacheTimestamp(parsedTimestamp);
          console.log('[Offline] Loaded cached contacts:', contactsWithDates.length);
        } else {
          console.log('[Offline] Cache expired, clearing');
          clearCache();
        }
      }
    } catch (err) {
      console.error('[Offline] Error loading cache:', err);
    }
  }, []);

  // Cache contacts for offline use
  const cacheContacts = useCallback((contacts: DailyContact[]) => {
    try {
      const now = Date.now();
      localStorage.setItem(CACHE_KEY, JSON.stringify(contacts));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());
      setCachedContacts(contacts);
      setCacheTimestamp(now);
      console.log('[Offline] Cached contacts:', contacts.length);
    } catch (err) {
      console.error('[Offline] Error caching contacts:', err);
      // localStorage might be full, try to clear old data
      try {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      } catch {
        // Ignore
      }
    }
  }, []);

  // Clear the cache
  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      setCachedContacts(null);
      setCacheTimestamp(null);
    } catch (err) {
      console.error('[Offline] Error clearing cache:', err);
    }
  }, []);

  // Get contacts - uses cache when offline
  const getContactsForOffline = useCallback((onlineContacts: DailyContact[] | null): DailyContact[] => {
    // If online and have contacts, use them and update cache
    if (!isOffline && onlineContacts && onlineContacts.length > 0) {
      // Update cache in background
      cacheContacts(onlineContacts);
      return onlineContacts;
    }

    // If offline or no online contacts, use cache
    if (isOffline && cachedContacts) {
      return cachedContacts;
    }

    // Return online contacts or empty array
    return onlineContacts ?? [];
  }, [isOffline, cachedContacts, cacheContacts]);

  return {
    isOffline,
    cachedContacts,
    cacheTimestamp,
    cacheContacts,
    clearCache,
    getContactsForOffline,
    hasCachedData: cachedContacts !== null && cachedContacts.length > 0,
  };
}
