import { useState, useEffect, useMemo } from 'react';
import { DailyContact, CADENCE_LABELS, SocialPlatform } from '@/types/contact';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageSquare, 
  Check, 
  Clock, 
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Settings
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAIMessage } from '@/hooks/useAIMessage';
import { SocialLinkButton } from '@/components/SocialLinkButton';
import { EditablePhone } from '@/components/EditablePhone';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Link } from 'react-router-dom';

// Map platform keys to their contact URL property names
const platformToUrlKey: Record<SocialPlatform, keyof DailyContact | null> = {
  linkedin: 'linkedinUrl',
  x: 'xUrl',
  youtube: 'youtubeUrl',
  facebook: 'facebookUrl',
  instagram: 'instagramUrl',
  tiktok: 'tiktokUrl',
  github: 'githubUrl',
  threads: 'threadsUrl',
  snapchat: 'snapchatUrl',
  pinterest: 'pinterestUrl',
  reddit: 'redditUrl',
  discord: 'discordUrl',
  twitch: 'twitchUrl',
  whatsapp: 'whatsappUrl',
  telegram: 'telegramUrl',
};

interface ContactCardProps {
  contact: DailyContact;
  onComplete: (id: string) => void;
  onSnooze: (id: string) => void;
  onUpdateDraft: (id: string, draft: string) => void;
  onUpdatePhone: (id: string, phone: string, googleId: string | null, shouldSyncToGoogle: boolean) => Promise<void>;
  onNameClick?: (contact: DailyContact) => void;
  canSyncToGoogle: boolean;
  index: number;
}

