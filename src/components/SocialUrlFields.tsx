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
  Send
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

// Platform configuration
const platformConfig: Record<SocialPlatform, { 
  icon: LucideIcon; 
  label: string; 
  placeholder: string;
  urlKey: keyof Contact;
}> = {
  linkedin: { icon: Linkedin, label: 'LinkedIn', placeholder: 'https://linkedin.com/in/username', urlKey: 'linkedinUrl' },
  x: { icon: Twitter, label: 'X (Twitter)', placeholder: 'https://x.com/username', urlKey: 'xUrl' },
  youtube: { icon: Youtube, label: 'YouTube', placeholder: 'https://youtube.com/@channel', urlKey: 'youtubeUrl' },
  instagram: { icon: Instagram, label: 'Instagram', placeholder: 'https://instagram.com/username', urlKey: 'instagramUrl' },
  facebook: { icon: Facebook, label: 'Facebook', placeholder: 'https://facebook.com/username', urlKey: 'facebookUrl' },
  tiktok: { icon: Camera, label: 'TikTok', placeholder: 'https://tiktok.com/@username', urlKey: 'tiktokUrl' },
  github: { icon: Github, label: 'GitHub', placeholder: 'https://github.com/username', urlKey: 'githubUrl' },
  threads: { icon: Hash, label: 'Threads', placeholder: 'https://threads.net/@username', urlKey: 'threadsUrl' },
  snapchat: { icon: Camera, label: 'Snapchat', placeholder: 'https://snapchat.com/add/username', urlKey: 'snapchatUrl' },
  pinterest: { icon: Camera, label: 'Pinterest', placeholder: 'https://pinterest.com/username', urlKey: 'pinterestUrl' },
  reddit: { icon: MessageCircle, label: 'Reddit', placeholder: 'https://reddit.com/u/username', urlKey: 'redditUrl' },
  discord: { icon: MessageCircle, label: 'Discord', placeholder: 'Discord username or invite link', urlKey: 'discordUrl' },
  twitch: { icon: Tv, label: 'Twitch', placeholder: 'https://twitch.tv/username', urlKey: 'twitchUrl' },
  whatsapp: { icon: MessageCircle, label: 'WhatsApp', placeholder: 'https://wa.me/phonenumber', urlKey: 'whatsappUrl' },
  telegram: { icon: Send, label: 'Telegram', placeholder: 'https://t.me/username', urlKey: 'telegramUrl' },
};

// Order to display platforms
const platformOrder: SocialPlatform[] = [
  'linkedin', 'x', 'youtube', 'instagram', 'facebook', 'tiktok', 
  'github', 'threads', 'snapchat', 'pinterest', 'reddit', 'discord', 
  'twitch', 'whatsapp', 'telegram'
];

interface SocialUrlFieldsProps {
  contact: Contact;
  visiblePlatforms: SocialPlatformSettings;
  onUpdate: (urlKey: keyof Contact, value: string) => void;
}

export const SocialUrlFields = ({ contact, visiblePlatforms, onUpdate }: SocialUrlFieldsProps) => {
  const [editedUrls, setEditedUrls] = useState<Record<string, string>>({});

  // Initialize edited URLs when contact changes
  useEffect(() => {
    const urls: Record<string, string> = {};
    platformOrder.forEach(platform => {
      const config = platformConfig[platform];
      urls[config.urlKey] = (contact[config.urlKey] as string) || '';
    });
    setEditedUrls(urls);
  }, [contact.id]);

  const handleBlur = (urlKey: keyof Contact) => {
    const currentValue = (contact[urlKey] as string) || '';
    const editedValue = editedUrls[urlKey] || '';
    if (editedValue !== currentValue) {
      onUpdate(urlKey, editedValue);
    }
  };

  const handleChange = (urlKey: string, value: string) => {
    setEditedUrls(prev => ({ ...prev, [urlKey]: value }));
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
        const urlValue = editedUrls[config.urlKey] || '';

        return (
          <div key={platform} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Icon className="w-4 h-4" />
                <span>{config.label}</span>
              </div>
              <SocialLinkButton url={urlValue || undefined} platform={platform} />
            </div>
            <Input
              value={urlValue}
              onChange={(e) => handleChange(config.urlKey, e.target.value)}
              onBlur={() => handleBlur(config.urlKey)}
              placeholder={config.placeholder}
              type="url"
            />
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">
        Click the icons to view their profiles and gather context for personalized messages
      </p>
    </div>
  );
};
