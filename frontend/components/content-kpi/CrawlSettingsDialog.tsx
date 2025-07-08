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
import { Play, Info, ChevronDown, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface CrawlSettings {
  maxPages: number;
  userAgent?: string;
  includePatterns?: string[];
  excludePatterns?: string[];
  mode?: 'auto' | 'manual';
  manualUrls?: string[];
}

interface CrawlSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (settings: CrawlSettings) => void;
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
  const [userAgent, setUserAgent] = useState<string>('');
  const [includePatterns, setIncludePatterns] = useState<string>('');
  const [excludePatterns, setExcludePatterns] = useState<string>('');
  const [crawlMode, setCrawlMode] = useState<'auto' | 'manual'>('auto');
  const [manualUrls, setManualUrls] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);

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
    // For automatic crawl, show confirmation dialog first
    if (crawlMode === 'auto') {
      setShowConfirmation(true);
      return;
    }
    
    // For manual crawl, proceed directly
    proceedWithCrawl();
  };

  const proceedWithCrawl = () => {
    const settings: CrawlSettings = {
      maxPages: crawlMode === 'manual' ? manualUrls.split('\n').filter(u => u.trim()).length : maxPages,
      mode: crawlMode,
      ...(crawlMode === 'manual' && { manualUrls: manualUrls.split('\n').filter(u => u.trim()) }),
      ...(userAgent && { userAgent }),
      ...(includePatterns && { includePatterns: includePatterns.split('\n').filter(p => p.trim()) }),
      ...(excludePatterns && { excludePatterns: excludePatterns.split('\n').filter(p => p.trim()) }),
    };
    setShowConfirmation(false);
    onConfirm(settings);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Analyze Website Content</DialogTitle>
            <DialogDescription>
              Choose how to analyze your website content.
            </DialogDescription>
          </DialogHeader>
        
        <div className="space-y-6 py-4">
          <RadioGroup value={crawlMode} onValueChange={(value) => setCrawlMode(value as 'auto' | 'manual')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="auto" id="auto" />
              <Label htmlFor="auto" className="font-normal cursor-pointer">
                Automatic crawl (discover pages automatically)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="manual" id="manual" />
              <Label htmlFor="manual" className="font-normal cursor-pointer">
                Manual URLs (analyze specific pages only)
              </Label>
            </div>
          </RadioGroup>
          {crawlMode === 'auto' ? (
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
          ) : (
            <div className="space-y-2">
              <Label htmlFor="manualUrls">URLs to analyze</Label>
              <Textarea
                id="manualUrls"
                placeholder="https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3"
                value={manualUrls}
                onChange={(e) => setManualUrls(e.target.value)}
                rows={5}
                className="font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                Enter one URL per line. Only URLs from the project domain will be crawled.
                {manualUrls && (
                  <span className="block mt-1">
                    {manualUrls.split('\n').filter(u => u.trim()).length} URL(s) entered
                  </span>
                )}
              </p>
            </div>
          )}

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="advanced">
              <AccordionTrigger className="text-sm">
                Advanced Settings
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="userAgent">Custom User-Agent (optional)</Label>
                  <Input
                    id="userAgent"
                    placeholder="e.g., MyBot/1.0 (+https://example.com/bot)"
                    value={userAgent}
                    onChange={(e) => setUserAgent(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Override the default crawler user-agent
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="includePatterns">URL Include Patterns (optional)</Label>
                  <Textarea
                    id="includePatterns"
                    placeholder="/blog/.*&#10;/products/.*&#10;.*\.html$"
                    value={includePatterns}
                    onChange={(e) => setIncludePatterns(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Only crawl URLs matching these regex patterns (one per line)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="excludePatterns">URL Exclude Patterns (optional)</Label>
                  <Textarea
                    id="excludePatterns"
                    placeholder="/admin/.*&#10;.*\.(pdf|doc|xls)$&#10;/private/.*"
                    value={excludePatterns}
                    onChange={(e) => setExcludePatterns(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Skip URLs matching these regex patterns (one per line)
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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

      {/* Confirmation Dialog for Automatic Crawl */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Automatic Crawl
            </DialogTitle>
            <DialogDescription>
              This action will replace all existing page analysis data for this project.
            </DialogDescription>
          </DialogHeader>
          
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Starting an automatic crawl will permanently delete all previous page analysis data and scores for this project. This action cannot be undone.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              The system will:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Delete all existing page content scores</li>
              <li>• Remove previous crawl data</li>
              <li>• Discover and analyze up to {maxPages} pages automatically</li>
              <li>• Generate new scores and insights</li>
            </ul>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={proceedWithCrawl}
              disabled={isLoading}
            >
              {isLoading ? (
                <>Deleting & Starting...</>
              ) : (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Delete Data & Start Crawl
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}