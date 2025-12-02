import { useState, useEffect } from 'react';
import { Contact } from '@/types/contact';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  MessageSquare, 
  Check, 
  Calendar,
  Sparkles,
  RefreshCw,
  Phone,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAIMessage } from '@/hooks/useAIMessage';

interface SendTextDialogProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (contactId: string) => void;
  showSnooze?: boolean;
  onSnooze?: (contactId: string) => void;
}

export const SendTextDialog = ({
  contact,
  open,
  onOpenChange,
  onComplete,
  showSnooze = false,
  onSnooze,
}: SendTextDialogProps) => {
  const [draft, setDraft] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const { generateMessage, isGenerating } = useAIMessage();

  // Generate message when dialog opens
  useEffect(() => {
    if (open && contact) {
      handleGenerateMessage();
    } else if (!open) {
      setDraft('');
      setShowConfirm(false);
    }
  }, [open, contact?.id]);

  const handleGenerateMessage = async () => {
    if (!contact) return;
    
    const message = await generateMessage(
      contact.name,
      contact.notes,
      contact.lastContacted,
      contact.linkedinUrl,
      contact.conversationContext
    );
    
    if (message) {
      setDraft(message);
    }
  };

  const handleOpeniMessage = () => {
    if (!contact) return;
    
    const encodedMessage = encodeURIComponent(draft);
    const phoneNumber = contact.phone.replace(/\D/g, '');
    const iMessageUrl = `sms:${phoneNumber}&body=${encodedMessage}`;
    window.open(iMessageUrl, '_blank');
    
    setTimeout(() => setShowConfirm(true), 1000);
  };

  const handleConfirmSent = (sent: boolean) => {
    setShowConfirm(false);
    if (sent && contact) {
      onComplete(contact.id);
      onOpenChange(false);
    }
  };

  if (!contact) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {/* Confirmation Overlay */}
        {showConfirm && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg animate-fade-in">
            <Card className="p-6 max-w-sm mx-4 card-shadow-hover">
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

        <DialogHeader>
          <div className="flex items-center gap-4">
            {contact.photo ? (
              <img 
                src={contact.photo} 
                alt={contact.name}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-border"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xl font-semibold text-primary">
                  {contact.name.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <DialogTitle className="text-xl">{contact.name}</DialogTitle>
              <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>{contact.phone || 'No phone'}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Last Contacted */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Last contacted:</span>
            <span className="font-medium">
              {contact.lastContacted 
                ? formatDistanceToNow(contact.lastContacted, { addSuffix: true })
                : 'Never'}
            </span>
          </div>

          {/* Notes preview */}
          {contact.notes && (
            <div className="p-3 bg-secondary/50 rounded-lg">
              <p className="text-sm text-secondary-foreground leading-relaxed line-clamp-2">
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
                onClick={handleGenerateMessage}
                disabled={isGenerating}
                className="h-7 text-xs"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Generating...' : 'Regenerate'}
              </Button>
            </div>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-[100px] resize-none bg-card"
              placeholder={isGenerating ? "Generating message..." : "Write your message..."}
              disabled={isGenerating}
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
              onClick={() => {
                onComplete(contact.id);
                onOpenChange(false);
              }}
              title="Mark as done"
            >
              <Check className="w-4 h-4" />
            </Button>
            {showSnooze && onSnooze && (
              <Button
                variant="warning"
                size="icon"
                onClick={() => {
                  onSnooze(contact.id);
                  onOpenChange(false);
                }}
                title="Snooze until tomorrow"
              >
                <Clock className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
