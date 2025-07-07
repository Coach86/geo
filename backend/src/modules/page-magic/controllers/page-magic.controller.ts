import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query,
  HttpException, 
  HttpStatus,
  Logger,
  ValidationPipe,
  UsePipes
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { IsString, IsUrl, IsOptional, IsArray } from 'class-validator';
import { PageContentService } from '../services/page-content.service';
import { ImprovementWorkflowService } from '../services/improvement-workflow.service';
import { SequentialImprovementService, RuleToProcess } from '../services/sequential-improvement.service';
import { SequentialImprovementStructuredService } from '../services/sequential-improvement-structured.service';
import { ContentScoreRepository } from '../../crawler/repositories/content-score.repository';
import { ContentScore } from '../../crawler/schemas/content-score.schema';
import { Types } from 'mongoose';
import { PageImprovementJobDocument } from '../schemas/page-improvement-job.schema';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';

export class ExtractContentDto {
  @IsUrl()
  @IsString()
  url: string;

  @IsString()
  projectId: string;
}

export class StartImprovementDto {
  @IsString()
  projectId: string;

  @IsUrl()
  @IsString()
  pageUrl: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  contentScoreId?: string;
}

export class PageListQuery {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  sortBy?: 'score' | 'url' | 'date';

  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc';

  @IsOptional()
  @IsString()
  limit?: string;
}

@ApiTags('Page Magic')
@Controller('page-magic')
export class PageMagicController {
  private readonly logger = new Logger(PageMagicController.name);

  constructor(
    private readonly contentService: PageContentService,
    private readonly workflowService: ImprovementWorkflowService,
    private readonly sequentialImprovementService: SequentialImprovementService,
    private readonly sequentialImprovementStructuredService: SequentialImprovementStructuredService,
    private readonly contentScoreRepository: ContentScoreRepository,
  ) {}

