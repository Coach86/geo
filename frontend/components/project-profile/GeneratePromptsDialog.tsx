import React, { useState, useEffect } from 'react';
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
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SvgLoader } from "@/components/ui/svg-loader";
import { generatePromptsFromKeywords, regeneratePromptType } from "@/lib/auth-api";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/auth-provider";
import { PromptGenerationMethod } from "./PromptGenerationMethod";
import { KeywordsInput } from "./KeywordsInput";
import { PromptCountSelect } from "./PromptCountSelect";

interface GeneratePromptsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  promptType: 'visibility' | 'sentiment' | 'alignment' | 'competition';
  currentPrompts: string[];
  onPromptsGenerated: (prompts: string[]) => void;
  maxSpontaneousPrompts?: number;
  initialMethod?: 'ai' | 'keywords';
}

export function GeneratePromptsDialog({
  open,
  onOpenChange,
  projectId,
  promptType,
  currentPrompts,
  onPromptsGenerated,
  maxSpontaneousPrompts,
  initialMethod = 'ai',
}: GeneratePromptsDialogProps) {
  const { token } = useAuth();
  const router = useRouter();
  const [generationMethod, setGenerationMethod] = useState<'ai' | 'keywords'>(initialMethod);
  const [keywords, setKeywords] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [promptCount, setPromptCount] = useState('12');
  const [isGenerating, setIsGenerating] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  // Update generation method when initialMethod prop changes
  useEffect(() => {
    setGenerationMethod(initialMethod);
  }, [initialMethod]);

  const handleGenerateFromKeywords = async () => {
    if (!token) {
      toast({
        title: "Authentication required",
        description: "Please log in to generate prompts",
        variant: "destructive",
      });
      return;
    }

    const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k);
    if (keywordList.length === 0) {
      toast({
        title: "Keywords required",
        description: "Please enter at least one keyword",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generatePromptsFromKeywords(
        {
          projectId,
          keywords: keywordList,
          promptType,
          additionalInstructions: additionalInstructions.trim() || undefined,
          count: parseInt(promptCount),
        },
        token
      );

      onPromptsGenerated(result.prompts);
      toast({
        title: "Prompts generated",
        description: `Successfully generated ${result.prompts.length} ${promptType} prompts from keywords`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to generate prompts from keywords:", error);
      toast({
        title: "Generation failed",
        description: "Failed to generate prompts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateWithAI = async () => {
    if (!token) {
      toast({
        title: "Authentication required",
        description: "Please log in to generate prompts",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await regeneratePromptType(
        projectId,
        promptType,
        token,
        parseInt(promptCount),
        additionalInstructions.trim() || undefined,
      );

      onPromptsGenerated(result.prompts);
      toast({
        title: "Prompts generated",
        description: `Successfully generated ${result.prompts.length} ${promptType} prompts`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to generate prompts:", error);
      toast({
        title: "Generation failed",
        description: "Failed to generate prompts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };


  const handleGenerate = () => {
    const count = parseInt(promptCount);

    // Check if user is trying to generate more prompts than allowed
    if (promptType === 'visibility' && maxSpontaneousPrompts && count > maxSpontaneousPrompts) {
      onOpenChange(false);
      router.push("/update-plan");
      return;
    }

    if (generationMethod === 'keywords') {
      handleGenerateFromKeywords();
    } else {
      handleGenerateWithAI();
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Create {promptType.charAt(0).toUpperCase() + promptType.slice(1)} Prompts</DialogTitle>
          <DialogDescription>
            Choose how to generate your prompts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Generation Method Selection */}
          <PromptGenerationMethod
            value={generationMethod}
            onChange={setGenerationMethod}
          />

          {/* Prompt Count Selection */}
          <PromptCountSelect
            value={promptCount}
            onChange={setPromptCount}
            promptType={promptType}
            maxSpontaneousPrompts={maxSpontaneousPrompts}
          />

          {/* Keywords Input (only for keyword method) */}
          {generationMethod === 'keywords' && (
            <KeywordsInput
              keywords={keywords}
              onKeywordsChange={setKeywords}
              csvFile={csvFile}
              onCsvFileChange={setCsvFile}
            />
          )}

          {/* Additional Instructions */}
          <div className="space-y-2">
            <Label>Additional Instructions (Optional)</Label>
            <Textarea
              placeholder={ "e.g., Focus on a line of products"}
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Provide specific guidance to tailor the prompt generation
            </p>
          </div>

          {/* Warning */}
          <Alert className="bg-amber-50 border-amber-200 text-amber-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This will replace all your current {currentPrompts.length} {promptType} prompts.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || (generationMethod === 'keywords' && !keywords.trim())}
          >
            {isGenerating ? (
              <>
                <SvgLoader className="mr-2" size="sm" />
                Generating...
              </>
            ) : (
              'Generate Prompts'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
