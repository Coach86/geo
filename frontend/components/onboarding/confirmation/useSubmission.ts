import { useState } from "react";
import { useRouter } from "next/navigation";
import { StepId } from "@/app/onboarding/steps.config";
import { createProject, type CreateFullProjectRequest } from "@/lib/auth-api";
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
      // Process each configuration
      for (const config of allConfigs) {
        console.log("Processing configuration:", config.website);

        // Prepare the identity card request
        const identityCardRequest: CreateFullProjectRequest = {
          url: config.website,
          brandName: config.brandName,
          description:
            config.analyzedData?.fullDescription || config.description,
          industry: config.industry,
          market: config.markets?.[0]?.country || "United States",
          language: config.markets?.[0]?.languages?.[0] || "English",
          keyBrandAttributes:
            config.analyzedData?.keyBrandAttributes || config.attributes || [],
          competitors:
            config.analyzedData?.competitors ||
            config.competitors?.filter((c) => c.selected).map((c) => c.name) ||
            [],
        };

        // Save the identity card
        console.log("Saving identity card for:", config.brandName);
        const identityCard = await createProject(identityCardRequest, token);
        console.log("Identity card saved successfully:", identityCard.id);
        console.log(
          "Prompt generation will be triggered automatically via backend events"
        );
      }

      console.log("All configurations processed successfully");

      // Redirect to the next step
      setCurrentStep(StepId.CONTACT);
      router.push("/onboarding");
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