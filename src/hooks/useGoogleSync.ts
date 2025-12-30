import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserIntegrations } from '@/hooks/useUserIntegrations';
import { useToast } from '@/hooks/use-toast';

export function useGoogleSync() {
  const { user, session } = useAuth();
  const { integrations, updateGoogleTokens, setGoogleSyncEnabled, refetch } = useUserIntegrations();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Check if Google is connected
  const isConnected = Boolean(integrations?.google_access_token);

  // Connect Google account - initiates OAuth flow
  const connectGoogle = useCallback(async () => {
    setIsConnecting(true);
    try {
      const redirectUrl = `${window.location.origin}/oauth-callback`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          scopes: 'https://www.googleapis.com/auth/contacts',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
      // OAuth redirect will happen, so we don't need to do anything else here
    } catch (error) {
      console.error('[useGoogleSync] Connect error:', error);
      toast({
        title: 'Connection failed',
        description: error instanceof Error ? error.message : 'Failed to connect Google',
        variant: 'destructive',
      });
      setIsConnecting(false);
    }
  }, [toast]);

  // Capture Google tokens from the session after OAuth
  const captureGoogleTokens = useCallback(async () => {
    if (!session?.provider_token || !user) {
      console.log('[useGoogleSync] No provider token available');
      return false;
    }

    try {
      // Get provider refresh token if available
      const providerRefreshToken = session.provider_refresh_token;
      
      // Calculate token expiry (Google tokens typically expire in 1 hour)
      const expiresAt = new Date(Date.now() + 3600 * 1000);

      // Store tokens in user_integrations
      const success = await updateGoogleTokens(
        session.provider_token,
        providerRefreshToken || '',
        expiresAt
      );

      if (success) {
        await setGoogleSyncEnabled(true);
        console.log('[useGoogleSync] Google tokens captured successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('[useGoogleSync] Error capturing tokens:', error);
      return false;
    }
  }, [session, user, updateGoogleTokens, setGoogleSyncEnabled]);

  // Sync contacts from Google
  const syncContacts = useCallback(async () => {
    if (!user || !integrations?.google_access_token) {
      toast({
        title: 'Not connected',
        description: 'Please connect your Google account first',
        variant: 'destructive',
      });
      return false;
    }

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-google-contacts', {
        body: {
          userId: user.id,
          accessToken: integrations.google_access_token,
          syncToken: integrations.google_sync_token,
        },
      });

      if (error) throw error;

      toast({
        title: 'Sync complete',
        description: `Synced ${data?.syncedCount || 0} contacts from Google`,
      });

      // Refetch integrations to update last_sync_google
      await refetch();
      return true;
    } catch (error) {
      console.error('[useGoogleSync] Sync error:', error);
      toast({
        title: 'Sync failed',
        description: error instanceof Error ? error.message : 'Failed to sync contacts',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [user, integrations, toast, refetch]);

  return {
    isConnected,
    isConnecting,
    isSyncing,
    connectGoogle,
    captureGoogleTokens,
    syncContacts,
  };
}
