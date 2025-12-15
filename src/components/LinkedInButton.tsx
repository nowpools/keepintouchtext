import { Button } from '@/components/ui/button';
import { Linkedin } from 'lucide-react';

interface LinkedInButtonProps {
  linkedinUrl: string | null;
}

export const LinkedInButton = ({ linkedinUrl }: LinkedInButtonProps) => {
  if (!linkedinUrl) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Opens in new tab, or LinkedIn app if installed on mobile
    window.open(linkedinUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      title="Open LinkedIn Profile"
      className="h-8 w-8"
    >
      <Linkedin className="w-4 h-4 text-[#0A66C2]" />
    </Button>
  );
};
