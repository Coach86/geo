"use client";

import { useState, useEffect } from "react";
import { useOnboarding } from "@/providers/onboarding-provider";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";
import { StepId } from "@/app/onboarding/steps.config";
import { getOnboardingData, updateOnboardingData } from "@/lib/onboarding-storage";
import type { FormData } from "@/app/onboarding/types/form-data";

// Import all sub-components
import { ConfirmationHeader } from "./ConfirmationHeader";
import { ErrorDisplay } from "./ErrorDisplay";
import { WebsiteSelector } from "./WebsiteSelector";
import { ConfigurationDetails } from "./ConfigurationDetails";
import { AddWebsiteButton } from "./AddWebsiteButton";
import { GenerateButton } from "./GenerateButton";
import { useSubmission } from "./useSubmission";
import { calculateConfigStats, getSelectedItems } from "./utils";
import { INITIAL_EXPANDED_SECTIONS, STEP_ROUTES } from "./constants";
import type { NavigationHandlers } from "./types";

// Export sub-components
export { ModelsReview } from "./ModelsReview";

export default function Confirmation() {
  const { setCurrentStep } = useOnboarding();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // State for tracking current configuration
  const [currentConfigIndex, setCurrentConfigIndex] = useState<number>(0);
  const [viewingConfig, setViewingConfig] = useState<boolean>(false);

  // Get form data from localStorage
  const formData = getOnboardingData();

  // Currently displayed configuration
  const displayedConfig = formData;
  
  // Debug logging
  console.log('Confirmation - FormData:', formData)
  console.log('Confirmation - Displayed config:', displayedConfig)

  // Get submission hook
  const { isGenerating, generationError, handleGenerateReport } = useSubmission({
    token,
    authLoading,
    setCurrentStep,
  });

  // Calculate statistics
  const configStats = calculateConfigStats([formData]);
  const selectedItems = getSelectedItems(displayedConfig);

  // Navigation handlers
  const handleAddNewUrl = () => {
    // Clear onboarding data and start fresh
    updateOnboardingData({
      project: {},
      brand: {},
      prompts: {},
      contact: {}
    });
    router.push("/onboarding");
  };

  const viewConfigDetails = (index: number) => {
    // In the new structure, we only have one config
    console.log('[Confirmation] Viewing config');
    setViewingConfig(true);
  };

  const navigateConfig = (direction: "prev" | "next") => {
    // No-op in new structure as we only have one config
  };

  const navigateToStep = (step: number) => {
    console.log('[Confirmation] navigateToStep called, step:', step);
    
    // Mark as editing
    updateOnboardingData({ isEditing: true });

    // Set the current step in the context before navigating
    switch (step) {
      case 0:
        setCurrentStep(StepId.PROJECT);
        router.push(STEP_ROUTES.PROJECT_INFO);
        break;
      case 1:
        setCurrentStep(StepId.BRAND);
        router.push(STEP_ROUTES.BRAND_IDENTITY);
        break;
      case 2:
        setCurrentStep(StepId.PROMPTS);
        router.push(STEP_ROUTES.PROMPT_SELECTION);
        break;
      default:
        setCurrentStep(StepId.PROJECT);
        router.push(STEP_ROUTES.PROJECT_INFO);
    }
  };

  const navigationHandlers: NavigationHandlers = {
    handleAddNewUrl,
    viewConfigDetails,
    navigateConfig,
    navigateToStep,
    setEditingMode: (isEditing: boolean) => {
      updateOnboardingData({ isEditing });
    },
  };

  return (
    <div className="py-8 animate-fade-in">
      <ConfirmationHeader />

      <ErrorDisplay
        error={null}
        showNoConfigWarning={!formData.project?.website}
      />

      <WebsiteSelector
        allConfigs={formData.project?.website ? [formData] : []}
        currentConfigIndex={0}
        viewingConfig={viewingConfig}
        onAddNewUrl={handleAddNewUrl}
        onSelectConfig={viewConfigDetails}
      />

      {viewingConfig && formData.project?.website && (
        <ConfigurationDetails
          config={displayedConfig}
          selectedItems={selectedItems}
          currentIndex={0}
          totalConfigs={1}
          handlers={navigationHandlers}
        />
      )}

      <AddWebsiteButton onClick={handleAddNewUrl} />

      <ErrorDisplay error={generationError} />

      {formData.project?.website && (
        <GenerateButton
          isGenerating={isGenerating}
          authLoading={authLoading}
          token={token}
          stats={configStats}
          onGenerate={() => {
            // Get fresh data from localStorage
            const freshData = getOnboardingData();
            
            console.log('[Confirmation] About to call handleGenerateReport');
            console.log('[Confirmation] Fresh data from localStorage:', freshData);
            console.log('[Confirmation] Fresh data attributes:', freshData.brand?.attributes);
            console.log('[Confirmation] Fresh data analyzedData:', freshData.brand?.analyzedData);
            
            handleGenerateReport([freshData]);
          }}
        />
      )}
    </div>
  );
}