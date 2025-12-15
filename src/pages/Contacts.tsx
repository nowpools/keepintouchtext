import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ContactListItem } from '@/components/ContactListItem';
import { EmptyState } from '@/components/EmptyState';
import { SendTextDialog } from '@/components/SendTextDialog';
import { BulkCategoryDialog } from '@/components/BulkCategoryDialog';
import { ConversationContextDialog } from '@/components/ConversationContextDialog';
import { AddContactDialog } from '@/components/AddContactDialog';
import { BirthdayField } from '@/components/BirthdayField';
import { useAuth } from '@/hooks/useAuth';
import { useContacts } from '@/hooks/useContacts';
import { useCategorySettings } from '@/hooks/useCategorySettings';
import { useSubscription } from '@/hooks/useSubscription';
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
import { Search, Users, Phone, Calendar, StickyNote, RefreshCw, Cloud, MessageSquare, Linkedin, Twitter, Youtube, Tag, X, MessageSquareText, CalendarClock, EyeOff, Eye, UserPlus, ExternalLink } from 'lucide-react';
import { SocialLinkButton } from '@/components/SocialLinkButton';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

type SortOption = 'name' | 'lastContacted' | 'category';

const Contacts = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const { features, isTrialActive } = useSubscription();
  const { contacts, isLoading, isSyncing, syncGoogleContacts, updateContact, markAsContacted, refetch } = useContacts();
  const { categorySettings, isLoading: categoriesLoading } = useCategorySettings();
  
  const hasBirthdayFeature = features.birthdayField || isTrialActive;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showHidden, setShowHidden] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [editedNotes, setEditedNotes] = useState('');
  const [editedLinkedinUrl, setEditedLinkedinUrl] = useState('');
  const [editedXUrl, setEditedXUrl] = useState('');
  const [editedYoutubeUrl, setEditedYoutubeUrl] = useState('');
  const [sendTextContact, setSendTextContact] = useState<Contact | null>(null);
  
  // Bulk selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [showBulkCategoryDialog, setShowBulkCategoryDialog] = useState(false);
  
  // Conversation context dialog state
  const [showConversationContextDialog, setShowConversationContextDialog] = useState(false);
  const [showCadenceOverride, setShowCadenceOverride] = useState(false);
  
  // Add contact dialog state
  const [showAddContactDialog, setShowAddContactDialog] = useState(false);

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
      setEditedXUrl(selectedContact.xUrl || '');
      setEditedYoutubeUrl(selectedContact.youtubeUrl || '');
      setShowCadenceOverride(false);
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

    // Hidden filter - by default hide hidden contacts
    if (!showHidden) {
      result = result.filter(c => !c.isHidden);
    }

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
  }, [contacts, searchQuery, categoryFilter, sortBy, showHidden]);

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

  const handleXBlur = async () => {
    if (selectedContact && editedXUrl !== (selectedContact.xUrl || '')) {
      await updateContact(selectedContact.id, { xUrl: editedXUrl });
      setSelectedContact(prev => prev ? { ...prev, xUrl: editedXUrl } : null);
    }
  };

  const handleYoutubeBlur = async () => {
    if (selectedContact && editedYoutubeUrl !== (selectedContact.youtubeUrl || '')) {
      await updateContact(selectedContact.id, { youtubeUrl: editedYoutubeUrl });
      setSelectedContact(prev => prev ? { ...prev, youtubeUrl: editedYoutubeUrl } : null);
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

  const handleBulkHide = async () => {
    const selectedIds = Array.from(selectedContactIds);
    let successCount = 0;

    for (const id of selectedIds) {
      try {
        await updateContact(id, { isHidden: true });
        successCount++;
      } catch (error) {
        console.error('Error hiding contact:', error);
      }
    }

    toast({
      title: 'Contacts hidden',
      description: `${successCount} contacts will no longer appear in cadence`,
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
              onClick={() => setShowAddContactDialog(true)}
              className="gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Add Contact
            </Button>
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
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowBulkCategoryDialog(true)}
                disabled={selectedContactIds.size === 0}
                className="gap-2"
              >
                <Tag className="w-4 h-4" />
                Apply Category
              </Button>
              <Button
                variant="outline"
                onClick={handleBulkHide}
                disabled={selectedContactIds.size === 0}
                className="gap-2"
              >
                <EyeOff className="w-4 h-4" />
                Hide Contacts
              </Button>
            </div>
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

          <Button
            variant={showHidden ? "secondary" : "outline"}
            onClick={() => setShowHidden(!showHidden)}
            className="gap-2"
          >
            {showHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showHidden ? 'Showing Hidden' : 'Show Hidden'}
          </Button>
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Last contacted:</span>
                      <span className="font-medium">
                        {selectedContact.lastContacted 
                          ? formatDistanceToNow(selectedContact.lastContacted, { addSuffix: true })
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

                  {/* Cadence Override Section (Collapsible) */}
                  {showCadenceOverride && (
                    <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30 animate-fade-in">
                      {/* Custom Cadence */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Custom Cadence</Label>
                        <Select 
                          value={selectedContact.cadence} 
                          onValueChange={(v) => handleCadenceChange(selectedContact.id, v as CadenceType)}
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

                      {/* Specific Follow-up Date */}
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
                                {selectedContact.followUpOverride 
                                  ? format(selectedContact.followUpOverride, 'PPP')
                                  : <span className="text-muted-foreground">Pick a date</span>
                                }
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={selectedContact.followUpOverride || undefined}
                                onSelect={async (date) => {
                                  await updateContact(selectedContact.id, { followUpOverride: date || null });
                                  setSelectedContact(prev => prev ? { ...prev, followUpOverride: date || null } : null);
                                }}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          {selectedContact.followUpOverride && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              onClick={async () => {
                                await updateContact(selectedContact.id, { followUpOverride: null });
                                setSelectedContact(prev => prev ? { ...prev, followUpOverride: null } : null);
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
                      month={selectedContact.birthdayMonth}
                      day={selectedContact.birthdayDay}
                      year={selectedContact.birthdayYear}
                      onChange={async (birthday) => {
                        await updateContact(selectedContact.id, {
                          birthdayMonth: birthday.month,
                          birthdayDay: birthday.day,
                          birthdayYear: birthday.year,
                        });
                        setSelectedContact(prev => prev ? {
                          ...prev,
                          birthdayMonth: birthday.month,
                          birthdayDay: birthday.day,
                          birthdayYear: birthday.year,
                        } : null);
                      }}
                    />
                  )}

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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Linkedin className="w-4 h-4" />
                        <span>LinkedIn</span>
                      </div>
                      <SocialLinkButton url={selectedContact.linkedinUrl} platform="linkedin" />
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
                      <SocialLinkButton url={selectedContact.xUrl} platform="x" />
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
                      <SocialLinkButton url={selectedContact.youtubeUrl} platform="youtube" />
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
                    Click the icons to view their profiles and gather context for personalized messages
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
                  {selectedContact.isHidden ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground flex-1">This contact is hidden from cadence</span>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={async () => {
                          await updateContact(selectedContact.id, { isHidden: false });
                          setSelectedContact(prev => prev ? { ...prev, isHidden: false } : null);
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
                        await updateContact(selectedContact.id, { isHidden: true });
                        setSelectedContact(prev => prev ? { ...prev, isHidden: true } : null);
                      }}
                    >
                      <EyeOff className="w-4 h-4" />
                      Hide Contact
                    </Button>
                  )}
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

        {/* Add Contact Dialog */}
        <AddContactDialog
          open={showAddContactDialog}
          onOpenChange={setShowAddContactDialog}
          onContactAdded={refetch}
        />
      </div>
    </Layout>
  );
};

export default Contacts;
