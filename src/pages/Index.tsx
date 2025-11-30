import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { ContactCard } from '@/components/ContactCard';
import { ProgressBar } from '@/components/ProgressBar';
import { EmptyState } from '@/components/EmptyState';
import { mockContacts, getTodaysContacts } from '@/data/mockContacts';
import { DailyContact } from '@/types/contact';
import { format } from 'date-fns';
import { Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [todaysContacts, setTodaysContacts] = useState<DailyContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      const contacts = getTodaysContacts(mockContacts, 5);
      setTodaysContacts(contacts);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleComplete = (id: string) => {
    setTodaysContacts(prev => 
      prev.map(c => c.id === id ? { ...c, isCompleted: true } : c)
    );
  };

  const handleSnooze = (id: string) => {
    setTodaysContacts(prev => 
      prev.map(c => c.id === id ? { ...c, isSnoozed: true } : c)
    );
  };

  const handleUpdateDraft = (id: string, draft: string) => {
    setTodaysContacts(prev => 
      prev.map(c => c.id === id ? { ...c, aiDraft: draft } : c)
    );
  };

  const completedCount = todaysContacts.filter(c => c.isCompleted).length;
  const activeContacts = todaysContacts.filter(c => !c.isSnoozed);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-1 animate-fade-in">
          <p className="text-sm text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM d')}
          </p>
          <h1 className="text-3xl font-bold">Today's Connections</h1>
          <p className="text-muted-foreground">
            People who'd love to hear from you today
          </p>
        </div>

        {/* Progress */}
        <ProgressBar 
          completed={completedCount} 
          total={activeContacts.length}
          className="animate-fade-in" 
        />

        {/* Contact Cards */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div 
                key={i}
                className="h-32 rounded-lg bg-secondary animate-pulse"
              />
            ))}
          </div>
        ) : todaysContacts.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="w-8 h-8 text-primary" />}
            title="All caught up!"
            description="No one needs a message today. Check back tomorrow or add new contacts to keep in touch with."
            action={
              <Button variant="outline" onClick={() => window.location.href = '/contacts'}>
                View All Contacts
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {todaysContacts.map((contact, index) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                index={index}
                onComplete={handleComplete}
                onSnooze={handleSnooze}
                onUpdateDraft={handleUpdateDraft}
              />
            ))}
          </div>
        )}

        {/* Refresh hint */}
        {!isLoading && todaysContacts.length > 0 && completedCount === activeContacts.length && (
          <div className="text-center py-8 animate-fade-in">
            <p className="text-muted-foreground mb-4">
              Amazing work! Your relationships are thriving. 🌱
            </p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh for tomorrow
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Index;
