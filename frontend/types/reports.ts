// Types that mirror the backend ReportContentResponseDto
export interface ModelVisibility {
  model: string;
  value: number;
}

export interface SentimentResult {
  model: string;
  sentiment: string;
  status: string;
  positiveKeywords: string[];
  negativeKeywords: string[];
}

export interface Question {
  question: string;
  results: {
    model: string;
    sentiment: string;
    status: string;
    positiveKeywords: string[];
    negativeKeywords: string[];
    llmResponse?: string;
  }[];
}

export interface AttributeItem {
  name: string;
  rate: string;
  alignment: string;
}

export interface Competitor {
  name: string;
  size: string;
  modelsMentionsRate?: {
    model: string;
    mentionsRate: number;
  }[];
  global?: string;
}

export interface CompetitionData {
  competitorAnalyses: {
    competitor: string;
    analysisByModel: {
      model: string;
      strengths: string[];
      weaknesses: string[];
    }[];
  }[];
  commonStrengths: string[];
  commonWeaknesses: string[];
}

// Citations data structure
export interface CitationsData {
  summary: {
    totalPrompts: number;
    promptsWithWebAccess: number;
    webAccessPercentage: number;
    totalCitations: number;
    uniqueSources: number;
  };
  citationsByModel: Array<{
    modelId: string;
    modelProvider: string;
    promptIndex: number;
    promptType: string;
    usedWebSearch: boolean;
    webSearchQueries: Array<{
      query: string;
      timestamp?: string;
    }>;
    citations: Array<{
      source: string;
      url: string;
      title: string;
      snippet?: string;
      relevanceScore?: number;
    }>;
  }>;
  sourceStatistics: Array<{
    domain: string;
    totalMentions: number;
    citedByModels: string[];
    associatedQueries: string[];
  }>;
  topSources: Array<{
    domain: string;
    count: number;
    percentage: number;
  }>;
  topKeywords: Array<{
    keyword: string;
    count: number;
    percentage: number;
  }>;
}

// Main report response that mirrors backend DTO exactly
export interface ReportResponse {
  // Basic report information
  id: string;
  projectId: string;
  generatedAt: string;
  batchExecutionId?: string;

  // Brand name
  brand: string;

  // Metadata section
  metadata: {
    url: string;
    market: string;
    flag: string;
    competitors: string;
    date: string;
    models: string;
  };

  // KPI data
  kpi: {
    pulse: {
      value: string;
      description: string;
    };
    tone: {
      value: string;
      status: "green" | "yellow" | "red" | string;
      description: string;
    };
    accord: {
      value: string;
      status: "green" | "yellow" | "red" | string;
      description: string;
    };
    arena: {
      competitors: Competitor[];
      description: string;
    };
  };

  // Pulse section
  pulse: {
    promptsTested: number;
    modelVisibility: ModelVisibility[];
  };

  // Tone section
  tone: {
    sentiments: SentimentResult[];
    questions: Question[];
  };

  // Accord section
  accord: {
    attributes: AttributeItem[];
    score: {
      value: string;
      status: "green" | "yellow" | "red" | string;
    };
  };

  // Arena section
  arena: {
    competitors: Competitor[];
  };

  // Competition section
  competition: CompetitionData;

  // Trace section
  trace: {
    consultedWebsites: Array<{
      url: string;
      count: number;
    }>;
  };

  // Citations data
  citationsData?: CitationsData;

  // Raw data for debugging
  rawData?: {
    visibility?: any;
    sentiment?: any;
    accord?: any;
  };
}

// Processed report interfaces for different pages
export interface BaseProcessedReport {
  id: string;
  projectId: string;
  reportDate: string;
  createdAt: string;
  brandName: string;
}

export interface VisibilityProcessedReport extends BaseProcessedReport {
  mentionRate: number;
  modeMetrics: {
    model: string;
    mentionRate: number;
  }[];
  arenaMetrics: {
    model: string;
    mentions: number;
    score: number;
    rank: number;
  }[];
  arenaData: Competitor[];
  topMentions: {
    mention: string;
    count: number;
  }[];
  spontaneousData?: any;
}

export interface SentimentProcessedReport extends BaseProcessedReport {
  sentimentData: {
    overall: number;
    byModel: Record<
      string,
      {
        score: number;
        positive: number;
        negative: number;
        neutral: number;
      }
    >;
    questions: Question[];
  };
}

export interface CompetitionProcessedReport extends BaseProcessedReport {
  competitors: string[];
  competition?: CompetitionData;
}

export interface CitationsProcessedReport extends BaseProcessedReport {
  citationsData: {
    summary: {
      totalCitations: number;
      topDomains: string[];
    };
    citations: Array<{
      url: string;
      title: string;
      domain: string;
      count: number;
    }>;
  };
}
