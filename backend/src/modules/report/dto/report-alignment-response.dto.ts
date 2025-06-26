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

class AttributeScoreDto {
  @ApiProperty({ description: 'Attribute name' })
  attribute: string;

  @ApiProperty({ description: 'Alignment score (0-100)' })
  score: number;

  @ApiProperty({ description: 'Evaluation explanation' })
  evaluation: string;
}

class AttributeAlignmentSummaryDto {
  @ApiProperty({ description: 'Attribute name' })
  name: string;

  @ApiProperty({ description: 'Mention rate percentage' })
  mentionRate: string;

  @ApiProperty({ description: 'Average alignment score' })
  alignment: string;
}

class AlignmentSummaryDto {
  @ApiProperty({ description: 'Overall alignment score' })
  overallAlignmentScore: number;

  @ApiProperty({ description: 'Average scores by attribute', type: Object })
  averageAttributeScores: Record<string, number>;

  @ApiProperty({ description: 'Attribute alignment summaries', type: [AttributeAlignmentSummaryDto] })
  attributeAlignmentSummary: AttributeAlignmentSummaryDto[];
}

class DetailedAlignmentResultDto {
  @ApiProperty({ description: 'AI model name' })
  model: string;

  @ApiProperty({ description: 'Prompt index', required: false })
  promptIndex?: number;

  @ApiProperty({ description: 'Original prompt text', required: false })
  originalPrompt?: string;

  @ApiProperty({ description: 'LLM response text', required: false })
  llmResponse?: string;

  @ApiProperty({ description: 'Attribute scores', type: [AttributeScoreDto] })
  attributeScores: AttributeScoreDto[];

  @ApiProperty({ description: 'Whether web search was used', required: false })
  usedWebSearch?: boolean;

  @ApiProperty({ description: 'List of citations', type: [CitationDto], required: false })
  citations?: CitationDto[];

  @ApiProperty({ description: 'Tool usage information', type: [ToolUsageDto], required: false })
  toolUsage?: ToolUsageDto[];

  @ApiProperty({ description: 'Error message if analysis failed', required: false })
  error?: string;
}

export class AlignmentData {
  @ApiProperty({ description: 'Alignment summary', type: AlignmentSummaryDto })
  summary: AlignmentSummaryDto;

  @ApiProperty({ description: 'Detailed alignment results', type: [DetailedAlignmentResultDto] })
  detailedResults: DetailedAlignmentResultDto[];
}