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

class DetailedVisibilityResultDto {
  @ApiProperty({ description: 'AI model name' })
  model: string;

  @ApiProperty({ description: 'Prompt index' })
  promptIndex: number;

  @ApiProperty({ description: 'Whether the brand was mentioned' })
  brandMentioned: boolean;

  @ApiProperty({ description: 'List of companies extracted from response', type: [String] })
  extractedCompanies: string[];

  @ApiProperty({ description: 'Original prompt text' })
  originalPrompt: string;

  @ApiProperty({ description: 'LLM response text' })
  llmResponse: string;

  @ApiProperty({ description: 'Whether web search was used' })
  usedWebSearch: boolean;

  @ApiProperty({ description: 'List of citations', type: [CitationDto] })
  citations: CitationDto[];

  @ApiProperty({ description: 'Tool usage information', type: [ToolUsageDto] })
  toolUsage: ToolUsageDto[];
}

class TopMentionDto {
  @ApiProperty({ description: 'Company mentioned' })
  mention: string;

  @ApiProperty({ description: 'Number of times mentioned' })
  count: number;
}

class TopOtherMentionDto {
  @ApiProperty({ description: 'Company name' })
  company: string;

  @ApiProperty({ description: 'Number of mentions' })
  count: number;
}

class ModelVisibilityDto {
  @ApiProperty({ description: 'AI model name' })
  model: string;

  @ApiProperty({ description: 'Whether brand was mentioned by this model' })
  mentioned: boolean;

  @ApiProperty({ description: 'Number of times brand was mentioned' })
  brandMentionCount: number;

  @ApiProperty({ description: 'Top other company mentions', type: [TopOtherMentionDto] })
  topOtherMentions: TopOtherMentionDto[];
}

class CompetitorRankDto {
  @ApiProperty({ description: 'Competitor name' })
  competitor: string;

  @ApiProperty({ description: 'Number of mentions' })
  count: number;

  @ApiProperty({ description: 'Ranking position' })
  rank: number;
}

class ArenaMetricsDto {
  @ApiProperty({ description: 'Overall mention rate' })
  mentionRate: number;

  @ApiProperty({ description: 'Average ranking position' })
  avgRank: number;

  @ApiProperty({ description: 'Number of models mentioning the brand' })
  modelsMentioningBrand: number;

  @ApiProperty({ description: 'Total number of models' })
  totalModels: number;
}

export class VisibilityData {
  @ApiProperty({ description: 'Brand name' })
  brandName: string;

  @ApiProperty({ description: 'Overall mention rate percentage' })
  mentionRate: number;

  @ApiProperty({ description: 'Top company mentions', type: [TopMentionDto] })
  topMentions: TopMentionDto[];

  @ApiProperty({ description: 'Competitor rankings', type: [CompetitorRankDto] })
  competitorRanks: CompetitorRankDto[];

  @ApiProperty({ description: 'Visibility by model', type: [ModelVisibilityDto] })
  modelVisibility: ModelVisibilityDto[];

  @ApiProperty({ description: 'Arena metrics', type: ArenaMetricsDto })
  arenaMetrics: ArenaMetricsDto;

  @ApiProperty({ description: 'All mentioned companies', type: [String] })
  allMentionedCompanies: string[];

  @ApiProperty({ 
    description: 'Detailed results with full context', 
    type: [DetailedVisibilityResultDto],
    required: false 
  })
  detailedResults?: DetailedVisibilityResultDto[];
}