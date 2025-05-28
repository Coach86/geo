import { ApiProperty } from '@nestjs/swagger';

// We're no longer implementing the full WeeklyBrandReport interface
export class WeeklyReportResponseDto {
  @ApiProperty({ description: 'Company ID this report is associated with' })
  companyId: string;

  @ApiProperty({ description: 'Start of the week (Monday 00:00:00 UTC)' })
  date: Date;

  @ApiProperty({
    description: 'Spontaneous mention results per LLM and prompt',
    type: Object,
  })
  spontaneous: {
    results: Array<{
      llmProvider: string;
      promptIndex: number;
      mentioned: boolean;
      topOfMind: string[];
    }>;
    summary: {
      mentionRate: number;
      topMentions: string[];
    };
  };

  @ApiProperty({
    description: 'Sentiment and accuracy results per LLM and prompt',
    type: Object,
  })
  sentiment: {
    results: Array<{
      llmProvider: string;
      promptIndex: number;
      sentiment: 'positive' | 'neutral' | 'negative';
      accuracy: number;
      extractedPositiveKeywords: string[];
      extractedNegativeKeywords: string[];
    }>;
    summary: {
      overallSentiment: 'positive' | 'neutral' | 'negative';
      averageAccuracy: number;
    };
  };

  @ApiProperty({
    description: 'Comparison results per LLM and prompt',
    type: Object,
  })
  comparison: {
    results: Array<{
      llmProvider: string;
      promptIndex: number;
      winner: string;
      differentiators: string[];
    }>;
    summary: {
      winRate: number;
      keyDifferentiators: string[];
    };
  };

  @ApiProperty({
    description: 'Model identifiers for each LLM used',
    type: Object,
  })
  llmVersions: Record<string, string>;

  @ApiProperty({ description: 'When the report was generated' })
  generatedAt: Date;

  // New fields are not included in this DTO since it's used for the legacy API
}
