import { ApiProperty } from '@nestjs/swagger';

/**
 * This DTO matches the BrandIntelligenceReportData interface defined in the email/utils/types.ts file
 * to ensure consistent structure between the API and the frontend components
 */
export class ReportContentResponseDto {
  // Basic report information
  @ApiProperty({ description: 'Unique report ID' })
  id: string;

  @ApiProperty({ description: 'Company ID this report is associated with' })
  companyId: string;

  @ApiProperty({ description: 'Start of the week (Monday 00:00:00 UTC)' })
  weekStart: Date;

  @ApiProperty({ description: 'When the report was generated' })
  generatedAt: Date;

  // Brand name - corresponds to identity card's brandName
  @ApiProperty({ description: 'Brand name' })
  brand: string;

  // Metadata section
  @ApiProperty({ description: 'Report metadata', type: 'object', additionalProperties: true })
  metadata: {
    url: string;      // Company website
    market: string;   // Target market (e.g., "US Market / English")
    flag: string;     // Flag emoji (e.g., "🇺🇸")
    competitors: string; // Comma-separated list of competitors
    date: string;     // Report date in ISO format (YYYY-MM-DD)
    models: string;   // Comma-separated list of LLM models used
  };

  // KPI data - summary metrics shown at the top of the report
  @ApiProperty({ description: 'KPI data', type: 'object', additionalProperties: true })
  kpi: {
    pulse: {
      value: string;      // Visibility percentage (e.g., "68%")
      description: string; // Description of the KPI
    };
    tone: {
      value: string;      // Sentiment score (e.g., "+0.35")
      status: string;     // Status color (green/yellow/red)
      description: string; // Description of the KPI
    };
    accord: {
      value: string;      // Brand compliance score (e.g., "7.4/10")
      status: string;     // Status color (green/yellow/red)
      description: string; // Description of the KPI
    };
    arena: {
      competitors: string[]; // List of main competitors
      description: string;   // Description of the KPI
    };
  };

  // Pulse section - visibility metrics across LLM models
  @ApiProperty({ description: 'Pulse section data', type: 'object', additionalProperties: true })
  pulse: {
    promptsTested: number; // Number of prompts tested
    modelVisibility: Array<{
      model: string;      // Model name (e.g., "Claude 3")
      value: number;      // Visibility percentage (0-100)
      isAverage?: boolean; // Whether this entry is the average value
    }>;
  };

  // Tone section - sentiment analysis across LLM models
  @ApiProperty({ description: 'Tone section data', type: 'object', additionalProperties: true })
  tone: {
    sentiments: Array<{
      model: string;      // Model name
      sentiment: string;  // Sentiment score (e.g., "+0.42")
      status: string;     // Status color (green/yellow/red)
      positives: string;  // Comma-separated positive attributes
      negatives: string;  // Comma-separated negative attributes
      isAverage?: boolean; // Whether this entry is the average value
    }>;
    questions: Array<{
      question: string;   // Question asked to LLMs
      results: Array<{
        model: string;    // Model name
        sentiment: string; // Sentiment score
        status: string;   // Status color (green/yellow/red) 
        keywords: string; // Keywords from the response
      }>;
    }>;
  };

  // Accord section - brand attribute alignment
  @ApiProperty({ description: 'Accord section data', type: 'object', additionalProperties: true })
  accord: {
    attributes: Array<{
      name: string;      // Attribute name (e.g., "Innovation")
      rate: string;      // Percentage (e.g., "82%")
      alignment: string; // Alignment indicator (✅/⚠️/❌)
    }>;
    score: {
      value: string;     // Overall score (e.g., "7.4/10")
      status: string;    // Status color (green/yellow/red)
    };
  };

  // Arena section - competitor comparison
  @ApiProperty({ description: 'Arena section data', type: 'object', additionalProperties: true })
  arena: {
    competitors: Array<{
      name: string;      // Competitor name
      chatgpt: number;   // Rank in ChatGPT responses (1-3)
      claude: number;    // Rank in Claude responses (1-3)
      mistral: number;   // Rank in Mistral responses (1-3)
      gemini: number;    // Rank in Gemini responses (1-3)
      global: string;    // Global percentage (e.g., "65%")
      size: string;      // Size indicator for visualization (lg/md/sm)
      sentiment: string; // Overall sentiment (positive/neutral/negative)
    }>;
    battle: {
      competitors: Array<{
        name: string;    // Competitor name
        comparisons: Array<{
          model: string;   // Model name
          positives: string[]; // Positive differentiators
          negatives: string[]; // Negative differentiators
        }>;
      }>;
      chatgpt?: {        // ChatGPT-specific summaries
        positives: string[];
        negatives: string[];
      };
      claude?: {         // Claude-specific summaries
        positives: string[];
        negatives: string[];
      };
    };
  };

  // Raw data for debugging (not visible to frontend)
  @ApiProperty({ description: 'Raw data from database (for debugging)', type: 'object', additionalProperties: true })
  rawData?: {
    spontaneous: any;    // Raw spontaneous data from database
    sentiment: any;      // Raw sentiment data from database
    comparison: any;     // Raw comparison data from database
    llmVersions: Record<string, string>; // LLM version information
  };
}