import { WifiOff } from 'lucide-react';

interface OfflineBannerProps {
  cacheTimestamp?: number | null;
}

export function OfflineBanner({ cacheTimestamp }: OfflineBannerProps) {
  const formatCacheTime = () => {
    if (!cacheTimestamp) return '';
    
    const now = Date.now();
    const diff = now - cacheTimestamp;
    
    if (diff < 60000) {
      return 'just now';
    } else if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `${mins} minute${mins > 1 ? 's' : ''} ago`;
    } else if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diff / 86400000);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-warning/10 border border-warning/20 text-warning animate-fade-in">
      <WifiOff className="w-4 h-4 shrink-0" />
      <p className="text-sm">
        You're offline. Showing your saved Today list
        {cacheTimestamp && (
          <span className="text-muted-foreground"> (cached {formatCacheTime()})</span>
        )}
      </p>
    </div>
  );
}
