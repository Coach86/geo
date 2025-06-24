/**
 * Core Report Type System
 *
 * This file defines the complete type hierarchy for the report system to ensure
 * consistent data flow from batch results to MongoDB documents to API responses.
 *
 * Data flow:
 * BatchResults → BatchReportInput → WeeklyBrandReportDocument → WeeklyBrandReportEntity → ResponseDTOs
 */

import {
  SpontaneousResults,
  SentimentResults,
  ComparisonResults,
  AccuracyResults,
  BrandBattleAnalysis,
} from '../../batch/interfaces/batch.interfaces';

/**
 * Raw input from batch processing results
 */
export interface BatchReportInput {
  /** Project identifier */
  projectId: string;

  /** Start of the week (Monday 00:00:00 UTC) */
  date: Date;

  /** Spontaneous mention results from the spontaneous pipeline */
  spontaneous?: SpontaneousResults;

  /** Sentiment analysis results from the sentiment pipeline */
  sentiment?: SentimentResults;

  /** Accuracy analysis results from the accuracy pipeline */
  accord?: AccuracyResults;

  /** Comparison results from the comparison pipeline */
  comparison?: ComparisonResults;

  /** Model identifiers for each LLM used in batch processing */
  llmVersions: Record<string, string>;

  /** When the report data was generated */
  generatedAt: Date;
}

/**
 * Interfaces for the formatted report sections
 */

export interface ModelVisibility {
  model: string;
  value: number;
  isAverage?: boolean;
}

export interface CommonSentimentResult {
  model: string;
  sentiment: string;
  status: string;
  isAverage?: boolean;
}

export interface ApiSentimentResult extends CommonSentimentResult {
  positives?: string;
  negatives?: string;
}

export interface DatabaseSentimentResult extends CommonSentimentResult {
  positiveKeywords?: string[];
  negativeKeywords?: string[];
}

export type SentimentResult = ApiSentimentResult | DatabaseSentimentResult;

export interface CommonQuestionResult {
  model: string;
  sentiment: string;
  status: string;
}

export interface ApiQuestionResult extends CommonQuestionResult {
  keywords?: string;
}

export interface DatabaseQuestionResult extends CommonQuestionResult {
  positiveKeywords?: string[];
  negativeKeywords?: string[];
}

export type QuestionResult = ApiQuestionResult | DatabaseQuestionResult;

export interface Question {
  question: string;
  results: QuestionResult[];
}

export interface AttributeItem {
  name: string;
  rate: string;
  alignment: '✅' | '⚠️' | '❌' | string;
}

export interface Competitor {
  name: string;
  global: string;
  modelsMentionsRate: {
    model: string;
    mentionsRate: number;
  }[];
}

export interface CompetitorComparison {
  name: string;
  comparisons: {
    model: string;
    positives: string[];
    negatives: string[];
  }[];
}

export interface ModelComparison {
  positives: string[];
  negatives: string[];
}

/**
 * Citations data structure
 */
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

/**
 * Complete report entity structure
 * This represents the fully transformed report with all sections
 */
export interface WeeklyBrandReportEntity {
  /** Unique identifier for the report */
  id: string;

  /** Project ID this report is associated with */
  projectId: string;

  /** When the report was generated */
  generatedAt: Date;

  /** ID of the batch execution that generated this report */
  batchExecutionId?: string;

  /** Brand name from identity card */
  brand: string;

  /** Week start date */
  date: Date;

  /** Report metadata */
  metadata: {
    url: string;
    market: string;
    flag: string;
    competitors: string;
    date: string;
    models: string;
  };

  /** Key Performance Indicators */
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

  /** Pulse section data */
  pulse: {
    promptsTested: number;
    modelVisibility: ModelVisibility[];
  };

  /** Tone section data */
  tone: {
    sentiments: SentimentResult[];
    questions: Question[];
  };

  /** Accord section data */
  accord: {
    attributes: AttributeItem[];
    score: {
      value: string;
      status: 'green' | 'yellow' | 'red' | string;
    };
  };

  /** Arena section data */
  arena: {
    competitors: Competitor[];
  };

