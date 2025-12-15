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

export const SocialLinkButton = ({ url, platform, isVisible = true }: SocialLinkButtonProps) => {
  if (!url || !isVisible) return null;

  const config = platformConfig[platform];
  const Icon = config.icon;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
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