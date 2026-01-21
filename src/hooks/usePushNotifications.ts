import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PushNotificationState {
  isSupported: boolean;
  isRegistered: boolean;
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unknown';
  token: string | null;
  isLoading: boolean;
  error: Error | null;
}

export function usePushNotifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isRegistered: false,
    permissionStatus: 'unknown',
    token: null,
    isLoading: false,
    error: null,
  });

  // Check if push notifications are supported
  const isSupported = Capacitor.isNativePlatform();

  // Register device token with backend
  const registerTokenWithBackend = useCallback(async (token: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.functions.invoke('register-device-token', {
        body: {
          token,
          platform: Capacitor.getPlatform(),
        },
      });

      if (error) {
        console.error('[Push] Failed to register token with backend:', error);
        throw error;
      }

      console.log('[Push] Token registered with backend');
    } catch (err) {
      console.error('[Push] Token registration error:', err);
      throw err;
    }
  }, [user]);

  // Handle deep link navigation from notification
  const handleDeepLink = useCallback((deeplink: string) => {
    console.log('[Push] Handling deep link:', deeplink);
    
    // Parse the deep link URL
    // Format: keepintouch://today or keepintouch://contact/:id
    try {
      const url = new URL(deeplink);
      const path = url.pathname || url.host; // Handle both URL formats
      
      if (path === 'today' || deeplink.includes('://today')) {
        navigate('/dashboard');
      } else if (path.startsWith('contact/') || deeplink.includes('://contact/')) {
        const contactId = path.replace('contact/', '') || deeplink.split('://contact/')[1];
        if (contactId) {
          navigate(`/contact/${contactId}`);
        }
      }
    } catch {
      // Fallback: try simple parsing
      if (deeplink.includes('://today')) {
        navigate('/dashboard');
      } else if (deeplink.includes('://contact/')) {
        const contactId = deeplink.split('://contact/')[1]?.split('?')[0];
        if (contactId) {
          navigate(`/contact/${contactId}`);
        }
      }
    }
  }, [navigate]);

  // Request permission and register for push notifications
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      console.log('[Push] Not supported on this platform');
      return { granted: false };
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Check current permission status
      const permStatus = await PushNotifications.checkPermissions();
      console.log('[Push] Current permission status:', permStatus.receive);

      if (permStatus.receive === 'prompt') {
        // Request permission
        const requestResult = await PushNotifications.requestPermissions();
        console.log('[Push] Permission request result:', requestResult.receive);

        if (requestResult.receive !== 'granted') {
          setState(prev => ({
            ...prev,
            isLoading: false,
            permissionStatus: 'denied',
          }));
          return { granted: false };
        }
      } else if (permStatus.receive === 'denied') {
        setState(prev => ({
          ...prev,
          isLoading: false,
          permissionStatus: 'denied',
        }));
        return { granted: false };
      }

      // Register with APNs/FCM
      await PushNotifications.register();

      setState(prev => ({
        ...prev,
        isLoading: false,
        permissionStatus: 'granted',
      }));

      return { granted: true };
    } catch (err) {
      console.error('[Push] Permission request error:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err as Error,
      }));
      return { granted: false, error: err };
    }
  }, [isSupported]);

  // Set up push notification listeners
  useEffect(() => {
    if (!isSupported) {
      setState(prev => ({ ...prev, isSupported: false }));
      return;
    }

    setState(prev => ({ ...prev, isSupported: true }));

    // Registration success - receive token
    const registrationListener = PushNotifications.addListener(
      'registration',
      async (token: Token) => {
        console.log('[Push] Registration successful, token:', token.value.substring(0, 20) + '...');
        
        setState(prev => ({
          ...prev,
          token: token.value,
          isRegistered: true,
        }));

        // Register with backend
        try {
          await registerTokenWithBackend(token.value);
        } catch (err) {
          console.error('[Push] Failed to register with backend:', err);
        }
      }
    );

    // Registration error
    const registrationErrorListener = PushNotifications.addListener(
      'registrationError',
      (error) => {
        console.error('[Push] Registration error:', error);
        setState(prev => ({
          ...prev,
          error: new Error(error.error || 'Registration failed'),
          isRegistered: false,
        }));
      }
    );

    // Notification received while app is in foreground
    const notificationReceivedListener = PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('[Push] Notification received in foreground:', notification);
        // Could show an in-app notification here
      }
    );

    // User tapped on notification
    const notificationActionListener = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (notification: ActionPerformed) => {
        console.log('[Push] Notification action performed:', notification);
        
        // Extract deep link from notification data
        const data = notification.notification.data;
        if (data?.deeplink) {
          handleDeepLink(data.deeplink);
        } else if (data?.contactId) {
          navigate(`/contact/${data.contactId}`);
        } else {
          // Default: go to Today
          navigate('/dashboard');
        }
      }
    );

    // Cleanup listeners on unmount
    return () => {
      registrationListener.then(l => l.remove());
      registrationErrorListener.then(l => l.remove());
      notificationReceivedListener.then(l => l.remove());
      notificationActionListener.then(l => l.remove());
    };
  }, [isSupported, registerTokenWithBackend, handleDeepLink, navigate]);

  // Check initial permission status
  useEffect(() => {
    if (!isSupported) return;

    PushNotifications.checkPermissions().then(result => {
      setState(prev => ({
        ...prev,
        permissionStatus: result.receive as PushNotificationState['permissionStatus'],
      }));
    });
  }, [isSupported]);

  return {
    ...state,
    requestPermission,
    handleDeepLink,
  };
}
