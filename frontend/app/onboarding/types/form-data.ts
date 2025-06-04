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
  competitors: [
    { name: "Competitor 1", selected: true },
    { name: "Competitor 2", selected: true },
    { name: "Competitor 3", selected: false },
    { name: "Competitor 4", selected: false },
  ],
};

export const DEFAULT_PROMPT_DATA: PromptData = {
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
      description: "OpenAI's most advanced model, supports reasoning, vision and audio",
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
      description: "Anthropic's flagship model, ideal for long-form and nuanced content",
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
      description: "Google's top model, integrated with Android and real-time search",
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
      description: "Fast, search-native LLM with real-time sourcing and citations",
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
      description: "Efficient EU model, fast and open-source with solid technical output",
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
      description: "Meta's latest open model, versatile across technical and general use",
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
      description: "xAI's model built for X/Twitter, with bold, web-native tone",
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
      description: "OpenAI's freemium model, widely used for daily/general tasks",
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
      description: "Balanced B2B model used in Slack/Zoom for structured writing",
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
      description: "High-performing open-source Chinese model with multilingual support",
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