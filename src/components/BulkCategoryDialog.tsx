import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CategorySetting } from '@/types/labelSettings';
import { Loader2, Tag } from 'lucide-react';

interface BulkCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategorySetting[];
  selectedCount: number;
  onApply: (categoryName: string) => Promise<void>;
}

export const BulkCategoryDialog = ({
  open,
  onOpenChange,
  categories,
  selectedCount,
  onApply,
}: BulkCategoryDialogProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    if (!selectedCategory) return;
    
    setIsApplying(true);
    try {
      await onApply(selectedCategory);
      onOpenChange(false);
      setSelectedCategory('');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Apply Category
          </DialogTitle>
          <DialogDescription>
            Apply a category to {selectedCount} selected contact{selectedCount !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup value={selectedCategory} onValueChange={setSelectedCategory}>
            <div className="space-y-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedCategory(category.label_name)}
                >
                  <RadioGroupItem value={category.label_name} id={category.id} />
                  <div className="flex-1">
                    <Label htmlFor={category.id} className="font-medium cursor-pointer">
                      {category.label_name}
                    </Label>
                    {category.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {category.description}
                      </p>
                    )}
                    <p className="text-xs text-primary mt-1">
                      Contact every {category.cadence_days} days
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!selectedCategory || isApplying}>
            {isApplying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Apply Category
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
