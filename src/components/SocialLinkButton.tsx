import { Button } from '@/components/ui/button';
import { Linkedin, Twitter, Youtube } from 'lucide-react';

type SocialPlatform = 'linkedin' | 'x' | 'youtube';

interface SocialLinkButtonProps {
  url: string | null | undefined;
  platform: SocialPlatform;
}

const platformConfig = {
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
};

export const SocialLinkButton = ({ url, platform }: SocialLinkButtonProps) => {
  if (!url) return null;

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
