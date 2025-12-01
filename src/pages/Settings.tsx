import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  RefreshCw, 
  Sliders, 
  MessageSquare, 
  Calendar,
  Users,
  Check,
  ExternalLink,
  Plus,
  Trash2,
  Tag,
  Loader2,
} from 'lucide-react';
import { AppSettings, DEFAULT_CADENCE_DAYS, CADENCE_LABELS, CadenceType } from '@/types/contact';
import { useToast } from '@/hooks/use-toast';
import { useLabelSettings } from '@/hooks/useLabelSettings';

const Settings = () => {
  const { toast } = useToast();
  const { labelSettings, isLoading: isLoadingLabels, updateLabelSetting, addLabelSetting, deleteLabelSetting } = useLabelSettings();
  
  const [settings, setSettings] = useState<AppSettings>({
    maxDailyContacts: 5,
    cadenceSettings: { ...DEFAULT_CADENCE_DAYS },
    aiTone: 'friendly',
    aiLength: 'medium',
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [newLabel, setNewLabel] = useState({ name: '', description: '', cadenceDays: 30 });

  const handleSync = async () => {
    setIsSyncing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSyncing(false);
    toast({
      title: "Sync complete",
      description: "Your Google Contacts have been synced.",
    });
  };

  const handleSave = () => {
    localStorage.setItem('kitSettings', JSON.stringify(settings));
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated.",
    });
  };

  const handleCadenceChange = async (labelId: string, days: number) => {
    await updateLabelSetting(labelId, { cadence_days: days });
  };

  const handleAddLabel = async () => {
    if (!newLabel.name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a label name',
        variant: 'destructive',
      });
      return;
    }

    const result = await addLabelSetting(newLabel.name.trim(), newLabel.description.trim(), newLabel.cadenceDays);
    if (result) {
      setNewLabel({ name: '', description: '', cadenceDays: 30 });
      setIsAddingLabel(false);
      toast({
        title: 'Label added',
        description: `"${result.label_name}" has been created.`,
      });
    }
  };

  const handleDeleteLabel = async (id: string, name: string) => {
    const success = await deleteLabelSetting(id);
    if (success) {
      toast({
        title: 'Label deleted',
        description: `"${name}" has been removed.`,
      });
    }
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

        {/* Label-Based Cadence Definitions */}
        <Card className="p-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Tag className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Label Cadence Definitions</h3>
                  <p className="text-sm text-muted-foreground">
                    Set contact frequency for each label category
                  </p>
                </div>
                <Dialog open={isAddingLabel} onOpenChange={setIsAddingLabel}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Label
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Custom Label</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Label Name</Label>
                        <Input
                          placeholder="e.g., Mentors, Colleagues"
                          value={newLabel.name}
                          onChange={(e) => setNewLabel(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description (optional)</Label>
                        <Textarea
                          placeholder="Describe who belongs in this category..."
                          value={newLabel.description}
                          onChange={(e) => setNewLabel(prev => ({ ...prev, description: e.target.value }))}
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Contact Every</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={365}
                            value={newLabel.cadenceDays}
                            onChange={(e) => setNewLabel(prev => ({ ...prev, cadenceDays: parseInt(e.target.value) || 30 }))}
                            className="w-24"
                          />
                          <span className="text-sm text-muted-foreground">days</span>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setIsAddingLabel(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddLabel}>
                          Create Label
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {isLoadingLabels ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3">
                  {labelSettings.map((label) => (
                    <div 
                      key={label.id} 
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{label.label_name}</span>
                          {label.is_default && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              Default
                            </span>
                          )}
                        </div>
                        {label.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {label.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          value={label.cadence_days}
                          onChange={(e) => handleCadenceChange(label.id, parseInt(e.target.value) || 30)}
                          className="w-20 text-center"
                        />
                        <span className="text-sm text-muted-foreground w-10">days</span>
                        {!label.is_default && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteLabel(label.id, label.label_name)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        {label.is_default && <div className="w-8" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
