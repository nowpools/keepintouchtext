-- Add social media URL columns for additional platforms
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS instagram_url text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS tiktok_url text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS facebook_url text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS github_url text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS threads_url text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS snapchat_url text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS pinterest_url text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS reddit_url text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS discord_url text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS twitch_url text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS whatsapp_url text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS telegram_url text;