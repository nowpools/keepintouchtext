import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';

// Handle OAuth for Capacitor native apps
export const setupCapacitorAuth = () => {
  if (!Capacitor.isNativePlatform()) return;

  // Listen for deep links (OAuth callback)
  CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
    console.log('App URL opened:', url);
    
    // Check if this is an OAuth callback
    if (url.includes('access_token') || url.includes('code=')) {
      // Close the browser
      await Browser.close();
      
      // Extract the URL fragment/query params
      const urlObj = new URL(url);
      const hashParams = new URLSearchParams(urlObj.hash.substring(1));
      const queryParams = urlObj.searchParams;
      
      const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
      
      if (accessToken && refreshToken) {
        // Set the session manually
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }
    }
  });
};

export const signInWithGoogleNative = async () => {
  const redirectUrl = 'app.keepintouch.crm://callback';
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      scopes: 'https://www.googleapis.com/auth/contacts',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
      skipBrowserRedirect: true, // Important: we handle the redirect ourselves
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
