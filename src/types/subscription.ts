export type SubscriptionTier = 'free' | 'pro' | 'business';

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  isTrialActive: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TierFeatures {
  // Contact limits
  maxDailyContacts: number | 'unlimited';
  maxLabels: number | 'unlimited';
  maxAiDraftsPerDay: number | 'unlimited';
  
  // Cadence options
  cadenceOptions: string[];
  
  // Features
  googleContactsSync: boolean;
  twoWaySync: boolean;
  smartDailyTarget: boolean;
  progressIndicators: boolean;
  streakTracking: boolean;
  birthdayField: boolean;
  hideContacts: boolean;
  manualNotes: boolean;
  openInMessaging: boolean;
  markDone: boolean;
  dynamicDailyCalc: boolean; // Allow blank daily max for dynamic calculation
  
  // Business features
  aiToneSetting: boolean;
  exportHistory: boolean;
  overrideFollowUp: boolean;
  customCadencePerLabel: boolean;
  socialMediaLinks: boolean;
}

export const TIER_FEATURES: Record<SubscriptionTier, TierFeatures> = {
  free: {
    maxDailyContacts: 5,
    maxLabels: 2,
    maxAiDraftsPerDay: 5,
    cadenceOptions: ['monthly', 'quarterly'],
    googleContactsSync: true,
    twoWaySync: false,
    smartDailyTarget: false,
    progressIndicators: false,
    streakTracking: false,
    birthdayField: false,
    hideContacts: false,
    manualNotes: true,
    openInMessaging: true,
    markDone: true,
    dynamicDailyCalc: false,
    aiToneSetting: false,
    exportHistory: false,
    overrideFollowUp: false,
    customCadencePerLabel: false,
    socialMediaLinks: false,
  },
  pro: {
    maxDailyContacts: 'unlimited',
    maxLabels: 'unlimited',
    maxAiDraftsPerDay: 'unlimited',
    cadenceOptions: ['daily', 'weekly', 'monthly', 'quarterly', 'twice-yearly', 'yearly'],
    googleContactsSync: true,
    twoWaySync: true,
    smartDailyTarget: true,
    progressIndicators: true,
    streakTracking: true,
    birthdayField: true,
    hideContacts: true,
    manualNotes: true,
    openInMessaging: true,
    markDone: true,
    dynamicDailyCalc: true,
    aiToneSetting: false,
    exportHistory: false,
    overrideFollowUp: false,
    customCadencePerLabel: false,
    socialMediaLinks: false,
  },
  business: {
    maxDailyContacts: 'unlimited',
    maxLabels: 'unlimited',
    maxAiDraftsPerDay: 'unlimited',
    cadenceOptions: ['daily', 'weekly', 'monthly', 'quarterly', 'twice-yearly', 'yearly'],
    googleContactsSync: true,
    twoWaySync: true,
    smartDailyTarget: true,
    progressIndicators: true,
    streakTracking: true,
    birthdayField: true,
    hideContacts: true,
    manualNotes: true,
    openInMessaging: true,
    markDone: true,
    dynamicDailyCalc: true,
    aiToneSetting: true,
    exportHistory: true,
    overrideFollowUp: true,
    customCadencePerLabel: true,
    socialMediaLinks: true,
  },
};

export const TIER_PRICING = {
  free: { monthly: 0, yearly: 0 },
  pro: { monthly: 9, yearly: 79 },
  business: { monthly: 19, yearly: 149 },
};
