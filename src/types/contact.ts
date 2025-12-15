export type CadenceType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'twice-yearly' | 'yearly';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  photo?: string;
  labels: string[];
  notes: string;
  linkedinUrl?: string;
  xUrl?: string;
  youtubeUrl?: string;
  conversationContext?: string;
  cadence: CadenceType;
  lastContacted: Date | null;
  nextDue: Date;
  aiDraft?: string;
  followUpOverride?: Date | null;
  isHidden: boolean;
}

export interface DailyContact extends Contact {
  isCompleted: boolean;
  isSnoozed: boolean;
}

export interface CadenceSettings {
  daily: number;
  weekly: number;
  monthly: number;
  quarterly: number;
  'twice-yearly': number;
  yearly: number;
}

export type SortOrderType = 'alphabetical' | 'random';

export type SocialPlatform = 
  | 'linkedin' 
  | 'x' 
  | 'youtube' 
  | 'facebook' 
  | 'instagram' 
  | 'tiktok' 
  | 'github' 
  | 'threads' 
  | 'snapchat' 
  | 'pinterest' 
  | 'reddit' 
  | 'discord' 
  | 'twitch' 
  | 'whatsapp' 
  | 'telegram';

export interface SocialPlatformSettings {
  linkedin: boolean;
  x: boolean;
  youtube: boolean;
  facebook: boolean;
  instagram: boolean;
  tiktok: boolean;
  github: boolean;
  threads: boolean;
  snapchat: boolean;
  pinterest: boolean;
  reddit: boolean;
  discord: boolean;
  twitch: boolean;
  whatsapp: boolean;
  telegram: boolean;
}

export interface AppSettings {
  maxDailyContacts: number;
  cadenceSettings: CadenceSettings;
  aiTone: 'casual' | 'professional' | 'friendly';
  aiLength: 'short' | 'medium' | 'long';
  sortOrder: SortOrderType;
  visibleSocialPlatforms: SocialPlatformSettings;
}

export const DEFAULT_CADENCE_DAYS: CadenceSettings = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  'twice-yearly': 180,
  yearly: 365,
};

export const CADENCE_LABELS: Record<CadenceType, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  'twice-yearly': 'Twice Yearly',
  yearly: 'Yearly',
};
