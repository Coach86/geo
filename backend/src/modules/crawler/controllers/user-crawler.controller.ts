import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Req,
  HttpException,
  HttpStatus,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsArray, IsString } from 'class-validator';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';
import { WebCrawlerService } from '../services/web-crawler.service';
import { ContentAnalyzerService } from '../services/content-analyzer.service';
import { CrawlerPipelineService } from '../services/crawler-pipeline.service';
import { ProjectService } from '../../project/services/project.service';
import { UserService } from '../../user/services/user.service';

class TriggerCrawlDto {
  @ApiProperty({ description: 'Maximum number of pages to crawl', required: false, default: 100 })
  @IsOptional()
  @IsNumber()
  maxPages?: number;

  @ApiProperty({ description: 'Delay between crawl requests in milliseconds', required: false, default: 1000 })
  @IsOptional()
  @IsNumber()
  crawlDelay?: number;

  @ApiProperty({ description: 'URL patterns to include in crawl', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includePatterns?: string[];

  @ApiProperty({ description: 'URL patterns to exclude from crawl', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludePatterns?: string[];
}

@ApiTags('User - Content KPI')
@Controller('user/projects/:projectId/crawler')
export class UserCrawlerController {
  private readonly logger = new Logger(UserCrawlerController.name);

  constructor(
    private readonly webCrawlerService: WebCrawlerService,
    private readonly contentAnalyzerService: ContentAnalyzerService,
    private readonly crawlerPipelineService: CrawlerPipelineService,
    private readonly projectService: ProjectService,
    private readonly userService: UserService,
  ) {}

  @Post('crawl')
  @TokenRoute()
  @ApiOperation({ summary: 'Trigger web crawling for a project' })
  @ApiResponse({ status: 200, description: 'Crawl initiated successfully' })
  async triggerCrawl(
    @Param('projectId') projectId: string,
    @Body() options: TriggerCrawlDto,
    @Req() req: any,
  ) {
    // Token is already validated by @TokenRoute decorator
    if (!req.userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }

    // Get user details
    const user = await this.userService.findOne(req.userId);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.UNAUTHORIZED);
    }

    // Verify project exists and user has access
    const project = await this.projectService.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Verify user's organization owns the project
    if (project.organizationId !== user.organizationId) {
      throw new HttpException('Unauthorized access to project', HttpStatus.FORBIDDEN);
    }

    // Run the complete pipeline
    const result = await this.crawlerPipelineService.runContentKPIPipeline(projectId);
    
    return {
      success: true,
      message: 'Content KPI analysis initiated',
      result,
    };
  }

  @Get('status')
  @TokenRoute()
  @ApiOperation({ summary: 'Get crawl status for a project' })
  async getCrawlStatus(
    @Param('projectId') projectId: string,
    @Req() req: any,
  ) {
    // Token is already validated by @TokenRoute decorator
    if (!req.userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }

    // Get user details
    const user = await this.userService.findOne(req.userId);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.UNAUTHORIZED);
    }

    // Verify project exists and user has access
    const project = await this.projectService.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Verify user's organization owns the project
    if (project.organizationId !== user.organizationId) {
      throw new HttpException('Unauthorized access to project', HttpStatus.FORBIDDEN);
    }

    const crawlStatus = await this.webCrawlerService.getCrawlStatus(projectId);
    const lastResult = await this.crawlerPipelineService.getLastPipelineResult(projectId);
    
    return {
      crawl: crawlStatus,
      lastAnalysis: lastResult,
    };
  }

