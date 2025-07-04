import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContentAnalyzerService } from './content-analyzer.service';
import { AEOScoringService } from './aeo-scoring.service';
import { ContentScore } from '../schemas/content-score.schema';
import { RuleResult } from '../interfaces/rule.interface';
import { PageContent, Score } from '../interfaces/rule.interface';
import { PageCategoryType, AnalysisLevel } from '../interfaces/page-category.interface';
import { CrawledPageRepository } from '../repositories/crawled-page.repository';
import { ContentScoreRepository } from '../repositories/content-score.repository';
import { ProjectService } from '../../project/services/project.service';
import { PageCategorizerService } from './page-categorizer.service';
import { LLMCallTrackerService } from './llm-call-tracker.service';
import { DomainAnalysisService } from './domain-analysis.service';

@Injectable()
export class AEOContentAnalyzerService extends ContentAnalyzerService {
  private readonly aeoLogger = new Logger(AEOContentAnalyzerService.name);

  constructor(
    private readonly aeoScoringService: AEOScoringService,
    // Explicitly inject all parent dependencies
    configService: ConfigService,
    crawledPageRepository: CrawledPageRepository,
    contentScoreRepository: ContentScoreRepository,
    projectService: ProjectService,
    eventEmitter: EventEmitter2,
    pageCategorizerService: PageCategorizerService,
    llmCallTracker: LLMCallTrackerService,
    domainAnalysisService: DomainAnalysisService,
  ) {
    super(
      configService,
      crawledPageRepository,
      contentScoreRepository,
      projectService,
      eventEmitter,
      pageCategorizerService,
      llmCallTracker,
      domainAnalysisService,
    );
  }

  /**
   * Override the analyzePage method to use AEO scoring
   */
  async analyzePage(page: any, project: any): Promise<Partial<ContentScore>> {
    this.aeoLogger.log(`[AEO] Analyzing page with AEO rules: ${page.url}`);
    
    // No longer calling parent's analyzePage as legacy system is removed
    
    try {
      // Categorize the page first
      const pageCategory = await this.pageCategorizerService.categorize(
        page.url, 
        page.html, 
        page.metadata || {}
      );

      // Prepare page content for AEO analysis
      const pageContent: PageContent = {
        url: page.url,
        html: page.html,
        cleanContent: page.cleanContent || this.extractCleanContent(page.html),
        pageSignals: {
          content: {
            h1Text: '',
            metaDescription: '',
            wordCount: 0,
            hasAuthor: false,
            hasByline: false,
            hasAuthorBio: false,
            citationCount: 0,
            internalLinkCount: 0,
            externalLinkCount: 0,
            hasSources: false,
            hasReferences: false,
            academicSourceCount: 0,
            newsSourceCount: 0,
            industrySourceCount: 0
          },
          structure: {
            h1Count: 0,
            headingHierarchy: [],
            listCount: 0,
            schemaTypes: [],
            hasSchema: false,
            wordCount: 0,
            avgSentenceWords: 0,
            headingHierarchyScore: 0
          },
          freshness: {
            hasDateInUrl: false,
            hasDateInTitle: false,
            yearMentionCount: 0,
            updateIndicators: []
          },
          brand: {
            brandMentionCount: 0,
            competitorMentionCount: 0,
            brandInTitle: false,
            brandInH1: false,
            brandInUrl: false,
            brandProminence: 0,
            contextQuality: []
          },
          snippet: {
            qaBlockCount: 0,
            listItemCount: 0,
            avgSentenceLength: 0,
            definitionCount: 0,
            hasStructuredData: false,
            stepCount: 0,
            bulletPoints: 0
          }
        },
        pageCategory: pageCategory,
        metadata: page.metadata || {},
        securityInfo: this.extractSecurityInfo(page),
        performanceMetrics: this.extractPerformanceMetrics(page),
        structuralElements: this.extractStructuralElements(page.html)
      };
      
      // Calculate AEO score
      const aeoScore = await this.aeoScoringService.calculateScore(page.url, pageContent);
      
      // Create ContentScore from AEO analysis
      const { ruleResults, recommendations } = this.flattenRuleResults(aeoScore);
      const mergedScore: Partial<ContentScore> = {
        // Add scores (formerly AEO scores)
        scores: {
          technical: aeoScore.categoryScores.technical.score,
          content: aeoScore.categoryScores.content.score,
          authority: aeoScore.categoryScores.authority.score,
          monitoringKpi: aeoScore.categoryScores.monitoringKpi.score
        },
        globalScore: aeoScore.globalScore,
        pageType: aeoScore.pageType,
        pageCategory: pageCategory.type,
        analysisLevel: pageCategory.analysisLevel,
        categoryConfidence: pageCategory.confidence,
        ruleResults,
        recommendations
      };
      
      this.aeoLogger.log(`[AEO] Page analyzed - AEO Global Score: ${aeoScore.globalScore}, Issues: ${aeoScore.totalIssues}, Critical: ${aeoScore.criticalIssues}`);
      
      return mergedScore;
    } catch (error) {
      this.aeoLogger.error(`[AEO] Error in AEO analysis, falling back to legacy: ${error.message}`);
      // Re-throw error if AEO fails
      throw error;
    }
  }
  
