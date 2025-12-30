import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface CategorySetting {
  id: string;
  user_id: string;
  label_name: string;
  description: string | null;
  cadence_days: number;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_CATEGORIES: Omit<CategorySetting, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  { label_name: 'Close Friends', description: 'Your inner circle', cadence_days: 7, is_default: true, sort_order: 0 },
  { label_name: 'Friends', description: 'Good friends', cadence_days: 14, is_default: true, sort_order: 1 },
  { label_name: 'Family', description: 'Family members', cadence_days: 30, is_default: true, sort_order: 2 },
  { label_name: 'Colleagues', description: 'Work contacts', cadence_days: 30, is_default: true, sort_order: 3 },
  { label_name: 'Acquaintances', description: 'Casual connections', cadence_days: 90, is_default: true, sort_order: 4 },
];

export function useCategorySettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [categorySettings, setCategorySettings] = useState<CategorySetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCategorySettings = useCallback(async () => {
    if (!user) {
      setCategorySettings([]);
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
        setCategorySettings(data as unknown as CategorySetting[]);
      }
    } catch (error) {
      console.error('Error fetching category settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load category settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  const initializeDefaults = async () => {
    if (!user) return;

    try {
      const defaultsToInsert = DEFAULT_CATEGORIES.map((category) => ({
        ...category,
        user_id: user.id,
      }));

      const { data, error } = await supabase
        .from('label_settings')
        .insert(defaultsToInsert as any)
        .select();

      if (error) throw error;
      setCategorySettings(data as unknown as CategorySetting[]);
    } catch (error) {
      console.error('Error initializing defaults:', error);
    }
  };

  const updateCategorySetting = async (id: string, updates: Partial<CategorySetting>) => {
    try {
      const { error } = await supabase
        .from('label_settings')
        .update(updates as any)
        .eq('id', id);

      if (error) throw error;

      setCategorySettings((prev) =>
        prev.map((category) => (category.id === id ? { ...category, ...updates } : category))
      );

      return true;
    } catch (error) {
      console.error('Error updating category setting:', error);
      toast({
        title: 'Error',
        description: 'Failed to update category',
        variant: 'destructive',
      });
      return false;
    }
  };

  const addCategorySetting = async (categoryName: string, description: string, cadenceDays: number) => {
    if (!user) return null;

    try {
      const maxSortOrder = Math.max(...categorySettings.map((c) => c.sort_order), -1);

      const { data, error } = await supabase
        .from('label_settings')
        .insert({
          user_id: user.id,
          label_name: categoryName,
          description,
          cadence_days: cadenceDays,
          is_default: false,
          sort_order: maxSortOrder + 1,
        } as any)
        .select()
        .single();

      if (error) throw error;

      const newSetting = data as unknown as CategorySetting;
      setCategorySettings((prev) => [...prev, newSetting]);
      return newSetting;
    } catch (error: any) {
      console.error('Error adding category setting:', error);
      if (error.code === '23505') {
        toast({
          title: 'Category exists',
          description: 'A category with this name already exists',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to add category',
          variant: 'destructive',
        });
      }
      return null;
    }
  };

  const deleteCategorySetting = async (id: string) => {
    const category = categorySettings.find((c) => c.id === id);
    if (category?.is_default) {
      toast({
        title: 'Cannot delete',
        description: 'Default categories cannot be deleted',
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

      setCategorySettings((prev) => prev.filter((c) => c.id !== id));
      return true;
    } catch (error) {
      console.error('Error deleting category setting:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete category',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchCategorySettings();
  }, [fetchCategorySettings]);

  return {
    categorySettings,
    isLoading,
    updateCategorySetting,
    addCategorySetting,
    deleteCategorySetting,
    refetch: fetchCategorySettings,
  };
}

// Keep old hook name for backward compatibility
export { useCategorySettings as useLabelSettings };
