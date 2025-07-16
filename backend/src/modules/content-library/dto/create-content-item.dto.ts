import { IsString, IsNotEmpty, IsUrl, IsObject, ValidateNested, IsOptional, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ContentMetadataDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  publishedDate?: Date;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  source: string;

  @ApiProperty()
  @IsNotEmpty()
  wordCount: number;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  extractedAt: Date;
}

export class CreateContentItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty()
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty()
  @IsObject()
  @ValidateNested()
  @Type(() => ContentMetadataDto)
  metadata: ContentMetadataDto;
}