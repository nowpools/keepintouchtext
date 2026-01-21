-- Add job_params column to sync_jobs for storing sync mode and other parameters
ALTER TABLE public.sync_jobs
ADD COLUMN IF NOT EXISTS job_params jsonb DEFAULT NULL;