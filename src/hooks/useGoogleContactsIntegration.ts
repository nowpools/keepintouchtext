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
    
    const updates: Record<string, unknown> = {
      google_access_token: providerToken,
      google_token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour from now
      updated_at: new Date().toISOString(),
    };
    
    if (providerRefreshToken) {
      updates.google_refresh_token = providerRefreshToken;
    }

    const { error } = await supabase
      .from('user_integrations')
      .update(updates)
      .eq('user_id', userId);
    
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

  // Listen for OAuth callback when returning from Google
  useEffect(() => {
    const handleAuthChange = async (event: string, newSession: any) => {
      if (event === 'SIGNED_IN' && newSession?.provider_token && user) {
        // Store the tokens
        await storeGoogleTokens(user.id, newSession.provider_token, newSession.provider_refresh_token);
        await refreshStatus();
        setIsConnecting(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);
    return () => subscription.unsubscribe();
  }, [user, refreshStatus]);

  const connectGoogleContacts = async (): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error('Must be signed in to connect Google Contacts') };
    }

    setIsConnecting(true);

    try {
      // Use native OAuth flow for Capacitor apps
      if (Capacitor.isNativePlatform()) {
        const redirectUrl = 'https://964d240f-c90b-41c9-9988-8a8968fb6ab0.lovableproject.com/callback';
        
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            scopes: 'https://www.googleapis.com/auth/contacts.readonly',
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
            skipBrowserRedirect: true,
          },
        });

        if (error) {
          setIsConnecting(false);
          return { error };
        }

        if (data?.url) {
          await Browser.open({ 
            url: data.url,
            presentationStyle: 'fullscreen',
          });
        }

        return { error: null };
      }

      // Web OAuth flow
      const redirectUrl = `${window.location.origin}/settings`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          scopes: 'https://www.googleapis.com/auth/contacts.readonly',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) {
        setIsConnecting(false);
        return { error };
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
