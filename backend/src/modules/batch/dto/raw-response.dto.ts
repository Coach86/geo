import { ApiProperty } from '@nestjs/swagger';

export class RawResponseDto {
  @ApiProperty({ description: 'Unique identifier for the raw response' })
  id: string;

  @ApiProperty({ description: 'The ID of the batch execution this response belongs to' })
  batchExecutionId: string;

  @ApiProperty({ 
    description: 'The type of prompt that generated this response',
    enum: ['spontaneous', 'direct', 'comparison', 'accuracy'],
  })
  promptType: 'spontaneous' | 'direct' | 'comparison' | 'accuracy';

  @ApiProperty({ description: 'The index of the prompt within its type' })
  promptIndex: number;

  @ApiProperty({ description: 'The original prompt sent to the LLM' })
  originalPrompt: string;

  @ApiProperty({ description: 'The raw text response from the LLM' })
  llmResponse: string;

  @ApiProperty({ description: 'The model used to generate the LLM response' })
  llmResponseModel: string;

  @ApiProperty({ description: 'The prompt sent to the analyzer LLM', required: false })
  analyzerPrompt?: string;

  @ApiProperty({ description: 'The structured response from the analyzer LLM', required: false })
  analyzerResponse?: any;

  @ApiProperty({ description: 'The model used to generate the analyzer response', required: false })
  analyzerResponseModel?: string;

  @ApiProperty({ description: 'When the response was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the response was last updated' })
  updatedAt: Date;
}