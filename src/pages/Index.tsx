import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ContactCard } from '@/components/ContactCard';
import { ProgressBar } from '@/components/ProgressBar';
import { EmptyState } from '@/components/EmptyState';
import { ContactDetailDialog } from '@/components/ContactDetailDialog';
import { StreakIndicator } from '@/components/StreakIndicator';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useAuth } from '@/hooks/useAuth';
import { useContacts } from '@/hooks/useContacts';
import { useCategorySettings } from '@/hooks/useCategorySettings';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useSubscription } from '@/hooks/useSubscription';
import { useStreak } from '@/hooks/useStreak';
import { useContactHistory } from '@/hooks/useContactHistory';
import { useOfflineContacts } from '@/hooks/useOfflineContacts';
import { useGoogleContactsIntegration } from '@/hooks/useGoogleContactsIntegration';
import { DailyContact, Contact, ContactSurfaceReason } from '@/types/contact';
import { format, differenceInDays, isSameDay } from 'date-fns';
import { Sparkles, RefreshCw, Cloud, Cake, Calendar, CalendarClock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Seeded random for consistent daily randomization
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// Check if today is someone's birthday (using user's local timezone)
const isBirthdayToday = (contact: Contact): boolean => {
  if (!contact.birthdayMonth || !contact.birthdayDay) return false;
  const now = new Date();
  const todayMonth = now.getMonth() + 1; // 1-12
  const todayDay = now.getDate(); // 1-31
  return contact.birthdayMonth === todayMonth && contact.birthdayDay === todayDay;
};

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const { contacts, isLoading, markAsContacted, updateContact, updateContactWithGoogleSync } = useContacts();
  const { categorySettings } = useCategorySettings();
  const { settings, isLoaded: settingsLoaded } = useAppSettings();
  const { features, isTrialActive, tier } = useSubscription();
  const { currentStreak, longestStreak, recordCompletion } = useStreak();
  const { recordContactCompletion } = useContactHistory();
  const { isOffline, cacheTimestamp, cacheContacts, getContactsForOffline, hasCachedData } = useOfflineContacts();
  const { isConnected: isGoogleConnected, isConnecting: isGoogleConnecting, connectGoogleContacts } = useGoogleContactsIntegration();
  
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [snoozedIds, setSnoozedIds] = useState<Set<string>>(new Set());
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [oauthSettleTimeout, setOauthSettleTimeout] = useState(false);

  // Detect if we're in OAuth callback (code/state params present)
  const hasOAuthParams = searchParams.has('code') || searchParams.has('state');

  // Pro/Business users can sync to Google
  const canSyncToGoogle = tier === 'pro' || tier === 'business';

  // Set a timeout to allow OAuth to settle before redirecting
  useEffect(() => {
    if (hasOAuthParams && !user && !oauthSettleTimeout) {
      const timer = setTimeout(() => {
        setOauthSettleTimeout(true);
      }, 8000); // Give 8 seconds for OAuth to complete
      return () => clearTimeout(timer);
    }
  }, [hasOAuthParams, user, oauthSettleTimeout]);

  useEffect(() => {
    // If OAuth params are present, wait for session OR timeout before redirecting
    if (hasOAuthParams && !user && !oauthSettleTimeout) {
      return; // Don't redirect yet, still waiting for OAuth to settle
    }
    
    // Only redirect if we're done loading auth and there's no user
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate, hasOAuthParams, oauthSettleTimeout]);

  // Build a map of category name to cadence days
  const categoryCadenceMap = useMemo(() => {
    const map: Record<string, number> = {};
    categorySettings.forEach(cat => {
      map[cat.label_name] = cat.cadence_days;
    });
    return map;
  }, [categorySettings]);

  // Check if streak/progress features are available
  const hasStreakFeature = features.streakTracking || isTrialActive;
  const hasBirthdayReminders = features.birthdayField || isTrialActive;

  // Check if dynamic daily calc is available (null maxDaily)
  const hasDynamicDaily = features.dynamicDailyCalc || isTrialActive;

  // Calculate today's contacts based on category cadence, birthdays, and follow-up overrides
  const todaysContacts: DailyContact[] = useMemo(() => {
    const today = new Date();
    const todaySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    
    // Track which contacts we've added to avoid duplicates
    const addedIds = new Set<string>();
    const birthdayContacts: DailyContact[] = [];
    const followUpContacts: DailyContact[] = [];
    const cadenceContacts: DailyContact[] = [];

    // 1. First, collect birthday contacts (Pro/Business only) - they always appear
    if (hasBirthdayReminders) {
      contacts
        .filter(contact => !contact.isHidden && isBirthdayToday(contact))
        .forEach(contact => {
          if (!addedIds.has(contact.id)) {
            addedIds.add(contact.id);
            birthdayContacts.push({
              ...contact,
              isCompleted: completedIds.has(contact.id),
              isSnoozed: snoozedIds.has(contact.id),
              surfaceReason: 'birthday' as ContactSurfaceReason,
            });
          }
        });
    }

    // 2. Collect contacts with follow-up override set to today
    contacts
      .filter(contact => !contact.isHidden && contact.followUpOverride)
      .forEach(contact => {
        if (!addedIds.has(contact.id) && contact.followUpOverride) {
          const overrideDate = new Date(contact.followUpOverride);
          if (isSameDay(overrideDate, today)) {
            addedIds.add(contact.id);
            followUpContacts.push({
              ...contact,
              isCompleted: completedIds.has(contact.id),
              isSnoozed: snoozedIds.has(contact.id),
              surfaceReason: 'follow_up' as ContactSurfaceReason,
            });
          }
        }
      });

    // 3. Collect cadence-based contacts
    const dueContacts = contacts
      .filter(contact => {
        if (contact.isHidden) return false;
        if (addedIds.has(contact.id)) return false;
        
        const category = contact.labels[0];
        const cadenceDays = category && categoryCadenceMap[category] 
          ? categoryCadenceMap[category] 
          : 30;
        
        const lastContacted = contact.lastContacted;
        
        if (!lastContacted) return true;
        
        const daysSinceContact = differenceInDays(today, lastContacted);
        return daysSinceContact >= cadenceDays;
      })
      .map(contact => ({
        ...contact,
        isCompleted: completedIds.has(contact.id),
        isSnoozed: snoozedIds.has(contact.id),
        surfaceReason: 'cadence' as ContactSurfaceReason,
      }));

    // Apply selection logic based on sort order setting
    let selectedCadenceContacts: typeof dueContacts;
    if (settings.sortOrder === 'random') {
      // Random SELECTION, but we'll sort alphabetically for DISPLAY
      selectedCadenceContacts = [...dueContacts].sort((a, b) => {
        const aRand = seededRandom(todaySeed + a.id.charCodeAt(0));
        const bRand = seededRandom(todaySeed + b.id.charCodeAt(0));
        return aRand - bRand;
      });
    } else {
      selectedCadenceContacts = [...dueContacts].sort((a, b) => a.name.localeCompare(b.name));
    }

    // Calculate how many cadence contacts to include
    const maxDaily = settings.maxDailyContacts;
    const priorityCount = birthdayContacts.length + followUpContacts.length;
    
    let cadenceSlots: number;
    if (maxDaily === null && hasDynamicDaily) {
      // Pro/Business with blank = include all due contacts
      cadenceSlots = selectedCadenceContacts.length;
    } else {
      // Apply the max limit, but birthday/follow-up always show
      const effectiveMax = maxDaily ?? 5; // fallback for free users
      cadenceSlots = Math.max(0, effectiveMax - priorityCount);
    }
    
    // Add cadence contacts up to the slot limit
    selectedCadenceContacts
      .filter(c => !c.isSnoozed)
      .slice(0, cadenceSlots)
      .forEach(contact => cadenceContacts.push(contact));

    // Combine all and sort ALPHABETICALLY for display
    const allContacts = [...birthdayContacts, ...followUpContacts, ...cadenceContacts];
    
    // Final sort: alphabetically by name for display
    allContacts.sort((a, b) => a.name.localeCompare(b.name));

    return allContacts;
  }, [contacts, completedIds, snoozedIds, categoryCadenceMap, settings.maxDailyContacts, settings.sortOrder, hasBirthdayReminders, hasDynamicDaily]);

  const handleComplete = async (id: string) => {
    setCompletedIds(prev => new Set(prev).add(id));
    await markAsContacted(id);
    
    // Record in history
    const contact = contacts.find(c => c.id === id);
    const dailyContact = todaysContacts.find(c => c.id === id);
    if (contact && dailyContact) {
      await recordContactCompletion(contact, dailyContact.surfaceReason);
    }
    
    // Update streak (Pro/Business only)
    if (hasStreakFeature) {
      await recordCompletion();
    }
    
    // Clear follow-up override after completion
    if (dailyContact?.surfaceReason === 'follow_up') {
      await updateContact(id, { followUpOverride: null });
    }
  };

  const handleSnooze = (id: string) => {
    setSnoozedIds(prev => new Set(prev).add(id));
  };

  const handleUpdateDraft = (id: string, draft: string) => {
    console.log('Draft updated for', id, draft);
  };

  const handleNameClick = (contact: DailyContact) => {
    const fullContact: Contact = {
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      photo: contact.photo,
      labels: contact.labels,
      notes: contact.notes,
      linkedinUrl: contact.linkedinUrl,
      xUrl: contact.xUrl,
      youtubeUrl: contact.youtubeUrl,
      conversationContext: contact.conversationContext,
      cadence: contact.cadence,
      lastContacted: contact.lastContacted,
      nextDue: contact.nextDue,
      aiDraft: contact.aiDraft,
      followUpOverride: contact.followUpOverride,
      isHidden: contact.isHidden,
      birthdayMonth: contact.birthdayMonth,
      birthdayDay: contact.birthdayDay,
      birthdayYear: contact.birthdayYear,
    };
    setSelectedContact(fullContact);
  };

  const getReasonBadge = (reason: ContactSurfaceReason) => {
    switch (reason) {
      case 'birthday':
        return (
          <Badge variant="secondary" className="gap-1 bg-accent/20 text-accent border-accent/30">
            <Cake className="w-3 h-3" />
            Birthday
          </Badge>
        );
      case 'follow_up':
        return (
          <Badge variant="secondary" className="gap-1 bg-primary/20 text-primary border-primary/30">
            <CalendarClock className="w-3 h-3" />
            Follow-up
          </Badge>
        );
      default:
        return null;
    }
  };

  const completedCount = todaysContacts.filter(c => c.isCompleted).length;
  const activeContacts = todaysContacts.filter(c => !c.isSnoozed);

  // Cache contacts for offline use when they're loaded
  useEffect(() => {
    if (todaysContacts.length > 0 && !isOffline) {
      cacheContacts(todaysContacts);
    }
  }, [todaysContacts, isOffline, cacheContacts]);

  // Get the contacts to display (online or cached)
  const displayContacts = useMemo(() => {
    if (isOffline && hasCachedData) {
      return getContactsForOffline(todaysContacts);
    }
    return todaysContacts;
  }, [isOffline, hasCachedData, todaysContacts, getContactsForOffline]);

  // Show "Finishing sign-in" gate when OAuth is in progress
  if (hasOAuthParams && !user && !oauthSettleTimeout) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <div className="text-muted-foreground text-center">
          <p>Finishing sign-in...</p>
          <p className="text-xs text-muted-foreground/70 mt-2">This may take a few seconds</p>
        </div>
      </div>
    );
  }

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
        {/* Offline Banner */}
        {isOffline && hasCachedData && (
          <OfflineBanner cacheTimestamp={cacheTimestamp} />
        )}

        {/* Header */}
        <div className="flex items-start justify-between animate-fade-in">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {format(new Date(), 'EEEE, MMMM d')}
            </p>
            <p className="text-xs text-muted-foreground">
              Automatically generated reminders based on contact frequency, birthdays, and custom dates.
            </p>
            <h1 className="text-3xl font-bold">Today's Reminders</h1>
            <p className="text-muted-foreground">
              Scheduled follow-ups, birthdays, and check-ins
            </p>
          </div>
          
          {/* Streak indicator (Pro/Business only) */}
          {hasStreakFeature && (
            <StreakIndicator 
              currentStreak={currentStreak} 
              longestStreak={longestStreak} 
            />
          )}
        </div>

        {/* Progress */}
        {displayContacts.filter(c => !c.isSnoozed).length > 0 && (
          <ProgressBar 
            completed={displayContacts.filter(c => c.isCompleted).length}
            total={displayContacts.filter(c => !c.isSnoozed).length}
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
            title="No contacts yet"
            description="Sync your Google Contacts to get started, or add contacts manually in the Contacts tab."
            action={
              <div className="flex flex-col items-center gap-3">
                <Button 
                  onClick={() => connectGoogleContacts()} 
                  disabled={isGoogleConnecting} 
                  className="gap-2"
                >
                  {isGoogleConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                  {isGoogleConnecting ? 'Connecting...' : 'Sync Google Contacts'}
                </Button>
                <Button variant="outline" onClick={() => navigate('/contacts')} className="gap-2">
                  Add Contacts Manually
                </Button>
              </div>
            }
          />
        ) : displayContacts.length === 0 ? (
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
            {displayContacts.map((contact, index) => (
              <div key={contact.id} className="relative">
                {/* Reason badge */}
                {contact.surfaceReason !== 'cadence' && (
                  <div className="absolute -top-2 left-4 z-10">
                    {getReasonBadge(contact.surfaceReason)}
                  </div>
                )}
                <ContactCard
                  contact={contact}
                  index={index}
                  onComplete={handleComplete}
                  onSnooze={handleSnooze}
                  onUpdateDraft={handleUpdateDraft}
                  onUpdatePhone={async (id, phone, googleId, shouldSync) => {
                    await updateContactWithGoogleSync(id, { phone }, googleId, shouldSync);
                  }}
                  onNameClick={handleNameClick}
                  canSyncToGoogle={canSyncToGoogle}
                />
              </div>
            ))}
          </div>
        )}

        {/* Refresh hint */}
        {!isLoading && !isOffline && displayContacts.length > 0 && completedCount === activeContacts.length && (
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

        {/* Contact Detail Dialog */}
        <ContactDetailDialog
          contact={selectedContact}
          open={!!selectedContact}
          onOpenChange={(open) => !open && setSelectedContact(null)}
          categorySettings={categorySettings}
          onUpdateContact={updateContact}
          onUpdatePhone={async (id, phone, googleId, shouldSync) => {
            await updateContactWithGoogleSync(id, { phone }, googleId, shouldSync);
          }}
          canSyncToGoogle={canSyncToGoogle}
          onMarkAsContacted={handleComplete}
        />
      </div>
    </Layout>
  );
};

export default Index;
