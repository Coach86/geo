import type { OnboardingFormData, ProjectData, BrandData, PromptData, ContactData } from "./form-data";
import type { StepId } from "../config/steps";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface StepValidation {
  validate: (data: OnboardingFormData) => ValidationResult;
  canNavigateNext: (data: OnboardingFormData) => boolean;
}

// Project Info Step Validation
export function validateProjectInfo(data: OnboardingFormData): ValidationResult {
  const errors: string[] = [];
  const { project, brand } = data;

  if (!project.website) {
    errors.push("Website URL is required");
  }

  if (!project.analyzedData) {
    errors.push("Website must be analyzed before proceeding");
  }

  if (brand.markets.length === 0) {
    errors.push("At least one market must be selected");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Brand Identity Step Validation
export function validateBrandIdentity(data: OnboardingFormData): ValidationResult {
  const errors: string[] = [];
  const { brand } = data;

  if (brand.attributes.length === 0) {
    errors.push("At least one brand attribute must be selected");
  }

  const selectedCompetitors = brand.competitors.filter(c => c.selected);
  if (selectedCompetitors.length === 0) {
    errors.push("At least one competitor must be selected");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Prompt Selection Step Validation
export function validatePromptSelection(data: OnboardingFormData): ValidationResult {
  const errors: string[] = [];
  const { prompts } = data;

  const selectedModels = prompts.llmModels.filter(m => m.selected);
  if (selectedModels.length === 0) {
    errors.push("At least one LLM model must be selected");
  }

  const selectedVisibilityPrompts = prompts.visibilityPrompts.filter(p => p.selected);
  if (selectedVisibilityPrompts.length === 0) {
    errors.push("At least one visibility prompt must be selected");
  }

  const selectedPerceptionPrompts = prompts.perceptionPrompts.filter(p => p.selected);
  if (selectedPerceptionPrompts.length === 0) {
    errors.push("At least one perception prompt must be selected");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Confirmation Step Validation
export function validateConfirmation(data: OnboardingFormData): ValidationResult {
  // Run all previous validations
  const projectValidation = validateProjectInfo(data);
  const brandValidation = validateBrandIdentity(data);
  const promptValidation = validatePromptSelection(data);

  const allErrors = [
    ...projectValidation.errors,
    ...brandValidation.errors,
    ...promptValidation.errors,
  ];

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
}

// Phone Verification Step Validation
export function validatePhoneVerification(data: OnboardingFormData): ValidationResult {
  const errors: string[] = [];
  const { contact } = data;

  if (!contact.email) {
    errors.push("Email is required");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
    errors.push("Valid email is required");
  }

  if (!contact.phoneNumber) {
    errors.push("Phone number is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Step validation registry
export const STEP_VALIDATIONS: Record<StepId, StepValidation> = {
  "project-info": {
    validate: validateProjectInfo,
    canNavigateNext: (data) => validateProjectInfo(data).isValid,
  },
  "brand-identity": {
    validate: validateBrandIdentity,
    canNavigateNext: (data) => validateBrandIdentity(data).isValid,
  },
  "prompt-selection": {
    validate: validatePromptSelection,
    canNavigateNext: (data) => validatePromptSelection(data).isValid,
  },
  "confirmation": {
    validate: validateConfirmation,
    canNavigateNext: (data) => validateConfirmation(data).isValid,
  },
  "phone-verification": {
    validate: validatePhoneVerification,
    canNavigateNext: (data) => validatePhoneVerification(data).isValid,
  },
  "pricing": {
    validate: () => ({ isValid: true, errors: [] }),
    canNavigateNext: () => true,
  },
};

export function validateStep(stepId: StepId, data: OnboardingFormData): ValidationResult {
  const validation = STEP_VALIDATIONS[stepId];
  return validation ? validation.validate(data) : { isValid: true, errors: [] };
}

export function canNavigateFromStep(stepId: StepId, data: OnboardingFormData): boolean {
  const validation = STEP_VALIDATIONS[stepId];
  return validation ? validation.canNavigateNext(data) : true;
}