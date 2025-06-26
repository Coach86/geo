import { ApiProperty } from '@nestjs/swagger';

class CitationDto {
  @ApiProperty({ description: 'Citation URL' })
  url: string;

  @ApiProperty({ description: 'Citation title', required: false })
  title?: string;

  @ApiProperty({ description: 'Citation text snippet', required: false })
  text?: string;

  @ApiProperty({ description: 'Citation domain', required: false })
  domain?: string;

  @ApiProperty({ description: 'Citation source', required: false })
  source?: string;

  @ApiProperty({ description: 'Website', required: false })
  website?: string;

  @ApiProperty({ description: 'Full link', required: false })
  link?: string;

  @ApiProperty({ description: 'Model that generated this citation', required: false })
  model?: string;

  @ApiProperty({ description: 'Prompt type', required: false })
  promptType?: string;

  @ApiProperty({ description: 'Prompt index', required: false })
  promptIndex?: number;
}

class ToolUsageDto {
  @ApiProperty({ description: 'Tool type used' })
  type: string;

  @ApiProperty({ description: 'Tool parameters', required: false })
  parameters?: Record<string, any>;

  @ApiProperty({ description: 'Execution details', required: false })
  execution_details?: {
    status: string;
    result?: any;
    error?: string;
    duration?: number;
    timestamp?: string;
  };
}

class SentimentDistributionDto {
  @ApiProperty({ description: 'Number of positive sentiments' })
  positive: number;

  @ApiProperty({ description: 'Number of neutral sentiments' })
  neutral: number;

  @ApiProperty({ description: 'Number of negative sentiments' })
  negative: number;

  @ApiProperty({ description: 'Total number of sentiments' })
  total: number;
}

class ModelSentimentDto {
  @ApiProperty({ description: 'AI model name' })
  model: string;

  @ApiProperty({ description: 'Overall sentiment', enum: ['positive', 'neutral', 'negative'] })
  sentiment: 'positive' | 'neutral' | 'negative';

  @ApiProperty({ description: 'Status indicator', enum: ['green', 'yellow', 'red'] })
  status: 'green' | 'yellow' | 'red';

  @ApiProperty({ description: 'Positive keywords extracted', type: [String] })
  positiveKeywords: string[];

  @ApiProperty({ description: 'Negative keywords extracted', type: [String] })
  negativeKeywords: string[];
}

class HeatmapResultDto {
  @ApiProperty({ description: 'AI model name' })
  model: string;

  @ApiProperty({ description: 'Sentiment result', enum: ['positive', 'neutral', 'negative'] })
  sentiment: 'positive' | 'neutral' | 'negative';

  @ApiProperty({ description: 'Status indicator', enum: ['green', 'yellow', 'red'] })
  status: 'green' | 'yellow' | 'red';

  @ApiProperty({ description: 'LLM response text', required: false })
  llmResponse?: string;

  @ApiProperty({ description: 'Citations', type: [CitationDto], required: false })
  citations?: CitationDto[];

  @ApiProperty({ description: 'Tool usage', type: [ToolUsageDto], required: false })
  toolUsage?: ToolUsageDto[];
}

class HeatmapDataDto {
  @ApiProperty({ description: 'Question or prompt' })
  question: string;

  @ApiProperty({ description: 'Results by model', type: [HeatmapResultDto] })
  results: HeatmapResultDto[];
}

class DetailedSentimentResultDto {
  @ApiProperty({ description: 'AI model name' })
  model: string;

  @ApiProperty({ description: 'Prompt index' })
  promptIndex: number;

  @ApiProperty({ description: 'Original prompt text' })
  originalPrompt: string;

  @ApiProperty({ description: 'LLM response text' })
  llmResponse: string;

  @ApiProperty({ description: 'Sentiment classification', enum: ['positive', 'neutral', 'negative'] })
  sentiment: 'positive' | 'neutral' | 'negative';

  @ApiProperty({ description: 'Extracted positive keywords', type: [String] })
  extractedPositiveKeywords: string[];

  @ApiProperty({ description: 'Extracted negative keywords', type: [String] })
  extractedNegativeKeywords: string[];

  @ApiProperty({ description: 'Whether web search was used' })
  usedWebSearch: boolean;

  @ApiProperty({ description: 'List of citations', type: [CitationDto] })
  citations: CitationDto[];

  @ApiProperty({ description: 'Tool usage information', type: [ToolUsageDto] })
  toolUsage: ToolUsageDto[];
}

export class SentimentData {
  @ApiProperty({ description: 'Overall sentiment score (-100 to 100)' })
  overallScore: number;

  @ApiProperty({ description: 'Overall sentiment classification', enum: ['positive', 'neutral', 'negative'] })
  overallSentiment: 'positive' | 'neutral' | 'negative';

  @ApiProperty({ description: 'Sentiment distribution', type: SentimentDistributionDto })
  distribution: SentimentDistributionDto;

  @ApiProperty({ description: 'Sentiment by model', type: [ModelSentimentDto] })
  modelSentiments: ModelSentimentDto[];

  @ApiProperty({ description: 'Heatmap data by question', type: [HeatmapDataDto] })
  heatmapData: HeatmapDataDto[];

  @ApiProperty({ 
    description: 'Detailed sentiment results', 
    type: [DetailedSentimentResultDto],
    required: false 
  })
  detailedResults?: DetailedSentimentResultDto[];
}