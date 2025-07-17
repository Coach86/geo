import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PageImprovementJob, PageImprovementJobDocument } from '../schemas/page-improvement-job.schema';
import { LlmService } from '../../llm/services/llm.service';
import { LlmProvider } from '../../llm/interfaces/llm-provider.enum';
import { AEOScoringService } from '../../crawler/services/aeo-scoring.service';
import { AEOContentAnalyzerService } from '../../crawler/services/aeo-content-analyzer.service';
import { PageMagicEventsGateway } from '../gateways/page-magic-events.gateway';
import { ContentScoreRepository } from '../../crawler/repositories/content-score.repository';
import { ScoreIssue } from '../../crawler/schemas/content-score.schema';
import { PageContent } from '../../crawler/interfaces/rule.interface';
import { PageSignals } from '../../crawler/interfaces/page-signals.interface';
import { PageCategoryType, AnalysisLevel } from '../../crawler/interfaces/page-category.interface';
import { HtmlToMarkdownService } from './html-to-markdown.service';
import { ImprovementOrchestrationService } from './improvement-orchestration.service';
import { ImprovementLlmService } from './improvement-llm.service';
import { ImprovementScoringService } from './improvement-scoring.service';
import { z } from 'zod';

export interface RuleToProcess {
  id: string;
  ruleId?: string;
  ruleName?: string;
  dimension: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
  currentScore: number;
  affectedElements?: string[];
}

export interface StructuredImprovement {
  content?: string;
  title?: string;
  metas?: {
    description?: string;
    keywords?: string;
    [key: string]: string | undefined;
  };
}

export interface RuleProcessingResult {
  ruleId: string;
  improvedContent?: string;
  improvedTitle?: string;
  improvedMetas?: any;
  scoreBefore: number;
  scoreAfter: number;
  changes: string[];
  model: string;
  tokensUsed?: {
    input: number;
    output: number;
    total?: number;
  };
  retryCount?: number;
}

/**
 * Main service that delegates to specialized improvement services.
 * Maintains backward compatibility while using the new modular structure.
 */
@Injectable()
export class SequentialImprovementStructuredService {
  private readonly logger = new Logger(SequentialImprovementStructuredService.name);

  constructor(
    @InjectModel(PageImprovementJob.name)
    private readonly jobModel: Model<PageImprovementJobDocument>,
    private readonly eventsGateway: PageMagicEventsGateway,
    private readonly llmService: LlmService,
    private readonly aeoScoringService: AEOScoringService,
    private readonly aeoContentAnalyzerService: AEOContentAnalyzerService,
    private readonly contentScoreRepository: ContentScoreRepository,
    private readonly htmlToMarkdownService: HtmlToMarkdownService,
    private readonly improvementOrchestrationService: ImprovementOrchestrationService,
    private readonly improvementLlmService: ImprovementLlmService,
    private readonly improvementScoringService: ImprovementScoringService,
  ) {}

  /**
   * Process rules sequentially with retry logic and structured responses
   * Delegates to orchestration service
   */
  async processRulesSequentially(jobId: string): Promise<PageImprovementJobDocument> {
    return this.improvementOrchestrationService.processRulesSequentially(jobId);
  }

  /**
   * Extract rules to process from content score
   * Delegates to orchestration service
   */
  async extractRulesToProcess(contentScoreId: string): Promise<RuleToProcess[]> {
    return this.improvementOrchestrationService.extractRulesToProcess(contentScoreId);
  }

  /**
   * Fix a specific rule and return structured improvements
   * Delegates to LLM service
   */
  private async fixSpecificRuleStructured(
    content: string,
    title: string,
    metas: any,
    rule: RuleToProcess,
    previouslyFixedIssues?: string[]
  ): Promise<StructuredImprovement & { tokensUsed?: any }> {
    return this.improvementLlmService.fixSpecificRuleStructured(
      content,
      title,
      metas,
      rule,
      previouslyFixedIssues
    );
  }

  /**
   * Compute content score using the existing scoring system
   * Delegates to scoring service
   */
  private async computeContentScore(
    pageUrl: string, 
    content: string, 
    projectId: string,
    title?: string,
    metaDescription?: string
  ): Promise<number> {
    return this.improvementScoringService.computeContentScore(
      pageUrl,
      content,
      projectId,
      title,
      metaDescription
    );
  }

  /**
   * Convert Markdown back to HTML for scoring
   * Delegates to scoring service
   */
  private markdownToHtml(markdown: string): string {
    return this.improvementScoringService.markdownToHtml(markdown);
  }

  /**
   * Detect changes between improvements and original content
   * Delegates to scoring service
   */
  private detectChanges(
    improvement: StructuredImprovement,
    originalContent: string,
    originalTitle: string,
    originalMetas: any
  ): string[] {
    return this.improvementScoringService.detectChanges(
      improvement,
      originalContent,
      originalTitle,
      originalMetas
    );
  }

  /**
   * Log detailed evidence about rule scoring
   * Delegates to scoring service
   */
  private async logRuleEvidence(
    rule: RuleToProcess,
    projectId: string,
    pageUrl: string,
    scoreBefore: number,
    scoreAfter: number,
    contentScoreId?: string
  ): Promise<void> {
    return this.improvementScoringService.logRuleEvidence(
      rule,
      projectId,
      pageUrl,
      scoreBefore,
      scoreAfter,
      contentScoreId
    );
  }
}