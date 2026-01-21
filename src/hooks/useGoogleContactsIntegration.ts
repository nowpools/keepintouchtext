import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface GoogleContactsIntegration {
  isConnected: boolean;
  isConnecting: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  syncEnabled: boolean;
  connectGoogleContacts: () => Promise<{ error: Error | null }>;
  disconnectGoogleContacts: () => Promise<void>;
  syncContacts: () => Promise<void>;
  toggleSyncEnabled: (enabled: boolean) => Promise<void>;
  refreshStatus: () => Promise<void>;
}

// Store Google tokens when we have them from OAuth
async function storeGoogleTokens(userId: string, providerToken: string, providerRefreshToken?: string) {
  try {
    console.log('Storing Google tokens for user:', userId);
    
    const tokenExpiry = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour from now
    const now = new Date().toISOString();

    // Use upsert to handle both new and existing rows
    const { error } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: userId,
        google_access_token: providerToken,
        google_refresh_token: providerRefreshToken ?? null,
        google_token_expiry: tokenExpiry,
        updated_at: now,
      }, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error('Failed to store Google tokens:', error);
    } else {
      console.log('Google tokens stored successfully');
    }
  } catch (error) {
    console.error('Failed to store Google tokens:', error);
  }
}

export function useGoogleContactsIntegration(): GoogleContactsIntegration {
  const { user, session } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncEnabled, setSyncEnabled] = useState(false);

  const refreshStatus = useCallback(async () => {
    if (!user) {
      setIsConnected(false);
      setLastSyncedAt(null);
      setSyncEnabled(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_integrations')
        .select('google_access_token, google_refresh_token, google_sync_enabled, last_sync_google')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching integration status:', error);
        return;
      }

      // Consider connected if we have either access token or refresh token
      const hasTokens = !!(data?.google_access_token || data?.google_refresh_token);
      setIsConnected(hasTokens);
      setLastSyncedAt(data?.last_sync_google || null);
      setSyncEnabled(data?.google_sync_enabled || false);
    } catch (error) {
      console.error('Error checking Google connection:', error);
    }
  }, [user]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // Listen for OAuth callback when returning from Google (linkIdentity triggers USER_UPDATED)
  useEffect(() => {
    const handleAuthChange = async (event: string, newSession: any) => {
      if ((event === 'USER_UPDATED' || event === 'SIGNED_IN') && newSession?.provider_token && user) {
        // Store the tokens
        await storeGoogleTokens(user.id, newSession.provider_token, newSession.provider_refresh_token);
        await refreshStatus();
        setIsConnecting(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);
    return () => subscription.unsubscribe();
  }, [user, refreshStatus]);

  // Fallback: Parse tokens from URL hash when returning from OAuth
  useEffect(() => {
    const handleOAuthReturn = async () => {
      const hash = window.location.hash;
      if (hash && user) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        
        if (accessToken) {
          console.log('Found OAuth tokens in URL hash, storing...');
          await storeGoogleTokens(user.id, accessToken, refreshToken || undefined);
          await refreshStatus();
          setIsConnecting(false);
          // Clean up URL
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    };

    handleOAuthReturn();
  }, [user, refreshStatus]);

  const connectGoogleContacts = async (): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error('Must be signed in to connect Google Contacts') };
    }

    setIsConnecting(true);

    try {
      // Use custom OAuth flow to properly capture tokens
      const redirectUrl = Capacitor.isNativePlatform()
        ? 'https://keepintouchtext.com/google-callback'
        : `${window.location.origin}/google-callback`;

      // Get the OAuth URL from our edge function
      const { data, error } = await supabase.functions.invoke('google-oauth-url', {
        body: { userId: user.id, redirectUrl },
      });

      if (error || data?.error) {
        setIsConnecting(false);
        return { error: new Error(data?.error || error?.message || 'Failed to start OAuth') };
      }

      if (!data?.url) {
        setIsConnecting(false);
        return { error: new Error('No OAuth URL received') };
      }

      // Redirect to Google OAuth
      if (Capacitor.isNativePlatform()) {
        await Browser.open({
          url: data.url,
          presentationStyle: 'fullscreen',
        });
      } else {
        window.location.href = data.url;
      }

      return { error: null };
    } catch (error) {
      setIsConnecting(false);
      return { error: error as Error };
    }
  };

  const disconnectGoogleContacts = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_integrations')
        .update({
          google_access_token: null,
          google_refresh_token: null,
          google_token_expiry: null,
          google_sync_enabled: false,
          google_sync_token: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error disconnecting Google:', error);
        throw error;
      }

      setIsConnected(false);
      setLastSyncedAt(null);
      setSyncEnabled(false);
    } catch (error) {
      console.error('Failed to disconnect Google Contacts:', error);
      throw error;
    }
  };

  const syncContacts = async () => {
    if (!user || !session) return;

    setIsSyncing(true);

    try {
      // Get valid access token
      const { data: integrationData, error: fetchError } = await supabase
        .from('user_integrations')
        .select('google_access_token, google_refresh_token, google_token_expiry')
        .eq('user_id', user.id)
        .single();

      if (fetchError || !integrationData) {
        throw new Error('Failed to get Google tokens');
      }

      let accessToken = integrationData.google_access_token;

      // Check if token is expired and needs refresh
      if (integrationData.google_token_expiry) {
        const expiryTime = new Date(integrationData.google_token_expiry).getTime();
        const now = Date.now();

        if (now >= expiryTime && integrationData.google_refresh_token) {
          // Token expired, need to refresh
          const { data: refreshData, error: refreshError } = await supabase.functions.invoke('refresh-google-token', {
            body: { userId: user.id },
          });

          if (refreshError || !refreshData?.accessToken) {
            throw new Error('Failed to refresh Google token. Please reconnect Google Contacts.');
          }

          accessToken = refreshData.accessToken;
        }
      }

      if (!accessToken) {
        throw new Error('No valid Google access token. Please reconnect Google Contacts.');
      }

      // Call sync function
      const { data, error } = await supabase.functions.invoke('sync-google-contacts', {
        body: { accessToken },
      });

      if (error) throw error;

      // Update last sync time
      await supabase
        .from('user_integrations')
        .update({ 
          last_sync_google: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      await refreshStatus();

      console.log('Sync completed:', data);
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleSyncEnabled = async (enabled: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_integrations')
        .update({ 
          google_sync_enabled: enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setSyncEnabled(enabled);
    } catch (error) {
      console.error('Failed to update sync setting:', error);
      throw error;
    }
  };

  return {
    isConnected,
    isConnecting,
    isSyncing,
    lastSyncedAt,
    syncEnabled,
    connectGoogleContacts,
    disconnectGoogleContacts,
    syncContacts,
    toggleSyncEnabled,
    refreshStatus,
  };
}
