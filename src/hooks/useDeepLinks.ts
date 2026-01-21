import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

/**
 * Hook to handle deep links for the app
 * Supports:
 * - keepintouch://today → /dashboard
 * - keepintouch://contact/:id → /contact/:id
 * - keepintouch://settings → /settings
 * - keepintouch://contacts → /contacts
 */
export function useDeepLinks() {
  const navigate = useNavigate();

  const handleDeepLink = useCallback((url: string) => {
    console.log('[DeepLink] Received:', url);

    // Parse the URL
    // Format: keepintouch://today or keepintouch://contact/123
    try {
      // Extract path from URL
      let path = '';
      
      // Try standard URL parsing
      try {
        const parsed = new URL(url);
        path = parsed.host + parsed.pathname;
      } catch {
        // Fallback for custom schemes
        const match = url.match(/keepintouch:\/\/(.+)/);
        if (match) {
          path = match[1].split('?')[0]; // Remove query params
        }
      }

      console.log('[DeepLink] Parsed path:', path);

      // Route based on path
      if (path === 'today' || path === '/today') {
        navigate('/dashboard');
      } else if (path === 'settings' || path === '/settings') {
        navigate('/settings');
      } else if (path === 'contacts' || path === '/contacts') {
        navigate('/contacts');
      } else if (path.startsWith('contact/')) {
        const contactId = path.replace('contact/', '');
        if (contactId) {
          navigate(`/contact/${contactId}`);
        }
      } else {
        console.log('[DeepLink] Unknown path, ignoring');
      }
    } catch (err) {
      console.error('[DeepLink] Parse error:', err);
    }
  }, [navigate]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Listen for URL open events (app already running or cold start)
    const listener = CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      // Skip OAuth callback URLs (handled by useCapacitorAuth)
      if (url.includes('code=') || url.includes('access_token') || url.includes('error=')) {
        console.log('[DeepLink] Skipping OAuth callback URL');
        return;
      }

      handleDeepLink(url);
    });

    // Check if app was opened via URL (cold start)
    CapacitorApp.getLaunchUrl().then((result) => {
      if (result?.url) {
        // Skip OAuth callback URLs
        if (result.url.includes('code=') || result.url.includes('access_token') || result.url.includes('error=')) {
          console.log('[DeepLink] Skipping OAuth launch URL');
          return;
        }
        
        handleDeepLink(result.url);
      }
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, [handleDeepLink]);

  return { handleDeepLink };
}
