import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, MessageSquare, Check, Loader2, RefreshCw } from 'lucide-react';
import { useAIMessage } from '@/hooks/useAIMessage';
import type { ContactWithLinks } from '@/types/contacts';
import { toast } from '@/hooks/use-toast';

interface SendTextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: ContactWithLinks;
  phoneNumber: string;
  onMarkContacted?: (contactId: string) => void;
  isBirthday?: boolean;
}

export function SendTextDialog({
  open,
  onOpenChange,
  contact,
  phoneNumber,
  onMarkContacted,
  isBirthday = false,
}: SendTextDialogProps) {
  const [message, setMessage] = useState('');
  const { generateMessage, isGenerating } = useAIMessage();

  // Auto-generate message when dialog opens
  useEffect(() => {
    if (open && !message) {
      handleGenerate();
    }
  }, [open]);

  const handleGenerate = async () => {
    const result = await generateMessage(
      contact.display_name,
      contact.notes,
      contact.last_contacted ? new Date(contact.last_contacted) : null,
      contact.linkedin_url,
      contact.conversation_context,
      contact.x_url,
      contact.youtube_url,
      isBirthday
    );
    if (result) {
      setMessage(result);
    }
  };

  const handleOpenInMessages = () => {
    // Format phone number for SMS URL
    const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
    const encodedMessage = encodeURIComponent(message);
    
    // Use sms: protocol with body parameter
    // iOS uses &body= syntax
    const smsUrl = `sms:${cleanPhone}&body=${encodedMessage}`;
    
    window.location.href = smsUrl;
    
    // Mark as contacted
    if (onMarkContacted) {
      onMarkContacted(contact.id);
    }
    
    toast({
      title: 'Opening Messages',
      description: 'Your message has been prepared',
    });
    
    onOpenChange(false);
    setMessage('');
  };

  const handleMarkContacted = () => {
    if (onMarkContacted) {
      onMarkContacted(contact.id);
    }
    toast({
      title: 'Marked as contacted',
      description: `${contact.display_name} has been marked as contacted`,
    });
    onOpenChange(false);
    setMessage('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            {isBirthday ? `Birthday Message for ${contact.display_name}` : `Message ${contact.display_name}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isGenerating ? 'Generating message...' : 'Your message...'}
              className="min-h-[120px] resize-none pr-10"
              disabled={isGenerating}
            />
            {isGenerating && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-md">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleMarkContacted}
            className="gap-2"
          >
            <Check className="w-4 h-4" />
            Mark Contacted
          </Button>
          <Button
            onClick={handleOpenInMessages}
            disabled={!message.trim()}
            className="gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Open in Messages
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
