import {
  Building,
  Globe,
  Users,
  MessageSquare,
  CheckCircle,
  Phone,
  CreditCard,
} from "lucide-react";
import ProjectInfo from "@/components/onboarding/project-info";
import BrandIdentity from "@/components/onboarding/brand-identity";
import PromptSelection from "@/components/onboarding/prompt-selection";
import PhoneVerification from "@/components/onboarding/phone-verification";
import type { Market, Competitor, Prompt } from "./types/form-data";

// Step IDs as enum for type safety
export enum StepId {
  PROJECT = 1,
  BRAND = 2,
  PROMPTS = 3,
  CONTACT = 4,
  PRICING = 5,
}

// Type definitions for each step's data
export interface ProjectStepData {
  project: {
    website: string;
    brandName: string;
    description: string;
    industry: string;
  };
  brand: {
    markets: Market[];
    analyzedData?: {
      keyBrandAttributes: string[];
      competitors: string[];
      fullDescription?: string;
    };
  };
}

export interface BrandStepData {
  project: {
    brandName: string;
    description: string;
    industry: string;
  };
  attributes: string[];
  competitors: Competitor[];
}

export interface PromptsStepData {
  visibilityPrompts: Prompt[];
  perceptionPrompts: Prompt[];
  alignmentPrompts?: string[];
  competitionPrompts?: string[];
}

export interface ContactStepData {
  phoneNumber: string;
  phoneCountry: string;
}

// Union type for all possible step data
export type StepData = ProjectStepData | BrandStepData | PromptsStepData | ContactStepData;

// Common props that all step components accept
export interface StepComponentProps {
  initialData?: any;
  onDataReady?: (data: StepData) => void;
}

export interface OnboardingStep {
  id: StepId;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType<StepComponentProps>;
  path: string;
  canNavigate?: (formData: any) => boolean;
  nextButtonText?: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: StepId.PROJECT,
    name: "Start",
    icon: Globe,
    component: ProjectInfo,
    path: "/onboarding",
    canNavigate: (formData) => {
      return !!(
        formData.project?.website &&
        formData.brand?.markets?.length > 0 // Ensure at least one market is selected
      );
    },
  },
  {
    id: StepId.BRAND,
    name: "Project",
    icon: Users,
    component: BrandIdentity,
    path: "/onboarding",
    canNavigate: (formData) => {
      return !!(
        formData.project?.brandName &&
        formData.project?.description &&
        formData.project?.industry &&
        formData.brand?.attributes?.length > 0 &&
        formData.brand?.competitors?.filter((c: any) => c.selected).length > 0
      );
    },
  },
  {
    id: StepId.PROMPTS,
    name: "Prompts",
    icon: MessageSquare,
    component: PromptSelection,
    path: "/onboarding",
    canNavigate: (formData) => {
      // Check if at least some visibility prompts are selected
      const hasVisibilityPrompts = formData.prompts?.visibilityPrompts?.some((p: any) => p.selected);
      return !!hasVisibilityPrompts;
    },
  },
  {
    id: StepId.CONTACT,
    name: "Account",
    icon: CheckCircle,
    component: PhoneVerification,
    path: "/onboarding",
    canNavigate: (formData) => {
      return !!formData.contact?.phoneNumber;
    },
    nextButtonText: "Get my report",
  },
];

// Special step for pricing (not part of the main flow)
export const PRICING_STEP = {
  id: StepId.PRICING,
  name: "Plan",
  icon: CreditCard,
  component: null, // Pricing is a separate page
  path: "/pricing",
};

// Helper functions
export const getStepById = (id: StepId) => ONBOARDING_STEPS.find(step => step.id === id);
export const getStepComponent = (id: StepId) => getStepById(id)?.component;
export const getTotalSteps = () => ONBOARDING_STEPS.length;
export const isLastStep = (id: StepId) => id === ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1].id;
export const isFirstStep = (id: StepId) => id === ONBOARDING_STEPS[0].id;

// Navigation functions
export const getNextStepId = (currentId: StepId): StepId | null => {
  const currentIndex = ONBOARDING_STEPS.findIndex(step => step.id === currentId);
  if (currentIndex === -1 || currentIndex === ONBOARDING_STEPS.length - 1) {
    return StepId.PRICING; // After last onboarding step, go to pricing
  }
  return ONBOARDING_STEPS[currentIndex + 1].id;
};

export const getPreviousStepId = (currentId: StepId): StepId | null => {
  if (currentId === StepId.PRICING) {
    return StepId.CONTACT; // From pricing, go back to contact
  }
  const currentIndex = ONBOARDING_STEPS.findIndex(step => step.id === currentId);
  if (currentIndex <= 0) {
    return null; // No previous step
  }
  return ONBOARDING_STEPS[currentIndex - 1].id;
};

export const getNextButtonText = (currentId: StepId, canNavigate: boolean): string => {
  const step = getStepById(currentId);
  if (step?.nextButtonText) {
    return step.nextButtonText;
  }
  return "Next";
};