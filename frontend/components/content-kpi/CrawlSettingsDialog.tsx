'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Play, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CrawlSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (maxPages: number) => void;
  isLoading?: boolean;
}

export function CrawlSettingsDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: CrawlSettingsDialogProps) {
  const [maxPages, setMaxPages] = useState<number>(50);
  const [inputValue, setInputValue] = useState<string>('50');

  const handleSliderChange = (value: number[]) => {
    const newValue = value[0];
    setMaxPages(newValue);
    setInputValue(newValue.toString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 100) {
      setMaxPages(numValue);
    }
  };

  const handleInputBlur = () => {
    const numValue = parseInt(inputValue, 10);
    if (isNaN(numValue) || numValue < 1) {
      setMaxPages(1);
      setInputValue('1');
    } else if (numValue > 100) {
      setMaxPages(100);
      setInputValue('100');
    } else {
      setMaxPages(numValue);
      setInputValue(numValue.toString());
    }
  };

  const handleConfirm = () => {
    onConfirm(maxPages);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Analyze Website Content</DialogTitle>
          <DialogDescription>
            Choose how many pages to analyze. More pages provide better insights but take longer to process.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="maxPages">Number of pages to analyze</Label>
            <div className="flex items-center space-x-4">
              <Slider
                id="maxPages"
                min={1}
                max={100}
                step={1}
                value={[maxPages]}
                onValueChange={handleSliderChange}
                className="flex-1"
              />
              <Input
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                min={1}
                max={100}
                className="w-20"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Maximum: 100 pages
            </p>
          </div>

        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>Starting...</>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Analysis
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}