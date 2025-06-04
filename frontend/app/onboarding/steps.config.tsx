import {
  Building,
  Users,
  MessageSquare,
  CheckCircle,
  Phone,
  CreditCard,
} from "lucide-react";
import ProjectInfo from "@/components/onboarding/project-info";
import BrandIdentity from "@/components/onboarding/brand-identity";
import PromptSelection from "@/components/onboarding/prompt-selection";
import Confirmation from "@/components/onboarding/confirmation";
import PhoneVerification from "@/components/onboarding/phone-verification";

// Step IDs as enum for type safety
export enum StepId {
  PROJECT = 1,
  BRAND = 2,
  PROMPTS = 3,
  CONTACT = 4,
  PRICING = 5,
}

export interface OnboardingStep {
  id: StepId;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
  path: string;
  canNavigate?: (formData: any) => boolean;
  nextButtonText?: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: StepId.PROJECT,
    name: "Project",
    icon: Building,
    component: ProjectInfo,
    path: "/onboarding",
    canNavigate: (formData) => {
      return !!(
        formData.website &&
        formData.brandName &&
        formData.description &&
        formData.industry &&
        formData.analyzedData // Ensure website has been analyzed
      );
    },
  },
  {
    id: StepId.BRAND,
    name: "Brand",
    icon: Users,
    component: BrandIdentity,
    path: "/onboarding",
    canNavigate: (formData) => {
      return !!(
        formData.markets &&
        formData.markets.length > 0 &&
        formData.analyzedData?.keyBrandAttributes?.length > 0 &&
        formData.analyzedData?.competitors?.length > 0
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
      // Check if at least some prompts are selected in each category
      const hasVisibilityPrompts = formData.visibilityPrompts?.some((p: any) => p.selected);
      const hasPerceptionPrompts = formData.perceptionPrompts?.some((p: any) => p.selected);
      // Since the form has prefilled prompts, we should allow navigation if we have any selected prompts
      return !!(hasVisibilityPrompts && hasPerceptionPrompts);
    },
  },
  {
    id: StepId.CONTACT,
    name: "Contact",
    icon: Phone,
    component: PhoneVerification,
    path: "/onboarding",
    canNavigate: (formData) => {
      return !!formData.phoneNumber;
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
  if (currentId === StepId.PROJECT && !canNavigate) {
    return "Analyze website first";
  }
  return "Next";
};