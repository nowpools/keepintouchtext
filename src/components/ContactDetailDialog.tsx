import { useState, useEffect, useCallback, useRef } from 'react';
import type { FocusEvent } from 'react';
import { Contact, CadenceType, CADENCE_LABELS } from '@/types/contact';
import { Button } from '@/components/ui/button';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConversationContextDialog } from '@/components/ConversationContextDialog';
import { BirthdayField } from '@/components/BirthdayField';
import { EditablePhone } from '@/components/EditablePhone';
import { SendTextDialog } from '@/components/SendTextDialog';
import { SocialUrlFields } from '@/components/SocialUrlFields';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Calendar,
  StickyNote,
  MessageSquare,
  X,
  MessageSquareText,
  CalendarClock,
  EyeOff,
  Eye,
} from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useVisualViewportVars } from '@/hooks/useVisualViewportVars';

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
  onUpdatePhone?: (contactId: string, phone: string, googleId: string | null, shouldSyncToGoogle: boolean) => Promise<void>;
  canSyncToGoogle?: boolean;
  onMarkAsContacted?: (contactId: string) => void;
}

export const ContactDetailDialog = ({
  contact,
  open,
  onOpenChange,
  categorySettings,
  onUpdateContact,
  onUpdatePhone,
  canSyncToGoogle = false,
  onMarkAsContacted,
}: ContactDetailDialogProps) => {
  const [editedNotes, setEditedNotes] = useState('');
  const [showConversationContextDialog, setShowConversationContextDialog] = useState(false);
  const [showCadenceOverride, setShowCadenceOverride] = useState(false);
  const [showSendTextDialog, setShowSendTextDialog] = useState(false);
  const [localContact, setLocalContact] = useState<Contact | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  const { settings } = useAppSettings();
  const { features, isTrialActive } = useSubscription();

  const hasBirthdayFeature = features.birthdayField || isTrialActive;

  useVisualViewportVars(open);

  // Sync local state with contact prop changes
  useEffect(() => {
    if (contact) {
      setEditedNotes(contact.notes || '');
      setShowCadenceOverride(false);
      setLocalContact(contact);
    }
  }, [contact]);

  // Re-sync when dialog opens to ensure latest data
  useEffect(() => {
    if (open && contact) {
      setLocalContact(contact);
    }
  }, [open, contact]);

  const handleCadenceChange = async (newCadence: CadenceType) => {
    if (!localContact) return;
    await onUpdateContact(localContact.id, { cadence: newCadence });
    setLocalContact(prev => (prev ? { ...prev, cadence: newCadence } : null));
  };

  const handleCategoryChange = async (categoryName: string) => {
    if (!localContact) return;
    await onUpdateContact(localContact.id, { labels: [categoryName] });
    setLocalContact(prev => (prev ? { ...prev, labels: [categoryName] } : null));
  };

  const handleNotesBlur = async () => {
    if (localContact && editedNotes !== localContact.notes) {
      await onUpdateContact(localContact.id, { notes: editedNotes });
      setLocalContact(prev => (prev ? { ...prev, notes: editedNotes } : null));
    }
  };

  const handleSocialUpdate = useCallback(
    async (urlKey: keyof Contact, value: string) => {
      if (!localContact) return;

      const sanitized = value.trim().slice(0, 2048);
      await onUpdateContact(localContact.id, { [urlKey]: sanitized } as unknown as Partial<Contact>);
      setLocalContact(prev => (prev ? ({ ...prev, [urlKey]: sanitized } as Contact) : null));
    },
    [localContact, onUpdateContact],
  );

  const handleFocusCapture = useCallback((e: FocusEvent<HTMLElement>) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const tag = target.tagName;
    if (tag !== 'INPUT' && tag !== 'TEXTAREA') return;

    // iOS: the viewport often updates after a short delay when the keyboard opens
    window.setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }, 50);

    window.setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }, 350);
  }, []);

  if (!localContact) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-md top-[calc(env(safe-area-inset-top)+0.75rem)] translate-y-0 data-[state=open]:slide-in-from-top-2 flex max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden"
          style={{ maxHeight: 'calc(var(--vvh, 100dvh) - 1.5rem)' }}
        >
          <DialogHeader>
            <div className="flex items-center gap-4">
              {localContact.photo ? (
                <img
                  src={localContact.photo}
                  alt={localContact.name}
                  className="w-16 h-16 rounded-full object-cover"
                  loading="lazy"
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
                <EditablePhone
                  phone={localContact.phone}
                  onSave={async (newPhone) => {
                    if (onUpdatePhone) {
                      await onUpdatePhone(localContact.id, newPhone, localContact.googleId || null, canSyncToGoogle);
                    } else {
                      await onUpdateContact(localContact.id, { phone: newPhone });
                    }
                    setLocalContact(prev => (prev ? { ...prev, phone: newPhone } : null));
                  }}
                />
              </div>
            </div>
          </DialogHeader>

          <div
            ref={scrollAreaRef}
            className="mt-4 flex-1 overflow-y-auto overscroll-contain pr-1"
            onFocusCapture={handleFocusCapture}
            style={{
              paddingBottom:
                'calc(env(safe-area-inset-bottom) + var(--keyboard-inset, 0px) + 8rem)',
            }}
          >
            <div className="space-y-4">
              {/* Send Text Button */}
              <Button
                variant="imessage"
                className="w-full"
                onClick={() => {
                  // Close details first so we only ever show one overlay at a time
                  onOpenChange(false);
                  setShowSendTextDialog(true);
                }}
                disabled={!localContact.phone}
              >
                <MessageSquare className="w-4 h-4" />
                Send Text
              </Button>

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
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
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
                              : (
                                <span className="text-muted-foreground">Pick a date</span>
                              )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={localContact.followUpOverride || undefined}
                            onSelect={async (date) => {
                              await onUpdateContact(localContact.id, { followUpOverride: date || null });
                              setLocalContact(prev => (prev ? { ...prev, followUpOverride: date || null } : null));
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
                            setLocalContact(prev => (prev ? { ...prev, followUpOverride: null } : null));
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

              {/* Birthday - Pro/Business only */}
              {hasBirthdayFeature && (
                <BirthdayField
                  month={localContact.birthdayMonth}
                  day={localContact.birthdayDay}
                  year={localContact.birthdayYear}
                  onChange={async (birthday) => {
                    await onUpdateContact(localContact.id, {
                      birthdayMonth: birthday.month,
                      birthdayDay: birthday.day,
                      birthdayYear: birthday.year,
                    });
                    setLocalContact(prev => (prev
                      ? {
                        ...prev,
                        birthdayMonth: birthday.month,
                        birthdayDay: birthday.day,
                        birthdayYear: birthday.year,
                      }
                      : null));
                  }}
                />
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

              {/* Social Profiles */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MessageSquareText className="w-4 h-4" />
                  <span>Social profiles</span>
                </div>
                <SocialUrlFields
                  contact={localContact}
                  visiblePlatforms={settings.visibleSocialPlatforms}
                  onUpdate={handleSocialUpdate}
                />
              </div>

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
                      setLocalContact(prev => (prev ? { ...prev, isHidden: false } : null));
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
                    setLocalContact(prev => (prev ? { ...prev, isHidden: true } : null));
                  }}
                >
                  <EyeOff className="w-4 h-4" />
                  Hide Contact
                </Button>
              )}
            </div>
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

      {/* Send Text Dialog */}
      <SendTextDialog
        contact={localContact}
        open={showSendTextDialog}
        onOpenChange={setShowSendTextDialog}
        onComplete={(contactId) => {
          if (onMarkAsContacted) {
            onMarkAsContacted(contactId);
          }
          setShowSendTextDialog(false);
        }}
      />
    </>
  );
};
