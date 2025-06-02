import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  Param,
  UseInterceptors,
  ClassSerializerInterceptor,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { PromptService } from '../services/prompt.service';
import { UpdatePromptSetDto } from '../dto/update-prompt-set.dto';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';
import { TokenService } from '../../auth/services/token.service';
import { Project } from '../../project/entities/project.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PromptSet, PromptSetDocument } from '../schemas/prompt-set.schema';
import { Project as ProjectSchema, ProjectDocument } from '../../project/schemas/project-base.schema';

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
    @InjectModel(PromptSet.name) private promptSetModel: Model<PromptSetDocument>,
    @InjectModel(ProjectSchema.name) private projectModel: Model<ProjectDocument>,
    private readonly promptService: PromptService,
    private readonly tokenService: TokenService,
  ) {}

  @Get(':projectId')
  @TokenRoute() // Mark this route as token-authenticated
  @ApiOperation({ summary: 'Get prompt set for a project' })
  @ApiResponse({
    status: 200,
    description: 'Returns the prompt set',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        projectId: { type: 'string' },
        spontaneous: { type: 'array', items: { type: 'string' } },
        direct: { type: 'array', items: { type: 'string' } },
        comparison: { type: 'array', items: { type: 'string' } },
        accuracy: { type: 'array', items: { type: 'string' } },
        brandBattle: { type: 'array', items: { type: 'string' } },
        updatedAt: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token required' })
  @ApiResponse({ status: 404, description: 'Prompt set not found' })
  async getPromptSet(
    @Req() request: any,
    @Param('projectId') projectId: string,
  ) {
    try {
      this.logger.log(`Fetching prompt set for project: ${projectId}`);

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

      // Get the prompt set directly from the model
      const promptSet = await this.promptSetModel.findOne({ projectId }).lean().exec();
      
      if (!promptSet) {
        throw new NotFoundException('Prompt set not found');
      }

      // TODO: Verify user owns this project
      // For now, we'll skip this check but it should be added for security

      this.logger.log(`Prompt set retrieved successfully for project: ${projectId}`);

      return {
        id: promptSet._id?.toString() || promptSet.id,
        projectId: promptSet.projectId,
        spontaneous: promptSet.spontaneous,
        direct: promptSet.direct,
        comparison: promptSet.comparison,
        accuracy: promptSet.accuracy,
        brandBattle: promptSet.brandBattle,
        updatedAt: promptSet.updatedAt instanceof Date ? promptSet.updatedAt : new Date(),
        createdAt: promptSet.createdAt instanceof Date ? promptSet.createdAt : new Date(),
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get prompt set: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get prompt set: ${error.message}`);
    }
  }

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

      // Create a Project object for the prompt service
      // Note: We don't need projectId and userId for prompt generation, but the interface requires them
      const projectData: Project = {
        projectId: 'temp-id', // Temporary ID since we're not saving
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
      const promptSet = await this.promptService.generatePromptSet(projectData);

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

  @Patch(':projectId')
  @TokenRoute()
  @ApiOperation({ summary: 'Update prompt set for a project' })
  @ApiBody({ type: UpdatePromptSetDto })
  @ApiResponse({
    status: 200,
    description: 'Prompt set updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token required' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async updatePromptSet(
    @Req() request: any,
    @Param('projectId') projectId: string,
    @Body() updatePromptSetDto: UpdatePromptSetDto,
  ): Promise<any> {
    try {
      this.logger.log(`Updating prompt set for project ${projectId}`);
      
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

      // Check if the user owns this project
      const project = await this.projectModel.findOne({ id: projectId }).exec();
      if (!project) {
        throw new NotFoundException(`Project ${projectId} not found`);
      }
      
      if (project.userId !== request.userId) {
        this.logger.warn(`User ${request.userId} tried to update prompts for project ${projectId} owned by user ${project.userId}`);
        throw new UnauthorizedException('You do not have permission to update prompts for this project');
      }

      this.logger.log(`Updating prompt set for project ${projectId} for user: ${request.userId}`);
      
      // Update the prompt set
      const updatedPromptSet = await this.promptService.updatePromptSet(projectId, updatePromptSetDto);
      
      this.logger.log(`Prompt set updated successfully for project ${projectId}`);
      
      return updatedPromptSet;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update prompt set: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to update prompt set: ${error.message}`);
    }
  }
}
