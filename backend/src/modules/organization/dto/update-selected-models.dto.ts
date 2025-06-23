import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class UpdateSelectedModelsDto {
  @ApiProperty({ description: 'Array of selected AI model identifiers', type: [String] })
  @IsArray()
  @IsString({ each: true })
  selectedModels: string[];
}