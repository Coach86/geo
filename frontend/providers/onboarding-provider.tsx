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

// Define the types for our form data
export type FormData = {
  id?: string;
  website: string;
  brandName: string;
  description: string;
  industry: string;
  markets: {
    country: string;
    languages: string[];
  }[];
  attributes: string[];
  competitors: {
    name: string;
    logo?: string;
    selected: boolean;
  }[];
  visibilityPrompts: {
    text: string;
    selected: boolean;
  }[];
  perceptionPrompts: {
    text: string;
    selected: boolean;
  }[];
  comparisonPrompts: {
    text: string;
    selected: boolean;
  }[];
  llmModels: {
    id: string;
    name: string;
    description: string;
    provider: string;
    audience: string;
    dataFreshness: string;
    webAccess: string;
    webAccessDetail: string;
    icon: string;
    recommended: boolean;
    new: boolean;
    selected: boolean;
    comingSoon?: boolean;
  }[];
  email: string;
  phoneNumber: string;
  phoneCountry: string;
  country?: string;
  language?: string;
  isEditing?: boolean;
  analyzedData?: {
    keyBrandAttributes: string[];
    competitors: string[];
    fullDescription?: string;
  };
};

// Define the context type
type OnboardingContextType = {
  currentStep: StepId;
  setCurrentStep: (step: StepId) => void;
  navigateNext: () => void;
  navigatePrevious: () => void;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  updateFormData: (data: Partial<FormData>) => void;
  savedConfigs: FormData[];
  addNewConfig: () => void;
  setEditingMode: (isEditing: boolean, configId?: string) => void;
  canNavigateFromStep: (stepNumber: StepId) => boolean;
};

// Default form data
const defaultFormData: FormData = {
  id: crypto.randomUUID?.() || `id-${Date.now()}`,
  website: "",
  brandName: "",
  description: "",
  industry: "",
  markets: [{ country: "United States", languages: ["English"] }],
  attributes: [],
  competitors: [
    { name: "Competitor 1", selected: true },
    { name: "Competitor 2", selected: true },
    { name: "Competitor 3", selected: false },
    { name: "Competitor 4", selected: false },
  ],
  visibilityPrompts: [
    { text: "Best CRM for startups?", selected: true },
    { text: "Top HR software 2025", selected: true },
    { text: "Most innovative tech companies", selected: true },
    { text: "Best tools for remote teams", selected: true },
    { text: "Leading solutions for customer support", selected: true },
    { text: "Top enterprise software solutions", selected: true },
    { text: "Best marketing automation tools", selected: true },
    { text: "Most reliable cloud services", selected: true },
    { text: "Top project management software", selected: true },
    { text: "Best analytics platforms", selected: true },
    { text: "Leading e-commerce solutions", selected: false },
    { text: "Top collaboration tools", selected: false },
    { text: "Best sales enablement software", selected: false },
    { text: "Leading data visualization tools", selected: false },
    { text: "Top AI-powered business tools", selected: false },
  ],
  perceptionPrompts: [
    { text: "What is [Brand] known for?", selected: true },
    { text: "Is [Brand] reliable?", selected: true },
    { text: "What are [Brand]'s strengths and weaknesses?", selected: true },
    { text: "How innovative is [Brand]?", selected: true },
    { text: "What is [Brand]'s reputation?", selected: true },
  ],
  comparisonPrompts: [],
  llmModels: [
    {
      id: "gpt4o",
      name: "GPT-4o",
      description:
        "OpenAI's most advanced model, supports reasoning, vision and audio",
      provider: "OpenAI",
      audience: "180M+ (ChatGPT)",
      dataFreshness: "Apr 2024 —",
      webAccess: "full",
      webAccessDetail: "Web + Vision",
      icon: "sparkles",
      recommended: true,
      new: true,
      selected: true,
    },
    {
      id: "claude3opus",
      name: "Claude 3 Opus",
      description:
        "Anthropic's flagship model, ideal for long-form and nuanced content",
      provider: "Anthropic",
      audience: "10–15M (Slack, Notion)",
      dataFreshness: "Aug 2023 —",
      webAccess: "none",
      webAccessDetail: "No Web",
      icon: "brain",
      recommended: true,
      new: false,
      selected: false,
      comingSoon: true,
    },
    {
      id: "gemini15pro",
      name: "Gemini 1.5 Pro",
      description:
        "Google's top model, integrated with Android and real-time search",
      provider: "Google DeepMind",
      audience: "100M+ (Search/Android)",
      dataFreshness: "Real-time —",
      webAccess: "full",
      webAccessDetail: "Google Search",
      icon: "sparkles",
      recommended: true,
      new: true,
      selected: false,
      comingSoon: true,
    },
    {
      id: "perplexity",
      name: "Perplexity LLM",
      description:
        "Fast, search-native LLM with real-time sourcing and citations",
      provider: "Perplexity AI",
      audience: "10M+ MAU",
      dataFreshness: "Real-time —",
      webAccess: "full",
      webAccessDetail: "Web + Sources",
      icon: "zap",
      recommended: false,
      new: true,
      selected: false,
    },
    {
      id: "mixtral",
      name: "Mixtral 8x7B",
      description:
        "Efficient EU model, fast and open-source with solid technical output",
      provider: "Mistral",
      audience: "Growing fast in EU",
      dataFreshness: "2023 —",
      webAccess: "none",
      webAccessDetail: "No Web",
      icon: "bot",
      recommended: false,
      new: false,
      selected: false,
      comingSoon: true,
    },
    {
      id: "llama3",
      name: "LLaMA 3 70B",
      description:
        "Meta's latest open model, versatile across technical and general use",
      provider: "Meta",
      audience: "3B+ reach (Meta apps)",
      dataFreshness: "Dec 2023 —",
      webAccess: "partial",
      webAccessDetail: "Partial Web",
      icon: "brain",
      recommended: false,
      new: true,
      selected: false,
      comingSoon: true,
    },
    {
      id: "grok15",
      name: "Grok-1.5",
      description:
        "xAI's model built for X/Twitter, with bold, web-native tone",
      provider: "xAI (Elon Musk)",
      audience: "Millions (via X)",
      dataFreshness: "2023 —",
      webAccess: "partial",
      webAccessDetail: "Partial Web via X",
      icon: "zap",
      recommended: false,
      new: true,
      selected: false,
      comingSoon: true,
    },
    {
      id: "gpt35turbo",
      name: "GPT-3.5 Turbo",
      description:
        "OpenAI's freemium model, widely used for daily/general tasks",
      provider: "OpenAI",
      audience: "80–100M (Free users)",
      dataFreshness: "Jan 2022 —",
      webAccess: "none",
      webAccessDetail: "No Web",
      icon: "bot",
      recommended: false,
      new: false,
      selected: false,
      comingSoon: true,
    },
    {
      id: "claude3sonnet",
      name: "Claude 3 Sonnet",
      description:
        "Balanced B2B model used in Slack/Zoom for structured writing",
      provider: "Anthropic",
      audience: "Widely used in B2B apps",
      dataFreshness: "Aug 2023 —",
      webAccess: "none",
      webAccessDetail: "No Web",
      icon: "brain",
      recommended: false,
      new: false,
      selected: false,
    },
    {
      id: "yi34b",
      name: "Yi-34B",
      description:
        "High-performing open-source Chinese model with multilingual support",
      provider: "01.AI",
      audience: "Strong growth in Asia + OSS",
      dataFreshness: "Mid-2023 —",
      webAccess: "none",
      webAccessDetail: "No Web",
      icon: "bot",
      recommended: false,
      new: true,
      selected: false,
      comingSoon: true,
    },
  ],
  email: "",
  phoneNumber: "",
  phoneCountry: "US",
  isEditing: false,
};

