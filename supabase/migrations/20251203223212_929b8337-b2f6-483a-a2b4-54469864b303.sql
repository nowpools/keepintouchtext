-- Add follow_up_override column to allow setting a specific follow-up date
ALTER TABLE public.contacts 
ADD COLUMN follow_up_override timestamp with time zone DEFAULT NULL;