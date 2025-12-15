import { useState, useRef, useEffect } from 'react';
import { Phone, Check, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EditablePhoneProps {
  phone: string | undefined;
  onSave: (phone: string) => Promise<void>;
  className?: string;
}

export const EditablePhone = ({ phone, onSave, className }: EditablePhoneProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setValue(phone || '');
  }, [phone]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(value);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save phone:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(phone || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div 
        className={cn("flex items-center gap-1", className)}
        onClick={(e) => e.stopPropagation()}
      >
        <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <Input
          ref={inputRef}
          type="tel"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-6 text-sm py-0 px-1 w-32"
          placeholder="Phone number"
          disabled={isSaving}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Check className="w-3 h-3 text-success" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={handleCancel}
          disabled={isSaving}
        >
          <X className="w-3 h-3 text-destructive" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "h-7 px-2 -ml-2 gap-2 text-sm text-muted-foreground hover:text-foreground",
        className,
      )}
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
    >
      <Phone className="w-3.5 h-3.5" />
      <span className={cn(!phone && "italic")}>{phone || 'No phone'}</span>
    </Button>
  );
};
