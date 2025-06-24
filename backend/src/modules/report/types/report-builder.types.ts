/**
 * Type definitions for report builder outputs
 * These match the structure returned by report-builder.service
 */

export interface MentionCount {
  mention: string;
  count: number;
}

export interface ModelMentionRate {
  model: string;
  mentionsRate: number;
}

export interface ArenaMetricBuilder {
  name: string;
  size: 'lg' | 'md' | 'sm';
  global: string; // e.g., "48%"
  modelsMentionsRate: ModelMentionRate[];
}

export interface VisibilityDataBuilder {
  overallMentionRate: number;
  promptsTested: number;
  modelVisibility: Array<{
    model: string;
    mentionRate: number;
  }>;
  arenaMetrics: ArenaMetricBuilder[];
  topMentions: MentionCount[];
  topDomains?: Array<{
    domain: string;
    count: number;
    percentage: number;
  }>;
  detailedResults?: Array<{
    model: string;
    promptIndex: number;
    brandMentioned: boolean;
    extractedCompanies: string[];
    originalPrompt: string;
    llmResponse: string;
    usedWebSearch: boolean;
    citations: any[];
    toolUsage: any[];
  }>;
}

// This matches the interfaces/report.interfaces.ts VisibilityData
export interface VisibilityDataStored {
  brandName: string;
  mentionRate: number;
  topMentions: Array<{
    mention: string;
    count: number;
  }>;
  competitorRanks: Array<{
    competitor: string;
    count: number;
    rank: number;
  }>;
  modelVisibility: Array<{
    model: string;
    mentioned: boolean;
    brandMentionCount: number;
    topOtherMentions: Array<{
      company: string;
      count: number;
    }>;
  }>;
  arenaMetrics: {
    mentionRate: number;
    avgRank: number;
    modelsMentioningBrand: number;
    totalModels: number;
  };
  allMentionedCompanies: string[];
  detailedResults?: Array<{
    model: string;
    promptIndex: number;
    brandMentioned: boolean;
    extractedCompanies: string[];
    originalPrompt: string;
    llmResponse: string;
    usedWebSearch: boolean;
    citations: any[];
    toolUsage: any[];
  }>;
}