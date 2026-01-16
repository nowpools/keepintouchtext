-- Add user_id column to contact_links table
ALTER TABLE public.contact_links 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Create index for faster lookups by user_id
CREATE INDEX idx_contact_links_user_id ON public.contact_links(user_id);

-- Update RLS policy to include user_id check (if needed in future)
-- The existing RLS already checks via app_contacts.user_id join