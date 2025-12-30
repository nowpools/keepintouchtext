import { cn } from '@/lib/utils';

interface ProgressBarProps {
  completed: number;
  total: number;
  className?: string;
}

export const ProgressBar = ({ completed, total, className }: ProgressBarProps) => {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  const isComplete = completed === total && total > 0;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {isComplete ? (
            <span className="text-success">All done for today! 🎉</span>
          ) : (
            <span className="text-muted-foreground">Reminder Progress</span>
          )}
        </span>
        <span className={cn(
          "font-semibold",
          isComplete ? "text-success" : "text-foreground"
        )}>
          {completed} / {total}
        </span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            isComplete ? "bg-success" : "bg-primary"
          )}
          style={{ 
            width: `${percentage}%`,
            '--progress-width': `${percentage}%`
          } as React.CSSProperties}
        />
      </div>
      {!isComplete && completed > 0 && (
        <p className="text-xs text-muted-foreground">
          {total - completed} more to go – you've got this! 💪
        </p>
      )}
    </div>
  );
};
