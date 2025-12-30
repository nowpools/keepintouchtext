import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useAppContacts } from '@/hooks/useAppContacts';
import { useUserIntegrations } from '@/hooks/useUserIntegrations';
import { ContactWithLinks } from '@/types/contacts';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Search, 
  Users, 
  UserPlus, 
  RefreshCw, 
  Apple, 
  Mail, 
  Phone,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useEffect } from 'react';

const Contacts = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { contacts, isLoading, refetch, createContact, updateContact, deleteContact } = useAppContacts();
  const { integrations } = useUserIntegrations();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showApple, setShowApple] = useState(true);
  const [showGoogle, setShowGoogle] = useState(true);
  const [selectedContact, setSelectedContact] = useState<ContactWithLinks | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newContactName, setNewContactName] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Filter contacts
  const filteredContacts = useMemo(() => {
    let result = [...contacts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.display_name.toLowerCase().includes(query) ||
        c.emails.some(e => e.value.toLowerCase().includes(query)) ||
        c.phones.some(p => p.value.includes(query))
      );
    }

    // Source visibility filters
    if (!showApple) {
      result = result.filter(c => !c.hasAppleLink || c.hasGoogleLink);
    }
    if (!showGoogle) {
      result = result.filter(c => !c.hasGoogleLink || c.hasAppleLink);
    }

    // Sort alphabetically
    result.sort((a, b) => a.display_name.localeCompare(b.display_name));

    return result;
  }, [contacts, searchQuery, showApple, showGoogle]);

  const handleAddContact = async () => {
    if (!newContactName.trim()) return;
    
    await createContact({
      display_name: newContactName.trim(),
      emails: [],
      phones: [],
      tags: [],
      source_preference: 'app',
    });
    
    setNewContactName('');
    setShowAddDialog(false);
  };

  const getSourceBadges = (contact: ContactWithLinks) => {
    const badges = [];
    if (contact.hasAppleLink) {
      badges.push(
        <Badge key="apple" variant="outline" className="gap-1 text-xs">
          <Apple className="w-3 h-3" />
          Apple
        </Badge>
      );
    }
    if (contact.hasGoogleLink) {
      badges.push(
        <Badge key="google" variant="outline" className="gap-1 text-xs">
          <Mail className="w-3 h-3" />
          Google
        </Badge>
      );
    }
    if (!contact.hasAppleLink && !contact.hasGoogleLink) {
      badges.push(
        <Badge key="app" variant="secondary" className="text-xs">
          App
        </Badge>
      );
    }
    return badges;
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
        <div className="animate-fade-in space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold">Contacts</h1>
              <p className="text-muted-foreground">
                {contacts.length} people in your network
              </p>
            </div>
            <Button variant="outline" size="icon" onClick={() => navigate('/settings')}>
              <SettingsIcon className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setShowAddDialog(true)} className="gap-2">
              <UserPlus className="w-4 h-4" />
              Add Contact
            </Button>
            <Button onClick={refetch} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 animate-fade-in">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="show-apple"
                checked={showApple}
                onCheckedChange={setShowApple}
              />
              <Label htmlFor="show-apple" className="flex items-center gap-1 text-sm">
                <Apple className="w-4 h-4" />
                Apple
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-google"
                checked={showGoogle}
                onCheckedChange={setShowGoogle}
              />
              <Label htmlFor="show-google" className="flex items-center gap-1 text-sm">
                <Mail className="w-4 h-4" />
                Google
              </Label>
            </div>
          </div>
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
                ? "Add contacts or sync from Apple/Google"
                : "Try adjusting your search or filters"
            }
            action={
              contacts.length === 0 ? (
                <Button onClick={() => setShowAddDialog(true)} className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Add Contact
                </Button>
              ) : searchQuery ? (
                <Button variant="outline" onClick={() => setSearchQuery('')}>
                  Clear search
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-2">
            {filteredContacts.map((contact, index) => (
              <div 
                key={contact.id} 
                className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
                onClick={() => setSelectedContact(contact)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-lg font-semibold text-primary">
                      {contact.display_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{contact.display_name}</span>
                      {getSourceBadges(contact)}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      {contact.phones[0] && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {contact.phones[0].value}
                        </span>
                      )}
                      {contact.emails[0] && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3" />
                          {contact.emails[0].value}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
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
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-2xl font-semibold text-primary">
                        {selectedContact.display_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <DialogTitle className="text-xl">{selectedContact.display_name}</DialogTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {getSourceBadges(selectedContact)}
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4 pt-4">
                  {/* Phones */}
                  {selectedContact.phones.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Phone Numbers</Label>
                      {selectedContact.phones.map((phone, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span>{phone.value}</span>
                          {phone.label && (
                            <Badge variant="outline" className="text-xs">{phone.label}</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Emails */}
                  {selectedContact.emails.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Email Addresses</Label>
                      {selectedContact.emails.map((email, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="truncate">{email.value}</span>
                          {email.label && (
                            <Badge variant="outline" className="text-xs">{email.label}</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Notes */}
                  {selectedContact.notes && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Notes</Label>
                      <p className="text-sm whitespace-pre-wrap">{selectedContact.notes}</p>
                    </div>
                  )}

                  {/* Tags */}
                  {selectedContact.tags.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Tags</Label>
                      <div className="flex flex-wrap gap-1">
                        {selectedContact.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-4">
                    <Button 
                      variant="destructive" 
                      className="flex-1"
                      onClick={async () => {
                        await deleteContact(selectedContact.id);
                        setSelectedContact(null);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Add Contact Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Contact</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="Contact name"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddContact()}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleAddContact} className="flex-1">
                  Add Contact
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Contacts;
