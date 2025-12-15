import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastCompletionDate: Date | null;
  isLoading: boolean;
}

export function useStreak() {
  const { user } = useAuth();
  const [state, setState] = useState<StreakState>({
    currentStreak: 0,
    longestStreak: 0,
    lastCompletionDate: null,
    isLoading: true,
  });

  const fetchStreak = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching streak:', error);
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      if (data) {
        const lastDate = data.last_completion_date ? new Date(data.last_completion_date) : null;
        
        // Check if streak is still valid (completed yesterday or today)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let currentStreak = data.current_streak;
        
        if (lastDate) {
          const lastDateNormalized = new Date(lastDate);
          lastDateNormalized.setHours(0, 0, 0, 0);
          
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          
          // If last completion was before yesterday, streak is broken
          if (lastDateNormalized < yesterday) {
            currentStreak = 0;
          }
        }

        setState({
          currentStreak,
          longestStreak: data.longest_streak,
          lastCompletionDate: lastDate,
          isLoading: false,
        });
      } else {
        // No streak record yet
        setState({
          currentStreak: 0,
          longestStreak: 0,
          lastCompletionDate: null,
          isLoading: false,
        });
      }
    } catch (err) {
      console.error('Error in streak fetch:', err);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [user]);

  useEffect(() => {
    fetchStreak();
  }, [fetchStreak]);

  const recordCompletion = useCallback(async () => {
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Check if already completed today
    if (state.lastCompletionDate) {
      const lastDateNormalized = new Date(state.lastCompletionDate);
      lastDateNormalized.setHours(0, 0, 0, 0);
      
      if (lastDateNormalized.getTime() === today.getTime()) {
        // Already recorded today
        return;
      }
    }

    let newStreak = 1;
    
    if (state.lastCompletionDate) {
      const lastDateNormalized = new Date(state.lastCompletionDate);
      lastDateNormalized.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // If completed yesterday, continue streak
      if (lastDateNormalized.getTime() === yesterday.getTime()) {
        newStreak = state.currentStreak + 1;
      }
    }

    const newLongestStreak = Math.max(newStreak, state.longestStreak);

    try {
      const { error } = await supabase
        .from('user_streaks')
        .upsert({
          user_id: user.id,
          current_streak: newStreak,
          longest_streak: newLongestStreak,
          last_completion_date: todayStr,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setState({
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        lastCompletionDate: today,
        isLoading: false,
      });
    } catch (err) {
      console.error('Error updating streak:', err);
    }
  }, [user, state]);

  return {
    ...state,
    recordCompletion,
    refetch: fetchStreak,
  };
}
