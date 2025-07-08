import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, Settings, RefreshCw } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EditableList } from "./EditableList";
import { RegeneratePromptsDialog } from "./RegeneratePromptsDialog";
import { useAuth } from "@/providers/auth-provider";
import { regeneratePromptType } from "@/lib/auth-api";
import { toast } from "@/hooks/use-toast";
import { SvgLoader } from "@/components/ui/svg-loader";

interface PromptsDisplayProps {
  prompts: string[];
  type: "visibility" | "alignment" | "sentiment";
  projectId: string;
  onUpdate?: (prompts: string[]) => void;
  canAdd?: boolean;
  maxPrompts?: number;
  onAddClick?: () => void;
  onRegenerateComplete?: () => void;
  maxSpontaneousPrompts?: number;
}

export function PromptsDisplay({
  prompts,
  type,
  projectId,
  onUpdate,
  canAdd = false,
  maxPrompts,
  onAddClick,
  onRegenerateComplete,
  maxSpontaneousPrompts,
}: PromptsDisplayProps) {
  const { token } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isRegenerateDialogOpen, setIsRegenerateDialogOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const isAtLimit = maxPrompts ? prompts.length >= maxPrompts : false;
  const displayThreshold = 5;
  const displayedPrompts = prompts.slice(0, displayThreshold);
  const hiddenCount = Math.max(0, prompts.length - displayThreshold);
  
  const titles = {
    visibility: "Visibility Prompts",
    alignment: "Alignment Prompts",
    sentiment: "Sentiment Prompts",
  };

  const placeholders = {
    visibility: "Enter your new visibility prompt...",
    alignment: "Enter your new alignment prompt...",
    sentiment: "Enter your new sentiment prompt...",
  };

  const buttonLabels = {
    visibility: "Add Visibility Prompt",
    alignment: "Add Alignment Prompt",
    sentiment: "Add Sentiment Prompt",
  };

  const bgColors = {
    visibility: "gray",
    alignment: "gray",
    sentiment: "gray",
  } as const;

  const handleRegenerate = async (count: number) => {
    if (!token) {
      toast({
        title: "Authentication required",
        description: "Please log in to regenerate prompts",
        variant: "destructive",
      });
      return;
    }

    setIsRegenerating(true);
    try {
      const result = await regeneratePromptType(projectId, type, token, count);
      
      // Update the prompts immediately with the regenerated ones
      if (onUpdate && result.prompts) {
        onUpdate(result.prompts);
      }
      
      toast({
        title: "Prompts regenerated",
        description: `Successfully regenerated ${result.prompts.length} ${type} prompts`,
      });

      // Call the onRegenerateComplete callback to refresh the entire prompt set
      if (onRegenerateComplete) {
        await onRegenerateComplete();
      }

      // Close the regenerate dialog
      setIsRegenerateDialogOpen(false);
    } catch (error) {
      console.error("Failed to regenerate prompts:", error);
      toast({
        title: "Regeneration failed",
        description: "Failed to regenerate prompts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">{titles[type]}</h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs hover:bg-gray-100"
            onClick={() => setIsDrawerOpen(true)}
          >
            <Settings className="h-3 w-3 mr-1" />
            Manage
          </Button>
        </div>
        
        {/* Display first 5 prompts */}
        <div className="space-y-2">
          {displayedPrompts.length > 0 ? (
            displayedPrompts.map((prompt, index) => (
              <div
                key={index}
                className="px-3 py-3 bg-gray-50 hover:bg-gray-100 rounded-md text-sm text-gray-700 transition-colors min-h-[2.75rem] flex items-center"
              >
                {prompt}
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400 italic px-3 py-3 min-h-[2.75rem] flex items-center">
              No {type} prompts defined
            </p>
          )}
          
          {/* Show hidden count */}
          {hiddenCount > 0 && (
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors flex items-center"
            >
              <ChevronRight className="h-3 w-3 mr-1" />
              {hiddenCount} more
            </button>
          )}
        </div>
      </div>

      {/* Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{titles[type]}</SheetTitle>
            <SheetDescription>
              Manage your {type} prompts. {canAdd && type === "visibility" && "You can add, edit, or remove prompts."}
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-4">
            {type === "visibility" && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRegenerateDialogOpen(true)}
                  className="text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Regenerate Prompts
                </Button>
              </div>
            )}
            
            <div className="relative">
            {isRegenerating && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                <div className="flex flex-col items-center gap-2">
                  <SvgLoader size="md" />
                  <span className="text-sm text-muted-foreground">Regenerating prompts...</span>
                </div>
              </div>
            )}
            <EditableList
              title=""
              items={prompts}
              onUpdate={onUpdate}
              canAdd={canAdd && type === "visibility"}
              canExpand={false}
              onAddClick={onAddClick}
              isAtLimit={isAtLimit}
              limitMessage="(Upgrade required)"
              itemCount={`${prompts.length}${maxPrompts ? `/${maxPrompts}` : ''} prompts`}
              placeholder={placeholders[type]}
              emptyMessage={`No ${type} prompts defined`}
              bgColor={bgColors[type]}
              inputType="textarea"
              addButtonLabel={buttonLabels[type]}
            />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Regenerate Dialog */}
      <RegeneratePromptsDialog
        open={isRegenerateDialogOpen}
        onOpenChange={setIsRegenerateDialogOpen}
        promptType={type}
        onConfirm={handleRegenerate}
        currentPromptCount={prompts.length}
        maxSpontaneousPrompts={maxSpontaneousPrompts}
      />
    </>
  );
}