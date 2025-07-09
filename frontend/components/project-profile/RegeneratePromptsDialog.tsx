import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RegeneratePromptsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promptType: 'visibility' | 'sentiment' | 'alignment' | 'competition';
  onConfirm: (count: number, additionalInstructions?: string) => Promise<void>;
  currentPromptCount: number;
  maxSpontaneousPrompts?: number;
}

export function RegeneratePromptsDialog({
  open,
  onOpenChange,
  promptType,
  onConfirm,
  currentPromptCount,
  maxSpontaneousPrompts,
}: RegeneratePromptsDialogProps) {
  const router = useRouter();
  const [selectedCount, setSelectedCount] = useState("15");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [additionalInstructions, setAdditionalInstructions] = useState("");

  const countOptions = promptType === 'visibility' 
    ? [
        { value: "12", label: "12 prompts" },
        { value: "15", label: "15 prompts" },
        { value: "30", label: "30 prompts" },
        { value: "50", label: "50 prompts" },
      ]
    : [
        { value: "3", label: "3 prompts" },
        { value: "5", label: "5 prompts" },
        { value: "10", label: "10 prompts" },
      ];

  const handleRegenerate = async () => {
    const count = parseInt(selectedCount);
    
    // Check if user is trying to generate more prompts than allowed
    if (promptType === 'visibility' && maxSpontaneousPrompts && count > maxSpontaneousPrompts) {
      onOpenChange(false);
      router.push("/update-plan");
      return;
    }
    
    setIsRegenerating(true);
    try {
      await onConfirm(count, additionalInstructions.trim() || undefined);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to regenerate prompts:", error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const getTitle = () => {
    switch (promptType) {
      case 'visibility':
        return 'Regenerate Visibility Prompts';
      case 'sentiment':
        return 'Regenerate Sentiment Prompts';
      case 'alignment':
        return 'Regenerate Alignment Prompts';
      case 'competition':
        return 'Regenerate Competition Prompts';
      default:
        return 'Regenerate Prompts';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            {getTitle()}
          </DialogTitle>
          <DialogDescription>
            Choose how many prompts to generate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="bg-amber-50 border-amber-200 text-amber-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This will replace all your current {currentPromptCount} {promptType} prompts. This action cannot be undone.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Label>Number of prompts to generate:</Label>
            <RadioGroup value={selectedCount} onValueChange={setSelectedCount}>
              {countOptions.map((option) => {
                const optionCount = parseInt(option.value);
                const requiresUpgrade = promptType === 'visibility' && maxSpontaneousPrompts && optionCount > maxSpontaneousPrompts;
                
                return (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label
                      htmlFor={option.value}
                      className="text-sm font-normal cursor-pointer flex items-center gap-2"
                    >
                      {option.label}
                      {requiresUpgrade && (
                        <span className="text-xs text-muted-foreground">(Upgrade required)</span>
                      )}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Additional Instructions (Optional)</Label>
            <Textarea
              placeholder="e.g., Focus on technical aspects of the product"
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Provide specific guidance to tailor the prompt generation
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRegenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isRegenerating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate Prompts
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}