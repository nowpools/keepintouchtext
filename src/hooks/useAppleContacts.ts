import { useState, useCallback } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import type { AppleContact, ContactsPermission } from '@/types/contacts';

// Define the plugin interface
interface AppleContactsPluginInterface {
  requestPermission(): Promise<{ status: ContactsPermission }>;
  checkPermission(): Promise<{ status: ContactsPermission }>;
  fetchContacts(): Promise<{ contacts: AppleContact[] }>;
  createContact(contact: Partial<AppleContact>): Promise<{ contact: AppleContact }>;
  updateContact(contact: Partial<AppleContact> & { identifier: string }): Promise<{ contact: AppleContact }>;
  deleteContact(options: { identifier: string }): Promise<void>;
}

// Register the plugin - will be implemented natively in iOS
const AppleContactsPlugin = registerPlugin<AppleContactsPluginInterface>('AppleContacts');

export function useAppleContacts() {
  const [permission, setPermission] = useState<ContactsPermission>('unknown');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAvailable = Capacitor.getPlatform() === 'ios';

  const checkPermission = useCallback(async (): Promise<ContactsPermission> => {
    if (!isAvailable) {
      return 'denied';
    }

    try {
      const result = await AppleContactsPlugin.checkPermission();
      setPermission(result.status);
      return result.status;
    } catch (e) {
      console.error('[AppleContacts] Check permission error:', e);
      return 'unknown';
    }
  }, [isAvailable]);

  const requestPermission = useCallback(async (): Promise<ContactsPermission> => {
    if (!isAvailable) {
      setError('Apple Contacts is only available on iOS');
      return 'denied';
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await AppleContactsPlugin.requestPermission();
      setPermission(result.status);
      return result.status;
    } catch (e) {
      console.error('[AppleContacts] Request permission error:', e);
      setError(e instanceof Error ? e.message : 'Failed to request permission');
      return 'denied';
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  const fetchContacts = useCallback(async (): Promise<AppleContact[]> => {
    if (!isAvailable) {
      setError('Apple Contacts is only available on iOS');
      return [];
    }

    if (permission !== 'granted') {
      const newPermission = await requestPermission();
      if (newPermission !== 'granted') {
        setError('Contacts permission not granted');
        return [];
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await AppleContactsPlugin.fetchContacts();
      return result.contacts;
    } catch (e) {
      console.error('[AppleContacts] Fetch contacts error:', e);
      setError(e instanceof Error ? e.message : 'Failed to fetch contacts');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, permission, requestPermission]);

  const createContact = useCallback(async (contact: Partial<AppleContact>): Promise<AppleContact | null> => {
    if (!isAvailable) {
      setError('Apple Contacts is only available on iOS');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await AppleContactsPlugin.createContact(contact);
      return result.contact;
    } catch (e) {
      console.error('[AppleContacts] Create contact error:', e);
      setError(e instanceof Error ? e.message : 'Failed to create contact');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  const updateContact = useCallback(async (
    contact: Partial<AppleContact> & { identifier: string }
  ): Promise<AppleContact | null> => {
    if (!isAvailable) {
      setError('Apple Contacts is only available on iOS');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await AppleContactsPlugin.updateContact(contact);
      return result.contact;
    } catch (e) {
      console.error('[AppleContacts] Update contact error:', e);
      setError(e instanceof Error ? e.message : 'Failed to update contact');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  const deleteContact = useCallback(async (identifier: string): Promise<boolean> => {
    if (!isAvailable) {
      setError('Apple Contacts is only available on iOS');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      await AppleContactsPlugin.deleteContact({ identifier });
      return true;
    } catch (e) {
      console.error('[AppleContacts] Delete contact error:', e);
      setError(e instanceof Error ? e.message : 'Failed to delete contact');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  return {
    isAvailable,
    permission,
    isLoading,
    error,
    checkPermission,
    requestPermission,
    fetchContacts,
    createContact,
    updateContact,
    deleteContact,
  };
}
