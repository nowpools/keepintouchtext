-- Create sync_jobs table for background job queue
CREATE TABLE public.sync_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_type TEXT NOT NULL DEFAULT 'google_contacts_sync',
  status TEXT NOT NULL DEFAULT 'queued',
  progress_total_estimate INTEGER,
  progress_done INTEGER NOT NULL DEFAULT 0,
  last_checkpoint JSONB,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for sync_jobs
CREATE INDEX idx_sync_jobs_user_id ON public.sync_jobs(user_id);
CREATE INDEX idx_sync_jobs_job_type ON public.sync_jobs(job_type);
CREATE INDEX idx_sync_jobs_status ON public.sync_jobs(status);

-- Create sync_job_items table for debugging/logging
CREATE TABLE public.sync_job_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.sync_jobs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for sync_job_items
CREATE INDEX idx_sync_job_items_job_id ON public.sync_job_items(job_id);

-- Enable RLS on sync_jobs
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for sync_jobs
CREATE POLICY "Users can read their sync jobs"
ON public.sync_jobs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their sync jobs"
ON public.sync_jobs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their sync jobs"
ON public.sync_jobs
FOR UPDATE
USING (auth.uid() = user_id);

-- Enable RLS on sync_job_items
ALTER TABLE public.sync_job_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for sync_job_items
CREATE POLICY "Users can read their job items"
ON public.sync_job_items
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.sync_jobs
  WHERE sync_jobs.id = sync_job_items.job_id
  AND sync_jobs.user_id = auth.uid()
));

-- Add updated_at trigger for sync_jobs
CREATE TRIGGER update_sync_jobs_updated_at
BEFORE UPDATE ON public.sync_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add google_resource_name and etag columns to app_contacts for two-way sync
ALTER TABLE public.app_contacts
ADD COLUMN IF NOT EXISTS google_resource_name TEXT,
ADD COLUMN IF NOT EXISTS google_etag TEXT;

-- Create index on google_resource_name for efficient lookups
CREATE INDEX IF NOT EXISTS idx_app_contacts_google_resource_name ON public.app_contacts(google_resource_name);