import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, CheckCircle2, AlertCircle, Loader2, Clock, XCircle } from 'lucide-react';
import { SyncJobStatus } from '@/hooks/useSyncJob';
import { formatDistanceToNow } from 'date-fns';

interface SyncProgressCardProps {
  jobStatus: SyncJobStatus;
  onCancel: () => void;
  onDismiss: () => void;
  isCanceling?: boolean;
}

export function SyncProgressCard({ 
  jobStatus, 
  onCancel, 
  onDismiss,
  isCanceling = false,
}: SyncProgressCardProps) {
  const { status, progress_done, progress_total_estimate, error_message, started_at, finished_at } = jobStatus;

  const isActive = status === 'queued' || status === 'running';
  const isComplete = status === 'completed';
  const isFailed = status === 'failed';
  const isCanceled = status === 'canceled';

  // Calculate progress percentage
  const progressPercent = progress_total_estimate && progress_total_estimate > 0
    ? Math.min(100, Math.round((progress_done / progress_total_estimate) * 100))
    : null;

  const getStatusIcon = () => {
    switch (status) {
      case 'queued':
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'canceled':
        return <XCircle className="w-4 h-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'queued':
        return <Badge variant="secondary">Queued</Badge>;
      case 'running':
        return <Badge variant="default">Syncing</Badge>;
      case 'completed':
        return <Badge variant="outline" className="border-green-500 text-green-600">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'canceled':
        return <Badge variant="outline">Canceled</Badge>;
      default:
        return null;
    }
  };

  const getTimeInfo = () => {
    if (finished_at) {
      return `Finished ${formatDistanceToNow(new Date(finished_at), { addSuffix: true })}`;
    }
    if (started_at) {
      return `Started ${formatDistanceToNow(new Date(started_at), { addSuffix: true })}`;
    }
    return 'Waiting to start...';
  };

  return (
    <div className="p-4 rounded-lg border bg-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium text-sm">Google Contacts Sync</span>
          {getStatusBadge()}
        </div>
        {!isActive && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onDismiss}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Progress bar */}
      {isActive && (
        <div className="space-y-2">
          {progressPercent !== null ? (
            <>
              <Progress value={progressPercent} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{progress_done} contacts synced</span>
                <span>{progressPercent}%</span>
              </div>
            </>
          ) : (
            <>
              <Progress value={undefined} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {progress_done > 0 ? `${progress_done} contacts synced...` : 'Starting sync...'}
              </p>
            </>
          )}
        </div>
      )}

      {/* Completed state */}
      {isComplete && (
        <p className="text-sm text-green-600">
          Successfully synced {progress_done} contacts!
        </p>
      )}

      {/* Failed state */}
      {isFailed && (
        <div className="space-y-1">
          <p className="text-sm text-destructive">
            {error_message || 'Sync failed. Please try again.'}
          </p>
        </div>
      )}

      {/* Canceled state */}
      {isCanceled && (
        <p className="text-sm text-muted-foreground">
          Sync was canceled. {progress_done > 0 ? `${progress_done} contacts were synced.` : ''}
        </p>
      )}

      {/* Time info and actions */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-muted-foreground">{getTimeInfo()}</span>
        {isActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isCanceling}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            {isCanceling ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : null}
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
