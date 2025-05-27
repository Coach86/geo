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

export interface BrandBattleData {
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

// Main report response that mirrors backend DTO exactly
export interface ReportResponse {
  // Basic report information
  id: string;
  companyId: string;
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
      status: 'green' | 'yellow' | 'red' | string;
      description: string;
    };
    accord: {
      value: string;
      status: 'green' | 'yellow' | 'red' | string;
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
      status: 'green' | 'yellow' | 'red' | string;
    };
  };

  // Arena section
  arena: {
    competitors: Competitor[];
  };

  // Brand Battle section
  brandBattle: BrandBattleData;

  // Trace section
  trace: {
    consultedWebsites: Array<{
      url: string;
      count: number;
    }>;
  };

  // Raw data for debugging
  rawData?: {
    spontaneous?: any;
    sentiment?: any;
    comparison?: any;
    accord?: any;
  };
}

// Processed report interfaces for different pages
export interface BaseProcessedReport {
  id: string;
  companyId: string;
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
    byModel: Record<string, {
      score: number;
      positive: number;
      negative: number;
      neutral: number;
    }>;
    questions: Question[];
  };
}

export interface BattleProcessedReport extends BaseProcessedReport {
  competitors: string[];
  brandBattle?: BrandBattleData;
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