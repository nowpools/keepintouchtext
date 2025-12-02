-- Add conversation_context field to contacts table for AI training
ALTER TABLE public.contacts 
ADD COLUMN conversation_context text DEFAULT NULL;