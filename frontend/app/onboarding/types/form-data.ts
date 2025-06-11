export interface ProjectData {
  id: string;
  website: string;
  brandName: string;
  description: string;
  industry: string;
  analyzedData?: {
    keyBrandAttributes: string[];
    competitors: string[];
    fullDescription?: string;
  };
}

export interface Market {
  country: string;
  languages: string[];
}

export interface BrandData {
  markets: Market[];
  attributes: string[];
  competitors: Competitor[];
  analyzedData?: {
    keyBrandAttributes: string[];
    competitors: string[];
    fullDescription?: string;
  };
}

export interface Competitor {
  name: string;
  logo?: string;
  selected: boolean;
}

export interface Prompt {
  text: string;
  selected: boolean;
}

export interface LLMModel {
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
}

export interface PromptData {
  visibilityPrompts: Prompt[];
  perceptionPrompts: Prompt[];
  comparisonPrompts: Prompt[];
  llmModels: LLMModel[];
}

export interface ContactData {
  email: string;
  phoneNumber: string;
  phoneCountry: string;
  country?: string;
  language?: string;
}

export interface OnboardingFormData {
  project: ProjectData;
  brand: BrandData;
  prompts: PromptData;
  contact: ContactData;
  isEditing?: boolean;
}

// Alias for compatibility
export type FormData = OnboardingFormData;

export interface OnboardingConfig {
  id: string;
  data: OnboardingFormData;
  createdAt: Date;
  updatedAt: Date;
}

// Default data for each domain
export const DEFAULT_PROJECT_DATA: ProjectData = {
  id: "",
  website: "",
  brandName: "",
  description: "",
  industry: "",
};

export const DEFAULT_BRAND_DATA: BrandData = {
  markets: [{ country: "United States", languages: ["English"] }],
  attributes: [],
  competitors: [],
};

export const DEFAULT_PROMPT_DATA: PromptData = {
  visibilityPrompts: [],
  perceptionPrompts: [],
  comparisonPrompts: [],
  llmModels: [],
};

export const DEFAULT_CONTACT_DATA: ContactData = {
  email: "",
  phoneNumber: "",
  phoneCountry: "US",
};

export function createDefaultFormData(): OnboardingFormData {
  return {
    project: {
      ...DEFAULT_PROJECT_DATA,
      id: crypto.randomUUID?.() || `id-${Date.now()}`,
    },
    brand: DEFAULT_BRAND_DATA,
    prompts: DEFAULT_PROMPT_DATA,
    contact: DEFAULT_CONTACT_DATA,
    isEditing: false,
  };
}