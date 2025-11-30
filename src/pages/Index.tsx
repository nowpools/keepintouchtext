import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ContactCard } from '@/components/ContactCard';
import { ProgressBar } from '@/components/ProgressBar';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useContacts } from '@/hooks/useContacts';
import { DailyContact, DEFAULT_CADENCE_DAYS } from '@/types/contact';
import { format, differenceInDays } from 'date-fns';
import { Sparkles, RefreshCw, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { contacts, isLoading, isSyncing, syncGoogleContacts, markAsContacted } = useContacts();
  
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [snoozedIds, setSnoozedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Calculate today's contacts based on cadence and last contacted
  const todaysContacts: DailyContact[] = useMemo(() => {
    const today = new Date();
    
    return contacts
      .map(contact => {
        const lastContacted = contact.lastContacted;
        const cadenceDays = DEFAULT_CADENCE_DAYS[contact.cadence];
        
        // Calculate if contact is due
        let isDue = false;
        if (!lastContacted) {
          isDue = true; // Never contacted
        } else {
          const daysSinceContact = differenceInDays(today, lastContacted);
          isDue = daysSinceContact >= cadenceDays;
        }

        return {
          ...contact,
          isDue,
          isCompleted: completedIds.has(contact.id),
          isSnoozed: snoozedIds.has(contact.id),
        };
      })
      .filter(c => c.isDue && !c.isSnoozed)
      .slice(0, 5); // Max 5 contacts per day
  }, [contacts, completedIds, snoozedIds]);

  const handleComplete = async (id: string) => {
    setCompletedIds(prev => new Set(prev).add(id));
    await markAsContacted(id);
  };

  const handleSnooze = (id: string) => {
    setSnoozedIds(prev => new Set(prev).add(id));
  };

  const handleUpdateDraft = (id: string, draft: string) => {
    // Draft updates are local only for now
    console.log('Draft updated for', id, draft);
  };

  const completedCount = todaysContacts.filter(c => c.isCompleted).length;
  const activeContacts = todaysContacts.filter(c => !c.isSnoozed);

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
        <div className="space-y-1 animate-fade-in">
          <p className="text-sm text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM d')}
          </p>
          <h1 className="text-3xl font-bold">Today's Connections</h1>
          <p className="text-muted-foreground">
            People who'd love to hear from you today
          </p>
        </div>

        {/* Progress */}
        {activeContacts.length > 0 && (
          <ProgressBar 
            completed={completedCount} 
            total={activeContacts.length}
            className="animate-fade-in" 
          />
        )}

        {/* Contact Cards */}
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
            icon={<Cloud className="w-8 h-8 text-primary" />}
            title="No contacts synced"
            description="Sync your Google Contacts to start nurturing your relationships"
            action={
              <Button onClick={syncGoogleContacts} disabled={isSyncing} className="gap-2">
                {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                {isSyncing ? 'Syncing...' : 'Sync Google Contacts'}
              </Button>
            }
          />
        ) : todaysContacts.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="w-8 h-8 text-primary" />}
            title="All caught up!"
            description="No one needs a message today. Check back tomorrow or add new contacts to keep in touch with."
            action={
              <Button variant="outline" onClick={() => navigate('/contacts')}>
                View All Contacts
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {todaysContacts.map((contact, index) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                index={index}
                onComplete={handleComplete}
                onSnooze={handleSnooze}
                onUpdateDraft={handleUpdateDraft}
              />
            ))}
          </div>
        )}

        {/* Refresh hint */}
        {!isLoading && todaysContacts.length > 0 && completedCount === activeContacts.length && (
          <div className="text-center py-8 animate-fade-in">
            <p className="text-muted-foreground mb-4">
              Amazing work! Your relationships are thriving. 🌱
            </p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh for tomorrow
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Index;
