import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SocialLinkButton } from '@/components/SocialLinkButton';
import { SocialPlatform, Contact } from '@/types/contact';
import { LucideIcon, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SocialUrlEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: SocialPlatform;
  config: {
    icon: LucideIcon;
    label: string;
    placeholder: string;
    urlKey: keyof Contact;
    baseUrl: string | null;
  };
  currentValue: string;
  onSave: (urlKey: keyof Contact, value: string) => void;
}

// Extract handle from a full URL
const extractHandle = (url: string, baseUrl: string | null): string => {
  if (!url) return '';
  if (!baseUrl) return url;
  
  if (!url.includes('/') && !url.includes('.')) {
    return url;
  }
  
  const variations = [
    baseUrl,
    baseUrl.replace('https://', ''),
    baseUrl.replace('https://', 'http://'),
    baseUrl.replace('https://', 'www.'),
    baseUrl.replace('https://', 'https://www.'),
  ];
  
  for (const variant of variations) {
    const lowerVariant = variant.toLowerCase();
    if (url.toLowerCase().startsWith(lowerVariant)) {
      return url.slice(variant.length).replace(/\/$/, '');
    }
  }
  
  if (url.includes('http') || url.includes('.com') || url.includes('.net')) {
    return url;
  }
  
  return url;
};

// Build full URL from handle
const buildFullUrl = (handle: string, baseUrl: string | null): string => {
  if (!handle) return '';
  if (!baseUrl) return handle;
  
  if (handle.startsWith('http://') || handle.startsWith('https://')) {
    return handle;
  }
  
  const cleanHandle = handle.replace(/^[@\/]+/, '').replace(/\/$/, '');
  return `${baseUrl}${cleanHandle}`;
};

// Check if a value is a custom URL
const isCustomUrl = (url: string, baseUrl: string | null): boolean => {
  if (!url || !baseUrl) return false;
  const handle = extractHandle(url, baseUrl);
  return handle.includes('http') || (handle.includes('.') && handle.includes('/'));
};

export const SocialUrlEditDialog = ({
  open,
  onOpenChange,
  platform,
  config,
  currentValue,
  onSave,
}: SocialUrlEditDialogProps) => {
  const [editedHandle, setEditedHandle] = useState('');
  const [isFullUrlMode, setIsFullUrlMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const Icon = config.icon;

  useEffect(() => {
    if (open) {
      const handle = extractHandle(currentValue, config.baseUrl);
      const shouldUseFullUrl = isCustomUrl(currentValue, config.baseUrl) || !config.baseUrl;
      setIsFullUrlMode(shouldUseFullUrl);
      setEditedHandle(shouldUseFullUrl ? currentValue : handle);
      
      // Focus input after dialog opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
    
    // Cleanup timeout on unmount or close
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [open, currentValue, config.baseUrl]);

  // Auto-save with debounce
  const autoSave = (value: string, fullUrlMode: boolean) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      const newValue = fullUrlMode
        ? value
        : buildFullUrl(value, config.baseUrl);
      onSave(config.urlKey, newValue);
    }, 500);
  };

  const handleChange = (value: string) => {
    // If pasting a full URL, extract the handle (unless in full URL mode)
    if (!isFullUrlMode && config.baseUrl && (value.includes('http') || value.includes('.com'))) {
      const handle = extractHandle(value, config.baseUrl);
      if (isCustomUrl(value, config.baseUrl)) {
        setIsFullUrlMode(true);
        setEditedHandle(value);
        autoSave(value, true);
        return;
      }
      setEditedHandle(handle);
      autoSave(handle, false);
      return;
    }
    setEditedHandle(value);
    autoSave(value, isFullUrlMode);
  };

  const toggleFullUrlMode = () => {
    if (isFullUrlMode) {
      // Convert full URL back to handle
      const handle = extractHandle(editedHandle, config.baseUrl);
      setEditedHandle(handle);
      autoSave(handle, false);
    } else {
      // Convert handle to full URL
      const fullUrl = buildFullUrl(editedHandle, config.baseUrl);
      setEditedHandle(fullUrl);
      autoSave(fullUrl, true);
    }
    setIsFullUrlMode(!isFullUrlMode);
  };

  const fullUrl = isFullUrlMode ? editedHandle : buildFullUrl(editedHandle, config.baseUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md top-[25%] translate-y-0 sm:top-[50%] sm:-translate-y-1/2">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            Edit {config.label}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="social-input">
                {isFullUrlMode ? 'Full URL' : 'Username / Handle'}
              </Label>
              <div className="flex items-center gap-2">
                {config.baseUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={toggleFullUrlMode}
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    {isFullUrlMode ? 'Handle Mode' : 'Full URL Mode'}
                  </Button>
                )}
                <SocialLinkButton url={fullUrl || undefined} platform={platform} />
              </div>
            </div>

            {isFullUrlMode ? (
              <Input
                ref={inputRef}
                id="social-input"
                value={editedHandle}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={config.baseUrl ? `${config.baseUrl}${config.placeholder}` : config.placeholder}
                type="url"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onOpenChange(false);
                  }
                }}
              />
            ) : (
              <div className="flex">
                <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm whitespace-nowrap">
                  {config.baseUrl}
                </div>
                <Input
                  ref={inputRef}
                  id="social-input"
                  value={editedHandle}
                  onChange={(e) => handleChange(e.target.value)}
                  placeholder={config.placeholder}
                  className="rounded-l-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onOpenChange(false);
                    }
                  }}
                />
              </div>
            )}
          </div>

          {fullUrl && (
            <p className="text-xs text-muted-foreground break-all">
              Preview: {fullUrl}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
