// Constants for confirmation components
export const INITIAL_EXPANDED_SECTIONS = {
  visibility: false,
  perception: false,
  comparison: false,
  models: false,
  urls: true,
};

export const STEP_ROUTES = {
  PROJECT_INFO: "/onboarding",
  BRAND_IDENTITY: "/onboarding/brand-identity",
  PROMPT_SELECTION: "/onboarding/prompt-selection",
} as const;

export const TAB_VALUES = {
  SUMMARY: "summary",
  PROMPTS: "prompts",
  MODELS: "models",
  BRAND: "brand",
} as const;