  /** Brand Battle section data */
  brandBattle: {
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
  };

  /** Trace section data */
  trace: {
    consultedWebsites: Array<{
      url: string;
      count: number;
    }>;
  };

  /** Citations data */
  citationsData?: CitationsData;

  /** Model identifiers for each LLM used */
  llmVersions?: Record<string, string>;

  /** Original raw data (used only for debugging) */
  rawData?: {
    spontaneous?: any;
    sentiment?: any;
    accord?: any;
    comparison?: any;
  };
}

/**
 * MongoDB document interface (what's actually stored in the database)
 * Combines both raw batch data and processed report data
 */
export interface WeeklyBrandReportDocument {
  /** Unique identifier for the report */
  id: string;

  /** Project ID this report is associated with */
  projectId: string;

  /** When the report was generated */
  generatedAt: Date;

  /** ID of the batch execution that generated this report */
  batchExecutionId?: string;

  /** Week start date */
  date: Date;

  /** Brand name from identity card */
  brand?: string;

  /** Report metadata */
  metadata?: {
    url: string;
    market: string;
    flag: string;
    competitors: string;
    date: string;
    models: string;
  };

  /** Key Performance Indicators */
  kpi?: {
    pulse: {
      value: string;
      description: string;
    };
    tone: {
      value: string;
      status: string;
      description: string;
    };
    accord: {
      value: string;
      status: string;
      description: string;
    };
    arena: {
      competitors: string[];
      description: string;
    };
  };

  /** Pulse section data */
  pulse?: {
    promptsTested: number;
    modelVisibility: ModelVisibility[];
  };

  /** Tone section data */
  tone?: {
    sentiments: SentimentResult[];
    questions: Question[];
  };

  /** Accord section data */
  accord?: {
    attributes: AttributeItem[];
    score: {
      value: string;
      status: string;
    };
  };

  /** Arena section data */
  arena?: {
    competitors: Competitor[];
    battle: {
      competitors: CompetitorComparison[];
      chatgpt?: ModelComparison;
      claude?: ModelComparison;
    };
  };

  // Original batch data fields (used for backward compatibility)
  spontaneous?: SpontaneousResults;
  sentiment?: SentimentResults;
  comparison?: ComparisonResults;
  llmVersions: Record<string, string>;

  // Mongoose document timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Legacy weekly report response (for backward compatibility)
 */
export interface WeeklyReportResponseDto {
  projectId: string;
  date: Date;
  spontaneous: SpontaneousResults;
  sentiment: SentimentResults;
  comparison: ComparisonResults;
  llmVersions: Record<string, string>;
  generatedAt: Date;
  batchExecutionId?: string;
}

/**
 * Modern report content response that matches the email template data structure
 */
export interface ReportContentResponseDto {
  id: string;
  projectId: string;
  generatedAt: Date;
  batchExecutionId?: string;
  brand: string;
  metadata: {
    url: string;
    market: string;
    flag: string;
    competitors: string;
    date: string;
    models: string;
  };
  kpi: {
    pulse: {
      value: string;
      description: string;
    };
    tone: {
      value: string;
      status: string;
      description: string;
    };
    accord: {
      value: string;
      status: string;
      description: string;
    };
    arena: {
      competitors: string[];
      description: string;
    };
  };
  pulse: {
    promptsTested: number;
    modelVisibility: ModelVisibility[];
  };
  tone: {
    sentiments: SentimentResult[];
    questions: Question[];
  };
  accord: {
    attributes: AttributeItem[];
    score: {
      value: string;
      status: string;
    };
  };
  arena: {
    competitors: Competitor[];
    battle: {
      competitors: CompetitorComparison[];
      chatgpt?: ModelComparison;
      claude?: ModelComparison;
    };
  };
  brandBattle: {
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
  };
  trace: {
    consultedWebsites: Array<{
      url: string;
      count: number;
    }>;
  };
  citationsData?: CitationsData;
  rawData?: {
    spontaneous: any;
    sentiment: any;
    comparison: any;
    llmVersions: Record<string, string>;
  };
}
