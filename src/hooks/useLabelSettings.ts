import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { LabelSetting, DEFAULT_LABELS } from '@/types/labelSettings';
import { useToast } from '@/hooks/use-toast';

export function useLabelSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [labelSettings, setLabelSettings] = useState<LabelSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLabelSettings = useCallback(async () => {
    if (!user) {
      setLabelSettings([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('label_settings')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // If no settings exist, initialize with defaults
      if (!data || data.length === 0) {
        await initializeDefaults();
      } else {
        setLabelSettings(data as LabelSetting[]);
      }
    } catch (error) {
      console.error('Error fetching label settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load label settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  const initializeDefaults = async () => {
    if (!user) return;

    try {
      const defaultsToInsert = DEFAULT_LABELS.map((label) => ({
        ...label,
        user_id: user.id,
      }));

      const { data, error } = await supabase
        .from('label_settings')
        .insert(defaultsToInsert)
        .select();

      if (error) throw error;
      setLabelSettings(data as LabelSetting[]);
    } catch (error) {
      console.error('Error initializing defaults:', error);
    }
  };

  const updateLabelSetting = async (id: string, updates: Partial<LabelSetting>) => {
    try {
      const { error } = await supabase
        .from('label_settings')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setLabelSettings((prev) =>
        prev.map((label) => (label.id === id ? { ...label, ...updates } : label))
      );

      return true;
    } catch (error) {
      console.error('Error updating label setting:', error);
      toast({
        title: 'Error',
        description: 'Failed to update label',
        variant: 'destructive',
      });
      return false;
    }
  };

  const addLabelSetting = async (labelName: string, description: string, cadenceDays: number) => {
    if (!user) return null;

    try {
      const maxSortOrder = Math.max(...labelSettings.map((l) => l.sort_order), -1);

      const { data, error } = await supabase
        .from('label_settings')
        .insert({
          user_id: user.id,
          label_name: labelName,
          description,
          cadence_days: cadenceDays,
          is_default: false,
          sort_order: maxSortOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;

      setLabelSettings((prev) => [...prev, data as LabelSetting]);
      return data as LabelSetting;
    } catch (error: any) {
      console.error('Error adding label setting:', error);
      if (error.code === '23505') {
        toast({
          title: 'Label exists',
          description: 'A label with this name already exists',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to add label',
          variant: 'destructive',
        });
      }
      return null;
    }
  };

  const deleteLabelSetting = async (id: string) => {
    const label = labelSettings.find((l) => l.id === id);
    if (label?.is_default) {
      toast({
        title: 'Cannot delete',
        description: 'Default labels cannot be deleted',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('label_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setLabelSettings((prev) => prev.filter((l) => l.id !== id));
      return true;
    } catch (error) {
      console.error('Error deleting label setting:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete label',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchLabelSettings();
  }, [fetchLabelSettings]);

  return {
    labelSettings,
    isLoading,
    updateLabelSetting,
    addLabelSetting,
    deleteLabelSetting,
    refetch: fetchLabelSettings,
  };
}
