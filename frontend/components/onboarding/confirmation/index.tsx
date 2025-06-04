"use client";

import { useState, useEffect } from "react";
import { useOnboarding } from "@/providers/onboarding-provider";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";
import type { FormData } from "@/providers/onboarding-provider";

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

export default function Confirmation() {
  const {
    formData,
    savedConfigs,
    addNewConfig,
    setFormData,
    setEditingMode,
    setCurrentStep,
  } = useOnboarding();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // State for tracking current configuration
  const [currentConfigIndex, setCurrentConfigIndex] = useState<number>(0);
  const [viewingConfig, setViewingConfig] = useState<boolean>(false);

  // Local copy of configurations
  const [allConfigs, setAllConfigs] = useState<FormData[]>([]);

  // Update configurations list
  useEffect(() => {
    const configs = [
      formData,
      ...savedConfigs.filter((config) => config.id !== formData.id),
    ].filter((config) => config.website);
    setAllConfigs(configs);
  }, [formData, savedConfigs]);

  // Currently displayed configuration
  const displayedConfig =
    viewingConfig && allConfigs.length > currentConfigIndex
      ? allConfigs[currentConfigIndex]
      : formData;

  // Get submission hook
  const { isGenerating, generationError, handleGenerateReport } = useSubmission({
    token,
    authLoading,
    setCurrentStep,
  });

  // Calculate statistics
  const configStats = calculateConfigStats(allConfigs);
  const selectedItems = getSelectedItems(displayedConfig);

  // Navigation handlers
  const handleAddNewUrl = () => {
    addNewConfig();
    router.push("/onboarding");
  };

  const viewConfigDetails = (index: number) => {
    setCurrentConfigIndex(index);
    setViewingConfig(true);
  };

  const navigateConfig = (direction: "prev" | "next") => {
    if (direction === "prev" && currentConfigIndex > 0) {
      setCurrentConfigIndex(currentConfigIndex - 1);
    } else if (
      direction === "next" &&
      currentConfigIndex < allConfigs.length - 1
    ) {
      setCurrentConfigIndex(currentConfigIndex + 1);
    }
  };

  const navigateToStep = (step: number) => {
    const selectedConfig = allConfigs[currentConfigIndex];
    if (selectedConfig) {
      setFormData({
        ...selectedConfig,
        isEditing: true,
      });

      switch (step) {
        case 0:
          router.push(STEP_ROUTES.PROJECT_INFO);
          break;
        case 1:
          router.push(STEP_ROUTES.BRAND_IDENTITY);
          break;
        case 2:
          router.push(STEP_ROUTES.PROMPT_SELECTION);
          break;
        default:
          router.push(STEP_ROUTES.PROJECT_INFO);
      }
    }
  };

  const navigationHandlers: NavigationHandlers = {
    handleAddNewUrl,
    viewConfigDetails,
    navigateConfig,
    navigateToStep,
    setEditingMode,
  };

  return (
    <div className="py-8 animate-fade-in">
      <ConfirmationHeader />

      <ErrorDisplay
        error={null}
        showNoConfigWarning={allConfigs.length === 0}
      />

      <WebsiteSelector
        allConfigs={allConfigs}
        currentConfigIndex={currentConfigIndex}
        viewingConfig={viewingConfig}
        onAddNewUrl={handleAddNewUrl}
        onSelectConfig={viewConfigDetails}
      />

      {viewingConfig && allConfigs.length > 0 && (
        <ConfigurationDetails
          config={displayedConfig}
          selectedItems={selectedItems}
          currentIndex={currentConfigIndex}
          totalConfigs={allConfigs.length}
          handlers={navigationHandlers}
        />
      )}

      <AddWebsiteButton onClick={handleAddNewUrl} />

      <ErrorDisplay error={generationError} />

      {allConfigs.length > 0 && (
        <GenerateButton
          isGenerating={isGenerating}
          authLoading={authLoading}
          token={token}
          stats={configStats}
          onGenerate={() => handleGenerateReport(allConfigs)}
        />
      )}
    </div>
  );
}