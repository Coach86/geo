import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CrawledPageRepository } from '../repositories/crawled-page.repository';
import { ContentScoreRepository } from '../repositories/content-score.repository';
import { ProjectService } from '../../project/services/project.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PageCategorizerService } from './page-categorizer.service';
import { LLMCallTrackerService } from './llm-call-tracker.service';
import { DomainAnalysisService } from './domain-analysis.service';
import { ContentScore } from '../schemas/content-score.schema';

export interface AnalysisProgress {
  projectId: string;
  analyzed: number;
  total: number;
  currentUrl: string;
  status: 'running' | 'completed' | 'failed';
}

/**
 * Legacy ContentAnalyzerService - replaced by AEOContentAnalyzerService
 * This class is kept for backward compatibility during the transition period
 * All analysis is now delegated to AEO scoring system
 */
@Injectable()
export class ContentAnalyzerService {
  private readonly logger = new Logger(ContentAnalyzerService.name);

  constructor(
    protected readonly configService: ConfigService,
    protected readonly crawledPageRepository: CrawledPageRepository,
    protected readonly contentScoreRepository: ContentScoreRepository,
    protected readonly projectService: ProjectService,
    protected readonly eventEmitter: EventEmitter2,
    protected readonly pageCategorizerService: PageCategorizerService,
    protected readonly llmCallTracker: LLMCallTrackerService,
    protected readonly domainAnalysisService: DomainAnalysisService,
  ) {}

  async analyzeProjectContent(projectId: string, limit?: number): Promise<void> {
    this.logger.log(`[ANALYZER] Starting content analysis for project ${projectId}`);

    // Clear existing analysis data to ensure fresh results
    await this.contentScoreRepository.deleteByProjectId(projectId);
    
    // Get project details
    const project = await this.projectService.findById(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Get unprocessed crawled pages
    const pages = await this.crawledPageRepository.findUnprocessedByProjectId(projectId, limit);
    
    if (pages.length === 0) {
      this.logger.log('[ANALYZER] No unprocessed pages found');
      return;
    }
    
    this.logger.log(`[ANALYZER] Found ${pages.length} unprocessed pages to analyze`);

    const progress: AnalysisProgress = {
      projectId,
      analyzed: 0,
      total: pages.length,
      currentUrl: '',
      status: 'running',
    };

    this.eventEmitter.emit('analyzer.started', { projectId, totalPages: pages.length });

    // Run domain analysis first
    await this.runDomainAnalysis(projectId, pages, project);

    try {
      for (const page of pages) {
        progress.currentUrl = page.url;
        this.logger.log(`[ANALYZER] Analyzing page ${progress.analyzed + 1}/${pages.length}: ${page.url}`);
        this.eventEmitter.emit('analyzer.progress', {
          projectId,
          analyzed: progress.analyzed,
          total: progress.total,
          currentUrl: progress.currentUrl,
        });

        try {
          // Analyze the page - this method should be overridden by AEOContentAnalyzerService
          const score = await this.analyzePage(page, project);

          // Save the score
          const contentScore = await this.contentScoreRepository.create({
            ...score,
            projectId,
            url: page.url,
            analyzedAt: new Date(),
          } as ContentScore);

          // Mark page as processed
          await this.crawledPageRepository.markAsProcessed(page.id);

          progress.analyzed++;
        } catch (error) {
          this.logger.error(`[ANALYZER] Error analyzing page ${page.url}:`, error);
          await this.crawledPageRepository.markAsProcessed(page.id);
          progress.analyzed++;
        }
      }

      progress.status = 'completed';
      this.eventEmitter.emit('analyzer.completed', { 
        projectId, 
        analyzed: progress.analyzed,
        total: progress.total 
      });
      this.logger.log(`[ANALYZER] Analysis completed for project ${projectId}`);
    } catch (error) {
      progress.status = 'failed';
      this.eventEmitter.emit('analyzer.failed', { projectId, error: error.message });
      throw error;
    }
  }

  /**
   * Analyze a single page - this method should be overridden by AEOContentAnalyzerService
   */
  async analyzePage(page: any, project: any): Promise<Partial<ContentScore>> {
    // Legacy implementation - should be overridden
    throw new Error('ContentAnalyzerService.analyzePage should be overridden by AEOContentAnalyzerService');
  }

  /**
   * Run domain analysis for the project
   */
  private async runDomainAnalysis(projectId: string, pages: any[], project: any): Promise<void> {
    try {
      this.logger.log(`[ANALYZER] Starting domain analysis for project ${projectId}`);
      
      // Extract unique domains from crawled pages
      const domains = new Set<string>();
      pages.forEach(page => {
        try {
          const url = new URL(page.url);
          domains.add(url.hostname);
        } catch (error) {
          this.logger.warn(`[ANALYZER] Invalid URL: ${page.url}`);
        }
      });

      this.logger.log(`[ANALYZER] Found ${domains.size} unique domains to analyze`);

      // Analyze each domain
      for (const domain of domains) {
        try {
          // Find homepage or first page for this domain to use for domain analysis
          const domainPages = pages.filter(page => {
            try {
              const url = new URL(page.url);
              return url.hostname === domain;
            } catch {
              return false;
            }
          });
          
          // Prefer homepage, otherwise use first available page
          const homePage = domainPages.find(page => {
            const url = new URL(page.url);
            return url.pathname === '/' || url.pathname === '';
          }) || domainPages[0];
          
          await this.domainAnalysisService.analyzeDomain(projectId, domain, project, homePage);
          this.logger.log(`[ANALYZER] Domain analysis completed for ${domain}`);
        } catch (error) {
          this.logger.error(`[ANALYZER] Error analyzing domain ${domain}:`, error);
        }
      }

      this.logger.log(`[ANALYZER] Domain analysis completed for all domains`);
    } catch (error) {
      this.logger.error(`[ANALYZER] Error in domain analysis:`, error);
      // Don't throw - domain analysis failure shouldn't stop page analysis
    }
  }

  // Public methods for accessing data
  async getProjectContentScores(projectId: string): Promise<ContentScore[]> {
    return this.contentScoreRepository.findByProjectId(projectId);
  }

  async getPageContentScore(projectId: string, url: string): Promise<ContentScore | null> {
    return this.contentScoreRepository.findByProjectIdAndUrl(projectId, url);
  }

  async getProjectScoreStats(projectId: string): Promise<any> {
    const stats = await this.contentScoreRepository.getProjectScoreStats(projectId);
    const issuesSummary = await this.contentScoreRepository.getIssuesSummary(projectId);
    const scoreDistribution = await this.contentScoreRepository.getScoreDistribution(projectId);

    return {
      ...stats,
      issuesSummary,
      scoreDistribution,
    };
  }

  async getTopPerformingPages(projectId: string, limit: number = 10): Promise<ContentScore[]> {
    return this.contentScoreRepository.findTopScoresByProjectId(projectId, limit);
  }

  async getLowPerformingPages(projectId: string, limit: number = 10): Promise<ContentScore[]> {
    return this.contentScoreRepository.findLowScoresByProjectId(projectId, limit);
  }

  async getPagesWithIssues(projectId: string, severity?: string): Promise<ContentScore[]> {
    return this.contentScoreRepository.findByProjectIdWithIssues(projectId, severity);
  }
}