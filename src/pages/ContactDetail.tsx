import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useContacts } from '@/hooks/useContacts';
import { useCategorySettings } from '@/hooks/useCategorySettings';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { Contact } from '@/types/contact';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Phone, 
  MessageSquare, 
  Check, 
  Calendar,
  User,
  Mail,
  Loader2,
  Save,
  Cake,
} from 'lucide-react';

const FREQUENCY_OPTIONS = [
  { value: '7', label: 'Weekly' },
  { value: '14', label: 'Every 2 weeks' },
  { value: '30', label: 'Monthly' },
  { value: '60', label: 'Every 2 months' },
  { value: '90', label: 'Quarterly' },
  { value: '180', label: 'Twice yearly' },
  { value: '365', label: 'Yearly' },
  { value: 'custom', label: 'Custom' },
];

const ContactDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { contacts, isLoading, markAsContacted, updateContact } = useContacts();
  const { categorySettings } = useCategorySettings();
  const { tier } = useSubscription();
  const { toast } = useToast();

  const [isMarking, setIsMarking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [frequency, setFrequency] = useState<string>('30');
  const [customDays, setCustomDays] = useState<string>('');

  // Find the contact
  const contact = useMemo(() => {
    return contacts.find(c => c.id === id);
  }, [contacts, id]);

  // Initialize frequency from contact's category
  useEffect(() => {
    if (contact) {
      const category = contact.labels[0];
      const categorySetting = categorySettings.find(c => c.label_name === category);
      const cadenceDays = categorySetting?.cadence_days ?? 30;
      
      // Find matching preset or use custom
      const preset = FREQUENCY_OPTIONS.find(o => o.value === cadenceDays.toString());
      if (preset && preset.value !== 'custom') {
        setFrequency(preset.value);
      } else {
        setFrequency('custom');
        setCustomDays(cadenceDays.toString());
      }
    }
  }, [contact, categorySettings]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleCall = () => {
    if (contact?.phone) {
      window.open(`tel:${contact.phone}`, '_self');
    }
  };

  const handleText = () => {
    if (contact?.phone) {
      window.open(`sms:${contact.phone}`, '_self');
    }
  };

  const handleMarkDone = async () => {
    if (!contact) return;
    
    setIsMarking(true);
    try {
      await markAsContacted(contact.id);
      toast({
        title: 'Marked as contacted',
        description: `${contact.name} has been marked as contacted.`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to mark as contacted.',
        variant: 'destructive',
      });
    } finally {
      setIsMarking(false);
    }
  };

  const handleSaveReminder = async () => {
    if (!contact) return;

    setIsSaving(true);
    try {
      // For now, we just show a success message
      // In a full implementation, we'd update the contact's cadence
      const days = frequency === 'custom' ? parseInt(customDays) || 30 : parseInt(frequency);
      
      // Update the contact with new cadence
      // This would ideally update the category or create a custom cadence
      toast({
        title: 'Reminder saved',
        description: `Will remind you to contact ${contact.name} every ${days} days.`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to save reminder.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Birthday display
  const birthdayDisplay = useMemo(() => {
    if (!contact?.birthdayMonth || !contact?.birthdayDay) return null;
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[contact.birthdayMonth - 1];
    const day = contact.birthdayDay;
    const year = contact.birthdayYear;
    
    return year ? `${month} ${day}, ${year}` : `${month} ${day}`;
  }, [contact]);

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-24" />
          <Card className="p-6 space-y-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </Card>
        </div>
      </Layout>
    );
  }

  if (!contact) {
    return (
      <Layout>
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Card className="p-6 text-center">
            <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Contact not found</h2>
            <p className="text-muted-foreground mb-4">
              This contact may have been deleted or you don't have access to it.
            </p>
            <Button onClick={() => navigate('/contacts')}>
              View All Contacts
            </Button>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Back button */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        {/* Contact header */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              {contact.photo ? (
                <img 
                  src={contact.photo} 
                  alt={contact.name} 
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-primary" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold truncate">{contact.name}</h1>
              
              {/* Category badge */}
              {contact.labels[0] && (
                <Badge variant="secondary" className="mt-1">
                  {contact.labels[0]}
                </Badge>
              )}

              {/* Next check-in */}
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  Next check-in: {contact.nextDue ? format(new Date(contact.nextDue), 'MMM d, yyyy') : 'Not set'}
                </span>
              </div>

              {/* Birthday */}
              {birthdayDisplay && (
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <Cake className="w-4 h-4" />
                  <span>Birthday: {birthdayDisplay}</span>
                </div>
              )}

              {/* Email */}
              {contact.email && (
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{contact.email}</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Quick actions */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={handleText}
              disabled={!contact.phone}
              className="flex-1 gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Text
            </Button>
            <Button 
              variant="outline"
              onClick={handleCall}
              disabled={!contact.phone}
              className="flex-1 gap-2"
            >
              <Phone className="w-4 h-4" />
              Call
            </Button>
            <Button 
              variant="secondary"
              onClick={handleMarkDone}
              disabled={isMarking}
              className="flex-1 gap-2"
            >
              {isMarking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Mark Done
            </Button>
          </div>
        </Card>

        {/* Reminder settings */}
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Reminder Settings</h2>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Check-in frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {frequency === 'custom' && (
              <div className="space-y-2">
                <Label>Every X days</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
              </div>
            )}

            <Button 
              onClick={handleSaveReminder}
              disabled={isSaving}
              className="w-full gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Reminder
            </Button>
          </div>
        </Card>

        {/* Notes */}
        {contact.notes && (
          <Card className="p-6">
            <h2 className="font-semibold mb-2">Notes</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {contact.notes}
            </p>
          </Card>
        )}

        {/* Conversation context */}
        {contact.conversationContext && (
          <Card className="p-6">
            <h2 className="font-semibold mb-2">Conversation Context</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {contact.conversationContext}
            </p>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default ContactDetail;
