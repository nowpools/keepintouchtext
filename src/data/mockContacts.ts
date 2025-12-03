import { Contact, DailyContact, CadenceType } from '@/types/contact';
import { addDays, subDays } from 'date-fns';

const generateAIDraft = (contact: Contact): string => {
  const greetings = ['Hey', 'Hi', 'Hello'];
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  
  const templates = [
    `${greeting} ${contact.name.split(' ')[0]}! Just thinking about you and wanted to check in. How have you been?`,
    `${greeting} ${contact.name.split(' ')[0]}! It's been a while – would love to catch up soon. What's new with you?`,
    `${greeting} ${contact.name.split(' ')[0]}! Hope you're doing well! Any exciting plans coming up?`,
    `${greeting} ${contact.name.split(' ')[0]}! Wanted to drop a quick note and say hi. How's everything going?`,
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
};

export const mockContacts: Contact[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    phone: '+1 (415) 555-0123',
    email: 'sarah.chen@email.com',
    photo: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    labels: ['Friends', 'Weekly'],
    notes: 'Met at the tech conference last year. Loves hiking and photography. Working on a startup in AI.',
    cadence: 'weekly',
    lastContacted: subDays(new Date(), 8),
    nextDue: subDays(new Date(), 1),
    isHidden: false,
  },
  {
    id: '2',
    name: 'Michael Rodriguez',
    phone: '+1 (650) 555-0456',
    email: 'mike.r@email.com',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    labels: ['Family', 'Monthly'],
    notes: 'Cousin from Austin. Getting married next spring. Really into BBQ and golf.',
    cadence: 'monthly',
    lastContacted: subDays(new Date(), 35),
    nextDue: subDays(new Date(), 5),
    isHidden: false,
  },
  {
    id: '3',
    name: 'Emily Watson',
    phone: '+1 (212) 555-0789',
    email: 'emily.w@work.com',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    labels: ['Work', 'Quarterly'],
    notes: 'Former colleague from Google. Now VP at a fintech company. Great mentor for career advice.',
    cadence: 'quarterly',
    lastContacted: subDays(new Date(), 95),
    nextDue: subDays(new Date(), 5),
    isHidden: false,
  },
  {
    id: '4',
    name: 'David Kim',
    phone: '+1 (310) 555-0234',
    email: 'david.kim@email.com',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    labels: ['Friends', 'Weekly'],
    notes: 'College roommate. Lives in LA now. Working in film production. Always has great restaurant recommendations.',
    cadence: 'weekly',
    lastContacted: subDays(new Date(), 10),
    nextDue: subDays(new Date(), 3),
    isHidden: false,
  },
  {
    id: '5',
    name: 'Jessica Park',
    phone: '+1 (408) 555-0567',
    email: 'jpark@email.com',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
    labels: ['Networking', 'Monthly'],
    notes: 'Met through LinkedIn. Expert in product management. Recently published a book on user research.',
    cadence: 'monthly',
    lastContacted: subDays(new Date(), 32),
    nextDue: subDays(new Date(), 2),
    isHidden: false,
  },
  {
    id: '6',
    name: 'Robert Thompson',
    phone: '+1 (512) 555-0890',
    email: 'rob.t@email.com',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    labels: ['Family', 'Yearly'],
    notes: 'Uncle Rob from Texas. Retired teacher. Amazing storyteller. Birthday in March.',
    cadence: 'yearly',
    lastContacted: subDays(new Date(), 370),
    nextDue: subDays(new Date(), 5),
    isHidden: false,
  },
  {
    id: '7',
    name: 'Amanda Liu',
    phone: '+1 (617) 555-0111',
    email: 'amanda.liu@email.com',
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    labels: ['Friends', 'Daily'],
    notes: 'Best friend since high school. Training for a marathon. Works in healthcare.',
    cadence: 'daily',
    lastContacted: subDays(new Date(), 2),
    nextDue: subDays(new Date(), 1),
    isHidden: false,
  },
  {
    id: '8',
    name: 'Chris Martinez',
    phone: '+1 (305) 555-0222',
    email: 'chris.m@email.com',
    photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face',
    labels: ['Work', 'Twice-Yearly'],
    notes: 'Industry contact from Miami. Runs a successful agency. Great for referrals.',
    cadence: 'twice-yearly',
    lastContacted: subDays(new Date(), 190),
    nextDue: subDays(new Date(), 10),
    isHidden: false,
  },
];

export const getTodaysContacts = (contacts: Contact[], maxDaily: number = 5): DailyContact[] => {
  const today = new Date();
  
  // Sort by how overdue they are
  const sortedContacts = [...contacts]
    .filter(c => c.nextDue <= today)
    .sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime())
    .slice(0, maxDaily);
  
  return sortedContacts.map(contact => ({
    ...contact,
    aiDraft: generateAIDraft(contact),
    isCompleted: false,
    isSnoozed: false,
  }));
};
