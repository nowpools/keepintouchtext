import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  Sliders, 
  MessageSquare, 
  Calendar,
  Users,
  Check,
  ExternalLink
} from 'lucide-react';
import { AppSettings, DEFAULT_CADENCE_DAYS, CADENCE_LABELS, CadenceType } from '@/types/contact';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AppSettings>({
    maxDailyContacts: 5,
    cadenceSettings: { ...DEFAULT_CADENCE_DAYS },
    aiTone: 'friendly',
    aiLength: 'medium',
  });
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    // Simulate sync
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSyncing(false);
    toast({
      title: "Sync complete",
      description: "Your Google Contacts have been synced.",
    });
  };

  const handleSave = () => {
    // Save to localStorage or backend
    localStorage.setItem('kitSettings', JSON.stringify(settings));
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated.",
    });
  };

  const updateCadence = (type: CadenceType, days: number) => {
    setSettings(prev => ({
      ...prev,
      cadenceSettings: {
        ...prev.cadenceSettings,
        [type]: days,
      },
    }));
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-1 animate-fade-in">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Customize how Keep In Touch works for you
          </p>
        </div>

        {/* Google Contacts Sync */}
        <Card className="p-6 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="font-semibold">Google Contacts</h3>
                <p className="text-sm text-muted-foreground">
                  Connect to sync your contacts and their labels
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </Button>
                <Button variant="ghost" className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Manage in Google
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Last synced: Just now (demo mode)
              </p>
            </div>
          </div>
        </Card>

        {/* Daily Contacts */}
        <Card className="p-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="font-semibold">Daily Contacts</h3>
                <p className="text-sm text-muted-foreground">
                  Maximum number of contacts to show each day
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={settings.maxDailyContacts}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    maxDailyContacts: parseInt(e.target.value) || 5 
                  }))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">contacts per day</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Cadence Definitions */}
        <Card className="p-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Sliders className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="font-semibold">Cadence Definitions</h3>
                <p className="text-sm text-muted-foreground">
                  Define how many days between contacts for each frequency
                </p>
              </div>
              <div className="grid gap-4">
                {(Object.keys(CADENCE_LABELS) as CadenceType[]).map((type) => (
                  <div key={type} className="flex items-center gap-4">
                    <Label className="w-28 text-sm">{CADENCE_LABELS[type]}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={settings.cadenceSettings[type]}
                      onChange={(e) => updateCadence(type, parseInt(e.target.value) || 1)}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* AI Settings */}
        <Card className="p-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="font-semibold">AI Message Settings</h3>
                <p className="text-sm text-muted-foreground">
                  Customize how AI generates message suggestions
                </p>
              </div>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Tone</Label>
                  <Select 
                    value={settings.aiTone} 
                    onValueChange={(v) => setSettings(prev => ({ ...prev, aiTone: v as 'casual' | 'professional' | 'friendly' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Message Length</Label>
                  <Select 
                    value={settings.aiLength} 
                    onValueChange={(v) => setSettings(prev => ({ ...prev, aiLength: v as 'short' | 'medium' | 'long' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short (1-2 sentences)</SelectItem>
                      <SelectItem value="medium">Medium (2-3 sentences)</SelectItem>
                      <SelectItem value="long">Long (3-4 sentences)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end animate-fade-in" style={{ animationDelay: '400ms' }}>
          <Button onClick={handleSave} className="gap-2">
            <Check className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
