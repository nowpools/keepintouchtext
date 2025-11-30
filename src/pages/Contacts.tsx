import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { ContactListItem } from '@/components/ContactListItem';
import { EmptyState } from '@/components/EmptyState';
import { mockContacts } from '@/data/mockContacts';
import { Contact, CadenceType, CADENCE_LABELS } from '@/types/contact';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Search, Users, Phone, Calendar, StickyNote, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type SortOption = 'name' | 'lastContacted' | 'cadence';

const Contacts = () => {
  const [contacts, setContacts] = useState<Contact[]>(mockContacts);
  const [searchQuery, setSearchQuery] = useState('');
  const [cadenceFilter, setCadenceFilter] = useState<CadenceType | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

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

  const handleCadenceChange = (contactId: string, newCadence: CadenceType) => {
    setContacts(prev => 
      prev.map(c => c.id === contactId ? { ...c, cadence: newCadence } : c)
    );
    if (selectedContact?.id === contactId) {
      setSelectedContact(prev => prev ? { ...prev, cadence: newCadence } : null);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-1 animate-fade-in">
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">
            {contacts.length} people in your network
          </p>
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
        {filteredContacts.length === 0 ? (
          <EmptyState
            icon={<Users className="w-8 h-8 text-primary" />}
            title="No contacts found"
            description={searchQuery 
              ? "Try adjusting your search or filters"
              : "Connect your Google Contacts to get started"}
            action={
              searchQuery ? (
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
                      <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
                        <Phone className="w-4 h-4" />
                        <span>{selectedContact.phone}</span>
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                  {/* Labels */}
                  <div className="flex flex-wrap gap-2">
                    {selectedContact.labels.map(label => (
                      <Badge key={label} variant="secondary">{label}</Badge>
                    ))}
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

                  {/* Cadence */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Contact frequency</label>
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

                  {/* Notes */}
                  {selectedContact.notes && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <StickyNote className="w-4 h-4" />
                        <span>Notes</span>
                      </div>
                      <p className="text-sm text-muted-foreground p-3 bg-secondary rounded-lg">
                        {selectedContact.notes}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Contacts;
