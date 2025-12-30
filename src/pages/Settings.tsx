import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Apple, 
  Mail, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useUserIntegrations } from '@/hooks/useUserIntegrations';
import { useAppleContacts } from '@/hooks/useAppleContacts';
import { Capacitor } from '@capacitor/core';
import type { ConflictResolutionPreference } from '@/types/contacts';

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { 
    integrations, 
    isLoading,
    setAppleSyncEnabled,
    setAppleVisible,
    setGoogleSyncEnabled,
    setGoogleVisible,
    setAppleContactsPermission,
    setConflictPreference,
    clearGoogleTokens,
  } = useUserIntegrations();
  const { 
    isAvailable: appleAvailable, 
    permission: applePermission, 
    requestPermission: requestApplePermission,
    checkPermission: checkApplePermission,
  } = useAppleContacts();

  const isIOS = Capacitor.getPlatform() === 'ios';

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    // Check Apple permission on mount if on iOS
    if (isIOS && appleAvailable) {
      checkApplePermission().then(status => {
        if (status !== integrations?.apple_contacts_permission) {
          setAppleContactsPermission(status);
        }
      });
    }
  }, [isIOS, appleAvailable]);

  const handleEnableAppleSync = async () => {
    if (!appleAvailable) {
      toast({
        title: 'Not available',
        description: 'Apple Contacts is only available on iOS devices',
        variant: 'destructive',
      });
      return;
    }

    const permission = await requestApplePermission();
    await setAppleContactsPermission(permission);

    if (permission === 'granted') {
      await setAppleSyncEnabled(true);
      toast({
        title: 'Apple Contacts enabled',
        description: 'Your contacts will now sync with Apple Contacts',
      });
    } else {
      toast({
        title: 'Permission required',
        description: 'Please allow access to Contacts in Settings',
        variant: 'destructive',
      });
    }
  };

  const handleDisableAppleSync = async () => {
    await setAppleSyncEnabled(false);
    toast({
      title: 'Apple sync disabled',
      description: 'Your contacts will no longer sync with Apple Contacts',
    });
  };

  const handleDisconnectGoogle = async () => {
    await clearGoogleTokens();
    toast({
      title: 'Google disconnected',
      description: 'Your Google account has been disconnected',
    });
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const getPermissionBadge = (status: string) => {
    switch (status) {
      case 'granted':
        return (
          <Badge variant="default" className="gap-1 bg-green-500">
            <CheckCircle2 className="w-3 h-3" />
            Granted
          </Badge>
        );
      case 'denied':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            Denied
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <AlertCircle className="w-3 h-3" />
            Unknown
          </Badge>
        );
    }
  };

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold">Sync Settings</h1>
          <p className="text-muted-foreground">
            Configure how Keep In Touch syncs with your contacts
          </p>
        </div>

        {/* Apple Contacts */}
        <Card className="p-6 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Apple className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Apple Contacts</h3>
                  <p className="text-sm text-muted-foreground">
                    {isIOS ? 'Sync with your iPhone contacts' : 'Available on iOS only'}
                  </p>
                </div>
                {isIOS && getPermissionBadge(integrations?.apple_contacts_permission || 'unknown')}
              </div>

              {isIOS && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-muted-foreground" />
                      <Label>Sync Enabled</Label>
                    </div>
                    <Switch
                      checked={integrations?.apple_sync_enabled || false}
                      onCheckedChange={(checked) => 
                        checked ? handleEnableAppleSync() : handleDisableAppleSync()
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {integrations?.apple_visible ? (
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      )}
                      <Label>Show in Contacts List</Label>
                    </div>
                    <Switch
                      checked={integrations?.apple_visible || false}
                      onCheckedChange={setAppleVisible}
                    />
                  </div>

                  {integrations?.last_sync_apple && (
                    <p className="text-xs text-muted-foreground">
                      Last synced: {new Date(integrations.last_sync_apple).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Google Contacts */}
        <Card className="p-6 animate-fade-in" style={{ animationDelay: '50ms' }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Google Contacts</h3>
                  <p className="text-sm text-muted-foreground">
                    Sync with your Google account
                  </p>
                </div>
                {integrations?.google_access_token && (
                  <Badge variant="default" className="gap-1 bg-green-500">
                    <CheckCircle2 className="w-3 h-3" />
                    Connected
                  </Badge>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-muted-foreground" />
                    <Label>Sync Enabled</Label>
                  </div>
                  <Switch
                    checked={integrations?.google_sync_enabled || false}
                    onCheckedChange={setGoogleSyncEnabled}
                    disabled={!integrations?.google_access_token}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {integrations?.google_visible ? (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    )}
                    <Label>Show in Contacts List</Label>
                  </div>
                  <Switch
                    checked={integrations?.google_visible || false}
                    onCheckedChange={setGoogleVisible}
                  />
                </div>

                {integrations?.google_access_token && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDisconnectGoogle}
                    className="text-destructive hover:text-destructive"
                  >
                    Disconnect Google
                  </Button>
                )}

                {integrations?.last_sync_google && (
                  <p className="text-xs text-muted-foreground">
                    Last synced: {new Date(integrations.last_sync_google).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Conflict Resolution */}
        <Card className="p-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="font-semibold">Conflict Resolution</h3>
                <p className="text-sm text-muted-foreground">
                  When the same contact is edited in multiple places
                </p>
              </div>

              <Select 
                value={integrations?.conflict_preference || 'ask'} 
                onValueChange={(v) => setConflictPreference(v as ConflictResolutionPreference)}
              >
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ask">Ask me each time</SelectItem>
                  <SelectItem value="apple">Prefer Apple Contacts</SelectItem>
                  <SelectItem value="google">Prefer Google Contacts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Account */}
        <Card className="p-6 animate-fade-in" style={{ animationDelay: '150ms' }}>
          <div className="space-y-4">
            <h3 className="font-semibold">Account</h3>
            <p className="text-sm text-muted-foreground">
              Signed in as {user?.email}
            </p>
            <Button variant="outline" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Settings;
