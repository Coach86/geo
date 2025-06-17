import { useState } from "react";
import { useRouter } from "next/navigation";
import { StepId } from "@/app/onboarding/steps.config";
import { createProject, type CreateFullProjectRequest, runManualAnalysis } from "@/lib/auth-api";
import { getOnboardingData } from "@/lib/onboarding-storage";
import type { FormData } from "@/providers/onboarding-provider";
import { getMyOrganization } from "@/lib/organization-api";
import { usePlans } from "@/hooks/use-plans";

interface UseSubmissionProps {
  token: string | null;
  authLoading: boolean;
  setCurrentStep: (step: StepId) => void;
}

export function useSubmission({
  token,
  authLoading,
  setCurrentStep,
}: UseSubmissionProps) {
  const router = useRouter();
  const { plans } = usePlans();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const handleGenerateReport = async (allConfigs: FormData[]) => {
    console.log('[useSubmission] handleGenerateReport called with allConfigs:', allConfigs);
    console.log('[useSubmission] Number of configs:', allConfigs.length);
    
    if (!token || authLoading) {
      setGenerationError(
        "Authentication required. Please ensure you are logged in."
      );
      return;
    }

    if (allConfigs.length === 0) {
      setGenerationError(
        "No configurations found. Please add at least one website."
      );
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      // Get the latest data from localStorage
      const currentData = getOnboardingData();
      console.log("[useSubmission] Data from localStorage:", currentData);
      
      // Process each configuration
      for (const config of allConfigs) {
        console.log("Processing configuration:", config.website);
        
        // For the current configuration being submitted, use localStorage data
        const configData = config.id === currentData.id ? currentData : config;
        
        console.log("Config data:", {
          brandName: configData.brandName,
          attributes: configData.attributes,
          competitors: configData.competitors,
          analyzedData: configData.analyzedData,
          markets: configData.markets
        });
        
        // Debug: Check if attributes is falsy
        console.log("Debug - configData.attributes is:", configData.attributes);
        console.log("Debug - typeof configData.attributes:", typeof configData.attributes);
        console.log("Debug - configData.attributes truthiness:", !!configData.attributes);
        console.log("Debug - configData.attributes length:", configData.attributes?.length);
        console.log("Debug - analyzedData keyBrandAttributes:", configData.analyzedData?.keyBrandAttributes);
        console.log("Debug - Full config object:", JSON.stringify(configData, null, 2));

        // Prepare the identity card request
        // Use data directly from localStorage/config
        const identityCardRequest: CreateFullProjectRequest = {
          url: configData.website,
          brandName: configData.brandName,
          description:
            configData.description || configData.analyzedData?.fullDescription,
          industry: configData.industry,
          market: configData.markets?.[0]?.country || "United States",
          language: configData.markets?.[0]?.languages?.[0] || "English",
          keyBrandAttributes:
            configData.attributes || configData.analyzedData?.keyBrandAttributes || [],
          competitors:
            configData.competitors?.filter((c) => c.selected).map((c) => c.name) ||
            configData.analyzedData?.competitors ||
            [],
        };

        // Add prompts if they exist and have been edited
        if (configData.prompts) {
          const selectedVisibilityPrompts = configData.prompts.visibilityPrompts
            ?.filter((p: any) => p.selected)
            .map((p: any) => p.text);
          
          const selectedPerceptionPrompts = configData.prompts.perceptionPrompts
            ?.filter((p: any) => p.selected)
            .map((p: any) => p.text);

          if (selectedVisibilityPrompts?.length > 0 || selectedPerceptionPrompts?.length > 0) {
            identityCardRequest.prompts = {
              visibility: selectedVisibilityPrompts || [],
              sentiment: selectedPerceptionPrompts || [],
              // Initialize other prompt types as empty arrays
              alignment: [],
              competition: []
            };
          }
        }
        
        console.log("Identity card request:", identityCardRequest);
        console.log("Attributes being sent:", identityCardRequest.keyBrandAttributes);
        console.log("Competitors being sent:", identityCardRequest.competitors);

        // Save the identity card
        console.log("Saving identity card for:", configData.brandName);
        const identityCard = await createProject(identityCardRequest, token);
        console.log("Identity card saved successfully:", identityCard);
        console.log("Project ID:", identityCard.id);
        console.log(
          "Prompt generation will be triggered automatically via backend events"
        );
        
        // Store the created project ID for navigation
        if (allConfigs.length === 1) {
          // If only one project was created, we can navigate directly to it
          localStorage.setItem('lastCreatedProjectId', identityCard.id);
        }
        
        // Check if user has a free plan and trigger batch analysis
        try {
          const org = await getMyOrganization(token);
          if (org.stripePlanId) {
            const userPlan = plans.find(plan => plan.id === org.stripePlanId);
            const isFreePlan = 
              userPlan?.metadata?.isFree === true || 
              userPlan?.name.toLowerCase() === 'free' ||
              userPlan?.stripeProductId === null ||
              userPlan?.stripeProductId === '';
            
            if (isFreePlan) {
              console.log("Free plan detected, triggering visibility analysis for project:", identityCard.id);
              try {
                await runManualAnalysis(identityCard.id, token);
                console.log("Visibility analysis triggered successfully for free plan user");
              } catch (analysisError) {
                console.error("Failed to trigger visibility analysis:", analysisError);
                // Don't fail the whole process if analysis fails
              }
            }
          }
        } catch (orgError) {
          console.error("Failed to check organization plan:", orgError);
          // Continue without triggering analysis
        }
      }

      console.log("All configurations processed successfully");

      // Clear onboarding data since we're done
      localStorage.removeItem('onboardingData');
      localStorage.removeItem('onboardingStep');
      localStorage.removeItem('savedConfigs');

      // Set celebration flag for free plan activation and redirect to home
      console.log("Redirecting to home page with celebration");
      sessionStorage.setItem('celebrate_plan_activation', 'true');
      router.push("/home?plan_activated=true");
    } catch (error) {
      console.error("Error generating report:", error);
      setGenerationError(
        error instanceof Error
          ? error.message
          : "Failed to generate report. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    isGenerating,
    generationError,
    handleGenerateReport,
  };
}