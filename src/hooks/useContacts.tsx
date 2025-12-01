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
  cadence: string;
  last_contacted: string | null;
  next_due: string | null;
  ai_draft: string | null;
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
        labels: c.labels || [],
        notes: c.notes || '',
        linkedinUrl: c.linkedin_url || undefined,
        cadence: (c.cadence || 'monthly') as CadenceType,
        lastContacted: c.last_contacted ? new Date(c.last_contacted) : null,
        nextDue: c.next_due ? new Date(c.next_due) : new Date(),
        aiDraft: c.ai_draft || undefined,
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
      if (updates.cadence !== undefined) dbUpdates.cadence = updates.cadence;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.linkedinUrl !== undefined) dbUpdates.linkedin_url = updates.linkedinUrl;
      if (updates.lastContacted !== undefined) {
        dbUpdates.last_contacted = updates.lastContacted?.toISOString() || null;
      }

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

  const markAsContacted = async (contactId: string) => {
    await updateContact(contactId, { lastContacted: new Date() });
  };

  return {
    contacts,
    isLoading,
    isSyncing,
    syncGoogleContacts,
    updateContact,
    markAsContacted,
    refetch: fetchContacts,
  };
}
