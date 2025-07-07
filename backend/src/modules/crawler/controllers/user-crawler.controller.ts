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
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';
import { WebCrawlerService } from '../services/web-crawler.service';
import { ContentAnalyzerService } from '../services/content-analyzer.service';
import { CrawlerPipelineService } from '../services/crawler-pipeline.service';
import { ProjectService } from '../../project/services/project.service';
import { UserService } from '../../user/services/user.service';
import { RuleRegistryService } from '../rules/registry/rule-registry.service';
import { DomainAnalysisService } from '../services/domain-analysis.service';
import { AEORuleRegistryService } from '../services/aeo-rule-registry.service';
import { TriggerCrawlDto } from '../dto/trigger-crawl.dto';


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
    private readonly ruleRegistryService: RuleRegistryService,
    private readonly domainAnalysisService: DomainAnalysisService,
    private readonly aeoRuleRegistry: AEORuleRegistryService,
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

    // Validate maxPages if provided
    if (options.maxPages !== undefined) {
      if (options.maxPages < 1 || options.maxPages > 100) {
        throw new HttpException('maxPages must be between 1 and 100', HttpStatus.BAD_REQUEST);
      }
    }

    // Validate manual URLs if in manual mode
    if (options.mode === 'manual' && options.manualUrls) {
      const projectDomain = new URL(project.website).hostname.replace(/^www\./, '');
      
      for (const url of options.manualUrls) {
        try {
          const urlObj = new URL(url);
          const urlDomain = urlObj.hostname.replace(/^www\./, '');
          
          // Check if the URL domain matches the project domain (ignoring subdomains)
          const urlBaseDomain = urlDomain.split('.').slice(-2).join('.');
          const projectBaseDomain = projectDomain.split('.').slice(-2).join('.');
          
          if (urlBaseDomain !== projectBaseDomain) {
            throw new HttpException(
              `URL ${url} does not match project domain ${projectDomain}`,
              HttpStatus.BAD_REQUEST
            );
          }
        } catch (error) {
          if (error instanceof HttpException) throw error;
          throw new HttpException(`Invalid URL: ${url}`, HttpStatus.BAD_REQUEST);
        }
      }
    }

    // Run the complete pipeline with options
    const result = await this.crawlerPipelineService.runContentKPIPipeline(projectId, options);
    
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
          technical: Math.round(stats.avgTechnicalScore || 0),
          structure: Math.round(stats.avgStructureScore || 0),
          authority: Math.round(stats.avgAuthorityScore || 0),
          quality: Math.round(stats.avgMonitoringKpiScore || 0),
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
    
    if (scores.technical >= 80) strengths.push('Excellent technical optimization');
    if (scores.content >= 80) strengths.push('High-quality AI-ready content');
    if (scores.authority >= 80) strengths.push('Strong authority signals');
    if (scores.quality >= 80) strengths.push('Great AI visibility metrics');
    
    return strengths;
  }

  private getTopIssues(page: any): any[] {
    return page.issues?.slice(0, 3) || [];
  }

  private generateRecommendations(stats: any, criticalIssues: any[]): string[] {
    const recommendations: string[] = [];
    
    if (stats.avgTechnicalScore < 60) {
      recommendations.push('Optimize technical infrastructure: add llms.txt, improve internal linking, implement structured data');
    }
    if (stats.avgStructureScore < 60) {
      recommendations.push('Create more AI-optimized content: how-to guides, FAQs, and definitional content');
    }
    if (stats.avgAuthorityScore < 60) {
      recommendations.push('Build authority through high-quality citations and reputable source references');
    }
    if (stats.avgMonitoringKpiScore < 60) {
      recommendations.push('Track and improve AI visibility metrics: brand citations and sentiment in AI responses');
    }
    
    return recommendations.slice(0, 5);
  }

  @Get('content-scores/:pageUrl/llm-analysis')
  @TokenRoute()
  @ApiOperation({ summary: 'Get LLM analysis details for a specific page' })
  async getPageLLMAnalysis(
    @Param('projectId') projectId: string,
    @Param('pageUrl') pageUrl: string,
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

    // Get the content score for the specific URL
    const decodedUrl = decodeURIComponent(pageUrl);
    const score = await this.contentAnalyzerService.getPageContentScore(projectId, decodedUrl);
    
    if (!score) {
      throw new NotFoundException('Content score not found for this page');
    }

    // Check if we have multiple LLM calls or just the single analysis
    if (score.llmCalls && score.llmCalls.length > 0) {
      // Return all LLM calls
      return {
        url: score.url,
        analysisType: 'unified',
        llmCalls: score.llmCalls,
      };
    } else if (score.llmAnalysis) {
      // Return the single LLM analysis in the new format
      return {
        url: score.url,
        analysisType: score.llmAnalysis.analysisType,
        llmCalls: [{
          purpose: 'unified_analysis',
          prompt: score.llmAnalysis.prompt,
          response: score.llmAnalysis.response,
          model: score.llmAnalysis.model,
          timestamp: score.llmAnalysis.timestamp,
          tokensUsed: score.llmAnalysis.tokensUsed,
        }],
      };
    } else {
      return {
        message: 'No LLM analysis available for this page',
        analysisType: 'static',
        llmCalls: [],
      };
    }
  }

  @Get('rules')
  @TokenRoute()
  @ApiOperation({ summary: 'Get all available scoring rules with details' })
  async getScoringRules(
    @Req() req: any,
  ) {
    // Token is already validated by @TokenRoute decorator
    if (!req.userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }

    // Get all AEO rules from the registry
    const aeoRules = this.aeoRuleRegistry.getAllRules();
    
    // Transform AEO rules to the expected format
    const rules = aeoRules.map(rule => {
      // Determine if rule uses LLM based on known rules
      const usesLLM = this.checkRuleUsesLLM(rule.id);
      
      return {
        id: rule.id,
        name: rule.name,
        dimension: rule.category.toLowerCase().replace(/_/g, '').replace('monitoringkpi', 'quality'),
        description: this.getRuleDescription(rule),
        priority: rule.impactScore,
        weight: this.getRuleWeight(rule.impactScore),
        applicability: {
          scope: rule.isDomainLevel ? 'domain' : 
                 rule.pageTypes.length === 0 || rule.pageTypes.length > 15 ? 'all' : 'category',
          categories: rule.pageTypes,
        },
        executionScope: rule.isDomainLevel ? 'domain' : 'page',
        usesLLM,
        llmPurpose: usesLLM ? this.getLLMPurposeForRule(rule.id) : null,
      };
    });
    
    return {
      rules,
      dimensions: ['technical', 'structure', 'authority', 'quality'],
    };
  }

  private checkRuleUsesLLM(ruleId: string): boolean {
    const llmRules = [
      'case-studies',
      'definitional_content',
      'citing_sources',
      'comparison_content',
      'in_depth_guides'
    ];
    return llmRules.includes(ruleId);
  }

  private getLLMPurposeForRule(ruleId: string): string {
    const llmPurposes: Record<string, string> = {
      'case-studies': 'Identifies and evaluates case studies with quantifiable metrics',
      'definitional_content': 'Analyzes content for "What is" definitional patterns',
      'citing_sources': 'Evaluates source quality and citation practices',
      'comparison_content': 'Identifies and assesses comparison and versus content',
      'in_depth_guides': 'Evaluates content depth and comprehensiveness',
    };
    return llmPurposes[ruleId] || 'Uses AI for advanced content analysis';
  }

  private getRuleDescription(rule: any): string {
    // Map rule IDs to descriptions
    const descriptions: Record<string, string> = {
      // Technical
      'clean_html_structure': 'Validates HTML structure is clean and semantic',
      'https_security': 'Ensures site uses HTTPS for security',
      'mobile_optimization': 'Checks mobile responsiveness and optimization',
      'page_speed': 'Evaluates page loading performance',
      'internal_linking': 'Analyzes internal link structure and navigation',
      'llms_txt': 'Verifies presence of llms.txt file for AI crawlers',
      'robots_txt': 'Validates robots.txt configuration',
      'status_code': 'Checks for proper HTTP status codes',
      'structured_data': 'Evaluates schema markup implementation',
      'url_structure': 'Assesses URL structure and readability',
      'xml_sitemap': 'Verifies XML sitemap presence and validity',
      
      // Structure
      'how_to_content': 'Detects and evaluates how-to and instructional content',
      'definitional_content': 'Identifies "What is" definitional content',
      'case-studies': 'Finds and evaluates case studies with metrics',
      'citing_sources': 'Checks for reputable source citations',
      'comparison_content': 'Evaluates comparison and versus content',
      'concise_answers': 'Measures concise upfront answer delivery',
      'content_freshness': 'Assesses content recency and updates',
      'faq_pages': 'Evaluates FAQ and Q&A content structure',
      'glossaries': 'Checks for glossaries and terminology pages',
      'in_depth_guides': 'Identifies comprehensive guide content',
      'main_heading': 'Validates H1 tag usage and content',
      'meta_description': 'Evaluates meta description quality',
      'multimodal_content': 'Checks for multimedia content integration',
      'image_alt': 'Validates image alt attribute usage',
      
      // Authority (Off-site rules)
      'author_credentials': 'Evaluates author expertise signals',
      'community_engagement': 'Measures community interaction signals',
      'cross_platform_social': 'Checks cross-platform social presence',
      'forum_engagement': 'Evaluates forum participation',
      'expert_reviews': 'Identifies expert endorsements',
      'external_user_reviews': 'Checks third-party review presence',
      'industry_publications': 'Measures industry publication mentions',
      'industry_recognition': 'Evaluates awards and recognition',
      'influencer_community': 'Checks influencer relationships',
      'linkedin_thought_leadership': 'Evaluates LinkedIn presence',
      'podcasting': 'Checks podcast presence',
      'press_release': 'Evaluates press release strategy',
      'social_media_presence': 'Measures social media authority',
      'user_reviews_integration': 'Checks review integration',
      'wikipedia_presence': 'Verifies Wikipedia presence',
      'youtube_authority': 'Evaluates YouTube channel authority',
      
      // Monitoring KPIs
      'brand_citations': 'Tracks AI response citations',
      'brand_mentions': 'Monitors brand mention frequency',
      'brand_sentiment': 'Analyzes brand sentiment in AI'
    };
    
    return descriptions[rule.id] || rule.name;
  }

  private getRuleWeight(impactScore: number): number {
    // Map impact score (1-3) to weight
    const weightMap: Record<number, number> = {
      1: 0.5,  // Low impact
      2: 1.0,  // Medium impact
      3: 1.5   // High impact
    };
    return weightMap[impactScore] || 1.0;
  }

  @Get('domain-analysis')
  @TokenRoute()
  @ApiOperation({ summary: 'Get domain analysis results for a project' })
  async getDomainAnalysis(
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

    const domainAnalyses = await this.domainAnalysisService.getProjectDomainAnalyses(projectId);
    
    return {
      domainAnalyses,
      totalDomains: domainAnalyses.length,
    };
  }

  @Get('combined-scores')
  @TokenRoute()
  @ApiOperation({ summary: 'Get combined page and domain scores for a project' })
  async getCombinedScores(
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

    // Get both page scores and domain analyses
    const pageScores = await this.contentAnalyzerService.getProjectContentScores(projectId);
    const pageStats = await this.contentAnalyzerService.getProjectScoreStats(projectId);
    const domainAnalyses = await this.domainAnalysisService.getProjectDomainAnalyses(projectId);

    // Calculate combined metrics
    const avgDomainScore = domainAnalyses.length > 0 
      ? Math.round(domainAnalyses.reduce((sum, domain) => sum + domain.overallScore, 0) / domainAnalyses.length)
      : 0;

    const avgPageScore = pageStats.avgGlobalScore || 0;

    // Weighted combined score (60% page, 40% domain)
    const combinedScore = Math.round((avgPageScore * 0.6) + (avgDomainScore * 0.4));
    
    return {
      combined: {
        overallScore: combinedScore,
        pageScore: avgPageScore,
        domainScore: avgDomainScore,
        totalPages: pageStats.totalPages || 0,
        totalDomains: domainAnalyses.length,
      },
      pageScoreBreakdown: {
        technical: Math.round(pageStats.avgTechnicalScore || 0),
        structure: Math.round(pageStats.avgStructureScore || 0),
        authority: Math.round(pageStats.avgAuthorityScore || 0),
        quality: Math.round(pageStats.avgMonitoringKpiScore || 0),
      },
      domainScoreBreakdown: domainAnalyses.reduce((breakdown, domain) => {
        if (domain.calculationDetails?.dimensionBreakdown) {
          Object.entries(domain.calculationDetails.dimensionBreakdown).forEach(([dimension, data]: [string, any]) => {
            if (!breakdown[dimension]) {
              breakdown[dimension] = [];
            }
            breakdown[dimension].push(data.score);
          });
        }
        return breakdown;
      }, {} as Record<string, number[]>),
      pageScores: pageScores.slice(0, 10), // Top 10 pages
      domainAnalyses,
    };
  }
}