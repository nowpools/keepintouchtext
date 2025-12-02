import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ContactListItem } from '@/components/ContactListItem';
import { EmptyState } from '@/components/EmptyState';
import { SendTextDialog } from '@/components/SendTextDialog';
import { BulkCategoryDialog } from '@/components/BulkCategoryDialog';
import { ConversationContextDialog } from '@/components/ConversationContextDialog';
import { useAuth } from '@/hooks/useAuth';
import { useContacts } from '@/hooks/useContacts';
import { useCategorySettings } from '@/hooks/useCategorySettings';
import { Contact, CadenceType, CADENCE_LABELS } from '@/types/contact';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Search, Users, Phone, Calendar, StickyNote, RefreshCw, Cloud, MessageSquare, Linkedin, Tag, X, MessageSquareText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

type SortOption = 'name' | 'lastContacted' | 'category';

const Contacts = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const { contacts, isLoading, isSyncing, syncGoogleContacts, updateContact, markAsContacted } = useContacts();
  const { categorySettings, isLoading: categoriesLoading } = useCategorySettings();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [editedNotes, setEditedNotes] = useState('');
  const [editedLinkedinUrl, setEditedLinkedinUrl] = useState('');
  const [sendTextContact, setSendTextContact] = useState<Contact | null>(null);
  
  // Bulk selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [showBulkCategoryDialog, setShowBulkCategoryDialog] = useState(false);
  
  // Conversation context dialog state
  const [showConversationContextDialog, setShowConversationContextDialog] = useState(false);

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

  // Get unique categories from contacts and settings
  const availableCategories = useMemo(() => {
    const categoriesFromSettings = categorySettings.map(c => c.label_name);
    const categoriesFromContacts = contacts.flatMap(c => c.labels);
    const allCategories = [...new Set([...categoriesFromSettings, ...categoriesFromContacts])];
    return allCategories.filter(Boolean);
  }, [contacts, categorySettings]);

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

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(c => c.labels.includes(categoryFilter));
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
        case 'category':
          const aCategory = a.labels[0] || 'zzz';
          const bCategory = b.labels[0] || 'zzz';
          return aCategory.localeCompare(bCategory);
        default:
          return 0;
      }
    });

    return result;
  }, [contacts, searchQuery, categoryFilter, sortBy]);

  const handleCadenceChange = async (contactId: string, newCadence: CadenceType) => {
    await updateContact(contactId, { cadence: newCadence });
    if (selectedContact?.id === contactId) {
      setSelectedContact(prev => prev ? { ...prev, cadence: newCadence } : null);
    }
  };

  const handleCategoryChange = async (contactId: string, categoryName: string) => {
    await updateContact(contactId, { labels: [categoryName] });
    if (selectedContact?.id === contactId) {
      setSelectedContact(prev => prev ? { ...prev, labels: [categoryName] } : null);
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

  // Bulk selection handlers
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedContactIds(new Set());
  };

  const toggleContactSelection = (contactId: string, selected: boolean) => {
    setSelectedContactIds(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(contactId);
      } else {
        newSet.delete(contactId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedContactIds(new Set(filteredContacts.map(c => c.id)));
  };

  const deselectAll = () => {
    setSelectedContactIds(new Set());
  };

  const handleBulkCategoryApply = async (categoryName: string) => {
    const selectedIds = Array.from(selectedContactIds);
    let successCount = 0;

    for (const id of selectedIds) {
      try {
        await updateContact(id, { labels: [categoryName] });
        successCount++;
      } catch (error) {
        console.error('Error updating contact:', error);
      }
    }

    toast({
      title: 'Categories applied',
      description: `Updated ${successCount} of ${selectedIds.length} contacts to "${categoryName}"`,
    });

    setSelectedContactIds(new Set());
    setIsSelectionMode(false);
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
          <div className="flex items-center gap-2">
            <Button
              onClick={toggleSelectionMode}
              variant={isSelectionMode ? "secondary" : "outline"}
              className="gap-2"
            >
              {isSelectionMode ? (
                <>
                  <X className="w-4 h-4" />
                  Cancel
                </>
              ) : (
                <>
                  <Tag className="w-4 h-4" />
                  Bulk Edit
                </>
              )}
            </Button>
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
        </div>

        {/* Bulk Action Bar */}
        {isSelectionMode && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border animate-fade-in">
            <div className="flex items-center gap-4">
              <Checkbox
                checked={selectedContactIds.size === filteredContacts.length && filteredContacts.length > 0}
                onCheckedChange={(checked) => checked ? selectAll() : deselectAll()}
              />
              <span className="text-sm font-medium">
                {selectedContactIds.size} selected
              </span>
              {selectedContactIds.size > 0 && (
                <Button
                  variant="link"
                  className="text-sm p-0 h-auto"
                  onClick={deselectAll}
                >
                  Clear selection
                </Button>
              )}
            </div>
            <Button
              onClick={() => setShowBulkCategoryDialog(true)}
              disabled={selectedContactIds.size === 0}
              className="gap-2"
            >
              <Tag className="w-4 h-4" />
              Apply Category
            </Button>
          </div>
        )}

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 animate-fade-in">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {availableCategories.map((category) => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
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
              <SelectItem value="category">Category</SelectItem>
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
                  onClick={(c) => !isSelectionMode && setSelectedContact(c)}
                  isSelectable={isSelectionMode}
                  isSelected={selectedContactIds.has(contact.id)}
                  onSelectChange={(selected) => toggleContactSelection(contact.id, selected)}
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

                  {/* Category */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Category</Label>
                    <Select 
                      value={selectedContact.labels[0] || ''} 
                      onValueChange={(v) => handleCategoryChange(selectedContact.id, v)}
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
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Last contacted:</span>
                    <span className="font-medium">
                      {selectedContact.lastContacted 
                        ? formatDistanceToNow(selectedContact.lastContacted, { addSuffix: true })
                        : 'Never'}
                    </span>
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

                  {/* Conversation Context Button */}
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => setShowConversationContextDialog(true)}
                  >
                    <MessageSquareText className="w-4 h-4" />
                    Add Conversation Context
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Conversation Context Dialog */}
        {selectedContact && (
          <ConversationContextDialog
            open={showConversationContextDialog}
            onOpenChange={setShowConversationContextDialog}
            contactName={selectedContact.name}
            initialContext={selectedContact.conversationContext || ''}
            onSave={async (context) => {
              await updateContact(selectedContact.id, { conversationContext: context });
              setSelectedContact(prev => prev ? { ...prev, conversationContext: context } : null);
            }}
          />
        )}

        {/* Send Text Dialog */}
        <SendTextDialog
          contact={sendTextContact}
          open={!!sendTextContact}
          onOpenChange={(open) => !open && setSendTextContact(null)}
          onComplete={handleSendTextComplete}
          showSnooze={false}
        />

        {/* Bulk Category Dialog */}
        <BulkCategoryDialog
          open={showBulkCategoryDialog}
          onOpenChange={setShowBulkCategoryDialog}
          categories={categorySettings}
          selectedCount={selectedContactIds.size}
          onApply={handleBulkCategoryApply}
        />
      </div>
    </Layout>
  );
};

export default Contacts;
