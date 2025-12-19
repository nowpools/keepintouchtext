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
    if (isHandlingOAuthCallback) return;

    // We only care about auth callback URLs.
    const hasAuthParams = url.includes('code=') || url.includes('access_token') || url.includes('refresh_token');
    if (!hasAuthParams) return;

    isHandlingOAuthCallback = true;

    try {
      // Handle PKCE (code in query string)
      let code: string | null = null;
      try {
        const parsed = new URL(url);
        code = parsed.searchParams.get('code');
      } catch {
        // URL parsing can fail for some custom schemes; fall back to string parsing.
        const match = url.match(/[?&]code=([^&]+)/);
        code = match?.[1] ? decodeURIComponent(match[1]) : null;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
      } else {
        // Handle implicit flow (tokens in hash)
        const hash = url.split('#')[1] ?? '';
        const params = new URLSearchParams(hash);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
        }
      }

      // Close the in-app browser and return user to app UI
      try {
        await Browser.close();
      } catch {
        // ignore
      }

      // If user isn't already on /auth, ensure we land on the app.
      if (!window.location.pathname.startsWith('/auth')) {
        window.location.replace('/dashboard');
      }
    } catch (e) {
      console.warn('OAuth callback handling failed:', e);
    } finally {
      // Allow a future attempt if something went wrong.
      setTimeout(() => {
        isHandlingOAuthCallback = false;
      }, 1500);
    }
  });
};

export const signInWithGoogleNative = async () => {
  // Redirect back to a https URL (required), which will then deep-link into the app.
  const redirectUrl = 'https://keepintouchtext.com/callback';

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

  if (error) return { error };

  if (data?.url) {
    // Note: iOS SFSafariViewController won't open Universal Links automatically.
    // We rely on the /callback page to deep-link back into the app.
    await Browser.open({
      url: data.url,
      presentationStyle: 'fullscreen',
    });
  }

  return { error: null };
};

