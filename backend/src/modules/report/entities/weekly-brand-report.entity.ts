import { ApiProperty } from '@nestjs/swagger';

interface ModelVisibility {
  model: string;
  value: number;
  isAverage?: boolean;
}

interface SentimentResult {
  model: string;
  sentiment: string;
  status: 'green' | 'yellow' | 'red';
  positives: string;
  negatives: string;
  isAverage?: boolean;
}

interface QuestionResult {
  model: string;
  sentiment: string;
  status: 'green' | 'yellow' | 'red';
  keywords: string;
}

interface Question {
  question: string;
  results: QuestionResult[];
}

interface AttributeItem {
  name: string;
  rate: string;
  alignment: '✅' | '⚠️' | '❌';
}

interface Competitor {
  name: string;
  chatgpt: number;
  claude: number;
  mistral: number;
  gemini: number;
  global: string;
  size: 'lg' | 'md' | 'sm';
  sentiment: 'positive' | 'neutral' | 'negative';
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
      status: 'green' | 'yellow' | 'red';
      description: string;
    };
    accord: {
      value: string;
      status: 'green' | 'yellow' | 'red';
      description: string;
    };
    arena: {
      competitors: string[];
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
      status: 'green' | 'yellow' | 'red';
    };
  };

  @ApiProperty({ description: 'Arena section data' })
  arena: {
    competitors: Competitor[];
    battle: {
      competitors: CompetitorComparison[];
      chatgpt?: {
        positives: string[];
        negatives: string[];
      };
      claude?: {
        positives: string[];
        negatives: string[];
      };
    };
  };

  // Original data fields (for backward compatibility and data processing)
  @ApiProperty({ description: 'Start of the week (Monday 00:00:00 UTC)' })
  weekStart: Date;

  @ApiProperty({ description: 'Spontaneous mention results' })
  spontaneous?: {
    results: {
      llmProvider: string;
      promptIndex: number;
      mentioned: boolean;
      topOfMind: string[];
    }[];
    summary: {
      mentionRate: number;
      topMentions: string[];
    };
  };

  @ApiProperty({ description: 'Sentiment and accuracy results' })
  sentimentAccuracy?: {
    results: {
      llmProvider: string;
      promptIndex: number;
      sentiment: 'positive' | 'neutral' | 'negative';
      accuracy: number;
      extractedFacts: string[];
    }[];
    summary: {
      overallSentiment: 'positive' | 'neutral' | 'negative';
      averageAccuracy: number;
    };
  };

  @ApiProperty({ description: 'Comparison results' })
  comparison?: {
    results: {
      llmProvider: string;
      promptIndex: number;
      winner: string;
      differentiators: string[];
    }[];
    summary: {
      winRate: number;
      keyDifferentiators: string[];
    };
  };

  @ApiProperty({ description: 'Model identifiers for each LLM used' })
  llmVersions?: Record<string, string>;

  @ApiProperty({ description: 'User ID who generated the report' })
  userId: string;
}
