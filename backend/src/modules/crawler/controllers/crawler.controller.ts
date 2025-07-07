import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Query,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { WebCrawlerService } from '../services/web-crawler.service';
import { ContentAnalyzerService } from '../services/content-analyzer.service';
import { CrawlerPipelineService } from '../services/crawler-pipeline.service';
// ScoringRulesService removed - using AEO system now
import { ProjectService } from '../../project/services/project.service';
import { TriggerCrawlDto } from '../dto/trigger-crawl.dto';


class UpdateScoringRulesDto {
  dimensions?: any;
  globalScoreFormula?: any;
}

@ApiTags('crawler')
@Controller('api/projects/:projectId/crawler')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CrawlerController {
  constructor(
    private readonly webCrawlerService: WebCrawlerService,
    private readonly contentAnalyzerService: ContentAnalyzerService,
    private readonly crawlerPipelineService: CrawlerPipelineService,
    private readonly projectService: ProjectService,
  ) {}

  @Post('crawl')
  @ApiOperation({ summary: 'Trigger web crawling for a project' })
  @ApiResponse({ status: 200, description: 'Crawl initiated successfully' })
  async triggerCrawl(
    @Param('projectId') projectId: string,
    @Body() options: TriggerCrawlDto,
    @CurrentUser() user: any,
  ) {
    // Verify project exists and user has access
    const project = await this.projectService.findById(projectId);
    if (!project) {
      throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
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
  @ApiOperation({ summary: 'Get crawl status for a project' })
  async getCrawlStatus(@Param('projectId') projectId: string) {
    const crawlStatus = await this.webCrawlerService.getCrawlStatus(projectId);
    const lastResult = await this.crawlerPipelineService.getLastPipelineResult(projectId);
    
    return {
      crawl: crawlStatus,
      lastAnalysis: lastResult,
    };
  }

  @Get('content-scores')
  @ApiOperation({ summary: 'Get content KPI scores for a project' })
  async getContentScores(
    @Param('projectId') projectId: string,
    @Query('limit') limit?: number,
  ) {
    const scores = await this.contentAnalyzerService.getProjectContentScores(projectId);
    const stats = await this.contentAnalyzerService.getProjectScoreStats(projectId);
    
    return {
      scores: limit ? scores.slice(0, limit) : scores,
      stats,
    };
  }

  @Get('content-scores/report')
  @ApiOperation({ summary: 'Get detailed content KPI report' })
  async getContentReport(@Param('projectId') projectId: string) {
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
          brandAlignment: Math.round(stats.avgBrandScore),
        },
        lastAnalyzedAt: stats.lastAnalyzedAt,
      },
      scoreDistribution: stats.scoreDistribution,
      topPerformingPages: topPages.map(page => ({
        url: page.url,
        globalScore: page.globalScore,
        strengths: this.identifyStrengths(page.scores),
      })),
      lowPerformingPages: lowPages.map(page => ({
        url: page.url,
        globalScore: page.globalScore,
        topIssues: page.issues.slice(0, 3),
      })),
      issuesSummary: stats.issuesSummary,
      criticalIssuesCount: criticalIssues.length,
      recommendations: this.generateRecommendations(stats),
    };
  }

  @Get('content-scores/:url')
  @ApiOperation({ summary: 'Get content score for a specific URL' })
  async getUrlScore(
    @Param('projectId') projectId: string,
    @Param('url') encodedUrl: string,
  ) {
    const url = decodeURIComponent(encodedUrl);
    const score = await this.contentAnalyzerService.getProjectContentScores(projectId);
    const urlScore = score.find(s => s.url === url);
    
    if (!urlScore) {
      throw new HttpException('URL score not found', HttpStatus.NOT_FOUND);
    }
    
    return urlScore;
  }

  // Reanalyze method removed - use AEO scoring system

  // Scoring rules methods removed - use AEO system

  // Update scoring rules method removed - use AEO system

  private identifyStrengths(scores: any): string[] {
    const strengths: string[] = [];
    
    if (scores.authority >= 80) strengths.push('Strong authority signals');
    if (scores.freshness >= 80) strengths.push('Recently updated content');
    if (scores.structure >= 80) strengths.push('Excellent structure and schema');
    if (scores.brandAlignment >= 80) strengths.push('Strong brand consistency');
    
    return strengths;
  }

  private generateRecommendations(stats: any): string[] {
    const recommendations: string[] = [];
    
    // Check average scores and generate recommendations
    if (stats.avgAuthorityScore < 60) {
      recommendations.push('Add author bylines and credible citations to improve authority');
    }
    if (stats.avgFreshnessScore < 60) {
      recommendations.push('Update older content and add dateModified schema markup');
    }
    if (stats.avgStructureScore < 60) {
      recommendations.push('Improve heading hierarchy and add Article schema markup');
    }
    if (stats.avgBrandScore < 80) {
      recommendations.push('Update outdated brand terminology and maintain consistency');
    }

    // Check for critical issues
    const criticalIssues = stats.issuesSummary.filter((issue: any) => 
      issue.severities.some((s: any) => s.severity === 'critical')
    );
    
    if (criticalIssues.length > 0) {
      recommendations.unshift(`Address ${criticalIssues.length} critical issue types immediately`);
    }

    return recommendations.slice(0, 5); // Top 5 recommendations
  }
}