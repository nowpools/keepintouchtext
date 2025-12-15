import { useState, useEffect } from 'react';
import { Contact, CadenceType, CADENCE_LABELS } from '@/types/contact';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SocialLinkButton } from '@/components/SocialLinkButton';
import { ConversationContextDialog } from '@/components/ConversationContextDialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Phone, 
  Calendar, 
  StickyNote, 
  MessageSquare, 
  Linkedin,
  Twitter,
  Youtube,
  X, 
  MessageSquareText, 
  CalendarClock, 
  EyeOff, 
  Eye 
} from 'lucide-react';

interface CategorySetting {
  id: string;
  label_name: string;
  cadence_days: number;
}

interface ContactDetailDialogProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categorySettings: CategorySetting[];
  onUpdateContact: (contactId: string, updates: Partial<Contact>) => Promise<void>;
  onSendText?: (contact: Contact) => void;
}

export const ContactDetailDialog = ({
  contact,
  open,
  onOpenChange,
  categorySettings,
  onUpdateContact,
  onSendText,
}: ContactDetailDialogProps) => {
  const [editedNotes, setEditedNotes] = useState('');
  const [editedLinkedinUrl, setEditedLinkedinUrl] = useState('');
  const [editedXUrl, setEditedXUrl] = useState('');
  const [editedYoutubeUrl, setEditedYoutubeUrl] = useState('');
  const [showConversationContextDialog, setShowConversationContextDialog] = useState(false);
  const [showCadenceOverride, setShowCadenceOverride] = useState(false);
  const [localContact, setLocalContact] = useState<Contact | null>(null);

  useEffect(() => {
    if (contact) {
      setEditedNotes(contact.notes || '');
      setEditedLinkedinUrl(contact.linkedinUrl || '');
      setEditedXUrl(contact.xUrl || '');
      setEditedYoutubeUrl(contact.youtubeUrl || '');
      setShowCadenceOverride(false);
      setLocalContact(contact);
    }
  }, [contact?.id]);

  const handleCadenceChange = async (newCadence: CadenceType) => {
    if (!localContact) return;
    await onUpdateContact(localContact.id, { cadence: newCadence });
    setLocalContact(prev => prev ? { ...prev, cadence: newCadence } : null);
  };

  const handleCategoryChange = async (categoryName: string) => {
    if (!localContact) return;
    await onUpdateContact(localContact.id, { labels: [categoryName] });
    setLocalContact(prev => prev ? { ...prev, labels: [categoryName] } : null);
  };

  const handleNotesBlur = async () => {
    if (localContact && editedNotes !== localContact.notes) {
      await onUpdateContact(localContact.id, { notes: editedNotes });
      setLocalContact(prev => prev ? { ...prev, notes: editedNotes } : null);
    }
  };

  const handleLinkedinBlur = async () => {
    if (localContact && editedLinkedinUrl !== (localContact.linkedinUrl || '')) {
      await onUpdateContact(localContact.id, { linkedinUrl: editedLinkedinUrl });
      setLocalContact(prev => prev ? { ...prev, linkedinUrl: editedLinkedinUrl } : null);
    }
  };

  const handleXBlur = async () => {
    if (localContact && editedXUrl !== (localContact.xUrl || '')) {
      await onUpdateContact(localContact.id, { xUrl: editedXUrl });
      setLocalContact(prev => prev ? { ...prev, xUrl: editedXUrl } : null);
    }
  };

  const handleYoutubeBlur = async () => {
    if (localContact && editedYoutubeUrl !== (localContact.youtubeUrl || '')) {
      await onUpdateContact(localContact.id, { youtubeUrl: editedYoutubeUrl });
      setLocalContact(prev => prev ? { ...prev, youtubeUrl: editedYoutubeUrl } : null);
    }
  };

  if (!localContact) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-4">
              {localContact.photo ? (
                <img 
                  src={localContact.photo} 
                  alt={localContact.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-semibold text-primary">
                    {localContact.name.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <DialogTitle className="text-xl">{localContact.name}</DialogTitle>
                <DialogDescription className="flex items-center gap-1.5 mt-1">
                  <Phone className="w-4 h-4" />
                  <span>{localContact.phone || 'No phone'}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Send Text Button */}
            {onSendText && (
              <Button
                variant="imessage"
                className="w-full"
                onClick={() => onSendText(localContact)}
                disabled={!localContact.phone}
              >
                <MessageSquare className="w-4 h-4" />
                Send Text
              </Button>
            )}

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Category</Label>
              <Select 
                value={localContact.labels[0] || ''} 
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categorySettings.map((category) => (
                    <SelectItem key={category.id} value={category.label_name}>
                      {category.label_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Last Contacted */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Last contacted:</span>
                <span className="font-medium">
                  {localContact.lastContacted 
                    ? formatDistanceToNow(localContact.lastContacted, { addSuffix: true })
                    : 'Never'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-2 text-xs gap-1"
                onClick={() => setShowCadenceOverride(prev => !prev)}
              >
                <CalendarClock className="w-3 h-3" />
                Override
              </Button>
            </div>

            {/* Cadence Override Section */}
            {showCadenceOverride && (
              <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30 animate-fade-in">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Custom Cadence</Label>
                  <Select 
                    value={localContact.cadence} 
                    onValueChange={(v) => handleCadenceChange(v as CadenceType)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select cadence" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CADENCE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Specific Follow-up Date</Label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="flex-1 justify-start text-left font-normal h-9"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {localContact.followUpOverride 
                            ? format(localContact.followUpOverride, 'PPP')
                            : <span className="text-muted-foreground">Pick a date</span>
                          }
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={localContact.followUpOverride || undefined}
                          onSelect={async (date) => {
                            await onUpdateContact(localContact.id, { followUpOverride: date || null });
                            setLocalContact(prev => prev ? { ...prev, followUpOverride: date || null } : null);
                          }}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    {localContact.followUpOverride && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={async () => {
                          await onUpdateContact(localContact.id, { followUpOverride: null });
                          setLocalContact(prev => prev ? { ...prev, followUpOverride: null } : null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Override the calculated next due date
                  </p>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <StickyNote className="w-4 h-4" />
                <span>Notes</span>
              </div>
              <Textarea
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Add notes about this contact to help generate better AI messages..."
                className="min-h-[100px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Notes help the AI generate more personalized messages
              </p>
            </div>

            {/* LinkedIn URL */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Linkedin className="w-4 h-4" />
                  <span>LinkedIn</span>
                </div>
                <SocialLinkButton url={localContact.linkedinUrl} platform="linkedin" />
              </div>
              <Input
                value={editedLinkedinUrl}
                onChange={(e) => setEditedLinkedinUrl(e.target.value)}
                onBlur={handleLinkedinBlur}
                placeholder="https://linkedin.com/in/username"
                type="url"
              />
            </div>

            {/* X/Twitter URL */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Twitter className="w-4 h-4" />
                  <span>X (Twitter)</span>
                </div>
                <SocialLinkButton url={localContact.xUrl} platform="x" />
              </div>
              <Input
                value={editedXUrl}
                onChange={(e) => setEditedXUrl(e.target.value)}
                onBlur={handleXBlur}
                placeholder="https://x.com/username"
                type="url"
              />
            </div>

            {/* YouTube URL */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Youtube className="w-4 h-4" />
                  <span>YouTube</span>
                </div>
                <SocialLinkButton url={localContact.youtubeUrl} platform="youtube" />
              </div>
              <Input
                value={editedYoutubeUrl}
                onChange={(e) => setEditedYoutubeUrl(e.target.value)}
                onBlur={handleYoutubeBlur}
                placeholder="https://youtube.com/@channel"
                type="url"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Social profiles help the AI reference recent posts and generate more personalized messages
            </p>

            {/* Conversation Context Button */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setShowConversationContextDialog(true)}
            >
              <MessageSquareText className="w-4 h-4" />
              Add Conversation Context
            </Button>

            {/* Hide/Unhide Contact */}
            {localContact.isHidden ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground flex-1">This contact is hidden from cadence</span>
                </div>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={async () => {
                    await onUpdateContact(localContact.id, { isHidden: false });
                    setLocalContact(prev => prev ? { ...prev, isHidden: false } : null);
                  }}
                >
                  <Eye className="w-4 h-4" />
                  Unhide Contact
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full gap-2 text-muted-foreground"
                onClick={async () => {
                  await onUpdateContact(localContact.id, { isHidden: true });
                  setLocalContact(prev => prev ? { ...prev, isHidden: true } : null);
                }}
              >
                <EyeOff className="w-4 h-4" />
                Hide Contact
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Conversation Context Dialog */}
      <ConversationContextDialog
        open={showConversationContextDialog}
        onOpenChange={setShowConversationContextDialog}
        contactName={localContact.name}
        initialContext={localContact.conversationContext || ''}
        onSave={async (context) => {
          await onUpdateContact(localContact.id, { conversationContext: context });
          setLocalContact(prev => prev ? { ...prev, conversationContext: context } : null);
        }}
      />
    </>
  );
};
