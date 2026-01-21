import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToast } from '@/hooks/use-toast';
import { Bell, Loader2, Send, Lock, Smartphone } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

const DAYS_OF_WEEK = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
];

interface NotificationSettingsProps {
  canUseNotifications: boolean;
}

export function NotificationSettings({ canUseNotifications }: NotificationSettingsProps) {
  const { toast } = useToast();
  const { 
    settings, 
    isLoading, 
    isSaving,
    setNotificationsEnabled,
    setReminderTime,
    setReminderDays,
    sendTestNotification,
  } = useNotificationSettings();
  
  const {
    isSupported,
    isRegistered,
    permissionStatus,
    requestPermission,
    isLoading: isPushLoading,
  } = usePushNotifications();

  const [isSendingTest, setIsSendingTest] = useState(false);

  const isNative = Capacitor.isNativePlatform();

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled && isNative && permissionStatus !== 'granted') {
      // Request permission first
      const { granted } = await requestPermission();
      if (!granted) {
        toast({
          title: 'Permission denied',
          description: 'Please enable notifications in your device settings.',
          variant: 'destructive',
        });
        return;
      }
    }

    const { error } = await setNotificationsEnabled(enabled);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update notification settings.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: enabled ? 'Notifications enabled' : 'Notifications disabled',
        description: enabled 
          ? 'You will receive reminders for your check-ins.'
          : 'You will no longer receive reminder notifications.',
      });
    }
  };

  const handleTimeChange = async (time: string) => {
    const { error } = await setReminderTime(time);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update reminder time.',
        variant: 'destructive',
      });
    }
  };

  const handleDayToggle = async (day: string) => {
    const newDays = settings.reminderDays.includes(day)
      ? settings.reminderDays.filter(d => d !== day)
      : [...settings.reminderDays, day];
    
    // Ensure at least one day is selected
    if (newDays.length === 0) {
      toast({
        title: 'At least one day required',
        description: 'Select at least one day for reminders.',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await setReminderDays(newDays);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update reminder days.',
        variant: 'destructive',
      });
    }
  };

  const handleTestNotification = async () => {
    setIsSendingTest(true);
    try {
      const { error } = await sendTestNotification();
      if (error) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to send test notification.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Test notification sent',
          description: 'Check your device for the notification.',
        });
      }
    } finally {
      setIsSendingTest(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6 animate-fade-in">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Push Notifications</h3>
            {!canUseNotifications && (
              <Badge variant="outline" className="gap-1">
                <Lock className="w-3 h-3" />
                Pro
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Get reminded to reach out to your contacts on your schedule
          </p>

          {!isNative && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
              <Smartphone className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Push notifications are only available on the iOS app. Download the app to receive reminders.
              </p>
            </div>
          )}

          {canUseNotifications && (
            <div className="space-y-4">
              {/* Enable toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="space-y-0.5">
                  <Label htmlFor="enable-notifications" className="text-sm font-medium">
                    Enable reminders
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receive daily notifications for your check-ins
                  </p>
                </div>
                <Switch
                  id="enable-notifications"
                  checked={settings.notificationsEnabled}
                  onCheckedChange={handleToggleNotifications}
                  disabled={isSaving || isPushLoading || (!isNative && !settings.notificationsEnabled)}
                />
              </div>

              {settings.notificationsEnabled && (
                <>
                  {/* Reminder time */}
                  <div className="space-y-2">
                    <Label htmlFor="reminder-time" className="text-sm font-medium">
                      Reminder time
                    </Label>
                    <Input
                      id="reminder-time"
                      type="time"
                      value={settings.reminderTimeLocal}
                      onChange={(e) => handleTimeChange(e.target.value)}
                      className="w-32"
                      disabled={isSaving}
                    />
                    <p className="text-xs text-muted-foreground">
                      When you'll receive your daily reminder
                    </p>
                  </div>

                  {/* Reminder days */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Reminder days</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <button
                          key={day.value}
                          onClick={() => handleDayToggle(day.value)}
                          disabled={isSaving}
                          className={`
                            px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                            ${settings.reminderDays.includes(day.value)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }
                            disabled:opacity-50
                          `}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select which days you want to receive reminders
                    </p>
                  </div>

                  {/* Test notification button */}
                  {isNative && isRegistered && (
                    <Button
                      variant="outline"
                      onClick={handleTestNotification}
                      disabled={isSendingTest}
                      className="gap-2"
                    >
                      {isSendingTest ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {isSendingTest ? 'Sending...' : 'Test Notification'}
                    </Button>
                  )}
                </>
              )}

              {/* Permission status info */}
              {isNative && permissionStatus === 'denied' && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10">
                  <Bell className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">
                    Notifications are blocked. Please enable them in your device settings to receive reminders.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
