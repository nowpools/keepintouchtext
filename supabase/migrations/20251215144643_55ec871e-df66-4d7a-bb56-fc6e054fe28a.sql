-- Add X (Twitter) and YouTube URL columns to contacts
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS x_url TEXT,
ADD COLUMN IF NOT EXISTS youtube_url TEXT;