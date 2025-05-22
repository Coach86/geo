import { ApiProperty } from '@nestjs/swagger';
import {
  ModelVisibility,
  SentimentResult,
  Question,
  AttributeItem,
  Competitor,
  CompetitorComparison,
  ModelComparison,
} from '../interfaces/report-types';

/**
 * This DTO matches the WeeklyBrandReportEntity structure and is used
 * as a response type for the report content API
 */
export class ReportContentResponseDto {
  // Basic report information
  @ApiProperty({ description: 'Unique report ID' })
  id: string;

  @ApiProperty({ description: 'Company ID this report is associated with' })
  companyId: string;

  @ApiProperty({ description: 'When the report was generated' })
  generatedAt: Date;

  @ApiProperty({
    description: 'ID of the batch execution that generated this report',
    required: false,
  })
  batchExecutionId?: string;

  // Brand name - corresponds to identity card's brandName
  @ApiProperty({ description: 'Brand name' })
  brand: string;

  // Metadata section
  @ApiProperty({ description: 'Report metadata', type: 'object', additionalProperties: true })
  metadata: {
    url: string; // Company website
    market: string; // Target market (e.g., "US Market / English")
    flag: string; // Flag emoji (e.g., "🇺🇸")
    competitors: string; // Comma-separated list of competitors
    date: string; // Report date in ISO format (YYYY-MM-DD)
    models: string; // Comma-separated list of LLM models used
  };

  // KPI data - summary metrics shown at the top of the report
  @ApiProperty({ description: 'KPI data', type: 'object', additionalProperties: true })
  kpi: {
    pulse: {
      value: string; // Visibility percentage (e.g., "68%")
      description: string; // Description of the KPI
    };
    tone: {
      value: string; // Sentiment score (e.g., "+0.35")
      status: 'green' | 'yellow' | 'red' | string; // Status color
      description: string; // Description of the KPI
    };
    accord: {
      value: string; // Brand compliance score (e.g., "7.4/10")
      status: 'green' | 'yellow' | 'red' | string; // Status color
      description: string; // Description of the KPI
    };
    arena: {
      competitors: Competitor[]; // List of main competitors
      description: string; // Description of the KPI
    };
  };

  // Pulse section - visibility metrics across LLM models
  @ApiProperty({ description: 'Pulse section data', type: 'object', additionalProperties: true })
  pulse: {
    promptsTested: number; // Number of prompts tested
    modelVisibility: ModelVisibility[];
  };

  // Tone section - sentiment analysis across LLM models
  @ApiProperty({ description: 'Tone section data', type: 'object', additionalProperties: true })
  tone: {
    sentiments: SentimentResult[];
    questions: Question[];
  };

  // Accord section - brand attribute alignment
  @ApiProperty({ description: 'Accord section data', type: 'object', additionalProperties: true })
  accord: {
    attributes: AttributeItem[];
    score: {
      value: string; // Overall score (e.g., "7.4/10")
      status: 'green' | 'yellow' | 'red' | string; // Status color
    };
  };

  // Arena section - competitor comparison
  @ApiProperty({ description: 'Arena section data', type: 'object', additionalProperties: true })
  arena: {
    competitors: Competitor[];
  };

  // Brand Battle section - competitor analysis
  @ApiProperty({
    description: 'Brand Battle section data',
    type: 'object',
    additionalProperties: true,
  })
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

  // Trace section - consulted websites analysis
  @ApiProperty({
    description: 'Trace section data',
    type: 'object',
    additionalProperties: true,
  })
  trace: {
    consultedWebsites: Array<{
      url: string;
      count: number;
    }>;
  };

  // Raw data for debugging (only visible in development)
  @ApiProperty({
    description: 'Raw data from database (for debugging)',
    type: 'object',
    additionalProperties: true,
  })
  rawData?: {
    spontaneous?: any;
    sentiment?: any;
    comparison?: any;
    accord?: any;
  };
}
