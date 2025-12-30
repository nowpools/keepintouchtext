import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { SocialLinkButton } from '@/components/SocialLinkButton';
import { SocialPlatform, SocialPlatformSettings, Contact } from '@/types/contact';
import { SocialUrlEditDialog } from '@/components/SocialUrlEditDialog';
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
  Send
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Platform configuration with base URLs
const platformConfig: Record<SocialPlatform, { 
  icon: LucideIcon; 
  label: string; 
  placeholder: string;
  urlKey: keyof Contact;
  baseUrl: string | null;
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
  discord: { icon: MessageCircle, label: 'Discord', placeholder: 'username or invite link', urlKey: 'discordUrl', baseUrl: null },
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

interface SocialUrlFieldsProps {
  contact: Contact;
  visiblePlatforms: SocialPlatformSettings;
  onUpdate: (urlKey: keyof Contact, value: string) => void;
}

export const SocialUrlFields = ({ contact, visiblePlatforms, onUpdate }: SocialUrlFieldsProps) => {
  const [editingPlatform, setEditingPlatform] = useState<SocialPlatform>('linkedin');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Only show platforms that are enabled in settings
  const enabledPlatforms = platformOrder.filter(platform => visiblePlatforms[platform]);

  if (enabledPlatforms.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No social platforms enabled. Enable them in Settings → Social Media Platforms.
      </p>
    );
  }

  const handleSave = (urlKey: keyof Contact, value: string) => {
    onUpdate(urlKey, value);
  };

  const openEditor = (platform: SocialPlatform) => {
    setEditingPlatform(platform);
    // Small delay to ensure state is set before opening
    setTimeout(() => setDialogOpen(true), 10);
  };

  return (
    <div className="space-y-3">
      {enabledPlatforms.map(platform => {
        const config = platformConfig[platform];
        const Icon = config.icon;
        const currentValue = (contact[config.urlKey] as string) || '';
        const handle = extractHandle(currentValue, config.baseUrl);
        const displayValue = handle || 'Not set';

        return (
          <button
            key={platform}
            type="button"
            className="w-full flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors text-left"
            onClick={() => openEditor(platform)}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Icon className="w-5 h-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-medium">{config.label}</p>
                <p className={cn(
                  "text-xs truncate",
                  handle ? "text-foreground" : "text-muted-foreground"
                )}>
                  {displayValue}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <SocialLinkButton url={currentValue || undefined} platform={platform} />
            </div>
          </button>
        );
      })}

      {/* Edit Dialog - Always mounted */}
      <SocialUrlEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        platform={editingPlatform}
        config={platformConfig[editingPlatform]}
        currentValue={(contact[platformConfig[editingPlatform].urlKey] as string) || ''}
        onSave={handleSave}
      />

      <p className="text-xs text-muted-foreground pt-2">
        Tap any platform to edit. Just enter the username - the URL prefix is added automatically.
      </p>
    </div>
  );
};
