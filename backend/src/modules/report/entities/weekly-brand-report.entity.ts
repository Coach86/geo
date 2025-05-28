import { ApiProperty } from '@nestjs/swagger';

interface ModelVisibility {
  model: string;
  value: number;
  isAverage?: boolean;
}

interface SentimentResult {
  model: string;
  sentiment: string;
  status: string;
  positiveKeywords: string[];
  negativeKeywords: string[];
}

interface QuestionResult {
  model: string;
  sentiment: string;
  status: string;
  positiveKeywords: string[];
  negativeKeywords: string[];
}

interface Question {
  question: string;
  results: QuestionResult[];
}

interface AttributeItem {
  name: string;
  rate: string;
  alignment: string;
}

interface Competitor {
  name: string;
  size: string;
  global: string;
  modelsMentionsRate: {
    model: string;
    mentionsRate: number;
  }[];
}

interface CompetitorComparison {
  name: string;
  comparisons: {
    model: string;
    positives: string[];
    negatives: string[];
  }[];
}

export class WeeklyBrandReport {
  @ApiProperty({ description: 'Unique identifier for the report' })
  id: string;

  @ApiProperty({ description: 'Company ID this report is associated with' })
  companyId: string;

  @ApiProperty({ description: 'When the report was generated' })
  generatedAt: Date;

  @ApiProperty({ description: 'Brand name from identity card' })
  brand: string;

  @ApiProperty({ description: 'Week start date' })
  date: Date;

  @ApiProperty({ description: 'Report metadata' })
  metadata: {
    url: string;
    market: string;
    flag: string;
    competitors: string;
    date: string;
    models: string;
  };

  @ApiProperty({ description: 'Key Performance Indicators' })
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
      competitors: Array<{
        name: string;
        global: string;
        modelsMentionsRate: Array<{
          model: string;
          mentionsRate: number;
        }>;
        size: string;
      }>;
      description: string;
    };
  };

  @ApiProperty({ description: 'Pulse section data' })
  pulse: {
    promptsTested: number;
    modelVisibility: ModelVisibility[];
  };

  @ApiProperty({ description: 'Tone section data' })
  tone: {
    sentiments: SentimentResult[];
    questions: Question[];
  };

  @ApiProperty({ description: 'Accord section data' })
  accord: {
    attributes: AttributeItem[];
    score: {
      value: string;
      status: string;
    };
  };

  @ApiProperty({ description: 'Arena section data' })
  arena: {
    competitors: Competitor[];
  };

  @ApiProperty({ description: 'Brand Battle section data' })
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

  @ApiProperty({ description: 'Model identifiers for each LLM used' })
  llmVersions?: Record<string, string>;
}
