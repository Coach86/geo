"use client";

import type React from "react";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { 
  getStepById, 
  StepId,
  getNextStepId,
  getPreviousStepId 
} from "@/app/onboarding/steps.config";
import { NavigationConfirmationDialog } from "@/components/onboarding/navigation-confirmation-dialog";
import { getOnboardingData, updateOnboardingData, clearOnboardingData } from "@/lib/onboarding-storage";
import type { FormData } from "@/app/onboarding/types/form-data";

// Define the context type - navigation + step data management
type OnboardingContextType = {
  currentStep: StepId;
  setCurrentStep: (step: StepId) => void;
  navigateNext: () => void;
  navigatePrevious: () => void;
  canNavigateFromStep: (stepNumber: StepId) => boolean;
  currentStepData: any;
  setCurrentStepData: (data: any) => void;
  isTransitioning: boolean;
  setIsTransitioning: (loading: boolean) => void;
};


// Create the context with default values
const OnboardingContext = createContext<OnboardingContextType>({
  currentStep: StepId.PROJECT,
  setCurrentStep: () => {},
  navigateNext: () => {},
  navigatePrevious: () => {},
  canNavigateFromStep: () => true,
  currentStepData: null,
  setCurrentStepData: () => {},
  isTransitioning: false,
  setIsTransitioning: () => {},
});

// Create a provider component
export function OnboardingProvider({ children }: { children: ReactNode }) {
  // Initialize state for navigation only
  const [currentStep, setCurrentStepState] = useState(StepId.PROJECT);
  const [currentStepData, setCurrentStepData] = useState<any>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Navigation confirmation dialog state
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    targetStep: StepId | null;
    title: string;
    description: string;
  }>({
    isOpen: false,
    targetStep: null,
    title: "",
    description: "",
  });

  // Load step from localStorage on initial render
  useEffect(() => {
    try {
      const savedStep = localStorage.getItem("onboardingStep");
      if (savedStep) {
        const stepNumber = Number.parseInt(savedStep, 10);
        // Validate that it's a valid StepId
        if (Object.values(StepId).includes(stepNumber)) {
          setCurrentStepState(stepNumber as StepId);
        }
      }
    } catch (error) {
      console.error("Error loading onboarding step from localStorage:", error);
    }
  }, []);

  // Save step to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("onboardingStep", currentStep.toString());
    } catch (error) {
      console.error("Error saving onboarding step to localStorage:", error);
    }
  }, [currentStep]);

  // Helper to check if navigation needs confirmation
  const needsNavigationConfirmation = (fromStep: StepId, toStep: StepId): { needed: boolean; title: string; description: string } => {
    const formData = getOnboardingData();
    
    // Going back from PROMPTS to BRAND or PROJECT
    if (fromStep === StepId.PROMPTS && (toStep === StepId.BRAND || toStep === StepId.PROJECT)) {
      const hasPrompts = (formData.prompts?.visibilityPrompts?.length > 0 || formData.prompts?.perceptionPrompts?.length > 0);
      if (hasPrompts) {
        return {
          needed: true,
          title: "Discard generated prompts?",
          description: "Going back will remove all generated prompts. You'll need to regenerate them when you return to this step.",
        };
      }
    }
    
    // Going back from BRAND to PROJECT
    if (fromStep === StepId.BRAND && toStep === StepId.PROJECT) {
      const hasCustomData = (
        (formData.brand?.analyzedData?.keyBrandAttributes?.length ?? 0) > 0 ||
        (formData.brand?.analyzedData?.competitors?.length ?? 0) > 0
      );
      if (hasCustomData) {
        return {
          needed: true,
          title: "Discard brand analysis?",
          description: "Going back will remove your key brand attributes and competitors. You'll need to re-analyze your website when you return.",
        };
      }
    }
    
    return { needed: false, title: "", description: "" };
  };

  // Wrapper for setCurrentStep to handle prompt cache clearing and confirmation
  const setCurrentStep = (step: StepId, skipConfirmation = false) => {
    // Check if we need confirmation
    const confirmation = needsNavigationConfirmation(currentStep, step);
    
    if (confirmation.needed && !skipConfirmation) {
      // Show confirmation dialog
      setConfirmationDialog({
        isOpen: true,
        targetStep: step,
        title: confirmation.title,
        description: confirmation.description,
      });
      return;
    }
    
    // Proceed with navigation
    // If we're navigating to a step before prompts from prompts or later, clear caches
    if (currentStep >= StepId.PROMPTS && (step === StepId.BRAND || step === StepId.PROJECT)) {
      // Clear all prompt caches
      const promptCacheKeys = Object.keys(localStorage).filter(key => key.startsWith('prompts-'));
      promptCacheKeys.forEach(key => localStorage.removeItem(key));
      
      // Also clear prompts from storage
      updateOnboardingData({
        prompts: {
          visibilityPrompts: [],
          perceptionPrompts: [],
          alignmentPrompts: [],
          competitionPrompts: [],
          llmModels: []
        }
      });
    }
    
    // If going back from BRAND to PROJECT, clear analyzed data
    if (currentStep === StepId.BRAND && step === StepId.PROJECT) {
      const currentData = getOnboardingData();
      updateOnboardingData({
        brand: {
          ...currentData.brand,
          analyzedData: undefined,
          // Don't clear attributes and competitors arrays, just reset them
          attributes: [],
          competitors: []
        }
      });
    }
    
    // Clear current step data when navigating
    setCurrentStepData(null);
    setCurrentStepState(step);
  };
  
  // Handlers for confirmation dialog
  const handleConfirmNavigation = () => {
    if (confirmationDialog.targetStep !== null) {
      setCurrentStep(confirmationDialog.targetStep, true); // Skip confirmation on retry
    }
    setConfirmationDialog({
      isOpen: false,
      targetStep: null,
      title: "",
      description: "",
    });
  };
  
  const handleCancelNavigation = () => {
    setConfirmationDialog({
      isOpen: false,
      targetStep: null,
      title: "",
      description: "",
    });
  };


  // Function to check if navigation from a step is allowed
  const canNavigateFromStep = (stepNumber: StepId): boolean => {
    const step = getStepById(stepNumber);
    if (!step || !step.canNavigate) {
      return true; // Allow navigation if no validation function is defined
    }
    return step.canNavigate(getOnboardingData());
  };

  // Navigation functions
  const navigateNext = () => {
    if (!canNavigateFromStep(currentStep)) {
      return; // Don't navigate if current step validation fails
    }
    const nextStep = getNextStepId(currentStep);
    if (nextStep) {
      setCurrentStep(nextStep);
    }
  };

  const navigatePrevious = () => {
    const previousStep = getPreviousStepId(currentStep);
    if (previousStep) {
      setCurrentStep(previousStep);
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        navigateNext,
        navigatePrevious,
        canNavigateFromStep,
        currentStepData,
        setCurrentStepData,
        isTransitioning,
        setIsTransitioning,
      }}
    >
      {children}
      <NavigationConfirmationDialog
        isOpen={confirmationDialog.isOpen}
        onConfirm={handleConfirmNavigation}
        onCancel={handleCancelNavigation}
        title={confirmationDialog.title}
        description={confirmationDialog.description}
        confirmText="Yes, go back"
        cancelText="Stay here"
      />
    </OnboardingContext.Provider>
  );
}

// Create a custom hook to use the context
export function useOnboarding() {
  return useContext(OnboardingContext);
}