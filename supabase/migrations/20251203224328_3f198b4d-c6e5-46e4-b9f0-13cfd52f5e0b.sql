-- Add is_hidden column to contacts to exclude from cadence
ALTER TABLE public.contacts 
ADD COLUMN is_hidden boolean DEFAULT false NOT NULL;