// Create the context with default values
const OnboardingContext = createContext<OnboardingContextType>({
  currentStep: StepId.PROJECT,
  setCurrentStep: () => {},
  navigateNext: () => {},
  navigatePrevious: () => {},
  formData: defaultFormData,
  setFormData: () => {},
  updateFormData: () => {},
  savedConfigs: [],
  addNewConfig: () => {},
  setEditingMode: () => {},
  canNavigateFromStep: () => true,
});

// Create a provider component
export function OnboardingProvider({ children }: { children: ReactNode }) {
  // Initialize state with data from localStorage if available
  const [currentStep, setCurrentStepState] = useState(StepId.PROJECT);
  const [formData, setFormData] = useState<FormData>({
    ...defaultFormData,
    id: crypto.randomUUID?.() || `id-${Date.now()}`,
  });
  const [savedConfigs, setSavedConfigs] = useState<FormData[]>([]);
  
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

  // Load data from localStorage on initial render
  useEffect(() => {
    try {
      // Check if this is a new version that requires localStorage reset
      const currentVersion = "v2.0-models-update";
      const savedVersion = localStorage.getItem("onboardingVersion");

      if (savedVersion !== currentVersion) {
        // Clear old data and set new version
        localStorage.removeItem("onboardingStep");
        localStorage.removeItem("onboardingData");
        localStorage.removeItem("savedConfigs");
        localStorage.setItem("onboardingVersion", currentVersion);
        console.log("Cleared old onboarding data due to version update");
        return;
      }

      const savedStep = localStorage.getItem("onboardingStep");
      const savedData = localStorage.getItem("onboardingData");
      const savedConfigsData = localStorage.getItem("savedConfigs");

      if (savedStep) {
        const stepNumber = Number.parseInt(savedStep, 10);
        // Validate that it's a valid StepId
        if (Object.values(StepId).includes(stepNumber)) {
          setCurrentStep(stepNumber as StepId);
        }
      }

      if (savedData) {
        const parsedData = JSON.parse(savedData);
        // Merge with default data to ensure new properties like comingSoon are applied
        const mergedData = {
          ...defaultFormData,
          ...parsedData,
          // Ensure llmModels are properly merged with comingSoon properties
          llmModels: defaultFormData.llmModels.map((defaultModel) => {
            const savedModel = parsedData.llmModels?.find(
              (m: any) => m.id === defaultModel.id
            );
            return {
              ...defaultModel,
              ...savedModel,
              // Force comingSoon from defaults (this is the important part)
              comingSoon: defaultModel.comingSoon,
            };
          }),
        };
        setFormData(mergedData);
      }

      if (savedConfigsData) {
        const parsedConfigs = JSON.parse(savedConfigsData);
        // Update saved configs to include comingSoon properties
        const updatedConfigs = parsedConfigs.map((config: any) => ({
          ...config,
          llmModels: defaultFormData.llmModels.map((defaultModel) => {
            const savedModel = config.llmModels?.find(
              (m: any) => m.id === defaultModel.id
            );
            return {
              ...defaultModel,
              ...savedModel,
              // Force comingSoon from defaults
              comingSoon: defaultModel.comingSoon,
            };
          }),
        }));
        setSavedConfigs(updatedConfigs);
      }
    } catch (error) {
      console.error("Error loading onboarding data from localStorage:", error);
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("onboardingStep", currentStep.toString());
      localStorage.setItem("onboardingData", JSON.stringify(formData));
    } catch (error) {
      console.error("Error saving onboarding data to localStorage:", error);
    }
  }, [currentStep, formData]);

  // Sauvegarde des configurations uniquement lorsqu'elles changent
  useEffect(() => {
    try {
      localStorage.setItem("savedConfigs", JSON.stringify(savedConfigs));
    } catch (error) {
      console.error("Error saving configurations to localStorage:", error);
    }
  }, [savedConfigs]);

  // Helper function to update form data
  const updateFormData = (data: Partial<FormData>) => {
    setFormData((prev) => {
      const updated = { ...prev, ...data };
      return updated;
    });
  };

  // Helper to check if navigation needs confirmation
  const needsNavigationConfirmation = (fromStep: StepId, toStep: StepId): { needed: boolean; title: string; description: string } => {
    // Going back from PROMPTS to BRAND or PROJECT
    if (fromStep === StepId.PROMPTS && (toStep === StepId.BRAND || toStep === StepId.PROJECT)) {
      const hasPrompts = (formData.visibilityPrompts?.length > 0 || formData.perceptionPrompts?.length > 0);
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
        (formData.analyzedData?.keyBrandAttributes?.length ?? 0) > 0 ||
        (formData.analyzedData?.competitors?.length ?? 0) > 0
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
      
      // Also clear prompts from form data
      updateFormData({
        visibilityPrompts: [],
        perceptionPrompts: []
      });
    }
    
    // If going back from BRAND to PROJECT, clear analyzed data
    if (currentStep === StepId.BRAND && step === StepId.PROJECT) {
      updateFormData({
        analyzedData: undefined
      });
    }
    
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

  // Fonction pour ajouter une nouvelle configuration
  const addNewConfig = () => {
    // Sauvegarder la configuration actuelle si elle a un site web
    if (formData.website) {
      // Vérifier si cette configuration existe déjà
      const existingIndex = savedConfigs.findIndex(
        (config) => config.id === formData.id
      );

      if (existingIndex >= 0) {
        // Mettre à jour la configuration existante
        setSavedConfigs((prev) => {
          const updated = [...prev];
          updated[existingIndex] = formData;
          return updated;
        });
      } else {
        // Ajouter une nouvelle configuration
        setSavedConfigs((prev) => [...prev, formData]);
      }
    }

    // Créer une nouvelle configuration
    setFormData({
      ...defaultFormData,
      id: crypto.randomUUID?.() || `id-${Date.now()}`,
      isEditing: false,
    });
    setCurrentStep(1);
  };

  // Fonction pour définir le mode d'édition
  const setEditingMode = (isEditing: boolean, configId?: string) => {
    if (isEditing && configId) {
      // Trouver la configuration à éditer
      const configToEdit = savedConfigs.find(
        (config) => config.id === configId
      );
      if (configToEdit) {
        // Sauvegarder la configuration actuelle si elle a un site web et n'est pas déjà sauvegardée
        if (formData.website && !formData.isEditing) {
          const existingIndex = savedConfigs.findIndex(
            (config) => config.id === formData.id
          );
          if (existingIndex >= 0) {
            // Mettre à jour la configuration existante
            setSavedConfigs((prev) => {
              const updated = [...prev];
              updated[existingIndex] = formData;
              return updated;
            });
          } else {
            // Ajouter une nouvelle configuration
            setSavedConfigs((prev) => [...prev, formData]);
          }
        }

        // Mettre à jour formData avec la configuration à éditer
        setFormData({
          ...configToEdit,
          isEditing: true,
        });
      }
    } else {
      // Mettre à jour le mode d'édition sans changer la configuration
      setFormData((prev) => ({
        ...prev,
        isEditing,
      }));
    }
  };

  // Function to check if navigation from a step is allowed
  const canNavigateFromStep = (stepNumber: StepId): boolean => {
    const step = getStepById(stepNumber);
    if (!step || !step.canNavigate) {
      return true; // Allow navigation if no validation function is defined
    }
    return step.canNavigate(formData);
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
        formData,
        setFormData,
        updateFormData,
        savedConfigs,
        addNewConfig,
        setEditingMode,
        canNavigateFromStep,
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
