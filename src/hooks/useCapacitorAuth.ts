import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';

// Handle OAuth for Capacitor native apps
export const setupCapacitorAuth = () => {
  if (!Capacitor.isNativePlatform()) return;

  // Listen for app resume (when returning from browser OAuth)
  CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
    if (isActive) {
      // Check if we have a session when app becomes active
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Close browser if still open
        try {
          await Browser.close();
        } catch (e) {
          // Browser might already be closed
        }
      }
    }
  });

  // Also listen for URL opens (deep links)
  CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
    console.log('App URL opened:', url);
    
    if (url.includes('access_token') || url.includes('code=')) {
      try {
        await Browser.close();
      } catch (e) {
        // Browser might already be closed
      }
    }
  });
};

export const signInWithGoogleNative = async () => {
  // Use the web URL - user will complete OAuth in browser and return to app
  const redirectUrl = 'https://keepintouchtext.com/dashboard';
  
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
    // Open OAuth URL in in-app browser
    await Browser.open({ 
      url: data.url,
      presentationStyle: 'popover',
    });
  }

  return { error: null };
};
