import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Cpu, Check } from "lucide-react";
import { toast } from "sonner";
import type { AIModel } from "./types";
import type { Organization } from "@/lib/organization-api";

interface ModelsSectionProps {
  organization: Organization;
  availableModels: AIModel[];
  selectedModels: string[];
  onSelectedModelsChange: (models: string[]) => void;
  modelsLoading: boolean;
  token: string;
}

export function ModelsSection({
  organization,
  availableModels,
  selectedModels,
  onSelectedModelsChange,
  modelsLoading,
  token,
}: ModelsSectionProps) {
  const [isUpdatingModels, setIsUpdatingModels] = useState(false);
  const [localSelectedModels, setLocalSelectedModels] = useState(selectedModels);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  const handleModelToggle = (modelId: string, checked: boolean) => {
    if (checked) {
      if (localSelectedModels.length < organization.planSettings.maxAIModels) {
        setLocalSelectedModels([...localSelectedModels, modelId]);
      }
    } else {
      setLocalSelectedModels(localSelectedModels.filter((id) => id !== modelId));
    }
  };

  const handleSaveModels = async () => {
    setIsUpdatingModels(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/user/organization/models`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ selectedModels: localSelectedModels }),
        }
      );
      
      if (!response.ok) {
        throw new Error("Failed to update models");
      }
      
      onSelectedModelsChange(localSelectedModels);
      toast.success("AI models updated successfully");
    } catch (err) {
      console.error("Failed to update models:", err);
      toast.error("Failed to update AI models");
    } finally {
      setIsUpdatingModels(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="h-5 w-5" />
          AI Models
        </CardTitle>
      </CardHeader>
      <CardContent>
        {modelsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Select up to {organization.planSettings.maxAIModels} AI models for your organization
              </p>
              <Badge variant="secondary">
                {localSelectedModels.length} / {organization.planSettings.maxAIModels} selected
              </Badge>
            </div>
            
            <div className="space-y-2">
              {availableModels.map((model) => (
                <div
                  key={model.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={model.id}
                      checked={localSelectedModels.includes(model.id)}
                      onCheckedChange={(checked) => 
                        handleModelToggle(model.id, checked as boolean)
                      }
                      disabled={
                        !localSelectedModels.includes(model.id) &&
                        localSelectedModels.length >= organization.planSettings.maxAIModels
                      }
                    />
                    <Label
                      htmlFor={model.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <span className="font-medium">{model.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {model.provider}
                      </Badge>
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={model.webAccess ? "default" : "secondary"} 
                      className="text-xs"
                    >
                      {model.webAccess ? "Web" : "No Web"}
                    </Badge>
                    {model.enabled ? (
                      <Badge variant="default" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Available
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Disabled
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSaveModels}
                disabled={isUpdatingModels}
              >
                {isUpdatingModels ? "Updating..." : "Save Model Selection"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}