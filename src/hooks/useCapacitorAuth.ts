import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';

// Handle OAuth for Capacitor native apps

let isHandlingOAuthCallback = false;

export const setupCapacitorAuth = () => {
  if (!Capacitor.isNativePlatform()) return;

  // Listen for app resume (when returning from browser OAuth)
  CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
    if (!isActive) return;

    // If a session is already present, close the in-app browser.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      await Browser.close();
    } catch {
      // Browser might already be closed
    }
  });

  // Listen for URL opens (universal links / custom scheme callbacks)
  CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
    console.log('[OAuth] App URL opened:', url);
    
    if (isHandlingOAuthCallback) {
      console.log('[OAuth] Already handling callback, skipping');
      return;
    }

    // Check for error params first
    const hasError = url.includes('error=');
    const hasAuthParams = url.includes('code=') || url.includes('access_token') || url.includes('refresh_token');
    
    if (!hasAuthParams && !hasError) {
      console.log('[OAuth] No auth params or error found');
      return;
    }

    isHandlingOAuthCallback = true;
    console.log('[OAuth] Starting callback handling');

    try {
      // Parse URL - handle custom scheme
      let params: URLSearchParams;
      try {
        const parsed = new URL(url);
        params = parsed.searchParams;
        // Also check hash for tokens
        if (parsed.hash) {
          const hashParams = new URLSearchParams(parsed.hash.substring(1));
          hashParams.forEach((value, key) => params.set(key, value));
        }
      } catch {
        // Fallback for custom schemes that URL can't parse
        const queryStart = url.indexOf('?');
        const hashStart = url.indexOf('#');
        let queryString = '';
        
        if (queryStart !== -1) {
          const endIndex = hashStart !== -1 && hashStart > queryStart ? hashStart : url.length;
          queryString = url.substring(queryStart + 1, endIndex);
        }
        if (hashStart !== -1) {
          queryString += (queryString ? '&' : '') + url.substring(hashStart + 1);
        }
        params = new URLSearchParams(queryString);
      }

      // Check for errors from Supabase
      const error = params.get('error');
      const errorDescription = params.get('error_description');
      if (error) {
        console.error('[OAuth] Auth error:', error, errorDescription);
        alert(`Sign-in failed: ${errorDescription || error}`);
        return;
      }

      const code = params.get('code');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      console.log('[OAuth] Params - code:', !!code, 'access_token:', !!accessToken, 'refresh_token:', !!refreshToken);

      if (code) {
        console.log('[OAuth] Exchanging code for session...');
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('[OAuth] Code exchange failed:', error);
          alert(`Sign-in failed: ${error.message}`);
          return;
        }
        console.log('[OAuth] Session established:', !!data.session);
      } else if (accessToken && refreshToken) {
        console.log('[OAuth] Setting session from tokens...');
        const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) {
          console.error('[OAuth] Set session failed:', error);
          alert(`Sign-in failed: ${error.message}`);
          return;
        }
        console.log('[OAuth] Session established:', !!data.session);
      } else {
        console.warn('[OAuth] No valid auth data found in URL');
        return;
      }

      // Close the in-app browser
      try {
        await Browser.close();
      } catch {
        // Browser might already be closed
      }

      // Force a session check to update the UI
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[OAuth] Final session check:', !!session);
      
      if (session) {
        // Navigate to dashboard
        window.location.href = '/dashboard';
      }
    } catch (e) {
      console.error('[OAuth] Callback handling failed:', e);
      alert(`Sign-in error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setTimeout(() => {
        isHandlingOAuthCallback = false;
      }, 1500);
    }
  });
};

// Browser-based OAuth for Google on native platforms
export const signInWithGoogleNative = async () => {
  console.log('[OAuth] Starting Google sign-in...');
  
  const redirectUrl = 'https://964d240f-c90b-41c9-9988-8a8968fb6ab0.lovableproject.com/callback';
  console.log('[OAuth] Redirect URL:', redirectUrl);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      scopes: 'https://www.googleapis.com/auth/contacts',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    console.error('[OAuth] signInWithOAuth error:', error);
    return { error };
  }

  console.log('[OAuth] OAuth URL generated:', data?.url);

  if (data?.url) {
    try {
      console.log('[OAuth] Opening browser...');
      await Browser.open({
        url: data.url,
        presentationStyle: 'fullscreen',
      });
      console.log('[OAuth] Browser.open() completed successfully');
    } catch (browserError) {
      console.error('[OAuth] Browser.open() failed:', browserError);
      return { error: browserError as Error };
    }
  }

  return { error: null };
};

// Browser-based OAuth for Apple on native platforms
export const signInWithAppleNative = async () => {
  console.log('[OAuth] Starting Apple sign-in...');
  
  const redirectUrl = 'https://964d240f-c90b-41c9-9988-8a8968fb6ab0.lovableproject.com/callback';
  console.log('[OAuth] Redirect URL:', redirectUrl);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    console.error('[OAuth] signInWithOAuth error:', error);
    return { error };
  }

  console.log('[OAuth] OAuth URL generated:', data?.url);

  if (data?.url) {
    try {
      console.log('[OAuth] Opening browser...');
      await Browser.open({
        url: data.url,
        presentationStyle: 'fullscreen',
      });
      console.log('[OAuth] Browser.open() completed successfully');
    } catch (browserError) {
      console.error('[OAuth] Browser.open() failed:', browserError);
      return { error: browserError as Error };
    }
  }

  return { error: null };
};
