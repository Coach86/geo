import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  Param,
  BadRequestException,
  UnauthorizedException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ProjectService } from '../services/project.service';
import { ProjectRepository } from '../repositories/project.repository';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { ProjectResponseDto } from '../dto/project-response.dto';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';
import { TokenService } from '../../auth/services/token.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProjectCreatedEvent } from '../events/project-created.event';
import { v4 as uuidv4 } from 'uuid';
import { UserService } from '../../user/services/user.service';
import { OrganizationService } from '../../organization/services/organization.service';
import { PromptService } from '../../prompt/services/prompt.service';
import { BatchExecutionRepository } from '../../batch/repositories/batch-execution.repository';

@ApiTags('User - Projects')
@Controller('user/project')
export class UserProjectController {
  private readonly logger = new Logger(UserProjectController.name);

  constructor(
    private readonly projectService: ProjectService,
    private readonly projectRepository: ProjectRepository,
    private readonly tokenService: TokenService,
    private readonly eventEmitter: EventEmitter2,
    private readonly userService: UserService,
    private readonly organizationService: OrganizationService,
    private readonly promptService: PromptService,
    private readonly batchExecutionRepository: BatchExecutionRepository,
  ) {}

  @Get('url-usage')
  @TokenRoute() // Mark this route as token-authenticated
  @ApiOperation({ summary: 'Get URL usage information for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'URL usage information',
    schema: {
      type: 'object',
      properties: {
        currentUrls: { type: 'array', items: { type: 'string' } },
        currentCount: { type: 'number' },
        maxUrls: { type: 'number' },
        canAddMore: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token required' })
  async getUserUrlUsage(@Req() request: any): Promise<{
    currentUrls: string[];
    currentCount: number;
    maxUrls: number;
    canAddMore: boolean;
  }> {
    try {
      this.logger.log(`Fetching URL usage for authenticated user`);

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

      // Get user and organization details
      const user = await this.userService.findOne(request.userId);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      const organization = await this.organizationService.findOne(user.organizationId);
      const existingProjects = await this.projectService.findByOrganizationId(user.organizationId);
      
      const normalizeUrl = (url: string): string => {
        try {
          const urlObj = new URL(url);
          return urlObj.hostname.toLowerCase();
        } catch {
          return url.toLowerCase();
        }
      };

      const existingUrls = existingProjects.map(project => normalizeUrl(project.website));
      const uniqueUrls = Array.from(new Set(existingUrls));
      const maxUrls = organization.planSettings.maxUrls;

      return {
        currentUrls: uniqueUrls,
        currentCount: uniqueUrls.length,
        maxUrls,
        canAddMore: uniqueUrls.length < maxUrls,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to fetch URL usage: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to fetch URL usage: ${error.message}`);
    }
  }

  @Get()
  @TokenRoute() // Mark this route as token-authenticated
  @ApiOperation({ summary: 'Get all projects for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'List of user projects',
    type: [ProjectResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token required' })
  async getUserProjects(@Req() request: any): Promise<ProjectResponseDto[]> {
    try {
      this.logger.log(`Fetching projects for authenticated user`);

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

      this.logger.log(`Fetching projects for user: ${request.userId}`);

      // Get user's organization
      const user = await this.userService.findOne(request.userId);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Get all projects for the user's organization
      const projects = await this.projectService.findByOrganizationId(user.organizationId);

      this.logger.log(`Found ${projects.length} projects for user ${request.userId}`);

      // Map to response DTOs
      return projects.map((project) => this.mapToResponseDto(project));
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Failed to fetch projects: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to fetch projects: ${error.message}`);
    }
  }

  @Get(':projectId')
  @TokenRoute() // Mark this route as token-authenticated
  @ApiOperation({ summary: 'Get a specific project by ID for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Project retrieved successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token required' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getProjectById(
    @Req() request: any,
    @Param('projectId') projectId: string,
  ): Promise<ProjectResponseDto> {
    try {
      this.logger.log(`Fetching project ${projectId} for authenticated user`);

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

      this.logger.log(`Fetching project ${projectId} for user: ${request.userId}`);

      // Get user's organization
      const user = await this.userService.findOne(request.userId);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Get the project
      const project = await this.projectService.findById(projectId);

      // Check if the project belongs to the user's organization
      if (project.organizationId !== user.organizationId) {
        this.logger.warn(
          `User ${request.userId} tried to access project ${projectId} from different organization`,
        );
        throw new UnauthorizedException('You do not have permission to access this project');
      }

      this.logger.log(`Project ${projectId} retrieved successfully for user ${request.userId}`);

      // Map to response DTO
      return this.mapToResponseDto(project);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch project: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to fetch project: ${error.message}`);
    }
  }

  @Post('analyze-from-url')
  @TokenRoute() // Mark this route as token-authenticated
  @ApiOperation({ summary: 'Analyze website URL and return brand data without saving' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', format: 'uri', example: 'https://example.com' },
        market: { type: 'string', example: 'United States' },
        language: { type: 'string', example: 'English' },
      },
      required: ['url', 'market'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Website analyzed successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid URL or request' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token required' })
  async analyzeFromUrl(
    @Req() request: any,
    @Body() body: { url: string; market: string; language?: string },
  ): Promise<ProjectResponseDto> {
    try {
      this.logger.log(`Token-based website analysis attempt for URL: ${body.url}`);
      this.logger.log(
        `Request details: userId=${request.userId}, token=${request.token ? request.token.substring(0, 8) + '...' : 'none'}`,
      );

      // The userId is added to the request by the TokenAuthGuard
      if (!request.userId) {
        this.logger.warn(`No userId found in request for website analysis`);

        // If we have a token but no userId, try to validate it directly
        if (request.token) {
          this.logger.log(
            `Attempting to validate token directly: ${request.token.substring(0, 8)}...`,
          );
          const validation = await this.tokenService.validateAccessToken(request.token);

          if (validation.valid && validation.userId) {
            this.logger.log(`Direct token validation successful, userId: ${validation.userId}`);
            request.userId = validation.userId;
          } else {
            this.logger.warn(`Direct token validation failed`);
            throw new UnauthorizedException('Invalid or expired token');
          }
        } else {
          throw new UnauthorizedException('User not authenticated');
        }
      }

      // Market is required
      if (!body.market) {
        throw new BadRequestException('Market is required');
      }

      // Get user's organization
      const user = await this.userService.findOne(request.userId);
      
      this.logger.log(`Analyzing website for user ${request.userId} in organization ${user.organizationId} with URL: ${body.url}`);
      const project = await this.projectService.analyzeFromUrl(
        body.url,
        body.market,
        body.language || 'en',
        user.organizationId,
      );

      this.logger.log(`Website analysis completed successfully`);
      return this.mapToResponseDto(project);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Failed to analyze website: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to analyze website: ${error.message}`);
    }
  }

  @Post('create-from-url')
  @TokenRoute() // Mark this route as token-authenticated
  @ApiOperation({ summary: 'Create project from URL analysis' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', format: 'uri', example: 'https://example.com' },
        market: { type: 'string', example: 'United States' },
        language: { type: 'string', example: 'en' },
        name: { type: 'string', example: 'Q1 2025 Campaign' },
      },
      required: ['url', 'market', 'name'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid URL or request' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token required' })
  @ApiResponse({ status: 403, description: 'Plan limit exceeded' })
  async createFromUrl(
    @Req() request: any,
    @Body() body: { url: string; market: string; language?: string; name: string },
  ): Promise<ProjectResponseDto> {
    try {
      this.logger.log(`Token-based project creation from URL: ${body.url}`);

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

      // Market is required
      if (!body.market) {
        throw new BadRequestException('Market is required');
      }

      // Get user and organization info
      const user = await this.userService.findOne(request.userId);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Get organization for plan limits
      const organization = await this.organizationService.findOne(user.organizationId);

      // Get existing projects count for the organization
      const existingProjects = await this.projectService.findByOrganizationId(user.organizationId);
      const currentProjectCount = existingProjects.length;
      const maxProjects = organization.planSettings.maxProjects;

      if (currentProjectCount >= maxProjects) {
        this.logger.warn(
          `User ${request.userId} has reached their project limit: ${currentProjectCount}/${maxProjects}`,
        );
        throw new BadRequestException({
          message: 'Project limit reached',
          code: 'PROJECT_LIMIT_EXCEEDED',
          currentCount: currentProjectCount,
          maxAllowed: maxProjects,
        });
      }

      // Check URL limits
      const normalizeUrl = (url: string): string => {
        try {
          const urlObj = new URL(url);
          return urlObj.hostname.toLowerCase();
        } catch {
          return url.toLowerCase();
        }
      };

      const existingUrls = existingProjects.map(project => normalizeUrl(project.website));
      const uniqueUrls = new Set(existingUrls);
      const newUrl = normalizeUrl(body.url);
      const maxUrls = organization.planSettings.maxUrls;

      // Check if adding this URL would exceed the unique URL limit
      // Only check if it's a new unique URL (not already in the set)
      if (!uniqueUrls.has(newUrl) && uniqueUrls.size >= maxUrls) {
        this.logger.warn(
          `User ${request.userId} has reached their unique URL limit: ${uniqueUrls.size}/${maxUrls}`,
        );
        throw new BadRequestException({
          message: 'Unique URL limit reached',
          code: 'URL_LIMIT_EXCEEDED',
          currentCount: uniqueUrls.size,
          maxAllowed: maxUrls,
          existingUrls: Array.from(uniqueUrls),
        });
      }

      // Log if it's a duplicate URL (but allow it)
      if (uniqueUrls.has(newUrl)) {
        this.logger.log(
          `User ${request.userId} is creating another project with existing URL: ${newUrl}`,
        );
      }

      this.logger.log(`Creating project for user ${request.userId} from URL: ${body.url}`);

      // Create DTO for project service
      const createDto = new CreateProjectDto();
      createDto.url = body.url;
      createDto.organizationId = user.organizationId;

      if (!createDto.data) {
        createDto.data = {};
      }
      createDto.data.market = body.market;
      createDto.data.name = body.name;

      if (body.language) {
        createDto.data.language = body.language;
      }

      // Create the project
      const project = await this.projectService.create(createDto);

      this.logger.log(`Project created successfully with ID: ${project.projectId}`);
      return this.mapToResponseDto(project);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Failed to create project from URL: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to create project: ${error.message}`);
    }
  }

  @Post('create')
  @TokenRoute() // Mark this route as token-authenticated
  @ApiOperation({ summary: 'Save project data directly (without re-analysis)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', format: 'uri', example: 'https://example.com' },
        brandName: { type: 'string', example: 'Acme Corp' },
        description: { type: 'string', example: 'A leading provider of innovative solutions' },
        industry: { type: 'string', example: 'Technology' },
        objectives: { type: 'string', example: 'To revolutionize the industry with innovative solutions' },
        market: { type: 'string', example: 'United States' },
        language: { type: 'string', example: 'English' },
        keyBrandAttributes: { type: 'array', items: { type: 'string' } },
        competitors: { type: 'array', items: { type: 'string' } },
        prompts: {
          type: 'object',
          properties: {
            visibility: { type: 'array', items: { type: 'string' } },
            sentiment: { type: 'array', items: { type: 'string' } },
            alignment: { type: 'array', items: { type: 'string' } },
            competition: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      required: ['url', 'brandName', 'market'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Project saved successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token required' })
  async create(
    @Req() request: any,
    @Body()
    body: {
      url: string;
      brandName: string;
      description?: string;
      industry?: string;
      objectives?: string;
      market: string;
      language?: string;
      keyBrandAttributes?: string[];
      competitors?: string[];
      prompts?: {
        visibility?: string[];
        sentiment?: string[];
        alignment?: string[];
        competition?: string[];
      };
    },
  ): Promise<ProjectResponseDto> {
    try {
      this.logger.log(`Token-based project saving for brand: ${body.brandName}`);

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

      // Required fields validation
      if (!body.brandName || !body.market || !body.url) {
        throw new BadRequestException('Brand name, market, and URL are required');
      }

      // Get user and organization details
      const user = await this.userService.findOne(request.userId);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Generate unique ID for the project
      const projectId = uuidv4();

      // Prepare project data for direct database saving
      const projectData = {
        id: projectId,
        brandName: body.brandName,
        website: body.url,
        industry: body.industry || '',
        shortDescription: body.description || '',
        fullDescription: body.description || '',
        objectives: body.objectives || '',
        market: body.market,
        language: body.language || 'en',
        keyBrandAttributes: body.keyBrandAttributes || [],
        competitors: body.competitors || [],
        organizationId: user.organizationId,
        updatedAt: new Date(),
        createdAt: new Date(),
      };

      this.logger.log(`Saving project directly to database for user ${request.userId}`);

      // Save directly to database without analysis
      const savedProject = await this.projectRepository.save(projectData);

      // Handle custom prompts if provided
      if (body.prompts && ((body.prompts.visibility?.length ?? 0) > 0 || (body.prompts.sentiment?.length ?? 0) > 0)) {
        this.logger.log(`Saving custom prompts for project ${projectId}`);
        
        try {
          await this.promptService.createPromptSet(projectId, {
            visibility: body.prompts.visibility || [],
            sentiment: body.prompts.sentiment || [],
            competition: body.prompts.competition || [],
            alignment: body.prompts.alignment || [],
          });
          this.logger.log(`Custom prompts saved successfully for project ${projectId}`);
        } catch (promptError) {
          this.logger.error(`Failed to save custom prompts: ${promptError.message}`, promptError.stack);
          // Don't fail the project creation if prompt saving fails
        }
      }
      
      // Don't emit project created event here - wait until plan is selected
      // The batch processing will be triggered after the user selects a plan

      this.logger.log(`Project saved successfully with ID: ${projectId}`);

      // Return the saved data
      const response = this.mapToResponseDto({
        projectId,
        brandName: body.brandName,
        website: body.url,
        industry: body.industry || '',
        shortDescription: body.description || '',
        fullDescription: body.description || '',
        objectives: body.objectives || '',
        market: body.market,
        language: body.language || 'en',
        keyBrandAttributes: body.keyBrandAttributes || [],
        competitors: body.competitors || [],
        organizationId: user.organizationId,
        updatedAt: new Date(),
      });

      return response;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Failed to save project: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to save project: ${error.message}`);
    }
  }

  @Patch(':projectId')
  @TokenRoute()
  @ApiOperation({ summary: 'Update project attributes and competitors' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        keyBrandAttributes: { type: 'array', items: { type: 'string' } },
        competitors: { type: 'array', items: { type: 'string' } },
        objectives: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Project updated successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token required' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async updateProject(
    @Req() request: any,
    @Param('projectId') projectId: string,
    @Body() body: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    try {
      this.logger.log(`Updating project ${projectId} for authenticated user`);

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

      // Get user's organization
      const user = await this.userService.findOne(request.userId);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Check if the project belongs to the user's organization
      const existingProject = await this.projectService.findById(projectId);
      if (existingProject.organizationId !== user.organizationId) {
        this.logger.warn(
          `User ${request.userId} tried to update project ${projectId} from different organization`,
        );
        throw new UnauthorizedException('You do not have permission to update this project');
      }

      this.logger.log(`Updating project ${projectId} for user: ${request.userId}`);
      this.logger.log(`Update request body: ${JSON.stringify(body)}`);

      // Update the project
      const updateData: any = {};
      if (body.name !== undefined) {
        updateData.name = body.name;
      }
      if (body.keyBrandAttributes !== undefined) {
        updateData.keyBrandAttributes = body.keyBrandAttributes;
      }
      if (body.competitors !== undefined) {
        updateData.competitors = body.competitors;
      }
      if (body.objectives !== undefined) {
        updateData.objectives = body.objectives;
      }

      this.logger.log(`Update data to be sent: ${JSON.stringify(updateData)}`);
      const updatedProject = await this.projectService.update(projectId, updateData);

      this.logger.log(`Project ${projectId} updated successfully`);
      this.logger.log(`Updated project data: ${JSON.stringify(updatedProject)}`);

      // Map to response DTO
      return this.mapToResponseDto(updatedProject);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Failed to update project: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to update project: ${error.message}`);
    }
  }

  @Get(':projectId/batch-status')
  @TokenRoute()
  @ApiOperation({ summary: 'Check if a batch is running for a specific project' })
  @ApiResponse({
    status: 200,
    description: 'Batch status for the project',
    schema: {
      type: 'object',
      properties: {
        isRunning: { type: 'boolean', description: 'Whether a batch is currently running' },
        batchExecutionId: { type: 'string', description: 'ID of the running batch (if any)' },
        status: { type: 'string', enum: ['running', 'completed', 'failed'], description: 'Status of the latest batch' },
        startedAt: { type: 'string', format: 'date-time', description: 'When the batch started' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Token required' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getBatchStatus(
    @Req() request: any,
    @Param('projectId') projectId: string,
  ): Promise<{ isRunning: boolean; batchExecutionId?: string; status?: string; startedAt?: Date }> {
    try {
      this.logger.log(`Checking batch status for project ${projectId}`);

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

      // Get user and verify access to project
      const user = await this.userService.findOne(request.userId);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Get the project and verify it belongs to user's organization
      const project = await this.projectService.findById(projectId);
      if (!project) {
        throw new NotFoundException('Project not found');
      }

      if (project.organizationId !== user.organizationId) {
        throw new UnauthorizedException('You do not have access to this project');
      }

      // Check for running batch
      const latestBatch = await this.batchExecutionRepository.findLatestByProjectId(projectId);
      
      const response = {
        isRunning: false,
        batchExecutionId: undefined as string | undefined,
        status: undefined as string | undefined,
        startedAt: undefined as Date | undefined,
      };

      if (latestBatch) {
        response.status = latestBatch.status;
        response.batchExecutionId = latestBatch.id;
        response.startedAt = latestBatch.executedAt;
        response.isRunning = latestBatch.status === 'running';
      }

      return response;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to check batch status: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to check batch status: ${error.message}`);
    }
  }

  private mapToResponseDto(project: any): ProjectResponseDto {
    const response = new ProjectResponseDto();
    response.id = project.projectId;
    response.name = project.name;
    response.brandName = project.brandName;
    response.website = project.website;
    response.url = project.website;
    response.industry = project.industry;
    response.market = project.market || 'Global';
    response.language = project.language;
    response.shortDescription = project.shortDescription;
    response.fullDescription = project.fullDescription;
    response.longDescription = project.fullDescription;
    response.objectives = project.objectives;
    response.keyBrandAttributes = project.keyBrandAttributes;
    response.scrapedKeywords = project.scrapedKeywords;
    response.competitors = project.competitors;
    response.competitorDetails = project.competitorDetails;
    response.organizationId = project.organizationId;
    response.createdAt = project.updatedAt;
    response.updatedAt = project.updatedAt;
    response.nextManualAnalysisAllowedAt = project.nextManualAnalysisAllowedAt;
    return response;
  }
}
