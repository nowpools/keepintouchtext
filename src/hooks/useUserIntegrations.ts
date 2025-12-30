import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { UserIntegrations, ContactsPermission, ConflictResolutionPreference } from '@/types/contacts';

export function useUserIntegrations() {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<UserIntegrations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async () => {
    if (!user) {
      setIntegrations(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No row exists, create one
          const { data: newData, error: insertError } = await supabase
            .from('user_integrations')
            .insert({ user_id: user.id })
            .select()
            .single();

          if (insertError) throw insertError;
          setIntegrations(newData as UserIntegrations);
        } else {
          throw fetchError;
        }
      } else {
        setIntegrations(data as UserIntegrations);
      }
    } catch (e) {
      console.error('[useUserIntegrations] Fetch error:', e);
      setError(e instanceof Error ? e.message : 'Failed to fetch integrations');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const updateIntegrations = useCallback(async (
    updates: Partial<Omit<UserIntegrations, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<boolean> => {
    if (!user || !integrations) return false;

    try {
      const { data, error: updateError } = await supabase
        .from('user_integrations')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      setIntegrations(data as UserIntegrations);
      return true;
    } catch (e) {
      console.error('[useUserIntegrations] Update error:', e);
      setError(e instanceof Error ? e.message : 'Failed to update integrations');
      return false;
    }
  }, [user, integrations]);

  const setAppleSyncEnabled = useCallback(async (enabled: boolean) => {
    return updateIntegrations({ apple_sync_enabled: enabled });
  }, [updateIntegrations]);

  const setAppleVisible = useCallback(async (visible: boolean) => {
    return updateIntegrations({ apple_visible: visible });
  }, [updateIntegrations]);

  const setGoogleSyncEnabled = useCallback(async (enabled: boolean) => {
    return updateIntegrations({ google_sync_enabled: enabled });
  }, [updateIntegrations]);

  const setGoogleVisible = useCallback(async (visible: boolean) => {
    return updateIntegrations({ google_visible: visible });
  }, [updateIntegrations]);

  const setAppleContactsPermission = useCallback(async (permission: ContactsPermission) => {
    return updateIntegrations({ apple_contacts_permission: permission });
  }, [updateIntegrations]);

  const setConflictPreference = useCallback(async (preference: ConflictResolutionPreference) => {
    return updateIntegrations({ conflict_preference: preference });
  }, [updateIntegrations]);

  const updateGoogleTokens = useCallback(async (
    accessToken: string,
    refreshToken: string,
    expiresAt: Date
  ) => {
    return updateIntegrations({
      google_access_token: accessToken,
      google_refresh_token: refreshToken,
      google_token_expiry: expiresAt.toISOString(),
    });
  }, [updateIntegrations]);

  const clearGoogleTokens = useCallback(async () => {
    return updateIntegrations({
      google_access_token: null,
      google_refresh_token: null,
      google_token_expiry: null,
      google_sync_token: null,
      google_sync_enabled: false,
    });
  }, [updateIntegrations]);

  const updateLastSync = useCallback(async (source: 'apple' | 'google') => {
    const now = new Date().toISOString();
    if (source === 'apple') {
      return updateIntegrations({ last_sync_apple: now });
    } else {
      return updateIntegrations({ last_sync_google: now });
    }
  }, [updateIntegrations]);

  return {
    integrations,
    isLoading,
    error,
    refetch: fetchIntegrations,
    setAppleSyncEnabled,
    setAppleVisible,
    setGoogleSyncEnabled,
    setGoogleVisible,
    setAppleContactsPermission,
    setConflictPreference,
    updateGoogleTokens,
    clearGoogleTokens,
    updateLastSync,
  };
}
