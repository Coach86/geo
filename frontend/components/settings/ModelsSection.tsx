import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Cpu, Check, Crown, Lock } from "lucide-react";
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
  const router = useRouter();
  const [isUpdatingModels, setIsUpdatingModels] = useState(false);
  const [localSelectedModels, setLocalSelectedModels] = useState(selectedModels);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  const handleModelToggle = (modelId: string, checked: boolean, model: AIModel) => {
    // Check if this is a premium model and user is on free plan
    // Free plans are identified by having no stripe subscription or inactive subscription
    const isPaidPlan = !!organization.stripeSubscriptionId && organization.subscriptionStatus === 'active';
    if (checked && model.premium && !isPaidPlan) {
      toast.error(`${model.name} is a premium model. Please upgrade your plan to access it.`);
      return;
    }

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
        const errorData = await response.json().catch(() => ({ message: "Failed to update models" }));
        throw new Error(errorData.message || "Failed to update models");
      }
      
      onSelectedModelsChange(localSelectedModels);
      toast.success("AI models updated successfully");
    } catch (err: any) {
      console.error("Failed to update models:", err);
      toast.error(err.message || "Failed to update AI models");
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
              {availableModels
                .filter((model) => model.enabled)
                .map((model) => {
                  const isPaidPlan = !!organization.stripeSubscriptionId && organization.subscriptionStatus === 'active';
                  const isPremiumLocked = model.premium && !isPaidPlan;
                  
                  return (
                  <div
                    key={model.id}
                    className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                      isPremiumLocked
                        ? 'opacity-60 bg-muted/30'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={model.id}
                        checked={localSelectedModels.includes(model.id)}
                        onCheckedChange={(checked) => 
                          handleModelToggle(model.id, checked as boolean, model)
                        }
                        disabled={
                          isPremiumLocked ||
                          (!localSelectedModels.includes(model.id) &&
                          localSelectedModels.length >= organization.planSettings.maxAIModels)
                        }
                      />
                      <Label
                        htmlFor={model.id}
                        className={`flex items-center gap-2 ${
                          isPremiumLocked
                            ? 'cursor-not-allowed'
                            : 'cursor-pointer'
                        }`}
                      >
                        <span className="font-medium">
                          {model.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {model.provider}
                        </Badge>
                        {model.premium && (
                          <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                            Premium
                          </Badge>
                        )}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={model.webAccess ? "default" : "secondary"} 
                        className="text-xs pointer-events-none"
                      >
                        {model.webAccess ? "Web" : "No Web"}
                      </Badge>
                      {isPremiumLocked ? (
                        <Badge 
                          variant="secondary" 
                          className="px-2 py-1 text-xs bg-purple-100 text-purple-700 cursor-pointer hover:bg-purple-200 transition-colors"
                          onClick={() => router.push('/update-plan')}
                        >
                          Upgrade
                        </Badge>
                      ) : (
                        <Badge variant="default" className="text-xs pointer-events-none">
                          <Check className="h-3 w-3 mr-1" />
                          Available
                        </Badge>
                      )}
                    </div>
                  </div>
                  );
                })}
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