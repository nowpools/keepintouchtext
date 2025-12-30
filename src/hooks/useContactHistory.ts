import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import type { AppContact } from '@/types/contacts';

interface ContactHistoryEntry {
  id: string;
  user_id: string;
  contact_id: string;
  contact_name: string;
  contacted_at: string;
  label?: string;
  notes?: string;
  reason?: string;
  cadence?: string;
}

export function useContactHistory(contactId?: string) {
  const { user } = useAuth();
  const [history, setHistory] = useState<ContactHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!user || !contactId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('contact_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('contact_id', contactId)
        .order('contacted_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory((data || []) as ContactHistoryEntry[]);
    } catch (err) {
      console.error('Error fetching contact history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, contactId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const recordContactCompletion = useCallback(async (
    contact: AppContact,
    reason: string = 'cadence'
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('contact_history')
        .insert({
          user_id: user.id,
          contact_id: contact.id,
          contact_name: contact.display_name,
          label: contact.label || null,
          notes: contact.notes || null,
          cadence: contact.cadence_days?.toString() || null,
          reason,
          contacted_at: new Date().toISOString(),
        } as any);

      if (error) throw error;
      
      // Refetch history if we're tracking this contact
      if (contactId === contact.id) {
        fetchHistory();
      }
    } catch (err) {
      console.error('Error recording contact history:', err);
    }
  }, [user, contactId, fetchHistory]);

  const exportContactHistory = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('contact_history')
        .select('*')
        .eq('user_id', user.id)
        .order('contacted_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: 'No history to export',
          description: 'Start contacting people to build your history!',
        });
        return;
      }

      // Generate CSV
      const headers = ['Contact Name', 'Label', 'Date Contacted', 'Notes', 'Reason'];
      const rows = (data as any[]).map(record => [
        record.contact_name || '',
        record.label || '',
        new Date(record.contacted_at).toLocaleDateString(),
        (record.notes || '').replace(/"/g, '""'),
        record.reason || 'cadence',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map((cell: string) => `"${cell}"`).join(','))
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `contact-history-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Export complete',
        description: `Exported ${data.length} contact records`,
      });
    } catch (err) {
      console.error('Error exporting contact history:', err);
      toast({
        title: 'Export failed',
        description: 'Could not export contact history',
        variant: 'destructive',
      });
    }
  }, [user]);

  return {
    history,
    isLoading,
    recordContactCompletion,
    exportContactHistory,
    refetch: fetchHistory,
  };
}
