import { Flame, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreakIndicatorProps {
  currentStreak: number;
  longestStreak: number;
  className?: string;
}

export const StreakIndicator = ({ currentStreak, longestStreak, className }: StreakIndicatorProps) => {
  const isActive = currentStreak > 0;
  
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full transition-all',
        isActive 
          ? 'bg-accent/20 text-accent' 
          : 'bg-muted text-muted-foreground'
      )}>
        <Flame className={cn(
          'w-5 h-5',
          isActive && 'animate-pulse'
        )} />
        <span className="font-bold text-lg">{currentStreak}</span>
        <span className="text-sm">day{currentStreak !== 1 ? 's' : ''}</span>
      </div>
      
      {longestStreak > 0 && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Trophy className="w-4 h-4" />
          <span>Best: {longestStreak}</span>
        </div>
      )}
    </div>
  );
};
