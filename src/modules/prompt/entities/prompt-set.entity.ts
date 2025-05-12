import { ApiProperty } from '@nestjs/swagger';

export class PromptSet {
  @ApiProperty({ description: 'Unique identifier for the prompt set' })
  id: string;

  @ApiProperty({ description: 'Company ID this prompt set is associated with' })
  companyId: string;

  @ApiProperty({ 
    description: 'List of spontaneous prompts without brand name but with industry keywords',
    type: [String]
  })
  spontaneous: string[];

  @ApiProperty({ 
    description: 'List of direct brand prompts with brand name explicitly mentioned',
    type: [String]
  })
  direct: string[];

  @ApiProperty({ 
    description: 'List of comparison prompts with brand and competitors',
    type: [String]
  })
  comparison: string[];

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;
}