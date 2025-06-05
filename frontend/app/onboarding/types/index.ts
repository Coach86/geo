// Re-export all types from form-data
export type {
  ProjectData,
  Market,
  BrandData,
  Competitor,
  Prompt,
  LLMModel,
  PromptData,
  ContactData,
  OnboardingFormData,
  OnboardingConfig,
} from "./form-data";

export {
  DEFAULT_PROJECT_DATA,
  DEFAULT_BRAND_DATA,
  DEFAULT_PROMPT_DATA,
  DEFAULT_CONTACT_DATA,
  createDefaultFormData,
} from "./form-data";

// Re-export all types from validation
export type {
  ValidationResult,
  StepValidation,
} from "./validation";

export {
  validateProjectInfo,
  validateBrandIdentity,
  validatePromptSelection,
  validateConfirmation,
  validatePhoneVerification,
  STEP_VALIDATIONS,
  validateStep,
  canNavigateFromStep,
} from "./validation";