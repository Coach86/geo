export interface CompetitionData {
  brandName?: string;
  competitors?: string[];
  competitorAnalyses: {
    competitor: string;
    analysisByModel: {
      model: string;
      strengths: string[];
      weaknesses: string[];
    }[];
  }[];
  competitorMetrics?: {
    competitor: string;
    overallRank: number;
    mentionRate: number;
    modelMentions: {
      model: string;
      rank: number;
      mentionRate: number;
    }[];
  }[];
  commonStrengths: string[];
  commonWeaknesses: string[];
  detailedResults?: {
    model: string;
    promptIndex: number;
    competitor: string;
    originalPrompt: string;
    llmResponse: string;
    brandStrengths: string[];
    brandWeaknesses: string[];
    usedWebSearch?: boolean;
    citations?: {
      url: string;
      title?: string;
      text?: string;
    }[];
    toolUsage?: {
      type: string;
      parameters?: any;
      execution_details?: {
        status: string;
        result?: any;
        error?: string;
      };
    }[];
  }[];
  citations?: {
    items: any[];
    uniqueDomains: number;
    totalCitations: number;
  };
}