  @Get('page/:id')
  @TokenRoute()
  @ApiOperation({ 
    summary: 'Get a single page by ID',
    description: 'Returns details for a specific page by content score ID'
  })
  @ApiParam({ name: 'id', description: 'Content Score ID' })
  @ApiResponse({ status: 200, description: 'Page retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Page not found' })
  async getPageById(@Param('id') id: string) {
    try {
      this.logger.log(`Getting page by ID: ${id}`);
      
      const contentScore = await this.contentScoreRepository.findById(id);
      
      if (!contentScore) {
        this.logger.warn(`Content score not found with ID: ${id}`);
        throw new HttpException('Page not found', HttpStatus.NOT_FOUND);
      }

      // Transform to Page Magic format
      const page = {
        _id: contentScore.id,
        url: contentScore.url,
        title: contentScore.title,
        globalScore: contentScore.globalScore,
        scores: contentScore.scores,
        issues: contentScore.issues || [],
        recommendations: contentScore.recommendations || [],
        analyzedAt: contentScore.analyzedAt,
        pageCategory: contentScore.pageCategory,
        analysisLevel: contentScore.analysisLevel,
        categoryConfidence: contentScore.categoryConfidence,
        skipped: contentScore.skipped,
        skipReason: contentScore.skipReason,
        projectId: contentScore.projectId,
      };
      
      return {
        success: true,
        data: page
      };
    } catch (error) {
      this.logger.error(`Error getting page by ID: ${error.message}`);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to retrieve page: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('pages')
  @TokenRoute()
  @ApiOperation({ 
    summary: 'Get pages sorted by score',
    description: 'Returns a list of pages from content scores, sorted by worst to best score by default'
  })
  @ApiQuery({ name: 'projectId', required: false, description: 'Filter by project ID' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['score', 'url', 'date'], description: 'Sort by field' })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of results' })
  @ApiResponse({ status: 200, description: 'Pages retrieved successfully' })
  async getPages(@Query() query: PageListQuery) {
    try {
      this.logger.log(`Getting pages with query: ${JSON.stringify(query)}`);
      
      const sortBy = query.sortBy || 'score';
      const order = query.order || 'asc'; // Ascending = worst to best score
      const limit = query.limit ? parseInt(query.limit, 10) : 100;

      const filter: any = {};
      if (query.projectId) {
        filter.projectId = query.projectId;
      }

      // Get content scores from the repository
      let contentScores: ContentScore[];
      if (query.projectId) {
        if (sortBy === 'score' && order === 'asc') {
          // Get worst scores first for Page Magic
          contentScores = await this.contentScoreRepository.findLowScoresByProjectId(query.projectId, limit);
        } else if (sortBy === 'score' && order === 'desc') {
          contentScores = await this.contentScoreRepository.findTopScoresByProjectId(query.projectId, limit);
        } else {
          contentScores = await this.contentScoreRepository.findByProjectId(query.projectId, limit);
        }
      } else {
        // For now, return empty if no project specified
        contentScores = [];
      }

      // Transform to Page Magic format
      const pages = contentScores.map((score: ContentScore) => ({
        _id: score.id,
        url: score.url,
        title: score.title,
        globalScore: score.globalScore,
        scores: score.scores,
        issues: score.issues || [],
        crawledAt: score.analyzedAt,
        pageCategory: score.pageCategory,
        analysisLevel: score.analysisLevel,
        categoryConfidence: score.categoryConfidence,
        skipped: score.skipped,
        skipReason: score.skipReason,
        projectId: score.projectId,
      }));

      this.logger.log(`Retrieved ${pages.length} pages`);
      
      return {
        success: true,
        data: pages,
        total: pages.length,
        query: {
          sortBy,
          order,
          limit,
          projectId: query.projectId,
        }
      };
    } catch (error) {
      this.logger.error(`Error getting pages: ${error.message}`);
      throw new HttpException(
        `Failed to retrieve pages: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('extract-content')
  @TokenRoute()
  @ApiOperation({ 
    summary: 'Extract clean content from a URL',
    description: 'Extracts text-only content from a webpage for display in Page Magic'
  })
  @ApiResponse({ status: 200, description: 'Content extracted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid URL provided' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async extractContent(@Body() dto: ExtractContentDto) {
    try {
      this.logger.log(`Extracting content from: ${dto.url}`);
      
      if (!this.contentService.validateUrl(dto.url)) {
        throw new HttpException('Invalid URL format', HttpStatus.BAD_REQUEST);
      }

      const crawledContent = await this.contentService.getCrawledPageContent(dto.projectId, dto.url);
      
      this.logger.log(`Successfully retrieved crawled content from ${dto.url}`);
      
      return {
        success: true,
        data: crawledContent
      };
    } catch (error) {
      this.logger.error(`Error extracting content: ${error.message}`);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to extract content: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('analyze-rules')
  @TokenRoute()
  @ApiOperation({ 
    summary: 'Analyze page for rules to fix',
    description: 'Returns a list of non-technical rules that can be fixed for the page'
  })
  @ApiResponse({ status: 200, description: 'Rules analysis completed' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async analyzeRules(@Body() dto: { contentScoreId: string }) {
    try {
      this.logger.log(`Analyzing rules for content score: ${dto.contentScoreId}`);
      
      const rules = await this.sequentialImprovementService.extractRulesToProcess(dto.contentScoreId);
      
      this.logger.log(`Found ${rules.length} rules to process`);
      
      return {
        success: true,
        data: {
          rules,
          totalRules: rules.length,
          estimatedTime: rules.length * 30, // 30 seconds per rule estimate
        }
      };
    } catch (error) {
      this.logger.error(`Error analyzing rules: ${error.message}`);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to analyze rules: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('improve')
  @TokenRoute()
  @ApiOperation({ 
    summary: 'Start content improvement process',
    description: 'Starts an AI-powered sequential improvement job for a page, processing rules one by one'
  })
  @ApiResponse({ status: 201, description: 'Improvement job started successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async startImprovement(@Body() dto: StartImprovementDto) {
    try {
      this.logger.log(`Starting improvement for: ${dto.pageUrl}`);
      
      if (!this.contentService.validateUrl(dto.pageUrl)) {
        throw new HttpException('Invalid URL format', HttpStatus.BAD_REQUEST);
      }

      // Get structured content from crawled page
      const crawledContent = await this.contentService.getCrawledPageContent(dto.projectId, dto.pageUrl);
      
      // Create improvement job with structured HTML content (preserves formatting)
      const job: PageImprovementJobDocument = await this.workflowService.createJob(
        dto.projectId,
        dto.pageUrl,
        crawledContent.structured?.content || crawledContent.html, // Use structured HTML content to preserve formatting
        dto.userId,
        dto.contentScoreId,
        crawledContent.structured // Pass the full structured content
      );

      // Get rules that will be processed
      let rulesToProcess: RuleToProcess[] = [];
      if (dto.contentScoreId) {
        rulesToProcess = await this.sequentialImprovementStructuredService.extractRulesToProcess(dto.contentScoreId);
      }
      
      this.logger.log(`Found ${rulesToProcess.length} rules to process for job ${job._id}`);
      
      // Save rules to the job before processing
      if (rulesToProcess.length > 0) {
        job.rules = rulesToProcess;
        await job.save();
        this.logger.log(`Saved ${rulesToProcess.length} rules to job ${job._id}`);
      }
      
      // Start sequential processing with structured responses in background (don't await)
      this.sequentialImprovementStructuredService.processRulesSequentially(job._id.toString())
        .catch(async (error: unknown) => {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const errorStack = error instanceof Error ? error.stack : undefined;
          this.logger.error(`Sequential job processing failed for job ${job._id}: ${errorMessage}`, errorStack);
          // Update job with error
          try {
            await this.workflowService.updateJobError(job._id.toString(), errorMessage);
          } catch (updateError: unknown) {
            const updateErrorMessage = updateError instanceof Error ? updateError.message : 'Unknown error';
            this.logger.error(`Failed to update job error: ${updateErrorMessage}`);
          }
        });

      this.logger.log(`Started improvement job ${job._id} for ${dto.pageUrl}`);
      
      return {
        success: true,
        data: {
          jobId: job._id.toString(),
          status: job.status,
          pageUrl: job.pageUrl,
          rules: rulesToProcess,
          projectId: job.projectId,
          maxIterations: job.maxIterations,
          originalContent: crawledContent,
        }
      };
    } catch (error) {
      this.logger.error(`Error starting improvement: ${error.message}`);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to start improvement: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('improvement/:jobId/status')
  @TokenRoute()
  @ApiOperation({ 
    summary: 'Get improvement job status',
    description: 'Returns the current status and progress of an improvement job'
  })
  @ApiParam({ name: 'jobId', description: 'The improvement job ID' })
  @ApiResponse({ status: 200, description: 'Job status retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJobStatus(@Param('jobId') jobId: string) {
    try {
      this.logger.log(`Getting status for job: ${jobId}`);
      
      const status = await this.workflowService.getJobStatus(jobId);
      
      if (!status) {
        throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
      }
      
      return {
        success: true,
        data: status
      };
    } catch (error) {
      this.logger.error(`Error getting job status: ${error.message}`);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to get job status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('improvement/:jobId')
  @TokenRoute()
  @ApiOperation({ 
    summary: 'Get improvement job details',
    description: 'Returns complete details of an improvement job including all iterations'
  })
  @ApiParam({ name: 'jobId', description: 'The improvement job ID' })
  @ApiResponse({ status: 200, description: 'Job details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJobDetails(@Param('jobId') jobId: string) {
    try {
      this.logger.log(`Getting details for job: ${jobId}`);
      
      const job: PageImprovementJobDocument | null = await this.workflowService.getJob(jobId);
      
      if (!job) {
        throw new HttpException('Job not found', HttpStatus.NOT_FOUND);
      }
      
      this.logger.log(`Job ${jobId} status: ${job.status}`);
      this.logger.log(`Job ${jobId} improvements count: ${job.improvements.length}`);
      this.logger.log(`Job ${jobId} current iteration: ${job.currentIteration}`);
      this.logger.log(`Job ${jobId} first improvement: ${job.improvements[0] ? 'exists' : 'missing'}`);
      
      // Log improvements array details
      if (job.improvements.length > 0) {
        this.logger.log(`Job ${jobId} improvements data: ${JSON.stringify(job.improvements.map(imp => ({
          iteration: imp.iteration,
          scoreBefore: imp.scoreBefore,
          scoreAfter: imp.scoreAfter,
          contentLength: imp.improvedContent?.length || 0,
          hasTitle: !!imp.improvedTitle,
          hasMetaDesc: !!imp.improvedMetaDescription,
          issuesCount: imp.issues?.length || 0,
          recommendationsCount: imp.recommendations?.length || 0,
        })))}`);
      }
      
      // Get rules - use stored rules from job if available, otherwise extract from content score
      let rules: RuleToProcess[] = [];
      
      // First check if job already has rules stored
      if (job.rules && job.rules.length > 0) {
        rules = job.rules;
        this.logger.log(`Using ${rules.length} stored rules from job ${jobId}`);
      } else if (job.contentScoreId) {
        // Fall back to extracting from content score if no rules stored
        try {
          rules = await this.sequentialImprovementService.extractRulesToProcess(job.contentScoreId);
          this.logger.log(`Extracted ${rules.length} rules from content score for job ${jobId}`);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(`Could not extract rules for job ${jobId}: ${errorMessage}`);
        }
      }
      
      // Convert to plain object to ensure serialization
      const responseData = {
        jobId: job._id.toString(),
        projectId: job.projectId,
        pageUrl: job.pageUrl,
        originalContent: job.originalContent,
        originalContentMarkdown: job.originalContentMarkdown,
        originalTitle: job.originalTitle,
        originalMetaDescription: job.originalMetaDescription,
        improvedContent: job.improvedContent,
        improvedContentMarkdown: job.improvedContentMarkdown,
        improvedTitle: job.improvedTitle,
        improvedMetas: job.improvedMetas,
        status: job.status,
        currentIteration: job.currentIteration,
        maxIterations: job.maxIterations,
        rules: rules,
        improvements: job.improvements.map(imp => ({
          iteration: imp.iteration,
          improvedContent: imp.improvedContent,
          improvedContentMarkdown: imp.improvedContentMarkdown,
          improvedTitle: imp.improvedTitle,
          improvedMetaDescription: imp.improvedMetaDescription,
          improvedMetas: imp.improvedMetas,
          scoreBefore: imp.scoreBefore,
          scoreAfter: imp.scoreAfter,
          issues: imp.issues || [],
          recommendations: imp.recommendations || [],
          timestamp: imp.timestamp,
        })),
        errors: job.errors,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        failedAt: job.failedAt,
      };
      
      this.logger.log(`Returning job data with ${responseData.improvements.length} improvements`);
      
      return {
        success: true,
        data: responseData
      };
    } catch (error) {
      this.logger.error(`Error getting job details: ${error.message}`);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to get job details: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('projects/:projectId/jobs')
  @TokenRoute()
  @ApiOperation({ 
    summary: 'Get improvement jobs for a project',
    description: 'Returns all improvement jobs for a specific project'
  })
  @ApiParam({ name: 'projectId', description: 'The project ID' })
  @ApiResponse({ status: 200, description: 'Project jobs retrieved successfully' })
  async getProjectJobs(@Param('projectId') projectId: string) {
    try {
      this.logger.log(`Getting jobs for project: ${projectId}`);
      
      const jobs: PageImprovementJobDocument[] = await this.workflowService.getJobsByProject(projectId);
      
      // Transform to simplified format
      const transformedJobs = jobs.map(job => ({
        jobId: job._id.toString(),
        pageUrl: job.pageUrl,
        status: job.status,
        currentIteration: job.currentIteration,
        maxIterations: job.maxIterations,
        improvementsCount: job.improvements.length,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        failedAt: job.failedAt,
      }));
      
      return {
        success: true,
        data: transformedJobs,
        total: transformedJobs.length,
        projectId,
      };
    } catch (error) {
      this.logger.error(`Error getting project jobs: ${error.message}`);
      throw new HttpException(
        `Failed to get project jobs: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('health')
  @TokenRoute()
  @ApiOperation({ 
    summary: 'Health check',
    description: 'Returns the health status of Page Magic services'
  })
  @ApiResponse({ status: 200, description: 'Service health status' })
  async getHealth() {
    try {
      const isClaudeAvailable = await this.checkClaudeAvailability();
      
      return {
        success: true,
        data: {
          status: 'healthy',
          services: {
            contentExtraction: true,
            aiImprovement: isClaudeAvailable,
            workflow: true,
          },
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return {
        success: false,
        data: {
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString(),
        }
      };
    }
  }

  private async checkClaudeAvailability(): Promise<boolean> {
    try {
      // This would ideally make a simple test call to Claude
      // For now, just check if the service thinks it's available
      return true;
    } catch {
      return false;
    }
  }
}