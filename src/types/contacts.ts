// Contact source types
export type ContactSource = 'apple' | 'google' | 'app';
export type SyncDirection = 'pull' | 'push';
export type SyncStatus = 'pending' | 'processing' | 'success' | 'failed';
export type ContactsPermission = 'unknown' | 'granted' | 'denied';
export type ConflictResolutionPreference = 'apple' | 'google' | 'ask';

// Email/Phone normalized structures
export interface NormalizedEmail {
  value: string;
  label?: string;
  primary?: boolean;
}

export interface NormalizedPhone {
  value: string;
  label?: string;
  primary?: boolean;
}

// App Contact (unified contact record)
export interface AppContact {
  id: string;
  user_id: string;
  display_name: string;
  given_name?: string;
  family_name?: string;
  emails: NormalizedEmail[];
  phones: NormalizedPhone[];
  notes?: string;
  tags: string[];
  source_preference: ContactSource;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  // Core product fields
  label?: string;
  cadence_days?: number;
  last_contacted?: string;
  next_contact_date?: string;
  birthday?: string;
  linkedin_url?: string;
  x_url?: string;
  youtube_url?: string;
  conversation_context?: string;
}

// Contact Link (links app contacts to external sources)
export interface ContactLink {
  id: string;
  app_contact_id: string;
  source: ContactSource;
  external_id: string;
  external_etag?: string | null;
  last_pulled_at?: string | null;
  last_pushed_at?: string | null;
  sync_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// User Integrations (per-user sync settings and tokens)
export interface UserIntegrations {
  id: string;
  user_id: string;
  google_access_token?: string | null;
  google_refresh_token?: string | null;
  google_token_expiry?: string | null;
  google_sync_token?: string | null;
  apple_contacts_permission: ContactsPermission;
  apple_sync_enabled: boolean;
  apple_visible: boolean;
  google_sync_enabled: boolean;
  google_visible: boolean;
  conflict_preference: ConflictResolutionPreference;
  last_sync_apple?: string | null;
  last_sync_google?: string | null;
  created_at: string;
  updated_at: string;
}

// Sync Queue Item
export interface SyncQueueItem {
  id: string;
  user_id: string;
  source: ContactSource;
  direction: SyncDirection;
  app_contact_id?: string | null;
  external_id?: string | null;
  payload?: Record<string, unknown>;
  status: SyncStatus;
  error?: string | null;
  created_at: string;
  updated_at: string;
}

// User Profile
export interface UserProfile {
  id: string;
  user_id: string;
  email?: string | null;
  name?: string | null;
  apple_sub?: string | null;
  google_sub?: string | null;
  created_at: string;
  updated_at: string;
}

// Extended contact with links for UI
export interface ContactWithLinks extends AppContact {
  links: ContactLink[];
  hasAppleLink: boolean;
  hasGoogleLink: boolean;
}

// Apple Contact from iOS (native format)
export interface AppleContact {
  identifier: string;
  givenName?: string;
  familyName?: string;
  organizationName?: string;
  emailAddresses?: Array<{ label?: string; value: string }>;
  phoneNumbers?: Array<{ label?: string; value: string }>;
  note?: string;
  imageData?: string; // base64
}

// Google Contact from People API
export interface GoogleContact {
  resourceName: string;
  etag?: string;
  names?: Array<{
    displayName?: string;
    givenName?: string;
    familyName?: string;
  }>;
  emailAddresses?: Array<{ value: string; type?: string }>;
  phoneNumbers?: Array<{ value: string; type?: string }>;
  biographies?: Array<{ value: string }>;
  photos?: Array<{ url: string }>;
}
