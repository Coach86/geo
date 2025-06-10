import { useState } from "react";
import { useRouter } from "next/navigation";
import { StepId } from "@/app/onboarding/steps.config";
import { createProject, type CreateFullProjectRequest } from "@/lib/auth-api";
import { getOnboardingData } from "@/lib/onboarding-storage";
import type { FormData } from "@/providers/onboarding-provider";

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
      }

      console.log("All configurations processed successfully");

      // Clear onboarding data since we're done
      localStorage.removeItem('onboardingData');
      localStorage.removeItem('onboardingStep');
      localStorage.removeItem('savedConfigs');

      // Redirect to the project profile page instead of continuing onboarding
      if (allConfigs.length === 1) {
        const lastProjectId = localStorage.getItem('lastCreatedProjectId');
        if (lastProjectId) {
          console.log("Redirecting to project profile:", lastProjectId);
          router.push(`/profile`);
          return;
        }
      }
      
      // For multiple projects, go to the project list
      router.push("/");
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