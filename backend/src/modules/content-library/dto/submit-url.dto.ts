import { IsString, IsNotEmpty, IsUrl, IsArray, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitUrlDto {
  @ApiProperty({ 
    description: 'URLs to submit for content extraction',
    example: ['https://example.com/article1', 'https://example.com/article2'],
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsUrl({}, { each: true })
  urls: string[];
}