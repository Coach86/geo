// Types for the project-info components
export interface Market {
  country: string;
  languages: string[];
}

export interface FormData {
  website: string;
  brandName: string;
  description: string;
  industry: string;
  markets: Market[];
  analyzedData?: {
    keyBrandAttributes: string[];
    competitors: string[];
    fullDescription: string;
  };
}

export interface ProjectInfoProps {
  // Add any props needed from parent component
}

export interface AnalyzedData {
  keyBrandAttributes: string[];
  competitors: string[];
  fullDescription: string;
}

export interface IdentityCardResponse {
  brandName?: string;
  shortDescription?: string;
  industry?: string;
  keyBrandAttributes?: string[];
  competitors?: string[];
  fullDescription?: string;
  longDescription?: string;
}

// Plan types
export type PlanType = "Starter" | "Growth" | "Pro" | "Enterprise";

// Constants
export const PLAN_LIMITS = {
  Starter: { markets: 1, languages: 1 },
  Growth: { markets: 3, languages: 5 },
  Pro: { markets: 5, languages: 10 },
  Enterprise: { markets: Infinity, languages: Infinity },
} as const;

export const PLAN_COLORS = {
  Starter: "bg-gray-100 text-gray-700",
  Growth: "bg-accent-100 text-accent-700",
  Pro: "bg-secondary-100 text-secondary-700",
  Enterprise: "bg-purple-100 text-purple-700",
} as const;