import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserPlus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactAdded: () => void;
}

export const AddContactDialog = ({
  open,
  onOpenChange,
  onContactAdded,
}: AddContactDialogProps) => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for the contact',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Not signed in',
        description: 'Please sign in to add contacts',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if user has Google integration for optional sync
      const hasGoogleToken = !!session?.provider_token;
      
      // Always insert into local database first
      const { data: newContact, error: insertError } = await supabase
        .from('app_contacts')
        .insert({
          user_id: user.id,
          display_name: formData.name.trim(),
          phones: formData.phone.trim() ? [{ value: formData.phone.trim() }] : [],
          emails: formData.email.trim() ? [{ value: formData.email.trim() }] : [],
          notes: formData.notes.trim() || null,
          cadence_days: 30,
          next_contact_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // If user has Google integration, also sync to Google Contacts
      if (hasGoogleToken && newContact) {
        try {
          await supabase.functions.invoke('create-google-contact', {
            body: {
              accessToken: session.provider_token,
              userId: user.id,
              name: formData.name.trim(),
              phone: formData.phone.trim() || undefined,
              email: formData.email.trim() || undefined,
              notes: formData.notes.trim() || undefined,
              appContactId: newContact.id,
            },
          });
        } catch (syncError) {
          // Log but don't fail - contact is saved locally
          console.warn('Failed to sync to Google Contacts:', syncError);
        }
      }

      toast({
        title: 'Contact added!',
        description: hasGoogleToken 
          ? `${formData.name} has been added and synced to Google` 
          : `${formData.name} has been added to your contacts`,
      });

      // Reset form and close dialog
      setFormData({ name: '', phone: '', email: '', notes: '' });
      onOpenChange(false);
      onContactAdded();

    } catch (error) {
      console.error('Error adding contact:', error);
      toast({
        title: 'Failed to add contact',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add New Contact
          </DialogTitle>
          <DialogDescription>
            Add a new contact to your list
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="John Doe"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+1 (555) 123-4567"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="john@example.com"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any notes about this contact..."
              className="min-h-[80px] resize-none"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Add Contact
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
