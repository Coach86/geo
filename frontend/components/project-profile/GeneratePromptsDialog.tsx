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
import { AlertCircle, RefreshCw, Plus, Sparkles, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SvgLoader } from "@/components/ui/svg-loader";
import { generatePromptsFromKeywords, regeneratePromptType } from "@/lib/auth-api";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/auth-provider";
import { PromptGenerationMethod } from "./PromptGenerationMethod";
import { KeywordsInput } from "./KeywordsInput";
import { PromptCountSelect } from "./PromptCountSelect";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface GeneratePromptsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  promptType: 'visibility' | 'sentiment' | 'alignment' | 'competition';
  currentPrompts: string[];
  onPromptsGenerated: (prompts: string[]) => void;
  maxSpontaneousPrompts?: number;
  initialMethod?: 'ai' | 'keywords';
  projectObjectives?: string;
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
  projectObjectives,
}: GeneratePromptsDialogProps) {
  const { token } = useAuth();
  const router = useRouter();
  const [generationMethod, setGenerationMethod] = useState<'ai' | 'keywords'>(initialMethod);
  const [keywords, setKeywords] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState(projectObjectives || '');
  const defaultPromptCount = promptType === 'visibility' ? '12' : '3';
  const [promptCount, setPromptCount] = useState(defaultPromptCount);
  const [isGenerating, setIsGenerating] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isAddMode, setIsAddMode] = useState(false); // Default to replace mode
  // Update generation method when initialMethod prop changes
  useEffect(() => {
    setGenerationMethod(initialMethod);
  }, [initialMethod]);

  // Update additional instructions when projectObjectives changes or dialog opens
  useEffect(() => {
    if (open && projectObjectives) {
      setAdditionalInstructions(projectObjectives);
    }
  }, [open, projectObjectives]);

  // Calculate remaining prompts that can be added
  const remainingPrompts = promptType === 'visibility' && maxSpontaneousPrompts
    ? Math.max(0, maxSpontaneousPrompts - currentPrompts.length)
    : Infinity;
  const [canAddPrompts, setCanAddPrompts] = useState(remainingPrompts > 0);


  // Adjust prompt count if in add mode and it exceeds remaining or is 0
  useEffect(() => {
    if (isAddMode) {
      const currentCount = parseInt(promptCount) || 0;
      if (currentCount === 0) {
        setPromptCount('1');
      } else if (remainingPrompts > 0 && currentCount > remainingPrompts) {
        setPromptCount(remainingPrompts.toString());
      }
    }
  }, [isAddMode, remainingPrompts]); // Remove promptCount from dependencies to avoid infinite loop

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
          addMode: isAddMode,
        },
        token
      );

      if (isAddMode) {
        // Combine existing prompts with new ones
        const combinedPrompts = [...currentPrompts, ...result.prompts];
        onPromptsGenerated(combinedPrompts);
        toast({
          title: "Prompts added",
          description: `Successfully added ${result.prompts.length} ${promptType} prompts`,
        });
      } else {
        onPromptsGenerated(result.prompts);
        toast({
          title: "Prompts generated",
          description: `Successfully generated ${result.prompts.length} ${promptType} prompts from keywords`,
        });
      }
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
        undefined, // keywords
        isAddMode,
      );

      if (isAddMode) {
        // Combine existing prompts with new ones
        const combinedPrompts = [...currentPrompts, ...result.prompts];
        onPromptsGenerated(combinedPrompts);
        toast({
          title: "Prompts added",
          description: `Successfully added ${result.prompts.length} ${promptType} prompts`,
        });
      } else {
        onPromptsGenerated(result.prompts);
        toast({
          title: "Prompts generated",
          description: `Successfully generated ${result.prompts.length} ${promptType} prompts`,
        });
      }
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
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Generation Method Selection */}
          <PromptGenerationMethod
            value={generationMethod}
            onChange={setGenerationMethod}
          />

          {/* Mode and Prompt Count Selection */}
          {promptType === 'visibility' && currentPrompts.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {/* Mode Toggle - Left Column */}
              <div className="space-y-2">
                <Label>Mode</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Replace existing prompts</span>
                  <Switch
                    id="add-mode"
                    checked={isAddMode}
                    onCheckedChange={(checked) => {
                      setIsAddMode(checked);
                      // Restore default prompt count when switching back to replace mode
                      if (!checked) {
                        setPromptCount(defaultPromptCount);
                      }
                    }}
                    className="data-[state=checked]:bg-green-600"
                  />
                  <span className="text-sm text-muted-foreground">Create additional prompts</span>
                </div>
              </div>

              {/* Number Input - Right Column */}
              <div className="space-y-2">
                {isAddMode ? (
                  <>
                    <Label>Number of prompts</Label>
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        type="number"
                        value={promptCount}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 1;
                          if (value >= 1) {
                            setPromptCount(value.toString());
                            setCanAddPrompts(value <= remainingPrompts);
                          }
                        }}
                        min={1}
                        max={100}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {remainingPrompts > 0
                        ? `You can add up to ${remainingPrompts} more prompts (${currentPrompts.length}/${maxSpontaneousPrompts} used)`
                        : `Limit reached (${currentPrompts.length}/${maxSpontaneousPrompts} used) - Upgrade to add more`
                      }
                    </p>
                  </div>
                  </>
                ) : (
                  <PromptCountSelect
                    value={promptCount}
                    onChange={setPromptCount}
                    promptType={promptType}
                    maxSpontaneousPrompts={maxSpontaneousPrompts}
                  />
                )}
              </div>
            </div>
          ) : (
            /* For non-visibility prompts or when no existing prompts, show full width */
            <PromptCountSelect
              value={promptCount}
              onChange={setPromptCount}
              promptType={promptType}
              maxSpontaneousPrompts={maxSpontaneousPrompts}
              label="Number of prompts"
            />
          )}

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
            <Label>Project Objectives (Optional)</Label>
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
          {!isAddMode && currentPrompts.length > 0 && (
            <Alert className="bg-amber-50 border-amber-200 text-amber-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> This will replace all your current {currentPrompts.length} {promptType} prompts.
              </AlertDescription>
            </Alert>
          )}

        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          {isAddMode && !canAddPrompts ? (
            <Badge
              variant="secondary"
              className="px-4 py-2 text-sm bg-purple-100 text-purple-700 cursor-pointer hover:bg-purple-200 transition-colors flex items-center"
              onClick={() => {
                onOpenChange(false);
                router.push('/update-plan');
              }}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Upgrade to Add More
            </Badge>
          ) : (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || (generationMethod === 'keywords' && !keywords.trim()) || parseInt(promptCount) === 0}
            >
              {isGenerating ? (
                <>
                  <SvgLoader className="mr-2" size="sm" />
                  {isAddMode ? 'Adding...' : 'Generating...'}
                </>
              ) : (
                isAddMode ? `Add ${promptCount} Prompts` : 'Generate Prompts'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
