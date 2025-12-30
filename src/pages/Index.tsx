import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useAppContacts } from '@/hooks/useAppContacts';
import { useUserIntegrations } from '@/hooks/useUserIntegrations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Sparkles, RefreshCw, Users, Settings, Apple, Mail } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { contacts, isLoading, refetch } = useAppContacts();
  const { integrations } = useUserIntegrations();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
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
        {/* Header */}
        <div className="flex items-start justify-between animate-fade-in">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {format(new Date(), 'EEEE, MMMM d')}
            </p>
            <h1 className="text-3xl font-bold">Today's Connections</h1>
            <p className="text-muted-foreground">
              People who'd love to hear from you today
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={() => navigate('/settings')}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        {/* Sync Status */}
        <div className="flex flex-wrap gap-2">
          <Badge 
            variant={integrations?.apple_sync_enabled ? "default" : "outline"} 
            className="gap-1"
          >
            <Apple className="w-3 h-3" />
            Apple: {integrations?.apple_sync_enabled ? 'Syncing' : 'Off'}
          </Badge>
          <Badge 
            variant={integrations?.google_sync_enabled ? "default" : "outline"} 
            className="gap-1"
          >
            <Mail className="w-3 h-3" />
            Google: {integrations?.google_sync_enabled ? 'Syncing' : 'Off'}
          </Badge>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div 
                key={i}
                className="h-32 rounded-lg bg-secondary animate-pulse"
              />
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <EmptyState
            icon={<Users className="w-8 h-8 text-primary" />}
            title="No contacts synced"
            description="Connect Apple Contacts or Google Contacts to start nurturing your relationships"
            action={
              <div className="flex flex-col gap-2">
                <Button onClick={() => navigate('/settings')} className="gap-2">
                  <Settings className="w-4 h-4" />
                  Configure Sync Settings
                </Button>
              </div>
            }
          />
        ) : (
          <EmptyState
            icon={<Sparkles className="w-8 h-8 text-primary" />}
            title="All caught up!"
            description={`You have ${contacts.length} contacts. The sync engine will show you who to contact based on your cadence settings.`}
            action={
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate('/contacts')}>
                  View All Contacts
                </Button>
                <Button onClick={refetch} variant="outline" className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
              </div>
            }
          />
        )}
      </div>
    </Layout>
  );
};

export default Index;
