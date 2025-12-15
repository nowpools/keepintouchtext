import { useState, useMemo, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, MessageSquare, Calendar, Users, Check, ExternalLink, Plus, Trash2, Tag, Loader2, Calculator, Shuffle, SortAsc, Share2, Linkedin, Twitter, Youtube, Facebook, Instagram, Github, MessageCircle, Send, Camera, Hash, Download, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCategorySettings } from '@/hooks/useCategorySettings';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useContacts } from '@/hooks/useContacts';
import { useSubscription } from '@/hooks/useSubscription';
import { useContactHistory } from '@/hooks/useContactHistory';
import { SortOrderType, SocialPlatform } from '@/types/contact';

const SOCIAL_PLATFORMS: { key: SocialPlatform; name: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { key: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'text-[#0A66C2]' },
  { key: 'x', name: 'X (Twitter)', icon: Twitter, color: 'text-foreground' },
  { key: 'youtube', name: 'YouTube', icon: Youtube, color: 'text-[#FF0000]' },
  { key: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-[#1877F2]' },
  { key: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-[#E4405F]' },
  { key: 'tiktok', name: 'TikTok', icon: Camera, color: 'text-foreground' },
  { key: 'github', name: 'GitHub', icon: Github, color: 'text-foreground' },
  { key: 'threads', name: 'Threads', icon: Hash, color: 'text-foreground' },
  { key: 'snapchat', name: 'Snapchat', icon: Camera, color: 'text-[#FFFC00]' },
  { key: 'pinterest', name: 'Pinterest', icon: Camera, color: 'text-[#E60023]' },
  { key: 'reddit', name: 'Reddit', icon: MessageCircle, color: 'text-[#FF4500]' },
  { key: 'discord', name: 'Discord', icon: MessageCircle, color: 'text-[#5865F2]' },
  { key: 'twitch', name: 'Twitch', icon: Camera, color: 'text-[#9146FF]' },
  { key: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, color: 'text-[#25D366]' },
  { key: 'telegram', name: 'Telegram', icon: Send, color: 'text-[#0088CC]' },
];

const Settings = () => {
  const { toast } = useToast();
  const { categorySettings, isLoading: isLoadingCategories, updateCategorySetting, addCategorySetting, deleteCategorySetting } = useCategorySettings();
  const { settings, updateSettings, updateMaxDailyContacts, updateSortOrder, toggleSocialPlatform } = useAppSettings();
  const { contacts } = useContacts();
  const { features, tier, isTrialActive, daysLeftInTrial } = useSubscription();
  const { exportContactHistory } = useContactHistory();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', description: '', cadenceDays: 30 });
  const [dailyContactsInput, setDailyContactsInput] = useState<string>(
    settings.maxDailyContacts === null ? '' : settings.maxDailyContacts.toString()
  );

  // Sync input when settings change (e.g., on load)
  useEffect(() => {
    setDailyContactsInput(settings.maxDailyContacts === null ? '' : settings.maxDailyContacts.toString());
  }, [settings.maxDailyContacts]);

  const canUseUnlimitedDaily = features.dynamicDailyCalc || isTrialActive;

  const recommendedDailyContacts = useMemo(() => {
    if (contacts.length === 0 || categorySettings.length === 0) return 0;
    let totalDaily = 0;
    const categoryContactCounts: Record<string, number> = {};
    contacts.forEach(contact => {
      const category = contact.labels[0];
      if (category) categoryContactCounts[category] = (categoryContactCounts[category] || 0) + 1;
    });
    categorySettings.forEach(cat => {
      const contactsInCategory = categoryContactCounts[cat.label_name] || 0;
      if (contactsInCategory > 0 && cat.cadence_days > 0) totalDaily += contactsInCategory / cat.cadence_days;
    });
    return Math.ceil(totalDaily);
  }, [contacts, categorySettings]);

  const categoryBreakdown = useMemo(() => {
    if (contacts.length === 0 || categorySettings.length === 0) return [];
    const categoryContactCounts: Record<string, number> = {};
    contacts.forEach(contact => {
      const category = contact.labels[0];
      if (category) categoryContactCounts[category] = (categoryContactCounts[category] || 0) + 1;
    });
    return categorySettings.map(cat => ({
      name: cat.label_name, count: categoryContactCounts[cat.label_name] || 0, cadenceDays: cat.cadence_days,
      dailyNeeded: (categoryContactCounts[cat.label_name] || 0) > 0 && cat.cadence_days > 0 ? (categoryContactCounts[cat.label_name] || 0) / cat.cadence_days : 0,
    })).filter(b => b.count > 0);
  }, [contacts, categorySettings]);

  const handleSync = async () => { setIsSyncing(true); await new Promise(r => setTimeout(r, 2000)); setIsSyncing(false); toast({ title: "Sync complete", description: "Your Google Contacts have been synced." }); };
  
  const handleDailyContactsChange = (value: string) => { 
    setDailyContactsInput(value); 
    
    // Allow blank for Pro/Business users (null = dynamic)
    if (value === '' && canUseUnlimitedDaily) {
      updateMaxDailyContacts(null);
      return;
    }
    
    const numValue = parseInt(value); 
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 50) {
      updateMaxDailyContacts(numValue);
    }
  };
  
  const isDailyContactsValid = () => { 
    // Blank is valid for Pro/Business
    if (dailyContactsInput === '' && canUseUnlimitedDaily) return true;
    const numValue = parseInt(dailyContactsInput); 
    return !isNaN(numValue) && numValue >= 1 && numValue <= 50; 
  };
  
  const handleCadenceChange = async (categoryId: string, days: number) => { await updateCategorySetting(categoryId, { cadence_days: days }); };
  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) { toast({ title: 'Name required', description: 'Please enter a category name', variant: 'destructive' }); return; }
    const result = await addCategorySetting(newCategory.name.trim(), newCategory.description.trim(), newCategory.cadenceDays);
    if (result) { setNewCategory({ name: '', description: '', cadenceDays: 30 }); setIsAddingCategory(false); toast({ title: 'Category added', description: `"${result.label_name}" has been created.` }); }
  };
  const handleDeleteCategory = async (id: string, name: string) => { const success = await deleteCategorySetting(id); if (success) toast({ title: 'Category deleted', description: `"${name}" has been removed.` }); };
  const handleSave = () => { 
    if (!isDailyContactsValid()) { 
      toast({ title: 'Invalid value', description: 'Daily contacts must be between 1 and 50 (or blank for Pro/Business)', variant: 'destructive' }); 
      return; 
    } 
    toast({ title: "Settings saved", description: "Your preferences have been updated." }); 
  };
  
  const handleExport = async () => {
    if (!features.exportHistory && !isTrialActive) {
      toast({ title: 'Business feature', description: 'Upgrade to Business to export contact history', variant: 'destructive' });
      return;
    }
    setIsExporting(true);
    await exportContactHistory();
    setIsExporting(false);
  };

  const canExport = features.exportHistory || isTrialActive;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between animate-fade-in">
          <div className="space-y-1"><h1 className="text-3xl font-bold">Settings</h1><p className="text-muted-foreground">Customize how Keep In Touch works for you</p></div>
          {isTrialActive && daysLeftInTrial > 0 && (
            <Badge variant="secondary" className="gap-1">Trial: {daysLeftInTrial} days left</Badge>
          )}
        </div>

        {/* Export History - Business only */}
        <Card className="p-6 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Download className="w-5 h-5 text-primary" /></div>
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Export Contact History</h3>
                {!canExport && <Badge variant="outline" className="gap-1"><Lock className="w-3 h-3" />Business</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">Download a CSV of all your contact interactions</p>
              <Button variant="outline" onClick={handleExport} disabled={isExporting || !canExport} className="gap-2">
                {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {isExporting ? 'Exporting...' : 'Export to CSV'}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Users className="w-5 h-5 text-primary" /></div>
            <div className="flex-1 space-y-4">
              <div><h3 className="font-semibold">Google Contacts</h3><p className="text-sm text-muted-foreground">Connect to sync your contacts and their categories</p></div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={handleSync} disabled={isSyncing} className="gap-2"><RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />{isSyncing ? 'Syncing...' : 'Sync Now'}</Button>
                <Button variant="ghost" className="gap-2"><ExternalLink className="w-4 h-4" />Manage in Google</Button>
              </div>
              <p className="text-xs text-muted-foreground">Last synced: Just now (demo mode)</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Calendar className="w-5 h-5 text-primary" /></div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="font-semibold">Daily Contacts</h3>
                <p className="text-sm text-muted-foreground">
                  Maximum number of contacts to show each day on Today's screen
                  {canUseUnlimitedDaily && <span className="text-primary"> (leave blank for dynamic)</span>}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Input 
                  type="text" 
                  inputMode="numeric"
                  value={dailyContactsInput} 
                  onChange={(e) => handleDailyContactsChange(e.target.value)} 
                  className={`w-24 ${!isDailyContactsValid() ? 'border-destructive' : ''}`}
                  placeholder={canUseUnlimitedDaily ? "Auto" : "5"} 
                />
                <span className="text-sm text-muted-foreground">
                  {dailyContactsInput === '' && canUseUnlimitedDaily ? 'dynamic (all due contacts)' : 'contacts per day'}
                </span>
              </div>
              {!isDailyContactsValid() && dailyContactsInput !== '' && (
                <p className="text-sm text-destructive">Enter a number between 1 and 50{canUseUnlimitedDaily ? ' (or leave blank for dynamic)' : ''}</p>
              )}
              {dailyContactsInput === '' && canUseUnlimitedDaily && (
                <p className="text-xs text-success">✓ Dynamic mode: All birthday, follow-up, and cadence-due contacts will appear</p>
              )}
              {contacts.length > 0 && categorySettings.length > 0 && (
                <div className="mt-4 p-4 rounded-lg bg-muted/50 space-y-3">
                  <div className="flex items-center gap-2"><Calculator className="w-4 h-4 text-primary" /><span className="font-medium text-sm">Recommended: {recommendedDailyContacts} contacts/day</span></div>
                  <p className="text-xs text-muted-foreground">Based on your {contacts.length} contacts and their category cadences.</p>
                  {categoryBreakdown.length > 0 && (<div className="space-y-1 mt-2"><p className="text-xs font-medium text-muted-foreground">Breakdown by category:</p>{categoryBreakdown.map((item) => (<div key={item.name} className="text-xs text-muted-foreground flex justify-between"><span>{item.name} ({item.count} ÷ {item.cadenceDays} days)</span><span className="font-medium">≈ {item.dailyNeeded.toFixed(1)}/day</span></div>))}</div>)}
                  {settings.maxDailyContacts !== null && recommendedDailyContacts > settings.maxDailyContacts && (<Button variant="outline" size="sm" className="mt-2" onClick={() => { setDailyContactsInput(recommendedDailyContacts.toString()); updateMaxDailyContacts(recommendedDailyContacts); }}>Use recommended ({recommendedDailyContacts})</Button>)}
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6 animate-fade-in" style={{ animationDelay: '150ms' }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">{settings.sortOrder === 'random' ? <Shuffle className="w-5 h-5 text-primary" /> : <SortAsc className="w-5 h-5 text-primary" />}</div>
            <div className="flex-1 space-y-4">
              <div><h3 className="font-semibold">Today's Connections Order</h3><p className="text-sm text-muted-foreground">Choose how contacts appear on the Today screen</p></div>
              <Select value={settings.sortOrder} onValueChange={(v) => updateSortOrder(v as SortOrderType)}><SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="alphabetical">Alphabetical</SelectItem><SelectItem value="random">Random</SelectItem></SelectContent></Select>
            </div>
          </div>
        </Card>

        <Card className="p-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Tag className="w-5 h-5 text-primary" /></div>
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <div><h3 className="font-semibold">Category Cadence Definitions</h3><p className="text-sm text-muted-foreground">Set contact frequency for each category</p></div>
                <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}><DialogTrigger asChild><Button variant="outline" size="sm" className="gap-2"><Plus className="w-4 h-4" />Add Category</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Create Custom Category</DialogTitle></DialogHeader><div className="space-y-4 pt-4"><div className="space-y-2"><Label>Category Name</Label><Input placeholder="e.g., Mentors, Colleagues" value={newCategory.name} onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))} /></div><div className="space-y-2"><Label>Description (optional)</Label><Textarea placeholder="Describe who belongs in this category..." value={newCategory.description} onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))} rows={2} /></div><div className="space-y-2"><Label>Contact Every</Label><div className="flex items-center gap-2"><Input type="number" min={1} max={365} value={newCategory.cadenceDays} onChange={(e) => setNewCategory(prev => ({ ...prev, cadenceDays: parseInt(e.target.value) || 30 }))} className="w-24" /><span className="text-sm text-muted-foreground">days</span></div></div><div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setIsAddingCategory(false)}>Cancel</Button><Button onClick={handleAddCategory}>Create Category</Button></div></div></DialogContent></Dialog>
              </div>
              {isLoadingCategories ? (<div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>) : (
                <div className="space-y-3">{categorySettings.map((category) => (<div key={category.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="font-medium text-sm">{category.label_name}</span>{category.is_default && (<span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Default</span>)}</div>{category.description && (<p className="text-xs text-muted-foreground mt-0.5 truncate">{category.description}</p>)}</div><div className="flex items-center gap-2 shrink-0"><Input type="number" min={1} max={365} value={category.cadence_days} onChange={(e) => handleCadenceChange(category.id, parseInt(e.target.value) || 30)} className="w-20 text-center" /><span className="text-sm text-muted-foreground w-10">days</span>{!category.is_default ? (<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteCategory(category.id, category.label_name)}><Trash2 className="w-4 h-4" /></Button>) : <div className="w-8" />}</div></div>))}</div>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6 animate-fade-in" style={{ animationDelay: '250ms' }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Share2 className="w-5 h-5 text-primary" /></div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="font-semibold">Social Media Platforms</h3>
                <p className="text-sm text-muted-foreground">Choose which social media links to display on contact cards</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {SOCIAL_PLATFORMS.map((platform) => {
                  const Icon = platform.icon;
                  return (
                    <div
                      key={platform.key}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${platform.color}`} />
                        <span className="text-sm font-medium">{platform.name}</span>
                      </div>
                      <Switch
                        checked={settings.visibleSocialPlatforms[platform.key]}
                        onCheckedChange={() => toggleSocialPlatform(platform.key)}
                      />
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Enabled platforms will show on all contact cards when the contact has a link for that platform.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><MessageSquare className="w-5 h-5 text-primary" /></div>
            <div className="flex-1 space-y-4">
              <div><h3 className="font-semibold">AI Message Settings</h3><p className="text-sm text-muted-foreground">Customize how AI generates message suggestions</p></div>
              <div className="grid gap-4">
                <div className="space-y-2"><Label className="text-sm">Tone</Label><Select value={settings.aiTone} onValueChange={(v) => updateSettings({ aiTone: v as 'casual' | 'professional' | 'friendly' })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="casual">Casual</SelectItem><SelectItem value="friendly">Friendly</SelectItem><SelectItem value="professional">Professional</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label className="text-sm">Message Length</Label><Select value={settings.aiLength} onValueChange={(v) => updateSettings({ aiLength: v as 'short' | 'medium' | 'long' })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="short">Short (1-2 sentences)</SelectItem><SelectItem value="medium">Medium (2-3 sentences)</SelectItem><SelectItem value="long">Long (3-4 sentences)</SelectItem></SelectContent></Select></div>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-end animate-fade-in" style={{ animationDelay: '400ms' }}><Button onClick={handleSave} className="gap-2" disabled={!isDailyContactsValid()}><Check className="w-4 h-4" />Save Changes</Button></div>
      </div>
    </Layout>
  );
};

export default Settings;
