import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SyncJobStatus {
  job_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'canceled';
  progress_done: number;
  progress_total_estimate: number | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  last_checkpoint: any;
  created_at: string;
}

export type SyncModeType = 'all' | 'phone_only' | 'phone_or_email';

interface StartSyncOptions {
  mode?: 'full' | 'incremental';
  syncMode?: SyncModeType;
}

interface UseSyncJobReturn {
  jobStatus: SyncJobStatus | null;
  isStarting: boolean;
  isPolling: boolean;
  startSync: (options?: StartSyncOptions) => Promise<{ jobId: string | null; error: Error | null }>;
  cancelSync: () => Promise<{ error: Error | null }>;
  clearJob: () => void;
}

const POLL_INTERVAL_MS = 3000;

export function useSyncJob(): UseSyncJobReturn {
  const [jobStatus, setJobStatus] = useState<SyncJobStatus | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const fetchJobStatus = useCallback(async (jobId: string): Promise<SyncJobStatus | null> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      
      if (!accessToken) {
        console.error('No session for fetching job status');
        return null;
      }

      const response = await supabase.functions.invoke('get-sync-job-status', {
        body: { job_id: jobId },
      });

      if (response.error) {
        console.error('Error fetching job status:', response.error);
        return null;
      }

      return response.data as SyncJobStatus;
    } catch (error) {
      console.error('Error fetching job status:', error);
      return null;
    }
  }, []);

  const startPolling = useCallback((jobId: string) => {
    // Clear any existing polling
    stopPolling();
    setIsPolling(true);

    const poll = async () => {
      const status = await fetchJobStatus(jobId);
      if (status) {
        setJobStatus(status);

        // Stop polling if job is complete
        if (['completed', 'failed', 'canceled'].includes(status.status)) {
          stopPolling();
        }
      }
    };

    // Poll immediately
    poll();

    // Set up interval
    pollIntervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
  }, [fetchJobStatus, stopPolling]);

  const startSync = useCallback(async (options: StartSyncOptions = {}): Promise<{ jobId: string | null; error: Error | null }> => {
    // Prevent duplicate requests if already starting
    if (isStarting) {
      console.log('[SyncJob] Already starting sync, ignoring duplicate request');
      return { jobId: null, error: null };
    }

    const { mode = 'full', syncMode = 'all' } = options;
    setIsStarting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('start-google-contacts-sync', {
        body: { mode, sync_mode: syncMode },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to start sync');
      }

      const { job_id, status, message } = response.data;
      
      console.log('Sync started:', { job_id, status, message });

      // Set initial status
      setJobStatus({
        job_id,
        status,
        progress_done: 0,
        progress_total_estimate: null,
        error_message: null,
        started_at: null,
        finished_at: null,
        last_checkpoint: null,
        created_at: new Date().toISOString(),
      });

      // Start polling
      startPolling(job_id);

      return { jobId: job_id, error: null };
    } catch (error) {
      console.error('Error starting sync:', error);
      return { jobId: null, error: error as Error };
    } finally {
      setIsStarting(false);
    }
  }, [startPolling]);

  const cancelSync = useCallback(async (): Promise<{ error: Error | null }> => {
    if (!jobStatus?.job_id) {
      return { error: new Error('No active job to cancel') };
    }

    try {
      const response = await supabase.functions.invoke('cancel-sync-job', {
        body: { job_id: jobStatus.job_id },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to cancel sync');
      }

      stopPolling();
      setJobStatus(prev => prev ? { ...prev, status: 'canceled' } : null);

      return { error: null };
    } catch (error) {
      console.error('Error canceling sync:', error);
      return { error: error as Error };
    }
  }, [jobStatus?.job_id, stopPolling]);

  const clearJob = useCallback(() => {
    stopPolling();
    setJobStatus(null);
  }, [stopPolling]);

  // Check for existing active job on mount
  useEffect(() => {
    const checkExistingJob = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session?.user?.id) return;

        // Query for active jobs directly
        const { data: activeJobs } = await supabase
          .from('sync_jobs')
          .select('*')
          .eq('user_id', sessionData.session.user.id)
          .eq('job_type', 'google_contacts_sync')
          .in('status', ['queued', 'running'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (activeJobs && activeJobs.length > 0) {
          const job = activeJobs[0];
          setJobStatus({
            job_id: job.id,
            status: job.status as SyncJobStatus['status'],
            progress_done: job.progress_done,
            progress_total_estimate: job.progress_total_estimate,
            error_message: job.error_message,
            started_at: job.started_at,
            finished_at: job.finished_at,
            last_checkpoint: job.last_checkpoint,
            created_at: job.created_at,
          });
          startPolling(job.id);
        }
      } catch (error) {
        console.error('Error checking for existing jobs:', error);
      }
    };

    checkExistingJob();
  }, [startPolling]);

  return {
    jobStatus,
    isStarting,
    isPolling,
    startSync,
    cancelSync,
    clearJob,
  };
}
