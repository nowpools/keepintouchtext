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

export type LabelSetting = CategorySetting;

export const DEFAULT_CATEGORIES: Omit<CategorySetting, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  { label_name: 'Family', description: 'For immediate + extended family members you want to stay close with.', cadence_days: 14, is_default: true, sort_order: 0 },
  { label_name: 'Close Friends', description: 'Your inner circle — people you genuinely want to keep up with regularly.', cadence_days: 21, is_default: true, sort_order: 1 },
  { label_name: 'Friends', description: 'Casual friends, neighbors, activity buddies, old classmates.', cadence_days: 45, is_default: true, sort_order: 2 },
  { label_name: 'Business Contacts', description: 'Networking connections, light professional acquaintances, industry peers.', cadence_days: 60, is_default: true, sort_order: 3 },
  { label_name: 'VIPs', description: 'Special category for mentors, investors, top clients, or priority relationships.', cadence_days: 30, is_default: true, sort_order: 4 },
];

export const DEFAULT_LABELS = DEFAULT_CATEGORIES;
