import { ApiProperty } from '@nestjs/swagger';
import { AggregatedCitationsDto } from './citation-item.dto';

class CitationDto {
  @ApiProperty({ description: 'Citation URL' })
  url: string;

  @ApiProperty({ description: 'Citation title', required: false })
  title?: string;

  @ApiProperty({ description: 'Citation text snippet', required: false })
  text?: string;
}

class ToolUsageExecutionDetailsDto {
  @ApiProperty({ description: 'Execution status' })
  status: string;

  @ApiProperty({ description: 'Execution result', required: false })
  result?: any;

  @ApiProperty({ description: 'Error message', required: false })
  error?: string;
}

class ToolUsageDto {
  @ApiProperty({ description: 'Tool type used' })
  type: string;

  @ApiProperty({ description: 'Tool parameters', required: false })
  parameters?: Record<string, any>;

  @ApiProperty({ description: 'Execution details', required: false, type: ToolUsageExecutionDetailsDto })
  execution_details?: ToolUsageExecutionDetailsDto;
}

class AnalysisByModelDto {
  @ApiProperty({ description: 'AI model name' })
  model: string;

  @ApiProperty({ description: 'Brand strengths identified', type: [String] })
  strengths: string[];

  @ApiProperty({ description: 'Brand weaknesses identified', type: [String] })
  weaknesses: string[];
}

class CompetitorAnalysisDto {
  @ApiProperty({ description: 'Competitor name' })
  competitor: string;

  @ApiProperty({ description: 'Analysis by different models', type: [AnalysisByModelDto] })
  analysisByModel: AnalysisByModelDto[];
}

class ModelMentionDto {
  @ApiProperty({ description: 'AI model name' })
  model: string;

  @ApiProperty({ description: 'Ranking position for this model' })
  rank: number;

  @ApiProperty({ description: 'Mention rate percentage' })
  mentionRate: number;
}

class CompetitorMetricsDto {
  @ApiProperty({ description: 'Competitor name' })
  competitor: string;

  @ApiProperty({ description: 'Overall ranking position' })
  overallRank: number;

  @ApiProperty({ description: 'Overall mention rate' })
  mentionRate: number;

  @ApiProperty({ description: 'Mentions by model', type: [ModelMentionDto] })
  modelMentions: ModelMentionDto[];
}

class DetailedCompetitionResultDto {
  @ApiProperty({ description: 'AI model name' })
  model: string;

  @ApiProperty({ description: 'Prompt index' })
  promptIndex: number;

  @ApiProperty({ description: 'Competitor being analyzed' })
  competitor: string;

  @ApiProperty({ description: 'Original prompt text' })
  originalPrompt: string;

  @ApiProperty({ description: 'LLM response text' })
  llmResponse: string;

  @ApiProperty({ description: 'Brand strengths identified', type: [String] })
  brandStrengths: string[];

  @ApiProperty({ description: 'Brand weaknesses identified', type: [String] })
  brandWeaknesses: string[];

  @ApiProperty({ description: 'Whether web search was used' })
  usedWebSearch: boolean;

  @ApiProperty({ description: 'List of citations', type: [CitationDto] })
  citations: CitationDto[];

  @ApiProperty({ description: 'Tool usage information', type: [ToolUsageDto] })
  toolUsage: ToolUsageDto[];
}

export class ReportCompetitionResponseDto {
  @ApiProperty({ description: 'Brand name' })
  brandName: string;

  @ApiProperty({ description: 'List of competitors', type: [String] })
  competitors: string[];

  @ApiProperty({ description: 'Competitor analyses', type: [CompetitorAnalysisDto] })
  competitorAnalyses: CompetitorAnalysisDto[];

  @ApiProperty({ description: 'Competitor metrics', type: [CompetitorMetricsDto] })
  competitorMetrics: CompetitorMetricsDto[];

  @ApiProperty({ description: 'Common strengths across analyses', type: [String] })
  commonStrengths: string[];

  @ApiProperty({ description: 'Common weaknesses across analyses', type: [String] })
  commonWeaknesses: string[];

  @ApiProperty({ 
    description: 'Detailed competition results', 
    type: [DetailedCompetitionResultDto],
    required: false 
  })
  detailedResults?: DetailedCompetitionResultDto[];

  @ApiProperty({ 
    description: 'Aggregated citations from competition analysis', 
    type: AggregatedCitationsDto,
    required: false 
  })
  citations?: AggregatedCitationsDto;
}

// Keep the original CompetitionData class for internal use
export class CompetitionData {
  @ApiProperty({ description: 'Brand name' })
  brandName: string;

  @ApiProperty({ description: 'List of competitors', type: [String] })
  competitors: string[];

  @ApiProperty({ description: 'Competitor analyses', type: [CompetitorAnalysisDto] })
  competitorAnalyses: CompetitorAnalysisDto[];

  @ApiProperty({ description: 'Competitor metrics', type: [CompetitorMetricsDto] })
  competitorMetrics: CompetitorMetricsDto[];

  @ApiProperty({ description: 'Common strengths across analyses', type: [String] })
  commonStrengths: string[];

  @ApiProperty({ description: 'Common weaknesses across analyses', type: [String] })
  commonWeaknesses: string[];

  @ApiProperty({ 
    description: 'Detailed competition results', 
    type: [DetailedCompetitionResultDto],
    required: false 
  })
  detailedResults?: DetailedCompetitionResultDto[];
}