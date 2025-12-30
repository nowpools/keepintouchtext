import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Contact, ContactSurfaceReason } from '@/types/contact';
import { toast } from '@/hooks/use-toast';

export function useContactHistory() {
  const { user } = useAuth();

  const recordContactCompletion = useCallback(async (
    contact: Contact,
    reason: ContactSurfaceReason = 'cadence'
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('contact_history')
        .insert({
          user_id: user.id,
          contact_id: contact.id,
          contact_name: contact.name,
          label: contact.labels[0] || null,
          notes: contact.notes || null,
          cadence: contact.cadence,
          reason,
          contacted_at: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error recording contact history:', err);
    }
  }, [user]);

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
      const headers = ['Contact Name', 'Relationship Label', 'Date Contacted', 'Notes', 'Cadence', 'Reason'];
      const rows = data.map(record => [
        record.contact_name,
        record.label || '',
        new Date(record.contacted_at).toLocaleDateString(),
        (record.notes || '').replace(/"/g, '""'), // Escape quotes
        record.cadence || '',
        record.reason || 'cadence',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
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
    recordContactCompletion,
    exportContactHistory,
  };
}
