import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Linkedin, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LinkedInDialogProps {
  linkedinUrl: string | null;
  contactName: string;
}

export const LinkedInDialog = ({ linkedinUrl, contactName }: LinkedInDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const { toast } = useToast();

  const fetchLinkedInData = async () => {
    if (!linkedinUrl) return;
    
    setIsLoading(true);
    setOpen(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('fetch-linkedin', {
        body: { linkedinUrl }
      });

      if (error) throw error;
      
      if (data?.success) {
        setContent(data.content);
        setTitle(data.title || contactName);
      } else {
        throw new Error(data?.error || 'Failed to fetch LinkedIn data');
      }
    } catch (error) {
      console.error('Error fetching LinkedIn:', error);
      toast({
        title: "Failed to load LinkedIn",
        description: error instanceof Error ? error.message : "Could not fetch profile",
        variant: "destructive"
      });
      setContent(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (!linkedinUrl) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          fetchLinkedInData();
        }}
        title="View LinkedIn Profile"
        className="h-8 w-8"
      >
        <Linkedin className="w-4 h-4 text-[#0A66C2]" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Linkedin className="w-5 h-5 text-[#0A66C2]" />
              {title || contactName}'s LinkedIn
            </DialogTitle>
          </DialogHeader>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Fetching LinkedIn profile...</span>
            </div>
          ) : content ? (
            <ScrollArea className="h-[60vh] pr-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {content}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(linkedinUrl, '_blank')}
                  className="gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in LinkedIn
                </Button>
              </div>
            </ScrollArea>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <p>Could not load LinkedIn profile content.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(linkedinUrl, '_blank')}
                className="mt-4 gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open in LinkedIn
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
