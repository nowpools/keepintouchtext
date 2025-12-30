import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AppSettings } from '@/types/contact';

export function useAIMessage() {
  const [isGenerating, setIsGenerating] = useState(false);

  const getSettings = (): Pick<AppSettings, 'aiTone' | 'aiLength'> => {
    try {
      const saved = localStorage.getItem('kitSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          aiTone: parsed.aiTone || 'friendly',
          aiLength: parsed.aiLength || 'medium',
        };
      }
    } catch {
      // Ignore parse errors
    }
    return { aiTone: 'friendly', aiLength: 'medium' };
  };

  const generateMessage = async (
    contactName: string,
    contactNotes?: string,
    lastContacted?: Date | null,
    linkedinUrl?: string,
    conversationContext?: string,
    xUrl?: string,
    youtubeUrl?: string,
    isBirthday?: boolean
  ): Promise<string | null> => {
    setIsGenerating(true);
    
    try {
      const settings = getSettings();
      
      const { data, error } = await supabase.functions.invoke('generate-message', {
        body: {
          contactName,
          contactNotes,
          linkedinUrl,
          xUrl,
          youtubeUrl,
          conversationContext,
          lastContacted: lastContacted?.toISOString() || null,
          tone: settings.aiTone,
          length: settings.aiLength,
          isBirthday: isBirthday || false,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast({
          title: 'Generation failed',
          description: data.error,
          variant: 'destructive',
        });
        return null;
      }

      return data?.message || null;
    } catch (error) {
      console.error('Error generating message:', error);
      toast({
        title: 'Could not generate message',
        description: 'Please try again or write your own message',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return { generateMessage, isGenerating };
}
