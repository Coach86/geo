import {
  Controller,
  Post,
  Body,
  Req,
  UseInterceptors,
  ClassSerializerInterceptor,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { PromptService } from '../services/prompt.service';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';
import { TokenService } from '../../auth/services/token.service';
import { CompanyIdentityCard } from '../../identity-card/entities/company-identity-card.entity';

export interface GeneratePromptsRequest {
  brandName: string;
  website: string;
  industry: string;
  market: string;
  language?: string;
  keyBrandAttributes: string[];
  competitors: string[];
  shortDescription?: string;
  fullDescription?: string;
}

export interface GeneratePromptsResponse {
  spontaneous: string[];
  direct: string[];
  comparison: string[];
  accuracy: string[];
  brandBattle: string[];
}

@ApiTags('public-prompts')
@Controller('prompts')
@UseInterceptors(ClassSerializerInterceptor)
export class PublicPromptController {
  private readonly logger = new Logger(PublicPromptController.name);

  constructor(
    private readonly promptService: PromptService,
    private readonly tokenService: TokenService,
  ) {}

  @Post('generate')
  @TokenRoute() // Mark this route as token-authenticated
  @ApiOperation({ summary: 'Generate prompts for brand data without saving' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        brandName: { type: 'string', example: 'Acme Corp' },
        website: { type: 'string', format: 'uri', example: 'https://example.com' },
        industry: { type: 'string', example: 'Technology' },
        market: { type: 'string', example: 'United States' },
        language: { type: 'string', example: 'English' },
        keyBrandAttributes: {
          type: 'array',
          items: { type: 'string' },
          example: ['Innovative', 'Reliable', 'User-friendly'],
        },
        competitors: {
          type: 'array',
          items: { type: 'string' },
          example: ['Competitor A', 'Competitor B', 'Competitor C'],
        },
        shortDescription: { type: 'string', example: 'A leading provider of innovative solutions' },
        fullDescription: { type: 'string', example: 'Detailed company description...' },
      },
      required: ['brandName', 'website', 'industry', 'market', 'keyBrandAttributes', 'competitors'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Prompts generated successfully',
    schema: {
      type: 'object',
      properties: {
        spontaneous: { type: 'array', items: { type: 'string' } },
        direct: { type: 'array', items: { type: 'string' } },
        comparison: { type: 'array', items: { type: 'string' } },
        accuracy: { type: 'array', items: { type: 'string' } },
        brandBattle: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token required' })
  async generatePrompts(
    @Req() request: any,
    @Body() body: GeneratePromptsRequest,
  ): Promise<GeneratePromptsResponse> {
    try {
      this.logger.log(`Token-based prompt generation for brand: ${body.brandName}`);

      // Validate user authentication
      if (!request.userId) {
        if (request.token) {
          const validation = await this.tokenService.validateAccessToken(request.token);
          if (validation.valid && validation.userId) {
            request.userId = validation.userId;
          } else {
            throw new UnauthorizedException('Invalid or expired token');
          }
        } else {
          throw new UnauthorizedException('User not authenticated');
        }
      }

      // Validate required fields
      if (!body.brandName || !body.website || !body.industry || !body.market) {
        throw new BadRequestException('Brand name, website, industry, and market are required');
      }

      if (!body.keyBrandAttributes || !Array.isArray(body.keyBrandAttributes)) {
        throw new BadRequestException('Key brand attributes must be provided as an array');
      }

      if (!body.competitors || !Array.isArray(body.competitors)) {
        throw new BadRequestException('Competitors must be provided as an array');
      }

      // Create a CompanyIdentityCard object for the prompt service
      // Note: We don't need companyId and userId for prompt generation, but the interface requires them
      const companyData: CompanyIdentityCard = {
        companyId: 'temp-id', // Temporary ID since we're not saving
        brandName: body.brandName,
        website: body.website,
        industry: body.industry,
        market: body.market,
        language: body.language || 'en',
        keyBrandAttributes: body.keyBrandAttributes,
        competitors: body.competitors,
        shortDescription: body.shortDescription || '',
        fullDescription: body.fullDescription || body.shortDescription || '',
        userId: request.userId,
        updatedAt: new Date(),
      };

      this.logger.log(`Generating prompts for brand: ${body.brandName} in market: ${body.market}`);

      // Generate prompts using the public method (no database saving)
      const promptSet = await this.promptService.generatePromptSet(companyData);

      this.logger.log(`Prompts generated successfully for brand: ${body.brandName}`);

      return {
        spontaneous: promptSet.spontaneous || [],
        direct: promptSet.direct || [],
        comparison: promptSet.comparison || [],
        accuracy: promptSet.accuracy || [],
        brandBattle: promptSet.brandBattle || [],
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Failed to generate prompts: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to generate prompts: ${error.message}`);
    }
  }
}
