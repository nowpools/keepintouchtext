import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Contact, CadenceType } from '@/types/contact';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type DbContact = Tables<'app_contacts'>;
type DbContactLink = Tables<'contact_links'>;

interface PhoneEntry {
  value: string;
  type?: string;
}

interface EmailEntry {
  value: string;
  type?: string;
}

// Map cadence_days to CadenceType
function cadenceDaysToType(days: number | null): CadenceType {
  if (days === null) return 'monthly';
  if (days <= 1) return 'daily';
  if (days <= 7) return 'weekly';
  if (days <= 30) return 'monthly';
  if (days <= 90) return 'quarterly';
  if (days <= 180) return 'twice-yearly';
  return 'yearly';
}

// Map CadenceType to days
function cadenceTypeToDays(type: CadenceType): number {
  switch (type) {
    case 'daily': return 1;
    case 'weekly': return 7;
    case 'monthly': return 30;
    case 'quarterly': return 90;
    case 'twice-yearly': return 180;
    case 'yearly': return 365;
    default: return 30;
  }
}

export function useContacts() {
  const { user, session } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactLinks, setContactLinks] = useState<Map<string, DbContactLink>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchContacts = useCallback(async () => {
    console.log('[Contacts] fetchContacts called, user:', user?.id || 'no user');
    
    if (!user) {
      console.log('[Contacts] No user, clearing contacts');
      setContacts([]);
      setIsLoading(false);
      return;
    }

    try {
      // On native platforms, add delay to ensure session is fully established after OAuth
      if (Capacitor.isNativePlatform()) {
        console.log('[Contacts] Native platform detected, waiting for session to settle...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Validate session with retry logic for native platforms
      let currentSession = null;
      let retries = 0;
      const maxRetries = Capacitor.isNativePlatform() ? 3 : 1;

      while (!currentSession && retries < maxRetries) {
        const { data: { session: fetchedSession }, error: sessionError } = await supabase.auth.getSession();
        currentSession = fetchedSession;
        
        console.log('[Contacts] Session check (attempt', retries + 1, '):', {
          hasSession: !!currentSession,
          sessionError: sessionError?.message,
          sessionUserId: currentSession?.user?.id,
          expectedUserId: user.id
        });

        if (!currentSession && retries < maxRetries - 1) {
          console.log(`[Contacts] No session, retry ${retries + 1}/${maxRetries} in 1s...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        retries++;
      }

      if (!currentSession) {
        console.warn('[Contacts] No valid session after', maxRetries, 'attempts, cannot fetch contacts');
        setIsLoading(false);
        return;
      }

      console.log('[Contacts] Fetching contacts for user:', user.id);
      
      // Fetch contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('app_contacts')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('display_name');

      console.log('[Contacts] Query result:', {
        count: contactsData?.length ?? 0,
        error: contactsError?.message,
        errorCode: contactsError?.code,
        errorDetails: contactsError?.details
      });

      if (contactsError) throw contactsError;

      // Fetch contact links for Google sync info
      const contactIds = (contactsData || []).map(c => c.id);
      console.log('[Contacts] Fetching links for', contactIds.length, 'contacts');
      
      const { data: linksData, error: linksError } = await supabase
        .from('contact_links')
        .select('*')
        .in('app_contact_id', contactIds)
        .eq('source', 'google');

      if (linksError) {
        console.warn('[Contacts] Links query error:', linksError.message);
      }

      const linksMap = new Map<string, DbContactLink>();
      (linksData || []).forEach(link => {
        linksMap.set(link.app_contact_id, link);
      });
      setContactLinks(linksMap);

      const mappedContacts: Contact[] = (contactsData || []).map(c => {
        const phones = (c.phones as unknown) as PhoneEntry[] | null;
        const emails = (c.emails as unknown) as EmailEntry[] | null;
        const link = linksMap.get(c.id);

        return {
          id: c.id,
          name: c.display_name,
          phone: phones?.[0]?.value || '',
          email: emails?.[0]?.value || undefined,
          photo: undefined,
          googleId: link?.external_id || undefined,
          labels: c.label ? [c.label] : [],
          notes: c.notes || '',
          linkedinUrl: c.linkedin_url || undefined,
          xUrl: c.x_url || undefined,
          youtubeUrl: c.youtube_url || undefined,
          instagramUrl: undefined,
          tiktokUrl: undefined,
          facebookUrl: undefined,
          githubUrl: undefined,
          threadsUrl: undefined,
          snapchatUrl: undefined,
          pinterestUrl: undefined,
          redditUrl: undefined,
          discordUrl: undefined,
          twitchUrl: undefined,
          whatsappUrl: undefined,
          telegramUrl: undefined,
          conversationContext: c.conversation_context || undefined,
          cadence: cadenceDaysToType(c.cadence_days),
          lastContacted: c.last_contacted ? new Date(c.last_contacted) : null,
          nextDue: c.next_contact_date ? new Date(c.next_contact_date) : new Date(),
          aiDraft: undefined,
          followUpOverride: null,
          isHidden: false,
          birthdayMonth: c.birthday ? parseInt(c.birthday.split('-')[1]) : null,
          birthdayDay: c.birthday ? parseInt(c.birthday.split('-')[2]) : null,
          birthdayYear: c.birthday ? parseInt(c.birthday.split('-')[0]) : null,
        };
      });

      console.log('[Contacts] Successfully mapped', mappedContacts.length, 'contacts');
      setContacts(mappedContacts);
    } catch (error) {
      console.error('[Contacts] Error fetching contacts:', error);
      console.error('[Contacts] Error details:', JSON.stringify(error, null, 2));
      toast({
        title: 'Error loading contacts',
        description: error instanceof Error ? error.message : 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const getValidGoogleToken = async (): Promise<string | null> => {
    if (!user) return null;

    // First check if we have a valid provider_token in session
    if (session?.provider_token) {
      return session.provider_token;
    }

    // Otherwise, try to refresh the token using our edge function
    try {
      const { data, error } = await supabase.functions.invoke('refresh-google-token', {
        body: { userId: user.id },
      });

      if (error || data?.needsReauth) {
        console.log('Token refresh failed, needs re-auth');
        return null;
      }

      return data?.accessToken || null;
    } catch (error) {
      console.error('Error getting valid Google token:', error);
      return null;
    }
  };

  const syncGoogleContacts = async () => {
    if (!user) return;

    const accessToken = await getValidGoogleToken();
    
    if (!accessToken) {
      toast({
        title: 'Google Contacts not connected',
        description: 'Please reconnect Google Contacts in Settings to sync',
        variant: 'destructive',
      });
      return;
    }

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-google-contacts', {
        body: { 
          accessToken,
          userId: user.id 
        },
      });

      if (error) throw error;

      const synced = data?.synced || 0;
      const updated = data?.updated || 0;
      
      toast({
        title: 'Contacts synced!',
        description: `${synced} new contacts imported, ${updated} updated`,
      });

      await fetchContacts();
    } catch (error) {
      console.error('Error syncing contacts:', error);
      toast({
        title: 'Sync failed',
        description: 'Could not sync Google Contacts. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const updateContact = async (contactId: string, updates: Partial<Contact>) => {
    if (!user) return;

    try {
      const dbUpdates: Record<string, unknown> = {};
      
      if (updates.phone !== undefined) {
        dbUpdates.phones = updates.phone ? [{ value: updates.phone, type: 'mobile' }] : null;
      }
      if (updates.cadence !== undefined) {
        dbUpdates.cadence_days = cadenceTypeToDays(updates.cadence);
      }
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.linkedinUrl !== undefined) dbUpdates.linkedin_url = updates.linkedinUrl;
      if (updates.xUrl !== undefined) dbUpdates.x_url = updates.xUrl;
      if (updates.youtubeUrl !== undefined) dbUpdates.youtube_url = updates.youtubeUrl;
      if (updates.conversationContext !== undefined) dbUpdates.conversation_context = updates.conversationContext;
      if (updates.labels !== undefined) dbUpdates.label = updates.labels[0] || null;
      if (updates.lastContacted !== undefined) {
        dbUpdates.last_contacted = updates.lastContacted?.toISOString() || null;
      }
      
      // Handle birthday
      if (updates.birthdayMonth !== undefined || updates.birthdayDay !== undefined || updates.birthdayYear !== undefined) {
        const existingContact = contacts.find(c => c.id === contactId);
        const month = updates.birthdayMonth ?? existingContact?.birthdayMonth;
        const day = updates.birthdayDay ?? existingContact?.birthdayDay;
        const year = updates.birthdayYear ?? existingContact?.birthdayYear;
        
        if (month && day) {
          const yearStr = year ? String(year).padStart(4, '0') : '0000';
          const monthStr = String(month).padStart(2, '0');
          const dayStr = String(day).padStart(2, '0');
          dbUpdates.birthday = `${yearStr}-${monthStr}-${dayStr}`;
        } else {
          dbUpdates.birthday = null;
        }
      }

      const { error } = await supabase
        .from('app_contacts')
        .update(dbUpdates)
        .eq('id', contactId)
        .eq('user_id', user.id);

      if (error) throw error;

      setContacts(prev =>
        prev.map(c => (c.id === contactId ? { ...c, ...updates } : c))
      );
    } catch (error) {
      console.error('Error updating contact:', error);
      toast({
        title: 'Update failed',
        description: 'Could not update contact',
        variant: 'destructive',
      });
    }
  };

  const updateContactWithGoogleSync = async (
    contactId: string, 
    updates: Partial<Contact>, 
    googleId: string | null,
    shouldSyncToGoogle: boolean
  ) => {
    if (!user) return;

    // First update in local DB
    await updateContact(contactId, updates);

    // If Pro/Business and has google_id, sync to Google
    if (shouldSyncToGoogle && googleId) {
      const accessToken = await getValidGoogleToken();
      
      if (accessToken) {
        try {
          const googleUpdates: Record<string, string | undefined> = {};
          if (updates.phone !== undefined) googleUpdates.phone = updates.phone;

          const { error } = await supabase.functions.invoke('update-google-contact', {
            body: {
              accessToken,
              googleId: googleId,
              ...googleUpdates,
            },
          });

          if (error) {
            console.error('Failed to sync to Google:', error);
            toast({
              title: 'Google sync failed',
              description: 'Changes saved locally but could not sync to Google Contacts',
              variant: 'default',
            });
          }
        } catch (error) {
          console.error('Error syncing to Google:', error);
        }
      }
    }
  };

  const markAsContacted = async (contactId: string) => {
    await updateContact(contactId, { lastContacted: new Date() });
  };

  const getContactGoogleId = async (contactId: string): Promise<string | null> => {
    const { data } = await supabase
      .from('contact_links')
      .select('external_id')
      .eq('app_contact_id', contactId)
      .eq('source', 'google')
      .single();
    return data?.external_id || null;
  };

  return {
    contacts,
    isLoading,
    isSyncing,
    syncGoogleContacts,
    updateContact,
    updateContactWithGoogleSync,
    getContactGoogleId,
    markAsContacted,
    refetch: fetchContacts,
  };
}
