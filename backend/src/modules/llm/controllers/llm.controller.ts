import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { LlmService } from '../services/llm.service';
import { LlmProvider } from '../interfaces/llm-provider.enum';
class DirectTestDto {
  @ApiProperty({ description: 'The prompt to test with LLM providers' })
  @IsString()
  prompt: string;

  @ApiPropertyOptional({ description: 'Specific providers to test (empty for all)', type: [String] })
  @IsArray()
  @IsOptional()
  providers?: string[];
}

@ApiTags('llm')
@Controller('admin/llm')
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  @Get('available-adapters')
  @ApiOperation({ summary: 'Get available LLM adapters' })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of available LLM adapters',
  })
  getAvailableAdapters() {
    const adapters = this.llmService.getAvailableAdapters();
    return {
      available: adapters.length,
      adapters: adapters.map((adapter) => adapter.name),
    };
  }

  @Post('direct-test')
  @ApiOperation({ summary: 'Test LLM providers with a direct prompt' })
  @ApiBody({ type: DirectTestDto })
  @ApiResponse({
    status: 200,
    description: 'Returns the responses from the specified LLM providers',
  })
  async testDirectly(@Body() directTestDto: DirectTestDto) {
    const results: Record<string, any> = {};

    if (!directTestDto.providers || directTestDto.providers.length === 0) {
      // If no providers specified, use all available
      const availableAdapters = this.llmService.getAvailableAdapters();
      directTestDto.providers = availableAdapters.map((adapter) => adapter.name);
    }

    // Call each provider one by one
    for (const provider of directTestDto.providers) {
      try {
        const response = await this.llmService.call(provider as LlmProvider, directTestDto.prompt);
        results[provider] = response;
      } catch (error) {
        results[provider] = { error: error.message };
      }
    }

    return results;
  }
}
