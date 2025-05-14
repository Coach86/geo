import { ApiProperty } from '@nestjs/swagger';

interface SpontaneousResult {
  llmProvider: string;
  promptIndex: number;
  mentioned: boolean;
  topOfMind: string[];
}

interface SentimentResult {
  llmProvider: string;
  promptIndex: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  accuracy: number;
  extractedFacts: string[];
}

interface ComparisonResult {
  llmProvider: string;
  promptIndex: number;
  winner: string;
  differentiators: string[];
}

export class WeeklyBrandReport {
  @ApiProperty({ description: 'Unique identifier for the report' })
  id: string;

  @ApiProperty({ description: 'Company ID this report is associated with' })
  companyId: string;

  @ApiProperty({ description: 'Start of the week (Monday 00:00:00 UTC)' })
  weekStart: Date;

  @ApiProperty({ 
    description: 'Spontaneous mention results per LLM and prompt',
    type: Object
  })
  spontaneous: {
    results: SpontaneousResult[];
    summary: {
      mentionRate: number;
      topMentions: string[];
    };
  };

  @ApiProperty({ 
    description: 'Sentiment and accuracy results per LLM and prompt',
    type: Object
  })
  sentimentAccuracy: {
    results: SentimentResult[];
    summary: {
      overallSentiment: 'positive' | 'neutral' | 'negative';
      averageAccuracy: number;
    };
  };

  @ApiProperty({ 
    description: 'Comparison results per LLM and prompt',
    type: Object
  })
  comparison: {
    results: ComparisonResult[];
    summary: {
      winRate: number;
      keyDifferentiators: string[];
    };
  };

  @ApiProperty({ 
    description: 'Model identifiers for each LLM used',
    type: Object
  })
  llmVersions: Record<string, string>;

  @ApiProperty({ description: 'When the report was generated' })
  generatedAt: Date;
}