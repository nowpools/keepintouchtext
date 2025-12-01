import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ContactListItem } from '@/components/ContactListItem';
import { EmptyState } from '@/components/EmptyState';
import { SendTextDialog } from '@/components/SendTextDialog';
import { useAuth } from '@/hooks/useAuth';
import { useContacts } from '@/hooks/useContacts';
import { Contact, CadenceType, CADENCE_LABELS } from '@/types/contact';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Search, Users, Phone, Calendar, StickyNote, RefreshCw, Cloud, MessageSquare, Linkedin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type SortOption = 'name' | 'lastContacted' | 'cadence';

const Contacts = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { contacts, isLoading, isSyncing, syncGoogleContacts, updateContact, markAsContacted } = useContacts();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [cadenceFilter, setCadenceFilter] = useState<CadenceType | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [editedNotes, setEditedNotes] = useState('');
  const [editedLinkedinUrl, setEditedLinkedinUrl] = useState('');
  const [sendTextContact, setSendTextContact] = useState<Contact | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Update editedNotes and editedLinkedinUrl when selectedContact changes
  useEffect(() => {
    if (selectedContact) {
      setEditedNotes(selectedContact.notes || '');
      setEditedLinkedinUrl(selectedContact.linkedinUrl || '');
    }
  }, [selectedContact?.id]);

  const filteredContacts = useMemo(() => {
    let result = [...contacts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        c.labels.some(l => l.toLowerCase().includes(query))
      );
    }

    // Cadence filter
    if (cadenceFilter !== 'all') {
      result = result.filter(c => c.cadence === cadenceFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'lastContacted':
          const aDate = a.lastContacted?.getTime() || 0;
          const bDate = b.lastContacted?.getTime() || 0;
          return aDate - bDate; // Oldest first
        case 'cadence':
          const order: CadenceType[] = ['daily', 'weekly', 'monthly', 'quarterly', 'twice-yearly', 'yearly'];
          return order.indexOf(a.cadence) - order.indexOf(b.cadence);
        default:
          return 0;
      }
    });

    return result;
  }, [contacts, searchQuery, cadenceFilter, sortBy]);

  const handleCadenceChange = async (contactId: string, newCadence: CadenceType) => {
    await updateContact(contactId, { cadence: newCadence });
    if (selectedContact?.id === contactId) {
      setSelectedContact(prev => prev ? { ...prev, cadence: newCadence } : null);
    }
  };

  const handleNotesBlur = async () => {
    if (selectedContact && editedNotes !== selectedContact.notes) {
      await updateContact(selectedContact.id, { notes: editedNotes });
      setSelectedContact(prev => prev ? { ...prev, notes: editedNotes } : null);
    }
  };

  const handleLinkedinBlur = async () => {
    if (selectedContact && editedLinkedinUrl !== (selectedContact.linkedinUrl || '')) {
      await updateContact(selectedContact.id, { linkedinUrl: editedLinkedinUrl });
      setSelectedContact(prev => prev ? { ...prev, linkedinUrl: editedLinkedinUrl } : null);
    }
  };

  const handleSendTextComplete = async (contactId: string) => {
    await markAsContacted(contactId);
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between animate-fade-in">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">Contacts</h1>
            <p className="text-muted-foreground">
              {contacts.length} people in your network
            </p>
          </div>
          <Button
            onClick={syncGoogleContacts}
            disabled={isSyncing}
            variant="outline"
            className="gap-2"
          >
            {isSyncing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Cloud className="w-4 h-4" />
            )}
            {isSyncing ? 'Syncing...' : 'Sync Contacts'}
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 animate-fade-in">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or label..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={cadenceFilter} onValueChange={(v) => setCadenceFilter(v as CadenceType | 'all')}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Cadence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cadences</SelectItem>
              {Object.entries(CADENCE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="lastContacted">Last contacted</SelectItem>
              <SelectItem value="cadence">Cadence</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Contact List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-lg bg-secondary animate-pulse" />
            ))}
          </div>
        ) : filteredContacts.length === 0 ? (
          <EmptyState
            icon={<Users className="w-8 h-8 text-primary" />}
            title={contacts.length === 0 ? "No contacts yet" : "No contacts found"}
            description={
              contacts.length === 0 
                ? "Sync your Google Contacts to get started"
                : "Try adjusting your search or filters"
            }
            action={
              contacts.length === 0 ? (
                <Button onClick={syncGoogleContacts} disabled={isSyncing} className="gap-2">
                  <Cloud className="w-4 h-4" />
                  Sync Google Contacts
                </Button>
              ) : searchQuery ? (
                <Button variant="outline" onClick={() => setSearchQuery('')}>
                  Clear search
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredContacts.map((contact, index) => (
              <div 
                key={contact.id} 
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <ContactListItem 
                  contact={contact} 
                  onClick={setSelectedContact}
                />
              </div>
            ))}
          </div>
        )}

        {/* Contact Detail Dialog */}
        <Dialog open={!!selectedContact} onOpenChange={(open) => !open && setSelectedContact(null)}>
          <DialogContent className="max-w-md">
            {selectedContact && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-4">
                    {selectedContact.photo ? (
                      <img 
                        src={selectedContact.photo} 
                        alt={selectedContact.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-2xl font-semibold text-primary">
                          {selectedContact.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <DialogTitle className="text-xl">{selectedContact.name}</DialogTitle>
                      <DialogDescription className="flex items-center gap-1.5 mt-1">
                        <Phone className="w-4 h-4" />
                        <span>{selectedContact.phone || 'No phone'}</span>
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                  {/* Send Text Button */}
                  <Button
                    variant="imessage"
                    className="w-full"
                    onClick={() => {
                      setSendTextContact(selectedContact);
                    }}
                    disabled={!selectedContact.phone}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Send Text
                  </Button>

                  {/* Labels */}
                  {selectedContact.labels.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedContact.labels.map(label => (
                        <Badge key={label} variant="secondary">{label}</Badge>
                      ))}
                    </div>
                  )}

                  {/* Last Contacted */}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Last contacted:</span>
                    <span className="font-medium">
                      {selectedContact.lastContacted 
                        ? formatDistanceToNow(selectedContact.lastContacted, { addSuffix: true })
                        : 'Never'}
                    </span>
                  </div>

                  {/* Cadence */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Contact frequency</Label>
                    <Select 
                      value={selectedContact.cadence} 
                      onValueChange={(v) => handleCadenceChange(selectedContact.id, v as CadenceType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CADENCE_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Notes - Editable */}
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
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Linkedin className="w-4 h-4" />
                      <span>LinkedIn Profile</span>
                    </div>
                    <Input
                      value={editedLinkedinUrl}
                      onChange={(e) => setEditedLinkedinUrl(e.target.value)}
                      onBlur={handleLinkedinBlur}
                      placeholder="https://linkedin.com/in/username"
                      type="url"
                    />
                    <p className="text-xs text-muted-foreground">
                      LinkedIn helps the AI reference recent posts and professional context
                    </p>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Send Text Dialog */}
        <SendTextDialog
          contact={sendTextContact}
          open={!!sendTextContact}
          onOpenChange={(open) => !open && setSendTextContact(null)}
          onComplete={handleSendTextComplete}
          showSnooze={false}
        />
      </div>
    </Layout>
  );
};

export default Contacts;
