import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Contact, CadenceType } from '@/types/contact';
import { toast } from '@/hooks/use-toast';

interface DbContact {
  id: string;
  user_id: string;
  google_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  photo: string | null;
  labels: string[];
  notes: string;
  linkedin_url: string | null;
  x_url: string | null;
  youtube_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  facebook_url: string | null;
  github_url: string | null;
  threads_url: string | null;
  snapchat_url: string | null;
  pinterest_url: string | null;
  reddit_url: string | null;
  discord_url: string | null;
  twitch_url: string | null;
  whatsapp_url: string | null;
  telegram_url: string | null;
  conversation_context: string | null;
  cadence: string;
  last_contacted: string | null;
  next_due: string | null;
  ai_draft: string | null;
  follow_up_override: string | null;
  is_hidden: boolean;
  birthday_month: number | null;
  birthday_day: number | null;
  birthday_year: number | null;
  created_at: string;
  updated_at: string;
}

export function useContacts() {
  const { user, session } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchContacts = useCallback(async () => {
    if (!user) {
      setContacts([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;

      const mappedContacts: Contact[] = (data as DbContact[] || []).map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        email: c.email || undefined,
        photo: c.photo || undefined,
        googleId: c.google_id || undefined,
        labels: c.labels || [],
        notes: c.notes || '',
        linkedinUrl: c.linkedin_url || undefined,
        xUrl: c.x_url || undefined,
        youtubeUrl: c.youtube_url || undefined,
        instagramUrl: c.instagram_url || undefined,
        tiktokUrl: c.tiktok_url || undefined,
        facebookUrl: c.facebook_url || undefined,
        githubUrl: c.github_url || undefined,
        threadsUrl: c.threads_url || undefined,
        snapchatUrl: c.snapchat_url || undefined,
        pinterestUrl: c.pinterest_url || undefined,
        redditUrl: c.reddit_url || undefined,
        discordUrl: c.discord_url || undefined,
        twitchUrl: c.twitch_url || undefined,
        whatsappUrl: c.whatsapp_url || undefined,
        telegramUrl: c.telegram_url || undefined,
        conversationContext: c.conversation_context || undefined,
        cadence: (c.cadence || 'monthly') as CadenceType,
        lastContacted: c.last_contacted ? new Date(c.last_contacted) : null,
        nextDue: c.next_due ? new Date(c.next_due) : new Date(),
        aiDraft: c.ai_draft || undefined,
        followUpOverride: c.follow_up_override ? new Date(c.follow_up_override) : null,
        isHidden: c.is_hidden || false,
        birthdayMonth: c.birthday_month,
        birthdayDay: c.birthday_day,
        birthdayYear: c.birthday_year,
      }));

      setContacts(mappedContacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: 'Error loading contacts',
        description: 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const syncGoogleContacts = async () => {
    if (!session?.provider_token) {
      toast({
        title: 'Re-authentication required',
        description: 'Please sign out and sign in again to sync contacts',
        variant: 'destructive',
      });
      return;
    }

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-google-contacts', {
        body: { 
          accessToken: session.provider_token,
          userId: user?.id 
        },
      });

      if (error) throw error;

      toast({
        title: 'Contacts synced!',
        description: `${data?.synced || 0} contacts imported from Google`,
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
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone || null;
      if (updates.cadence !== undefined) dbUpdates.cadence = updates.cadence;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.linkedinUrl !== undefined) dbUpdates.linkedin_url = updates.linkedinUrl;
      if (updates.xUrl !== undefined) dbUpdates.x_url = updates.xUrl;
      if (updates.youtubeUrl !== undefined) dbUpdates.youtube_url = updates.youtubeUrl;
      if (updates.instagramUrl !== undefined) dbUpdates.instagram_url = updates.instagramUrl;
      if (updates.tiktokUrl !== undefined) dbUpdates.tiktok_url = updates.tiktokUrl;
      if (updates.facebookUrl !== undefined) dbUpdates.facebook_url = updates.facebookUrl;
      if (updates.githubUrl !== undefined) dbUpdates.github_url = updates.githubUrl;
      if (updates.threadsUrl !== undefined) dbUpdates.threads_url = updates.threadsUrl;
      if (updates.snapchatUrl !== undefined) dbUpdates.snapchat_url = updates.snapchatUrl;
      if (updates.pinterestUrl !== undefined) dbUpdates.pinterest_url = updates.pinterestUrl;
      if (updates.redditUrl !== undefined) dbUpdates.reddit_url = updates.redditUrl;
      if (updates.discordUrl !== undefined) dbUpdates.discord_url = updates.discordUrl;
      if (updates.twitchUrl !== undefined) dbUpdates.twitch_url = updates.twitchUrl;
      if (updates.whatsappUrl !== undefined) dbUpdates.whatsapp_url = updates.whatsappUrl;
      if (updates.telegramUrl !== undefined) dbUpdates.telegram_url = updates.telegramUrl;
      if (updates.conversationContext !== undefined) dbUpdates.conversation_context = updates.conversationContext;
      if (updates.labels !== undefined) dbUpdates.labels = updates.labels;
      if (updates.lastContacted !== undefined) {
        dbUpdates.last_contacted = updates.lastContacted?.toISOString() || null;
      }
      if (updates.followUpOverride !== undefined) {
        dbUpdates.follow_up_override = updates.followUpOverride?.toISOString() || null;
      }
      if (updates.isHidden !== undefined) dbUpdates.is_hidden = updates.isHidden;
      if (updates.birthdayMonth !== undefined) dbUpdates.birthday_month = updates.birthdayMonth;
      if (updates.birthdayDay !== undefined) dbUpdates.birthday_day = updates.birthdayDay;
      if (updates.birthdayYear !== undefined) dbUpdates.birthday_year = updates.birthdayYear;

      const { error } = await supabase
        .from('contacts')
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
    if (shouldSyncToGoogle && googleId && session?.provider_token) {
      try {
        const googleUpdates: Record<string, string | undefined> = {};
        if (updates.phone !== undefined) googleUpdates.phone = updates.phone;

        const { error } = await supabase.functions.invoke('update-google-contact', {
          body: {
            accessToken: session.provider_token,
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
  };

  const markAsContacted = async (contactId: string) => {
    await updateContact(contactId, { lastContacted: new Date() });
  };

  const getContactGoogleId = async (contactId: string): Promise<string | null> => {
    const { data } = await supabase
      .from('contacts')
      .select('google_id')
      .eq('id', contactId)
      .single();
    return data?.google_id || null;
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
