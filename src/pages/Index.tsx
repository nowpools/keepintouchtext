import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ContactCard } from '@/components/ContactCard';
import { ProgressBar } from '@/components/ProgressBar';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useContacts } from '@/hooks/useContacts';
import { useCategorySettings } from '@/hooks/useCategorySettings';
import { useAppSettings } from '@/hooks/useAppSettings';
import { DailyContact } from '@/types/contact';
import { format, differenceInDays } from 'date-fns';
import { Sparkles, RefreshCw, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Seeded random for consistent daily randomization
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { contacts, isLoading, isSyncing, syncGoogleContacts, markAsContacted } = useContacts();
  const { categorySettings } = useCategorySettings();
  const { settings, isLoaded: settingsLoaded } = useAppSettings();
  
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [snoozedIds, setSnoozedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Build a map of category name to cadence days
  const categoryCadenceMap = useMemo(() => {
    const map: Record<string, number> = {};
    categorySettings.forEach(cat => {
      map[cat.label_name] = cat.cadence_days;
    });
    return map;
  }, [categorySettings]);

  // Calculate today's contacts based on category cadence and last contacted
  const todaysContacts: DailyContact[] = useMemo(() => {
    const today = new Date();
    const todaySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    
    const dueContacts = contacts
      .map(contact => {
        const category = contact.labels[0];
        // Use category cadence if available, otherwise fall back to 30 days
        const cadenceDays = category && categoryCadenceMap[category] 
          ? categoryCadenceMap[category] 
          : 30;
        
        const lastContacted = contact.lastContacted;
        
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
      .filter(c => c.isDue && !c.isSnoozed);

    // Sort based on user preference
    let sortedContacts: typeof dueContacts;
    if (settings.sortOrder === 'random') {
      // Use seeded random for consistent daily order
      sortedContacts = [...dueContacts].sort((a, b) => {
        const aRand = seededRandom(todaySeed + a.id.charCodeAt(0));
        const bRand = seededRandom(todaySeed + b.id.charCodeAt(0));
        return aRand - bRand;
      });
    } else {
      // Alphabetical
      sortedContacts = [...dueContacts].sort((a, b) => a.name.localeCompare(b.name));
    }

    return sortedContacts.slice(0, settings.maxDailyContacts);
  }, [contacts, completedIds, snoozedIds, categoryCadenceMap, settings.maxDailyContacts, settings.sortOrder]);

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

  if (authLoading || !settingsLoaded) {
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
