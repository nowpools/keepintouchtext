import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  Sparkles, 
  Calendar, 
  Cake,
  Linkedin,
  Twitter,
  Youtube,
  Clock
} from 'lucide-react';
import { formatDistanceToNow, format, isToday, parseISO } from 'date-fns';
import type { ContactWithLinks } from '@/types/contacts';
import { SendTextDialog } from './SendTextDialog';

interface ContactCardProps {
  contact: ContactWithLinks;
  onMarkContacted?: (contactId: string) => void;
  onOpenDetail?: (contact: ContactWithLinks) => void;
}

export function ContactCard({ contact, onMarkContacted, onOpenDetail }: ContactCardProps) {
  const [sendDialogOpen, setSendDialogOpen] = useState(false);

  const primaryPhone = contact.phones.find(p => p.primary)?.value || contact.phones[0]?.value;
  
  // Check if today is the contact's birthday
  const isBirthday = contact.birthday ? (() => {
    const today = new Date();
    const bday = parseISO(contact.birthday);
    return today.getMonth() === bday.getMonth() && today.getDate() === bday.getDate();
  })() : false;

  // Calculate if contact is overdue
  const isOverdue = contact.next_contact_date && new Date(contact.next_contact_date) < new Date();

  const handleGenerateMessage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (primaryPhone) {
      setSendDialogOpen(true);
    }
  };

  const handleCardClick = () => {
    onOpenDetail?.(contact);
  };

  return (
    <>
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow animate-fade-in"
        onClick={handleCardClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            {/* Left: Avatar & Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground truncate">
                  {contact.display_name}
                </h3>
                {isBirthday && (
                  <Cake className="w-4 h-4 text-pink-500 flex-shrink-0" />
                )}
              </div>
              
              {/* Category Badge */}
              {contact.label && (
                <Badge variant="secondary" className="text-xs mb-2">
                  {contact.label}
                </Badge>
              )}

              {/* Last Contacted */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {contact.last_contacted ? (
                  <span className={isOverdue ? 'text-destructive' : ''}>
                    {formatDistanceToNow(new Date(contact.last_contacted), { addSuffix: true })}
                  </span>
                ) : (
                  <span>Never contacted</span>
                )}
              </div>

              {/* Social Links */}
              <div className="flex gap-1 mt-2">
                {contact.linkedin_url && (
                  <Linkedin className="w-3 h-3 text-muted-foreground" />
                )}
                {contact.x_url && (
                  <Twitter className="w-3 h-3 text-muted-foreground" />
                )}
                {contact.youtube_url && (
                  <Youtube className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Right: Action Button */}
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                onClick={handleGenerateMessage}
                disabled={!primaryPhone}
                className="gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span className="hidden sm:inline">AI Message</span>
              </Button>
            </div>
          </div>

          {/* Due Indicator */}
          {contact.next_contact_date && (
            <div className="flex items-center gap-1 mt-3 text-xs">
              <Calendar className="w-3 h-3" />
              <span className={isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                {isOverdue ? 'Overdue' : `Due ${format(new Date(contact.next_contact_date), 'MMM d')}`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {primaryPhone && (
        <SendTextDialog
          open={sendDialogOpen}
          onOpenChange={setSendDialogOpen}
          contact={contact}
          phoneNumber={primaryPhone}
          onMarkContacted={onMarkContacted}
          isBirthday={isBirthday}
        />
      )}
    </>
  );
}
