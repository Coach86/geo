import { ApiProperty } from '@nestjs/swagger';

export class RawResponseDto {
  @ApiProperty({ description: 'Unique identifier for the raw response' })
  id: string;

  @ApiProperty({ description: 'The ID of the batch execution this response belongs to' })
  batchExecutionId: string;

  @ApiProperty({ description: 'The LLM provider that generated the response' })
  llmProvider: string;

  @ApiProperty({ 
    description: 'The type of prompt that generated this response',
    enum: ['spontaneous', 'direct', 'comparison'],
  })
  promptType: 'spontaneous' | 'direct' | 'comparison';

  @ApiProperty({ description: 'The index of the prompt within its type' })
  promptIndex: number;

  @ApiProperty({ description: 'The raw text response from the LLM' })
  response: string;

  @ApiProperty({ description: 'Whether the response used web search' })
  usedWebSearch: boolean;

  @ApiProperty({ description: 'Citations used in the response', required: false })
  citations?: string;

  @ApiProperty({ description: 'Tool usage in the response', required: false })
  toolUsage?: string;

  @ApiProperty({ description: 'Additional response metadata', required: false })
  responseMetadata?: string;

  @ApiProperty({ description: 'When the response was created' })
  createdAt: Date;
}