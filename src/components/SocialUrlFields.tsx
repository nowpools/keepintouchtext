import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { SocialLinkButton } from '@/components/SocialLinkButton';
import { SocialPlatform, SocialPlatformSettings, Contact } from '@/types/contact';
import { 
  Linkedin, 
  Twitter, 
  Youtube, 
  Instagram, 
  Facebook,
  Github,
  Hash,
  Camera,
  MessageCircle,
  Tv,
  Send,
  Pencil
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Platform configuration with base URLs
const platformConfig: Record<SocialPlatform, { 
  icon: LucideIcon; 
  label: string; 
  placeholder: string;
  urlKey: keyof Contact;
  baseUrl: string | null; // null means free-form input
}> = {
  linkedin: { icon: Linkedin, label: 'LinkedIn', placeholder: 'username', urlKey: 'linkedinUrl', baseUrl: 'https://linkedin.com/in/' },
  x: { icon: Twitter, label: 'X (Twitter)', placeholder: 'username', urlKey: 'xUrl', baseUrl: 'https://x.com/' },
  youtube: { icon: Youtube, label: 'YouTube', placeholder: '@channel', urlKey: 'youtubeUrl', baseUrl: 'https://youtube.com/' },
  instagram: { icon: Instagram, label: 'Instagram', placeholder: 'username', urlKey: 'instagramUrl', baseUrl: 'https://instagram.com/' },
  facebook: { icon: Facebook, label: 'Facebook', placeholder: 'username', urlKey: 'facebookUrl', baseUrl: 'https://facebook.com/' },
  tiktok: { icon: Camera, label: 'TikTok', placeholder: '@username', urlKey: 'tiktokUrl', baseUrl: 'https://tiktok.com/' },
  github: { icon: Github, label: 'GitHub', placeholder: 'username', urlKey: 'githubUrl', baseUrl: 'https://github.com/' },
  threads: { icon: Hash, label: 'Threads', placeholder: '@username', urlKey: 'threadsUrl', baseUrl: 'https://threads.net/' },
  snapchat: { icon: Camera, label: 'Snapchat', placeholder: 'username', urlKey: 'snapchatUrl', baseUrl: 'https://snapchat.com/add/' },
  pinterest: { icon: Camera, label: 'Pinterest', placeholder: 'username', urlKey: 'pinterestUrl', baseUrl: 'https://pinterest.com/' },
  reddit: { icon: MessageCircle, label: 'Reddit', placeholder: 'username', urlKey: 'redditUrl', baseUrl: 'https://reddit.com/u/' },
  discord: { icon: MessageCircle, label: 'Discord', placeholder: 'username or invite link', urlKey: 'discordUrl', baseUrl: null }, // Free-form
  twitch: { icon: Tv, label: 'Twitch', placeholder: 'username', urlKey: 'twitchUrl', baseUrl: 'https://twitch.tv/' },
  whatsapp: { icon: MessageCircle, label: 'WhatsApp', placeholder: 'phone number (e.g. 15551234567)', urlKey: 'whatsappUrl', baseUrl: 'https://wa.me/' },
  telegram: { icon: Send, label: 'Telegram', placeholder: 'username', urlKey: 'telegramUrl', baseUrl: 'https://t.me/' },
};

// Order to display platforms
const platformOrder: SocialPlatform[] = [
  'linkedin', 'x', 'youtube', 'instagram', 'facebook', 'tiktok', 
  'github', 'threads', 'snapchat', 'pinterest', 'reddit', 'discord', 
  'twitch', 'whatsapp', 'telegram'
];

// Extract handle from a full URL
const extractHandle = (url: string, baseUrl: string | null): string => {
  if (!url) return '';
  if (!baseUrl) return url; // Free-form platforms
  
  // Check if it's already just a handle (no slashes or dots suggesting a URL)
  if (!url.includes('/') && !url.includes('.')) {
    return url;
  }
  
  // Try to extract from various URL formats
  const lowerUrl = url.toLowerCase();
  const lowerBase = baseUrl.toLowerCase();
  
  // Handle with or without protocol
  const variations = [
    baseUrl,
    baseUrl.replace('https://', ''),
    baseUrl.replace('https://', 'http://'),
    baseUrl.replace('https://', 'www.'),
    baseUrl.replace('https://', 'https://www.'),
  ];
  
  for (const variant of variations) {
    const lowerVariant = variant.toLowerCase();
    if (lowerUrl.startsWith(lowerVariant)) {
      return url.slice(variant.length).replace(/\/$/, ''); // Remove trailing slash
    }
  }
  
  // If it looks like a URL but doesn't match our base, return as-is (custom URL)
  if (url.includes('http') || url.includes('.com') || url.includes('.net')) {
    return url;
  }
  
  return url;
};

// Build full URL from handle
const buildFullUrl = (handle: string, baseUrl: string | null): string => {
  if (!handle) return '';
  if (!baseUrl) return handle; // Free-form platforms
  
  // If it already looks like a full URL, return as-is
  if (handle.startsWith('http://') || handle.startsWith('https://')) {
    return handle;
  }
  
  // Clean the handle
  const cleanHandle = handle.replace(/^[@\/]+/, '').replace(/\/$/, '');
  
  return `${baseUrl}${cleanHandle}`;
};

// Check if a value is a custom URL (doesn't match base pattern)
const isCustomUrl = (url: string, baseUrl: string | null): boolean => {
  if (!url || !baseUrl) return false;
  const handle = extractHandle(url, baseUrl);
  // If after extraction, it still contains full URL patterns, it's custom
  return handle.includes('http') || (handle.includes('.') && handle.includes('/'));
};

interface SocialUrlFieldsProps {
  contact: Contact;
  visiblePlatforms: SocialPlatformSettings;
  onUpdate: (urlKey: keyof Contact, value: string) => void;
}

export const SocialUrlFields = ({ contact, visiblePlatforms, onUpdate }: SocialUrlFieldsProps) => {
  const [editedHandles, setEditedHandles] = useState<Record<string, string>>({});
  const [editFullUrl, setEditFullUrl] = useState<Record<string, boolean>>({});

  // Initialize edited handles when contact changes
  useEffect(() => {
    const handles: Record<string, string> = {};
    const fullUrlModes: Record<string, boolean> = {};
    
    platformOrder.forEach(platform => {
      const config = platformConfig[platform];
      const fullUrl = (contact[config.urlKey] as string) || '';
      const handle = extractHandle(fullUrl, config.baseUrl);
      handles[config.urlKey] = handle;
      // Auto-enable full URL mode for custom URLs
      fullUrlModes[platform] = isCustomUrl(fullUrl, config.baseUrl);
    });
    
    setEditedHandles(handles);
    setEditFullUrl(fullUrlModes);
  }, [contact.id]);

  const handleBlur = (platform: SocialPlatform, urlKey: keyof Contact) => {
    const config = platformConfig[platform];
    const currentValue = (contact[urlKey] as string) || '';
    const editedHandle = editedHandles[urlKey] || '';
    
    // Build full URL from handle (unless in full URL edit mode)
    const newValue = editFullUrl[platform] 
      ? editedHandle 
      : buildFullUrl(editedHandle, config.baseUrl);
    
    if (newValue !== currentValue) {
      onUpdate(urlKey, newValue);
    }
  };

  const handleChange = (platform: SocialPlatform, urlKey: string, value: string) => {
    const config = platformConfig[platform];
    
    // If pasting a full URL, extract the handle (unless in full URL mode)
    if (!editFullUrl[platform] && config.baseUrl && (value.includes('http') || value.includes('.com'))) {
      const handle = extractHandle(value, config.baseUrl);
      // If extraction returned the full URL, switch to full URL mode
      if (isCustomUrl(value, config.baseUrl)) {
        setEditFullUrl(prev => ({ ...prev, [platform]: true }));
        setEditedHandles(prev => ({ ...prev, [urlKey]: value }));
        return;
      }
      setEditedHandles(prev => ({ ...prev, [urlKey]: handle }));
      return;
    }
    
    setEditedHandles(prev => ({ ...prev, [urlKey]: value }));
  };

  const toggleFullUrlMode = (platform: SocialPlatform, urlKey: keyof Contact) => {
    const config = platformConfig[platform];
    const isEnteringFullMode = !editFullUrl[platform];
    
    setEditFullUrl(prev => ({ ...prev, [platform]: isEnteringFullMode }));
    
    if (isEnteringFullMode) {
      // Convert handle to full URL for editing
      const handle = editedHandles[urlKey] || '';
      const fullUrl = buildFullUrl(handle, config.baseUrl);
      setEditedHandles(prev => ({ ...prev, [urlKey]: fullUrl }));
    } else {
      // Convert full URL back to handle
      const fullUrl = editedHandles[urlKey] || '';
      const handle = extractHandle(fullUrl, config.baseUrl);
      setEditedHandles(prev => ({ ...prev, [urlKey]: handle }));
    }
  };

  // Only show platforms that are enabled in settings
  const enabledPlatforms = platformOrder.filter(platform => visiblePlatforms[platform]);

  if (enabledPlatforms.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No social platforms enabled. Enable them in Settings → Social Media Platforms.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {enabledPlatforms.map(platform => {
        const config = platformConfig[platform];
        const Icon = config.icon;
        const handleValue = editedHandles[config.urlKey] || '';
        const isFullUrlMode = editFullUrl[platform] || !config.baseUrl;
        const fullUrl = isFullUrlMode ? handleValue : buildFullUrl(handleValue, config.baseUrl);

        return (
          <div key={platform} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Icon className="w-4 h-4" />
                <span>{config.label}</span>
              </div>
              <div className="flex items-center gap-1">
                {config.baseUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => toggleFullUrlMode(platform, config.urlKey)}
                    title={isFullUrlMode ? "Switch to handle mode" : "Edit full URL"}
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    {isFullUrlMode ? "Handle" : "Full URL"}
                  </Button>
                )}
                <SocialLinkButton url={fullUrl || undefined} platform={platform} />
              </div>
            </div>
            
            {isFullUrlMode ? (
              <Input
                value={handleValue}
                onChange={(e) => handleChange(platform, config.urlKey, e.target.value)}
                onBlur={() => handleBlur(platform, config.urlKey)}
                placeholder={config.baseUrl ? `${config.baseUrl}${config.placeholder}` : config.placeholder}
                type="url"
              />
            ) : (
              <div className="flex">
                <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm whitespace-nowrap">
                  {config.baseUrl}
                </div>
                <Input
                  value={handleValue}
                  onChange={(e) => handleChange(platform, config.urlKey, e.target.value)}
                  onBlur={() => handleBlur(platform, config.urlKey)}
                  placeholder={config.placeholder}
                  className={cn("rounded-l-none")}
                />
              </div>
            )}
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">
        Just enter the username/handle - the URL prefix is added automatically. Click "Full URL" to edit custom URLs.
      </p>
    </div>
  );
};
