-- Add missing columns to app_contacts for core product functionality
ALTER TABLE public.app_contacts 
ADD COLUMN IF NOT EXISTS label text,
ADD COLUMN IF NOT EXISTS cadence_days integer,
ADD COLUMN IF NOT EXISTS last_contacted timestamp with time zone,
ADD COLUMN IF NOT EXISTS next_contact_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS birthday date,
ADD COLUMN IF NOT EXISTS linkedin_url text,
ADD COLUMN IF NOT EXISTS x_url text,
ADD COLUMN IF NOT EXISTS youtube_url text,
ADD COLUMN IF NOT EXISTS conversation_context text;

-- Create index for efficient querying of due contacts
CREATE INDEX IF NOT EXISTS idx_app_contacts_next_contact_date ON public.app_contacts(next_contact_date);
CREATE INDEX IF NOT EXISTS idx_app_contacts_label ON public.app_contacts(label);
CREATE INDEX IF NOT EXISTS idx_app_contacts_birthday ON public.app_contacts(birthday);