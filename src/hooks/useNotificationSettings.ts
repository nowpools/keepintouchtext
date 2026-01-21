import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface NotificationSettings {
  notificationsEnabled: boolean;
  reminderTimeLocal: string; // HH:MM format
  reminderDays: string[]; // ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
}

const DEFAULT_SETTINGS: NotificationSettings = {
  notificationsEnabled: false,
  reminderTimeLocal: '09:00',
  reminderDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
};

export function useNotificationSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch notification settings from user_profiles
  const fetchSettings = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('notifications_enabled, reminder_time_local, reminder_days')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('[NotificationSettings] Fetch error:', error);
        return;
      }

      if (data) {
        setSettings({
          notificationsEnabled: data.notifications_enabled ?? false,
          reminderTimeLocal: data.reminder_time_local 
            ? data.reminder_time_local.substring(0, 5) // Convert TIME to HH:MM
            : '09:00',
          reminderDays: (data.reminder_days as string[]) ?? ['mon', 'tue', 'wed', 'thu', 'fri'],
        });
      }
    } catch (err) {
      console.error('[NotificationSettings] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Update notification enabled status
  const setNotificationsEnabled = useCallback(async (enabled: boolean) => {
    if (!user) return { error: new Error('Not authenticated') };

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ notifications_enabled: enabled })
        .eq('user_id', user.id);

      if (error) throw error;

      setSettings(prev => ({ ...prev, notificationsEnabled: enabled }));
      return { error: null };
    } catch (err) {
      console.error('[NotificationSettings] Update error:', err);
      return { error: err as Error };
    } finally {
      setIsSaving(false);
    }
  }, [user]);

  // Update reminder time
  const setReminderTime = useCallback(async (time: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    setIsSaving(true);
    try {
      // Convert HH:MM to PostgreSQL TIME format (HH:MM:SS)
      const timeValue = time + ':00';

      const { error } = await supabase
        .from('user_profiles')
        .update({ reminder_time_local: timeValue })
        .eq('user_id', user.id);

      if (error) throw error;

      setSettings(prev => ({ ...prev, reminderTimeLocal: time }));
      return { error: null };
    } catch (err) {
      console.error('[NotificationSettings] Update error:', err);
      return { error: err as Error };
    } finally {
      setIsSaving(false);
    }
  }, [user]);

  // Update reminder days
  const setReminderDays = useCallback(async (days: string[]) => {
    if (!user) return { error: new Error('Not authenticated') };

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ reminder_days: days })
        .eq('user_id', user.id);

      if (error) throw error;

      setSettings(prev => ({ ...prev, reminderDays: days }));
      return { error: null };
    } catch (err) {
      console.error('[NotificationSettings] Update error:', err);
      return { error: err as Error };
    } finally {
      setIsSaving(false);
    }
  }, [user]);

  // Send test notification
  const sendTestNotification = useCallback(async () => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      const { error } = await supabase.functions.invoke('send-test-notification');

      if (error) throw error;

      return { error: null };
    } catch (err) {
      console.error('[NotificationSettings] Test notification error:', err);
      return { error: err as Error };
    }
  }, [user]);

  return {
    settings,
    isLoading,
    isSaving,
    setNotificationsEnabled,
    setReminderTime,
    setReminderDays,
    sendTestNotification,
    refetch: fetchSettings,
  };
}
