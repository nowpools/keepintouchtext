import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquareText, Save } from 'lucide-react';

interface ConversationContextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  initialContext: string;
  onSave: (context: string) => void;
}

export function ConversationContextDialog({
  open,
  onOpenChange,
  contactName,
  initialContext,
  onSave,
}: ConversationContextDialogProps) {
  const [context, setContext] = useState(initialContext);

  useEffect(() => {
    if (open) {
      setContext(initialContext);
    }
  }, [open, initialContext]);

  const handleSave = () => {
    onSave(context);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5" />
            Conversation Context for {contactName}
          </DialogTitle>
          <DialogDescription>
            Paste previous conversations or notes here to help the AI generate more personalized messages.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Textarea
            placeholder="Paste conversation snippets, topics you've discussed, shared interests, or any context that would help personalize messages..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="min-h-[200px] resize-none"
          />
          <p className="text-xs text-muted-foreground">
            This context will be used by the AI to craft more relevant and personal message suggestions.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Context
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
