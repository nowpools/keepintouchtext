import { Contact } from '@/types/contact';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Phone, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ContactListItemProps {
  contact: Contact;
  onClick: (contact: Contact) => void;
  isSelectable?: boolean;
  isSelected?: boolean;
  onSelectChange?: (selected: boolean) => void;
}

export const ContactListItem = ({ 
  contact, 
  onClick, 
  isSelectable = false,
  isSelected = false,
  onSelectChange,
}: ContactListItemProps) => {
  const isOverdue = contact.nextDue <= new Date();
  const primaryCategory = contact.labels[0];

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      className={cn(
        "p-4 rounded-lg bg-card border border-border card-shadow cursor-pointer",
        "hover:card-shadow-hover hover:border-primary/20 transition-all duration-200",
        isOverdue && "border-l-4 border-l-accent",
        isSelected && "border-primary bg-primary/5"
      )}
      onClick={() => onClick(contact)}
    >
      <div className="flex items-center gap-4">
        {isSelectable && (
          <div onClick={handleCheckboxClick}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelectChange?.(!!checked)}
            />
          </div>
        )}
        
        {contact.photo ? (
          <img 
            src={contact.photo} 
            alt={contact.name}
            className="w-12 h-12 rounded-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center ${contact.photo ? 'hidden' : ''}`}>
          <span className="text-lg font-semibold text-primary">
            {contact.name.charAt(0)}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{contact.name}</h3>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
            <div className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" />
              <span className="truncate">{contact.phone || 'No phone'}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Badge variant="secondary" className="text-xs">
            {primaryCategory || 'Uncategorized'}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>
              {contact.lastContacted 
                ? formatDistanceToNow(contact.lastContacted, { addSuffix: true })
                : 'Never'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