  private extractCleanContent(html: string): string {
    // Remove script and style tags
    let clean = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    clean = clean.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    // Remove all HTML tags
    clean = clean.replace(/<[^>]+>/g, ' ');
    // Normalize whitespace
    clean = clean.replace(/\s+/g, ' ').trim();
    return clean;
  }
  
  private extractSecurityInfo(page: any): any {
    const url = page.url || '';
    return {
      isHttps: url.startsWith('https://'),
      hasMixedContent: false, // Would need actual implementation
      certificateValid: true, // Would need actual implementation
      sslDetails: {}
    };
  }
  
  private extractPerformanceMetrics(page: any): any {
    // Extract from page metadata if available
    return page.metadata?.performance || {};
  }
  
  private extractStructuralElements(html: string): any {
    const h1Matches = html.match(/<h1[^>]*>([^<]+)<\/h1>/gi) || [];
    const semanticTags = ['article', 'section', 'nav', 'header', 'footer', 'main', 'aside'];
    const foundSemanticTags = semanticTags.filter(tag => 
      new RegExp(`<${tag}[^>]*>`, 'i').test(html)
    );
    
    // Extract schema types
    const schemaMatches = html.match(/"@type":\s*"([^"]+)"/g) || [];
    const schemaTypes = schemaMatches.map(match => 
      match.match(/"@type":\s*"([^"]+)"/)?.[1] || ''
    ).filter(Boolean);
    
    return {
      h1Count: h1Matches.length,
      h1Text: h1Matches.map(h1 => h1.replace(/<[^>]+>/g, '').trim()),
      semanticTags: foundSemanticTags,
      schemaTypes: [...new Set(schemaTypes)] // Deduplicate
    };
  }
  
  private flattenRuleResults(aeoScore: Score): { ruleResults: any[]; recommendations: string[] } {
    const allResults: any[] = [];
    const allRecommendations: string[] = [];
    
    Object.values(aeoScore.categoryScores).forEach(categoryScore => {
      categoryScore.ruleResults.forEach(result => {
        allResults.push({
          ruleId: result.ruleId,
          ruleName: result.ruleName,
          category: categoryScore.category.toLowerCase().replace(/_/g, '').replace('monitoringkpi', 'monitoringKpi') as 'technical' | 'content' | 'authority' | 'monitoringKpi',
          score: result.score,
          maxScore: result.maxScore,
          weight: result.weight,
          contribution: result.contribution,
          passed: result.passed,
          evidence: result.evidence, // Pass structured evidence directly
          recommendations: result.recommendations,
          issues: result.issues?.map(issue => ({
            ...issue,
            dimension: categoryScore.category.toLowerCase().replace(/_/g, '').replace('monitoringkpi', 'monitoringKpi')
          })),
          details: result.details,
          aiUsage: result.aiUsage // Include AI usage information
        });
        
        // Aggregate recommendations
        if (result.recommendations && result.recommendations.length > 0) {
          allRecommendations.push(...result.recommendations);
        }
      });
    });
    
    // Remove duplicates from recommendations
    const uniqueRecommendations = [...new Set(allRecommendations)];
    
    return { ruleResults: allResults, recommendations: uniqueRecommendations };
  }
}