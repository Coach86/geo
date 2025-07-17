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
import { GeneratePromptsFromKeywordsDto, RegeneratePromptsDto } from '../dto/generate-prompts-keywords.dto';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';
import { TokenService } from '../../auth/services/token.service';
import { Project } from '../../project/entities/project.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PromptSet, PromptSetDocument } from '../schemas/prompt-set.schema';
import { Project as ProjectSchema, ProjectDocument } from '../../project/schemas/project-base.schema';
import { UserService } from '../../user/services/user.service';
import { Organization, OrganizationDocument } from '../../organization/schemas/organization.schema';

export interface GeneratePromptsRequest {
  brandName: string;
  website: string;
  industry: string;
  market: string;
  language?: string;
  keyBrandAttributes: string[];
  competitors: string[];
  scrapedKeywords?: string[];
  shortDescription?: string;
  fullDescription?: string;
  objectives?: string;
}

export interface GeneratePromptsResponse {
  visibility: string[];
  sentiment: string[];
  alignment: string[];
  competition: string[];
}

@ApiTags('User - Prompts')
@Controller('prompts')
@UseInterceptors(ClassSerializerInterceptor)
export class PublicPromptController {
  private readonly logger = new Logger(PublicPromptController.name);

  constructor(
    @InjectModel(PromptSet.name) private promptSetModel: Model<PromptSetDocument>,
    @InjectModel(ProjectSchema.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Organization.name) private organizationModel: Model<OrganizationDocument>,
    private readonly promptService: PromptService,
    private readonly tokenService: TokenService,
    private readonly userService: UserService,
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
        visibility: { type: 'array', items: { type: 'string' } },
        sentiment: { type: 'array', items: { type: 'string' } },
        alignment: { type: 'array', items: { type: 'string' } },
        competition: { type: 'array', items: { type: 'string' } },
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

      // SECURITY: Verify user owns this project
      const user = await this.userService.findOne(request.userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const project = await this.projectModel.findOne({ id: projectId }).lean().exec();
      if (!project) {
        throw new NotFoundException('Project not found');
      }

      if (project.organizationId !== user.organizationId) {
        throw new UnauthorizedException('You do not have permission to access this project');
      }

      // Get the prompt set directly from the model
      const promptSet = await this.promptSetModel.findOne({ projectId }).lean().exec();
      
      if (!promptSet) {
        throw new NotFoundException('Prompt set not found');
      }

      this.logger.log(`Prompt set retrieved successfully for project: ${projectId}`);

      return {
        id: promptSet._id?.toString() || promptSet.id,
        projectId: promptSet.projectId,
        visibility: promptSet.visibility || [],
        sentiment: promptSet.sentiment || [],
        alignment: promptSet.alignment || [],
        competition: promptSet.competition || [],
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
        scrapedKeywords: {
          type: 'array',
          items: { type: 'string' },
          example: ['innovation', 'technology', 'solutions'],
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
        visibility: { type: 'array', items: { type: 'string' } },
        sentiment: { type: 'array', items: { type: 'string' } },
        alignment: { type: 'array', items: { type: 'string' } },
        competition: { type: 'array', items: { type: 'string' } },
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
      // Note: We don't need projectId for prompt generation, but the interface requires it
      const projectData: Project = {
        projectId: 'temp-id', // Temporary ID since we're not saving
        brandName: body.brandName,
        website: body.website,
        industry: body.industry,
        market: body.market,
        language: body.language || 'en',
        keyBrandAttributes: body.keyBrandAttributes,
        competitors: body.competitors,
        scrapedKeywords: body.scrapedKeywords || [],
        shortDescription: body.shortDescription || '',
        fullDescription: body.fullDescription || body.shortDescription || '',
        objectives: body.objectives || '',
        organizationId: 'temp-org-id', // Temporary ID since we're not saving
        updatedAt: new Date(),
      };

      this.logger.log(`Generating prompts for brand: ${body.brandName} in market: ${body.market}`);

      // Generate prompts using the public method (no database saving)
      const promptSet = await this.promptService.generatePromptSet(projectData);

      this.logger.log(`Prompts generated successfully for brand: ${body.brandName}`);

      return {
        visibility: promptSet.visibility || [],
        sentiment: promptSet.sentiment || [],
        alignment: promptSet.alignment || [],
        competition: promptSet.competition || [],
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Failed to generate prompts: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to generate prompts: ${error.message}`);
    }
  }

  @Post(':projectId/regenerate/:promptType')
  @TokenRoute()
  @ApiOperation({ summary: 'Regenerate specific prompt type for a project' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', description: 'Number of prompts to generate', example: 15 },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Prompts regenerated successfully',
    schema: {
      type: 'object',
      properties: {
        prompts: { type: 'array', items: { type: 'string' } },
        type: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token required' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async regeneratePromptType(
    @Req() request: any,
    @Param('projectId') projectId: string,
    @Param('promptType') promptType: 'visibility' | 'sentiment' | 'alignment' | 'competition',
    @Body() body: RegeneratePromptsDto,
  ): Promise<{ prompts: string[]; type: string }> {
    try {
      this.logger.log(`Regenerating ${promptType} prompts for project ${projectId}`);
      
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
      
      // Get user to check organization
      const user = await this.userService.findOne(request.userId);
      if (!user) {
        throw new BadRequestException('User not found');
      }
      
      if (project.organizationId !== user.organizationId) {
        this.logger.warn(`User ${request.userId} tried to regenerate prompts for project ${projectId} from different organization`);
        throw new UnauthorizedException('You do not have permission to regenerate prompts for this project');
      }

      // Validate prompt type
      const validTypes = ['visibility', 'sentiment', 'alignment', 'competition'];
      if (!validTypes.includes(promptType)) {
        throw new BadRequestException(`Invalid prompt type. Must be one of: ${validTypes.join(', ')}`);
      }

      // Check if we need to apply plan limits for add mode
      if (body.addMode && promptType === 'visibility') {
        // Get current prompts to check limit
        const existingPromptSet = await this.promptSetModel.findOne({ projectId }).lean().exec();
        const currentPromptCount = existingPromptSet?.visibility?.length || 0;
        
        // Check if user's plan allows adding more prompts
        if (user.organizationId) {
          const org = await this.organizationModel.findOne({ id: user.organizationId }).lean().exec();
          const maxPrompts = org?.planSettings?.maxSpontaneousPrompts || 12;
          const remainingSlots = maxPrompts - currentPromptCount;
          
          if (remainingSlots <= 0) {
            throw new BadRequestException('You have reached the maximum number of visibility prompts for your plan');
          }
          
          // Adjust count if it exceeds remaining slots
          if (body.count && body.count > remainingSlots) {
            body.count = remainingSlots;
          }
        }
      }

      // Regenerate prompts for the specific type
      const regeneratedPrompts = await this.promptService.regeneratePromptType(
        projectId, 
        promptType, 
        body.count,
        body.additionalInstructions,
        body.keywords,
        body.addMode,
      );
      
      this.logger.log(`Successfully regenerated ${regeneratedPrompts.length} ${promptType} prompts for project ${projectId}`);
      
      return {
        prompts: regeneratedPrompts,
        type: promptType,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to regenerate prompts: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to regenerate prompts: ${error.message}`);
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
      
      // Get user to check organization
      const user = await this.userService.findOne(request.userId);
      if (!user) {
        throw new BadRequestException('User not found');
      }
      
      if (project.organizationId !== user.organizationId) {
        this.logger.warn(`User ${request.userId} tried to update prompts for project ${projectId} from different organization`);
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

  @Post('generate-from-keywords')
  @TokenRoute()
  @ApiOperation({ summary: 'Generate prompts from keywords' })
  @ApiBody({ type: GeneratePromptsFromKeywordsDto })
  @ApiResponse({
    status: 200,
    description: 'Prompts generated successfully from keywords',
    schema: {
      type: 'object',
      properties: {
        prompts: { type: 'array', items: { type: 'string' } },
        type: { type: 'string' },
        // Additional fields for project creation
        visibility: { type: 'array', items: { type: 'string' } },
        sentiment: { type: 'array', items: { type: 'string' } },
        alignment: { type: 'array', items: { type: 'string' } },
        competition: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token required' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async generatePromptsFromKeywords(
    @Req() request: any,
    @Body() dto: GeneratePromptsFromKeywordsDto,
  ): Promise<{ prompts: string[]; type: string; visibility?: string[]; sentiment?: string[]; alignment?: string[]; competition?: string[]; }> {
    try {
      this.logger.log(`Generating ${dto.promptType} prompts from keywords for project ${dto.projectId}`);
      
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

      // If projectId is provided and not empty, validate ownership
      let generatedPrompts: string[];
      
      if (dto.projectId && dto.projectId.trim() !== '') {
        const project = await this.projectModel.findOne({ id: dto.projectId }).exec();
        if (!project) {
          throw new NotFoundException(`Project ${dto.projectId} not found`);
        }
        
        // Get user to check organization
        const user = await this.userService.findOne(request.userId);
        if (!user) {
          throw new BadRequestException('User not found');
        }
        
        if (project.organizationId !== user.organizationId) {
          this.logger.warn(`User ${request.userId} tried to generate prompts for project ${dto.projectId} from different organization`);
          throw new UnauthorizedException('You do not have permission to generate prompts for this project');
        }

        // Check if we need to apply plan limits for add mode
        if (dto.addMode && dto.promptType === 'visibility') {
          // Get current prompts to check limit
          const existingPromptSet = await this.promptSetModel.findOne({ projectId: dto.projectId }).lean().exec();
          const currentPromptCount = existingPromptSet?.visibility?.length || 0;
          
          // Check if user's plan allows adding more prompts
          if (user.organizationId) {
            const org = await this.organizationModel.findOne({ id: user.organizationId }).lean().exec();
            const maxPrompts = org?.planSettings?.maxSpontaneousPrompts || 12;
            const remainingSlots = maxPrompts - currentPromptCount;
            
            if (remainingSlots <= 0) {
              throw new BadRequestException('You have reached the maximum number of visibility prompts for your plan');
            }
            
            // Adjust count if it exceeds remaining slots
            if (dto.count && dto.count > remainingSlots) {
              dto.count = remainingSlots;
            }
          }
        }

        // Generate prompts from keywords with project context
        generatedPrompts = await this.promptService.generatePromptsFromKeywords(
          dto.projectId,
          dto.promptType,
          dto.keywords,
          dto.additionalInstructions,
          dto.count,
          dto.addMode,
        );
      } else {
        // Generate prompts without project context (for new projects)
        // When creating a new project, generate all prompt types, not just visibility
        generatedPrompts = await this.promptService.generatePromptsFromKeywordsWithoutProject(
          dto.promptType,
          dto.keywords,
          dto.additionalInstructions,
          dto.count,
          {
            brandName: dto.brandName,
            website: dto.website,
            industry: dto.industry,
            market: dto.market,
            language: dto.language,
            keyBrandAttributes: dto.keyBrandAttributes,
            competitors: dto.competitors,
            shortDescription: dto.shortDescription,
          },
        );

        // For project creation, also generate the other prompt types
        if (dto.promptType === 'visibility') {
          this.logger.log(`Generating additional prompt types for project creation`);
          
          const projectContext = {
            brandName: dto.brandName,
            website: dto.website,
            industry: dto.industry,
            market: dto.market,
            language: dto.language,
            keyBrandAttributes: dto.keyBrandAttributes,
            competitors: dto.competitors,
            shortDescription: dto.shortDescription,
          };

          // Generate competition prompts
          const competitionPrompts = await this.promptService.generatePromptsFromKeywordsWithoutProject(
            'competition',
            [], // Use empty keywords for non-visibility prompts
            undefined,
            undefined,
            projectContext,
          );

          // Generate sentiment prompts
          const sentimentPrompts = await this.promptService.generatePromptsFromKeywordsWithoutProject(
            'sentiment',
            [],
            undefined,
            undefined,
            projectContext,
          );

          // Generate alignment prompts
          const alignmentPrompts = await this.promptService.generatePromptsFromKeywordsWithoutProject(
            'alignment',
            [],
            undefined,
            undefined,
            projectContext,
          );

          // Return all prompt types for project creation
          return {
            prompts: generatedPrompts,
            type: dto.promptType,
            visibility: generatedPrompts,
            competition: competitionPrompts,
            sentiment: sentimentPrompts,
            alignment: alignmentPrompts,
          };
        }
      }
      
      this.logger.log(`Successfully generated ${generatedPrompts.length} ${dto.promptType} prompts from keywords for project ${dto.projectId || 'new project'}`);
      
      return {
        prompts: generatedPrompts,
        type: dto.promptType,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to generate prompts from keywords: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to generate prompts from keywords: ${error.message}`);
    }
  }
}