export const ContactCard = ({ 
  contact, 
  onComplete, 
  onSnooze, 
  onUpdateDraft,
  onUpdatePhone,
  onNameClick,
  canSyncToGoogle,
  index 
}: ContactCardProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [draft, setDraft] = useState(contact.aiDraft || '');
  const [showConfirm, setShowConfirm] = useState(false);
  const { generateMessage, isGenerating } = useAIMessage();
  const { settings } = useAppSettings();

  const visiblePlatforms = settings.visibleSocialPlatforms;

  const handlePhoneSave = async (newPhone: string) => {
    await onUpdatePhone(contact.id, newPhone, contact.googleId || null, canSyncToGoogle);
  };

  // Get platforms that are both enabled AND have a URL
  const enabledPlatformsWithUrls = useMemo(() => {
    const platforms: { platform: SocialPlatform; url: string }[] = [];
    
    (Object.keys(visiblePlatforms) as SocialPlatform[]).forEach((platform) => {
      if (!visiblePlatforms[platform]) return; // Not enabled in settings
      
      const urlKey = platformToUrlKey[platform];
      if (urlKey) {
        const url = contact[urlKey];
        if (url && typeof url === 'string') {
          platforms.push({ platform, url });
        }
      }
    });
    
    return platforms;
  }, [visiblePlatforms, contact]);

  const hasAnyPlatformEnabled = Object.values(visiblePlatforms).some(v => v);
  const hasAnySocialUrl = contact.linkedinUrl || contact.xUrl || contact.youtubeUrl || 
    contact.instagramUrl || contact.tiktokUrl || contact.facebookUrl || contact.githubUrl ||
    contact.threadsUrl || contact.snapchatUrl || contact.pinterestUrl || contact.redditUrl ||
    contact.discordUrl || contact.twitchUrl || contact.whatsappUrl || contact.telegramUrl;

  // Auto-generate message on mount if no draft exists
  useEffect(() => {
    if (!draft && isExpanded) {
      handleGenerateMessage();
    }
  }, []);

  const handleGenerateMessage = async () => {
    const message = await generateMessage(
      contact.name,
      contact.notes,
      contact.lastContacted,
      contact.linkedinUrl,
      contact.conversationContext,
      contact.xUrl,
      contact.youtubeUrl,
      contact.surfaceReason === 'birthday'
    );
    
    if (message) {
      setDraft(message);
      onUpdateDraft(contact.id, message);
    }
  };

  const handleOpeniMessage = () => {
    const encodedMessage = encodeURIComponent(draft);
    const phoneNumber = contact.phone.replace(/\D/g, '');
    const iMessageUrl = `sms:${phoneNumber}&body=${encodedMessage}`;
    window.open(iMessageUrl, '_blank');
    
    setTimeout(() => setShowConfirm(true), 1000);
  };

  const handleConfirmSent = (sent: boolean) => {
    setShowConfirm(false);
    if (sent) {
      onComplete(contact.id);
    }
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
    onUpdateDraft(contact.id, value);
  };

  if (contact.isCompleted) {
    return (
      <Card className={cn(
        "p-4 bg-success/5 border-success/20 animate-fade-in",
      )} style={{ animationDelay: `${index * 100}ms` }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
            <Check className="w-6 h-6 text-success" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-success">{contact.name}</p>
            <p className="text-sm text-muted-foreground">Message sent! Nice work keeping in touch ✨</p>
          </div>
        </div>
      </Card>
    );
  }

  if (contact.isSnoozed) {
    return (
      <Card className={cn(
        "p-4 bg-warning/5 border-warning/20 animate-fade-in opacity-60",
      )} style={{ animationDelay: `${index * 100}ms` }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
            <Clock className="w-6 h-6 text-warning" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-warning-foreground">{contact.name}</p>
            <p className="text-sm text-muted-foreground">Snoozed until tomorrow</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        "overflow-hidden card-shadow hover:card-shadow-hover transition-all duration-300 animate-fade-in",
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <Card className="p-6 max-w-sm mx-4 card-shadow-hover animate-scale-in">
            <h3 className="text-lg font-semibold mb-2">Did you send the message?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Let us know so we can update your contact history.
            </p>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => handleConfirmSent(false)}
              >
                Not yet
              </Button>
              <Button 
                variant="success" 
                className="flex-1"
                onClick={() => handleConfirmSent(true)}
              >
                <Check className="w-4 h-4" />
                Yes, sent!
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Header */}
      <div 
        className="p-4 flex items-center gap-4 cursor-pointer hover:bg-secondary/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {contact.photo ? (
          <img 
            src={contact.photo} 
            alt={contact.name}
            className="w-14 h-14 rounded-full object-cover ring-2 ring-border"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center ${contact.photo ? 'hidden' : ''}`}>
          <span className="text-xl font-semibold text-primary">
            {contact.name.charAt(0)}
          </span>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 
            className="font-semibold text-lg truncate cursor-pointer hover:text-primary transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onNameClick?.(contact);
            }}
          >
            {contact.name}
          </h3>
          <EditablePhone 
            phone={contact.phone} 
            onSave={handlePhoneSave}
          />
        </div>

        <div className="flex items-center gap-1">
          {enabledPlatformsWithUrls.length > 0 ? (
            <>
              {enabledPlatformsWithUrls.map(({ platform, url }) => (
                <SocialLinkButton key={platform} url={url} platform={platform} />
              ))}
            </>
          ) : hasAnySocialUrl && !hasAnyPlatformEnabled ? (
            <Link 
              to="/settings" 
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mr-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Settings className="w-3 h-3" />
              <span>Enable social links in Settings</span>
            </Link>
          ) : null}
          <Badge variant="secondary" className="text-xs">
            {CADENCE_LABELS[contact.cadence]}
          </Badge>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 animate-fade-in">
          {/* Meta Info */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>
                Last: {contact.lastContacted 
                  ? formatDistanceToNow(contact.lastContacted, { addSuffix: true })
                  : 'Never'}
              </span>
            </div>
          </div>

          {/* Notes */}
          {contact.notes && (
            <div className="p-3 bg-secondary/50 rounded-lg">
              <p className="text-sm text-secondary-foreground leading-relaxed">
                {contact.notes}
              </p>
            </div>
          )}

          {/* AI Draft */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Suggested message</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleGenerateMessage();
                }}
                disabled={isGenerating}
                className="h-7 text-xs"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Generating...' : 'Regenerate'}
              </Button>
            </div>
            <Textarea
              value={draft}
              onChange={(e) => handleDraftChange(e.target.value)}
              className="min-h-[100px] resize-none bg-card"
              placeholder={isGenerating ? "Generating message..." : "Write your message..."}
              disabled={isGenerating}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="imessage"
              className="flex-1"
              onClick={handleOpeniMessage}
              disabled={!draft || !contact.phone}
            >
              <MessageSquare className="w-4 h-4" />
              Open in iMessage
            </Button>
            <Button
              variant="success"
              size="icon"
              onClick={() => onComplete(contact.id)}
              title="Mark as done"
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              variant="warning"
              size="icon"
              onClick={() => onSnooze(contact.id)}
              title="Snooze until tomorrow"
            >
              <Clock className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
