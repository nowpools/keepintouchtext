import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { EmptyState } from '@/components/EmptyState';
import { ContactCard } from '@/components/ContactCard';
import { ContactDetailDialog } from '@/components/ContactDetailDialog';
import { useAuth } from '@/hooks/useAuth';
import { useAppContacts } from '@/hooks/useAppContacts';
import { useContactHistory } from '@/hooks/useContactHistory';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Sparkles, Users, Settings } from 'lucide-react';
import { useState } from 'react';
import type { ContactWithLinks } from '@/types/contacts';

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { dueContacts, contacts, isLoading, updateContact, deleteContact, markContacted } = useAppContacts();
  const { recordContactCompletion } = useContactHistory();
  
  const [selectedContact, setSelectedContact] = useState<ContactWithLinks | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleMarkContacted = async (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (contact) {
      await markContacted(contactId);
      await recordContactCompletion(contact, 'manual');
    }
  };

  const handleOpenDetail = (contact: ContactWithLinks) => {
    setSelectedContact(contact);
    setDetailOpen(true);
  };

  const handleSaveContact = async (id: string, updates: Partial<ContactWithLinks>) => {
    return await updateContact(id, updates);
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
            <p className="text-sm text-muted-foreground">
              {format(new Date(), 'EEEE, MMMM d')}
            </p>
            <h1 className="text-3xl font-bold">Today's Connections</h1>
            <p className="text-muted-foreground">
              People who'd love to hear from you today
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={() => navigate('/settings')}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 rounded-lg bg-secondary animate-pulse" />
            ))}
          </div>
        ) : dueContacts.length > 0 ? (
          <div className="space-y-3">
            {dueContacts.map(contact => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onMarkContacted={handleMarkContacted}
                onOpenDetail={handleOpenDetail}
              />
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <EmptyState
            icon={<Users className="w-8 h-8 text-primary" />}
            title="No contacts synced"
            description="Connect Apple Contacts or Google Contacts to start nurturing your relationships"
            action={
              <Button onClick={() => navigate('/settings')} className="gap-2">
                <Settings className="w-4 h-4" />
                Configure Sync Settings
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<Sparkles className="w-8 h-8 text-primary" />}
            title="All caught up!"
            description={`You have ${contacts.length} contacts. Assign categories to set contact cadences.`}
            action={
              <Button variant="outline" onClick={() => navigate('/contacts')}>
                View All Contacts
              </Button>
            }
          />
        )}
      </div>

      <ContactDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        contact={selectedContact}
        onSave={handleSaveContact}
        onDelete={deleteContact}
      />
    </Layout>
  );
};

export default Index;
