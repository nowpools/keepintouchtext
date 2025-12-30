import { Button } from '@/components/ui/button';
import { Linkedin, Twitter, Youtube, Facebook, Instagram, Github, MessageCircle, Send, Camera, Hash } from 'lucide-react';
import { SocialPlatform } from '@/types/contact';

interface SocialLinkButtonProps {
  url: string | null | undefined;
  platform: SocialPlatform;
  isVisible?: boolean;
}

const platformConfig: Record<SocialPlatform, { icon: React.ComponentType<{ className?: string }>; color: string; title: string }> = {
  linkedin: {
    icon: Linkedin,
    color: 'text-[#0A66C2]',
    title: 'Open LinkedIn Profile',
  },
  x: {
    icon: Twitter,
    color: 'text-foreground',
    title: 'Open X Profile',
  },
  youtube: {
    icon: Youtube,
    color: 'text-[#FF0000]',
    title: 'Open YouTube Channel',
  },
  facebook: {
    icon: Facebook,
    color: 'text-[#1877F2]',
    title: 'Open Facebook Profile',
  },
  instagram: {
    icon: Instagram,
    color: 'text-[#E4405F]',
    title: 'Open Instagram Profile',
  },
  tiktok: {
    icon: Camera,
    color: 'text-foreground',
    title: 'Open TikTok Profile',
  },
  github: {
    icon: Github,
    color: 'text-foreground',
    title: 'Open GitHub Profile',
  },
  threads: {
    icon: Hash,
    color: 'text-foreground',
    title: 'Open Threads Profile',
  },
  snapchat: {
    icon: Camera,
    color: 'text-[#FFFC00]',
    title: 'Open Snapchat Profile',
  },
  pinterest: {
    icon: Camera,
    color: 'text-[#E60023]',
    title: 'Open Pinterest Profile',
  },
  reddit: {
    icon: MessageCircle,
    color: 'text-[#FF4500]',
    title: 'Open Reddit Profile',
  },
  discord: {
    icon: MessageCircle,
    color: 'text-[#5865F2]',
    title: 'Open Discord Profile',
  },
  twitch: {
    icon: Camera,
    color: 'text-[#9146FF]',
    title: 'Open Twitch Channel',
  },
  whatsapp: {
    icon: MessageCircle,
    color: 'text-[#25D366]',
    title: 'Open WhatsApp',
  },
  telegram: {
    icon: Send,
    color: 'text-[#0088CC]',
    title: 'Open Telegram',
  },
};

/**
 * Attempts to extract a username/handle from a social URL and convert to a deep link.
 * Falls back to the original URL if extraction fails.
 */
function getDeepLink(url: string, platform: SocialPlatform): string {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/').filter(Boolean);

    switch (platform) {
      case 'linkedin': {
        // linkedin.com/in/username -> linkedin://in/username
        if (pathParts[0] === 'in' && pathParts[1]) {
          return `linkedin://in/${pathParts[1]}`;
        }
        if (pathParts[0] === 'company' && pathParts[1]) {
          return `linkedin://company/${pathParts[1]}`;
        }
        return url;
      }
      case 'instagram': {
        // instagram.com/username -> instagram://user?username=username
        const username = pathParts[0];
        if (username && !['p', 'reel', 'explore'].includes(username)) {
          return `instagram://user?username=${username}`;
        }
        return url;
      }
      case 'x': {
        // x.com/username or twitter.com/username -> twitter://user?screen_name=username
        const username = pathParts[0];
        if (username && !['i', 'search', 'explore', 'home'].includes(username)) {
          return `twitter://user?screen_name=${username}`;
        }
        return url;
      }
      case 'facebook': {
        // facebook.com/username -> fb://facewebmodal/f?href=URL
        const username = pathParts[0];
        if (username && !['watch', 'groups', 'events', 'marketplace'].includes(username)) {
          return `fb://facewebmodal/f?href=${encodeURIComponent(url)}`;
        }
        return url;
      }
      case 'tiktok': {
        // tiktok.com/@username -> tiktok://user?username=username
        const username = pathParts[0];
        if (username?.startsWith('@')) {
          return `tiktok://user?sec_uid=&unique_id=${username.slice(1)}`;
        }
        return url;
      }
      case 'youtube': {
        // youtube.com/@handle or youtube.com/channel/ID
        if (pathParts[0] === 'channel' && pathParts[1]) {
          return `youtube://channel/${pathParts[1]}`;
        }
        if (pathParts[0]?.startsWith('@')) {
          return `youtube://${parsed.host}/${pathParts[0]}`;
        }
        return url;
      }
      case 'snapchat': {
        // snapchat.com/add/username -> snapchat://add/username
        if (pathParts[0] === 'add' && pathParts[1]) {
          return `snapchat://add/${pathParts[1]}`;
        }
        return url;
      }
      case 'pinterest': {
        // pinterest.com/username -> pinterest://user/username
        const username = pathParts[0];
        if (username && !['pin', 'search', 'ideas'].includes(username)) {
          return `pinterest://user/${username}`;
        }
        return url;
      }
      case 'reddit': {
        // reddit.com/user/username or reddit.com/u/username -> reddit://user/username
        if ((pathParts[0] === 'user' || pathParts[0] === 'u') && pathParts[1]) {
          return `reddit://user/${pathParts[1]}`;
        }
        return url;
      }
      case 'twitch': {
        // twitch.tv/username -> twitch://stream/username
        const username = pathParts[0];
        if (username) {
          return `twitch://stream/${username}`;
        }
        return url;
      }
      case 'telegram': {
        // t.me/username -> tg://resolve?domain=username
        const username = pathParts[0];
        if (username) {
          return `tg://resolve?domain=${username}`;
        }
        return url;
      }
      case 'whatsapp': {
        // wa.me/phone or api.whatsapp.com/send?phone=X -> whatsapp://send?phone=X
        if (parsed.host === 'wa.me' && pathParts[0]) {
          return `whatsapp://send?phone=${pathParts[0]}`;
        }
        const phone = parsed.searchParams.get('phone');
        if (phone) {
          return `whatsapp://send?phone=${phone}`;
        }
        return url;
      }
      case 'threads': {
        // threads.net/@username -> threads://user?username=username
        const username = pathParts[0];
        if (username?.startsWith('@')) {
          return `threads://user?username=${username.slice(1)}`;
        }
        return url;
      }
      case 'discord':
      case 'github':
      default:
        // These platforms don't have universal deep link schemes for profiles
        return url;
    }
  } catch {
    return url;
  }
}

export const SocialLinkButton = ({ url, platform, isVisible = true }: SocialLinkButtonProps) => {
  if (!url || !isVisible) return null;

  const config = platformConfig[platform];
  const Icon = config.icon;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const deepLink = getDeepLink(url, platform);
    // Try deep link first - if app isn't installed, browser will handle fallback
    window.location.href = deepLink;
    // Fallback to web URL after a short delay if deep link didn't work
    if (deepLink !== url) {
      setTimeout(() => {
        window.open(url, '_blank', 'noopener,noreferrer');
      }, 500);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      title={config.title}
      className="h-8 w-8"
    >
      <Icon className={`w-4 h-4 ${config.color}`} />
    </Button>
  );
};
