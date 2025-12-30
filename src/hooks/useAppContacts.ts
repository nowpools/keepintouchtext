import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserIntegrations } from '@/hooks/useUserIntegrations';
import type { 
  AppContact, 
  ContactLink, 
  ContactWithLinks, 
  NormalizedEmail, 
  NormalizedPhone,
  ContactSource 
} from '@/types/contacts';

export function useAppContacts() {
  const { user } = useAuth();
  const { integrations } = useUserIntegrations();
  const [contacts, setContacts] = useState<ContactWithLinks[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    if (!user) {
      setContacts([]);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch contacts with their links
      const { data: contactsData, error: contactsError } = await supabase
        .from('app_contacts')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('display_name', { ascending: true });

      if (contactsError) throw contactsError;

      const contactIds = contactsData?.map(c => c.id) || [];
      
      // Fetch links for these contacts
      let linksData: ContactLink[] = [];
      if (contactIds.length > 0) {
        const { data: links, error: linksError } = await supabase
          .from('contact_links')
          .select('*')
          .in('app_contact_id', contactIds);

        if (linksError) throw linksError;
        linksData = (links || []) as unknown as ContactLink[];
      }

      // Combine contacts with their links
      const contactsWithLinks: ContactWithLinks[] = (contactsData || []).map(contact => {
        const rawContact = contact as unknown as Record<string, unknown>;
        const contactLinks = linksData.filter(l => l.app_contact_id === contact.id);
        return {
          id: rawContact.id as string,
          user_id: rawContact.user_id as string,
          display_name: rawContact.display_name as string,
          given_name: rawContact.given_name as string | undefined,
          family_name: rawContact.family_name as string | undefined,
          emails: (rawContact.emails as NormalizedEmail[]) || [],
          phones: (rawContact.phones as NormalizedPhone[]) || [],
          notes: rawContact.notes as string | undefined,
          tags: (rawContact.tags as string[]) || [],
          source_preference: rawContact.source_preference as ContactSource,
          created_at: rawContact.created_at as string,
          updated_at: rawContact.updated_at as string,
          deleted_at: rawContact.deleted_at as string | null | undefined,
          links: contactLinks,
          hasAppleLink: contactLinks.some(l => l.source === 'apple'),
          hasGoogleLink: contactLinks.some(l => l.source === 'google'),
        };
      });

      setContacts(contactsWithLinks);
    } catch (e) {
      console.error('[useAppContacts] Fetch error:', e);
      setError(e instanceof Error ? e.message : 'Failed to fetch contacts');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Filtered contacts based on visibility settings
  const visibleContacts = useMemo(() => {
    if (!integrations) return contacts;

    return contacts.filter(contact => {
      // App-created contacts are always visible
      if (!contact.hasAppleLink && !contact.hasGoogleLink) {
        return true;
      }

      // Check visibility based on source links
      const appleLink = contact.links.find(l => l.source === 'apple');
      const googleLink = contact.links.find(l => l.source === 'google');

      // If contact has Apple link and Apple is hidden, check if it also has Google link
      if (appleLink && !integrations.apple_visible) {
        // Only show if it has a visible Google link
        if (!googleLink || !integrations.google_visible) {
          return false;
        }
      }

      // If contact has Google link and Google is hidden, check if it also has Apple link
      if (googleLink && !integrations.google_visible) {
        // Only show if it has a visible Apple link
        if (!appleLink || !integrations.apple_visible) {
          return false;
        }
      }

      return true;
    });
  }, [contacts, integrations]);

  const createContact = useCallback(async (
    contactData: Omit<AppContact, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>
  ): Promise<AppContact | null> => {
    if (!user) return null;

    try {
      const insertData = {
        user_id: user.id,
        display_name: contactData.display_name,
        given_name: contactData.given_name,
        family_name: contactData.family_name,
        emails: contactData.emails as unknown as Record<string, unknown>[],
        phones: contactData.phones as unknown as Record<string, unknown>[],
        notes: contactData.notes,
        tags: contactData.tags,
        source_preference: contactData.source_preference,
      };
      
      const { data, error: insertError } = await supabase
        .from('app_contacts')
        .insert([insertData] as any)
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchContacts();
      return data as unknown as AppContact;
    } catch (e) {
      console.error('[useAppContacts] Create error:', e);
      setError(e instanceof Error ? e.message : 'Failed to create contact');
      return null;
    }
  }, [user, fetchContacts]);

  const updateContact = useCallback(async (
    id: string,
    updates: Partial<Omit<AppContact, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      // Convert to plain object for Supabase
      const updateData: Record<string, unknown> = {};
      if (updates.display_name !== undefined) updateData.display_name = updates.display_name;
      if (updates.given_name !== undefined) updateData.given_name = updates.given_name;
      if (updates.family_name !== undefined) updateData.family_name = updates.family_name;
      if (updates.emails !== undefined) updateData.emails = updates.emails;
      if (updates.phones !== undefined) updateData.phones = updates.phones;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.source_preference !== undefined) updateData.source_preference = updates.source_preference;
      if (updates.deleted_at !== undefined) updateData.deleted_at = updates.deleted_at;

      const { error: updateError } = await supabase
        .from('app_contacts')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await fetchContacts();
      return true;
    } catch (e) {
      console.error('[useAppContacts] Update error:', e);
      setError(e instanceof Error ? e.message : 'Failed to update contact');
      return false;
    }
  }, [user, fetchContacts]);

  const deleteContact = useCallback(async (id: string, hard = false): Promise<boolean> => {
    if (!user) return false;

    try {
      if (hard) {
        const { error: deleteError } = await supabase
          .from('app_contacts')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;
      } else {
        // Soft delete
        const { error: updateError } = await supabase
          .from('app_contacts')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      }

      await fetchContacts();
      return true;
    } catch (e) {
      console.error('[useAppContacts] Delete error:', e);
      setError(e instanceof Error ? e.message : 'Failed to delete contact');
      return false;
    }
  }, [user, fetchContacts]);

  const addContactLink = useCallback(async (
    appContactId: string,
    source: ContactSource,
    externalId: string,
    etag?: string
  ): Promise<ContactLink | null> => {
    try {
      const { data, error: insertError } = await supabase
        .from('contact_links')
        .insert({
          app_contact_id: appContactId,
          source,
          external_id: externalId,
          external_etag: etag,
          last_pulled_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchContacts();
      return data as ContactLink;
    } catch (e) {
      console.error('[useAppContacts] Add link error:', e);
      setError(e instanceof Error ? e.message : 'Failed to add contact link');
      return null;
    }
  }, [fetchContacts]);

  const removeContactLink = useCallback(async (linkId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('contact_links')
        .delete()
        .eq('id', linkId);

      if (deleteError) throw deleteError;

      await fetchContacts();
      return true;
    } catch (e) {
      console.error('[useAppContacts] Remove link error:', e);
      setError(e instanceof Error ? e.message : 'Failed to remove contact link');
      return false;
    }
  }, [fetchContacts]);

  const mergeContacts = useCallback(async (
    primaryId: string,
    secondaryId: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      // Get both contacts
      const primary = contacts.find(c => c.id === primaryId);
      const secondary = contacts.find(c => c.id === secondaryId);

      if (!primary || !secondary) {
        throw new Error('One or both contacts not found');
      }

      // Merge data (primary takes precedence for non-array fields)
      const mergedEmails = [...primary.emails];
      secondary.emails.forEach(email => {
        if (!mergedEmails.some(e => e.value.toLowerCase() === email.value.toLowerCase())) {
          mergedEmails.push(email);
        }
      });

      const mergedPhones = [...primary.phones];
      secondary.phones.forEach(phone => {
        if (!mergedPhones.some(p => p.value === phone.value)) {
          mergedPhones.push(phone);
        }
      });

      const mergedTags = [...new Set([...primary.tags, ...secondary.tags])];

      // Update primary with merged data
      await updateContact(primaryId, {
        emails: mergedEmails,
        phones: mergedPhones,
        tags: mergedTags,
        notes: primary.notes || secondary.notes,
      });

      // Move secondary's links to primary
      for (const link of secondary.links) {
        // Check if primary already has a link for this source
        if (!primary.links.some(l => l.source === link.source)) {
          await supabase
            .from('contact_links')
            .update({ app_contact_id: primaryId })
            .eq('id', link.id);
        }
      }

      // Delete secondary contact
      await deleteContact(secondaryId, true);

      await fetchContacts();
      return true;
    } catch (e) {
      console.error('[useAppContacts] Merge error:', e);
      setError(e instanceof Error ? e.message : 'Failed to merge contacts');
      return false;
    }
  }, [user, contacts, updateContact, deleteContact, fetchContacts]);

  return {
    contacts: visibleContacts,
    allContacts: contacts,
    isLoading,
    error,
    refetch: fetchContacts,
    createContact,
    updateContact,
    deleteContact,
    addContactLink,
    removeContactLink,
    mergeContacts,
  };
}
