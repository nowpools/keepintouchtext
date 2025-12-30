import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  MessageSquare, 
  Linkedin, 
  Twitter, 
  Youtube,
  Save,
  Trash2,
  Clock,
  History
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { ContactWithLinks } from '@/types/contacts';
import { useCategorySettings } from '@/hooks/useCategorySettings';
import { useContactHistory } from '@/hooks/useContactHistory';
import { BirthdayField } from './BirthdayField';

interface ContactDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: ContactWithLinks | null;
  onSave: (id: string, updates: Partial<ContactWithLinks>) => Promise<boolean>;
  onDelete?: (id: string) => Promise<boolean>;
}

export function ContactDetailDialog({
  open,
  onOpenChange,
  contact,
  onSave,
  onDelete,
}: ContactDetailDialogProps) {
  const { categorySettings } = useCategorySettings();
  const { history, isLoading: historyLoading } = useContactHistory(contact?.id);
  
  // Parse birthday string to month/day/year components
  const parseBirthday = (birthdayStr: string | undefined) => {
    if (!birthdayStr) return { month: null, day: null, year: null };
    try {
      const date = parseISO(birthdayStr);
      return {
        month: date.getMonth() + 1,
        day: date.getDate(),
        year: date.getFullYear(),
      };
    } catch {
      return { month: null, day: null, year: null };
    }
  };
  
  const formatBirthdayToString = (birthday: { month: number | null; day: number | null; year: number | null }) => {
    if (!birthday.month || !birthday.day) return '';
    const year = birthday.year || 2000;
    const month = birthday.month.toString().padStart(2, '0');
    const day = birthday.day.toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [formData, setFormData] = useState({
    display_name: '',
    label: '',
    cadence_days: 30,
    birthday: { month: null as number | null, day: null as number | null, year: null as number | null },
    linkedin_url: '',
    x_url: '',
    youtube_url: '',
    conversation_context: '',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (contact) {
      setFormData({
        display_name: contact.display_name || '',
        label: contact.label || '',
        cadence_days: contact.cadence_days || 30,
        birthday: parseBirthday(contact.birthday),
        linkedin_url: contact.linkedin_url || '',
        x_url: contact.x_url || '',
        youtube_url: contact.youtube_url || '',
        conversation_context: contact.conversation_context || '',
        notes: contact.notes || '',
      });
    }
  }, [contact]);

  const handleSave = async () => {
    if (!contact) return;
    
    setIsSaving(true);
    try {
      // If category changed, update cadence_days from category settings
      let cadenceDays = formData.cadence_days;
      if (formData.label) {
        const category = categorySettings.find(c => c.label_name === formData.label);
        if (category) {
          cadenceDays = category.cadence_days;
        }
      }

      const birthdayStr = formatBirthdayToString(formData.birthday);

      await onSave(contact.id, {
        display_name: formData.display_name,
        label: formData.label || undefined,
        cadence_days: cadenceDays,
        birthday: birthdayStr || undefined,
        linkedin_url: formData.linkedin_url || undefined,
        x_url: formData.x_url || undefined,
        youtube_url: formData.youtube_url || undefined,
        conversation_context: formData.conversation_context || undefined,
        notes: formData.notes || undefined,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!contact || !onDelete) return;
    
    if (confirm('Are you sure you want to delete this contact?')) {
      await onDelete(contact.id);
      onOpenChange(false);
    }
  };

  if (!contact) return null;

  const primaryPhone = contact.phones.find(p => p.primary)?.value || contact.phones[0]?.value;
  const primaryEmail = contact.emails.find(e => e.primary)?.value || contact.emails[0]?.value;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {contact.display_name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Basic Info */}
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.display_name}
                onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
              />
            </div>

            {/* Contact Info (Read-only) */}
            {primaryPhone && (
              <div className="space-y-1">
                <Label className="text-muted-foreground">Phone</Label>
                <p className="text-sm">{primaryPhone}</p>
              </div>
            )}
            {primaryEmail && (
              <div className="space-y-1">
                <Label className="text-muted-foreground">Email</Label>
                <p className="text-sm">{primaryEmail}</p>
              </div>
            )}

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.label}
                onValueChange={(value) => setFormData(prev => ({ ...prev, label: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No category</SelectItem>
                  {categorySettings.map(category => (
                    <SelectItem key={category.id} value={category.label_name}>
                      {category.label_name} ({category.cadence_days} days)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Birthday */}
            <BirthdayField
              month={formData.birthday.month}
              day={formData.birthday.day}
              year={formData.birthday.year}
              onChange={(birthday) => setFormData(prev => ({ ...prev, birthday }))}
            />

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Personal notes about this contact..."
                className="min-h-[80px]"
              />
            </div>

            {/* Conversation Context for AI */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Conversation Context (for AI)
              </Label>
              <Textarea
                value={formData.conversation_context}
                onChange={(e) => setFormData(prev => ({ ...prev, conversation_context: e.target.value }))}
                placeholder="What have you talked about? Topics, inside jokes, recent events..."
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                This helps the AI generate more personalized messages
              </p>
            </div>
          </TabsContent>

          <TabsContent value="social" className="space-y-4 mt-4">
            {/* LinkedIn */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Linkedin className="w-4 h-4" />
                LinkedIn Profile
              </Label>
              <Input
                value={formData.linkedin_url}
                onChange={(e) => setFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
                placeholder="https://linkedin.com/in/username"
              />
            </div>

            {/* X/Twitter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Twitter className="w-4 h-4" />
                X / Twitter
              </Label>
              <Input
                value={formData.x_url}
                onChange={(e) => setFormData(prev => ({ ...prev, x_url: e.target.value }))}
                placeholder="https://x.com/username"
              />
            </div>

            {/* YouTube */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Youtube className="w-4 h-4" />
                YouTube Channel
              </Label>
              <Input
                value={formData.youtube_url}
                onChange={(e) => setFormData(prev => ({ ...prev, youtube_url: e.target.value }))}
                placeholder="https://youtube.com/@channel"
              />
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Social profiles help the AI understand your contact's professional context 
              and generate more relevant messages.
            </p>
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-4">
            {/* Last Contacted */}
            {contact.last_contacted && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Clock className="w-4 h-4" />
                Last contacted: {format(new Date(contact.last_contacted), 'PPP')}
              </div>
            )}

            {/* Contact History */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Contact History
              </Label>
              
              {historyLoading ? (
                <p className="text-sm text-muted-foreground">Loading history...</p>
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contact history yet</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {history.map(entry => (
                    <div 
                      key={entry.id} 
                      className="p-3 rounded-lg bg-secondary/50 text-sm"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">
                          {format(new Date(entry.contacted_at), 'PPP')}
                        </span>
                        {entry.label && (
                          <Badge variant="outline" className="text-xs">
                            {entry.label}
                          </Badge>
                        )}
                      </div>
                      {entry.notes && (
                        <p className="text-muted-foreground">{entry.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          {onDelete && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleDelete}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save className="w-4 h-4" />
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
