import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SubscriptionTier, TIER_FEATURES, TierFeatures } from '@/types/subscription';

interface SubscriptionState {
  tier: SubscriptionTier;
  isTrialActive: boolean;
  trialEndsAt: Date | null;
  daysLeftInTrial: number;
  isLoading: boolean;
  features: TierFeatures;
}

export function useSubscription() {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    tier: 'free',
    isTrialActive: false,
    trialEndsAt: null,
    daysLeftInTrial: 0,
    isLoading: true,
    features: TIER_FEATURES.free,
  });

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching subscription:', error);
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      if (data) {
        const trialEndsAt = data.trial_ends_at ? new Date(data.trial_ends_at) : null;
        const now = new Date();
        const daysLeft = trialEndsAt 
          ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
          : 0;
        
        // During trial, user gets Pro features
        const effectiveTier = data.is_trial_active && daysLeft > 0 
          ? 'pro' 
          : (data.tier as SubscriptionTier);

        setState({
          tier: data.tier as SubscriptionTier,
          isTrialActive: data.is_trial_active && daysLeft > 0,
          trialEndsAt,
          daysLeftInTrial: daysLeft,
          isLoading: false,
          features: TIER_FEATURES[effectiveTier],
        });
      }
    } catch (err) {
      console.error('Error in subscription fetch:', err);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const hasFeature = useCallback((feature: keyof TierFeatures): boolean => {
    return !!state.features[feature];
  }, [state.features]);

  const canUseFeature = useCallback((feature: keyof TierFeatures): boolean => {
    // During trial, users get Pro features
    if (state.isTrialActive) {
      return !!TIER_FEATURES.pro[feature];
    }
    return hasFeature(feature);
  }, [state.isTrialActive, hasFeature]);

  return {
    ...state,
    hasFeature,
    canUseFeature,
    refetch: fetchSubscription,
  };
}