  @Get('content-scores')
  @TokenRoute()
  @ApiOperation({ summary: 'Get content KPI scores for a project' })
  async getContentScores(
    @Param('projectId') projectId: string,
    @Req() req: any,
    @Query('limit') limit?: number,
  ) {
    // Token is already validated by @TokenRoute decorator
    if (!req.userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }

    // Get user details
    const user = await this.userService.findOne(req.userId);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.UNAUTHORIZED);
    }

    // Verify project exists and user has access
    const project = await this.projectService.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Verify user's organization owns the project
    if (project.organizationId !== user.organizationId) {
      throw new HttpException('Unauthorized access to project', HttpStatus.FORBIDDEN);
    }

    const scores = await this.contentAnalyzerService.getProjectContentScores(projectId);
    const stats = await this.contentAnalyzerService.getProjectScoreStats(projectId);
    
    return {
      scores: limit ? scores.slice(0, limit) : scores,
      stats,
    };
  }

  @Get('content-scores/report')
  @TokenRoute()
  @ApiOperation({ summary: 'Get detailed content KPI report' })
  async getContentReport(
    @Param('projectId') projectId: string,
    @Req() req: any,
  ) {
    // Token is already validated by @TokenRoute decorator
    if (!req.userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }

    // Get user details
    const user = await this.userService.findOne(req.userId);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.UNAUTHORIZED);
    }

    // Verify project exists and user has access
    const project = await this.projectService.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Verify user's organization owns the project
    if (project.organizationId !== user.organizationId) {
      throw new HttpException('Unauthorized access to project', HttpStatus.FORBIDDEN);
    }

    const stats = await this.contentAnalyzerService.getProjectScoreStats(projectId);
    
    // Return 404 if no data exists
    if (!stats.totalPages || stats.totalPages === 0) {
      throw new NotFoundException('No content analysis data found for this project');
    }
    
    const topPages = await this.contentAnalyzerService.getTopPerformingPages(projectId, 5);
    const lowPages = await this.contentAnalyzerService.getLowPerformingPages(projectId, 5);
    const criticalIssues = await this.contentAnalyzerService.getPagesWithIssues(projectId, 'critical');
    
    return {
      summary: {
        totalPages: stats.totalPages,
        avgGlobalScore: Math.round(stats.avgGlobalScore),
        scoreBreakdown: {
          authority: Math.round(stats.avgAuthorityScore),
          freshness: Math.round(stats.avgFreshnessScore),
          structure: Math.round(stats.avgStructureScore),
          snippetExtractability: Math.round(stats.avgSnippetScore),
          brandAlignment: Math.round(stats.avgBrandScore),
        },
        lastAnalyzedAt: stats.lastAnalyzedAt,
      },
      scoreDistribution: stats.scoreDistribution,
      topPerformingPages: topPages.map((page) => ({
        url: page.url,
        globalScore: page.globalScore,
        strengths: this.getPageStrengths(page),
      })),
      lowPerformingPages: lowPages.map((page) => ({
        url: page.url,
        globalScore: page.globalScore,
        topIssues: this.getTopIssues(page),
      })),
      issuesSummary: stats.issuesSummary,
      criticalIssuesCount: criticalIssues.length,
      recommendations: this.generateRecommendations(stats, criticalIssues),
    };
  }

  private getPageStrengths(page: any): string[] {
    const strengths: string[] = [];
    const scores = page.scores || {};
    
    if (scores.authority >= 80) strengths.push('Strong authority signals');
    if (scores.freshness >= 80) strengths.push('Fresh content');
    if (scores.structure >= 80) strengths.push('Well-structured');
    if (scores.snippetExtractability >= 80) strengths.push('AI/Search optimized');
    if (scores.brandAlignment >= 80) strengths.push('Brand consistent');
    
    return strengths;
  }

  private getTopIssues(page: any): any[] {
    return page.issues?.slice(0, 3) || [];
  }

  private generateRecommendations(stats: any, criticalIssues: any[]): string[] {
    const recommendations: string[] = [];
    
    if (stats.avgAuthorityScore < 60) {
      recommendations.push('Add author information and citations to build authority');
    }
    if (stats.avgFreshnessScore < 60) {
      recommendations.push('Update older content to improve freshness scores');
    }
    if (stats.avgStructureScore < 60) {
      recommendations.push('Improve HTML structure with proper headings and schema markup');
    }
    if (stats.avgSnippetScore < 60) {
      recommendations.push('Optimize content for featured snippets and AI extraction');
    }
    if (stats.avgBrandScore < 60) {
      recommendations.push('Increase brand mentions and maintain consistent messaging');
    }
    
    return recommendations.slice(0, 5);
  }
}