import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Linkedin, Twitter, Youtube } from 'lucide-react';

interface SocialUrlFieldsProps {
  linkedinUrl: string;
  xUrl: string;
  youtubeUrl: string;
  onChange: (field: 'linkedin_url' | 'x_url' | 'youtube_url', value: string) => void;
}

export function SocialUrlFields({ linkedinUrl, xUrl, youtubeUrl, onChange }: SocialUrlFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Linkedin className="w-4 h-4 text-[#0077B5]" />
          LinkedIn Profile
        </Label>
        <Input
          value={linkedinUrl}
          onChange={(e) => onChange('linkedin_url', e.target.value)}
          placeholder="https://linkedin.com/in/username"
          type="url"
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Twitter className="w-4 h-4" />
          X / Twitter
        </Label>
        <Input
          value={xUrl}
          onChange={(e) => onChange('x_url', e.target.value)}
          placeholder="https://x.com/username"
          type="url"
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Youtube className="w-4 h-4 text-[#FF0000]" />
          YouTube Channel
        </Label>
        <Input
          value={youtubeUrl}
          onChange={(e) => onChange('youtube_url', e.target.value)}
          placeholder="https://youtube.com/@channel"
          type="url"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Adding social profiles helps the AI generate more relevant and personalized messages
        by understanding your contact's professional context and recent activity.
      </p>
    </div>
  );
}
