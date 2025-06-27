import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthorityAIAnalyzer } from '../analyzers/ai/authority-ai.analyzer';
import { AuthorityAnalyzer } from '../analyzers/authority.analyzer';
import { FreshnessAnalyzer } from '../analyzers/freshness.analyzer';
import { StructureAnalyzer } from '../analyzers/structure.analyzer';
import { SnippetAnalyzer } from '../analyzers/snippet.analyzer';
import { BrandAnalyzer } from '../analyzers/brand.analyzer';

export interface KPIAnalysisResult {
  scores: {
    authority: number;
    freshness: number;
    structure: number;
    snippetExtractability: number;
    brandAlignment: number;
  };
  details: any;
  issues: Array<{
    dimension: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    recommendation: string;
  }>;
  metadata: {
    aiEnabled: boolean;
    modelsUsed: Record<string, string>;
    totalCost: number;
    totalDuration: number;
    hybrid: boolean;
  };
}

@Injectable()
export class ContentKPILLMService {
  private readonly logger = new Logger(ContentKPILLMService.name);
  private readonly aiEnabled: boolean;
  private readonly hybridMode: boolean;
  private readonly aiWeight: number;
  private readonly maxConcurrentLLM: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly authorityAIAnalyzer: AuthorityAIAnalyzer,
    private readonly authorityAnalyzer: AuthorityAnalyzer,
    private readonly freshnessAnalyzer: FreshnessAnalyzer,
    private readonly structureAnalyzer: StructureAnalyzer,
    private readonly snippetAnalyzer: SnippetAnalyzer,
    private readonly brandAnalyzer: BrandAnalyzer,
  ) {
    this.aiEnabled = this.configService.get<boolean>('CONTENT_KPI_USE_AI', true);
    this.hybridMode = this.configService.get<boolean>('CONTENT_KPI_HYBRID_MODE', true);
    this.aiWeight = this.configService.get<number>('CONTENT_KPI_AI_WEIGHT', 0.8);
    this.maxConcurrentLLM = this.configService.get<number>('CONTENT_KPI_MAX_CONCURRENT_LLM', 5);
  }

  async analyzeContent(
    page: any,
    project: any,
    options?: { forceStatic?: boolean }
  ): Promise<KPIAnalysisResult> {
    const startTime = Date.now();
    this.logger.log(`[KPI-LLM] Starting content analysis for ${page.url}`);
    
    const metadata: KPIAnalysisResult['metadata'] = {
      aiEnabled: this.aiEnabled && !options?.forceStatic,
      modelsUsed: {},
      totalCost: 0,
      totalDuration: 0,
      hybrid: false,
    };

    try {
      // Run all analyzers in parallel where possible
      const [
        authorityResult,
        freshnessResult,
        structureResult,
        snippetResult,
        brandResult,
      ] = await Promise.all([
        this.analyzeAuthority(page, metadata),
        this.analyzeFreshness(page, metadata),
        this.analyzeStructure(page, metadata),
        this.analyzeSnippet(page, metadata),
        this.analyzeBrand(page, project, metadata),
      ]);

      // Combine all issues
      const allIssues: KPIAnalysisResult['issues'] = [];
      
      // Add issues from each dimension
      this.addIssuesToList(allIssues, 'authority', authorityResult.issues);
      this.addIssuesToList(allIssues, 'freshness', freshnessResult.issues);
      this.addIssuesToList(allIssues, 'structure', structureResult.issues);
      this.addIssuesToList(allIssues, 'snippet', snippetResult.issues);
      this.addIssuesToList(allIssues, 'brand', brandResult.issues);

      // Sort issues by severity
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      allIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      const scores = {
        authority: authorityResult.score,
        freshness: freshnessResult.score,
        structure: structureResult.score,
        snippetExtractability: snippetResult.score,
        brandAlignment: brandResult.score,
      };

      metadata.totalDuration = Date.now() - startTime;

      // Emit analysis event
      this.eventEmitter.emit('content-kpi.analyzed', {
        url: page.url,
        scores,
        aiEnabled: metadata.aiEnabled,
        cost: metadata.totalCost,
        duration: metadata.totalDuration,
      });

      this.logger.log(
        `[KPI-LLM] Analysis completed - Authority: ${scores.authority}, ` +
        `Freshness: ${scores.freshness}, Structure: ${scores.structure}, ` +
        `Snippet: ${scores.snippetExtractability}, Brand: ${scores.brandAlignment} ` +
        `(AI: ${metadata.aiEnabled}, Cost: $${metadata.totalCost.toFixed(4)}, Duration: ${metadata.totalDuration}ms)`
      );

      return {
        scores,
        details: {
          authority: authorityResult,
          freshness: freshnessResult,
          structure: structureResult,
          snippet: snippetResult,
          brand: brandResult,
        },
        issues: allIssues,
        metadata,
      };
    } catch (error) {
      this.logger.error(`[KPI-LLM] Analysis failed for ${page.url}:`, error);
      
      // Fallback to pure static analysis
      if (metadata.aiEnabled) {
        this.logger.warn('[KPI-LLM] Falling back to static analysis');
        return this.analyzeContent(page, project, { forceStatic: true });
      }
      
      throw error;
    }
  }

  private async analyzeAuthority(page: any, metadata: any): Promise<any> {
    const dimension = 'authority';
    
    if (metadata.aiEnabled) {
      try {
        this.logger.debug(`[KPI-LLM] Running AI analysis for ${dimension}`);
        const aiResult = await this.authorityAIAnalyzer.analyze(page.html, { url: page.url });
        
        metadata.modelsUsed[dimension] = aiResult.model;
        metadata.totalCost += aiResult.cost;
        
        if (this.hybridMode) {
          // Blend with static analysis
          const staticResult = this.authorityAnalyzer.analyze(page.html, page.url);
          const blendedScore = Math.round(
            aiResult.score * this.aiWeight + 
            staticResult.score * (1 - this.aiWeight)
          );
          
          metadata.hybrid = true;
          
          return {
            score: blendedScore,
            issues: [...aiResult.issues, ...staticResult.issues],
            aiScore: aiResult.score,
            staticScore: staticResult.score,
            ...aiResult.details,
          };
        }
        
        return {
          score: aiResult.score,
          issues: aiResult.issues,
          ...aiResult.details,
        };
      } catch (error) {
        this.logger.error(`[KPI-LLM] AI analysis failed for ${dimension}:`, error);
        // Fall through to static analysis
      }
    }
    
    // Static analysis fallback
    this.logger.debug(`[KPI-LLM] Running static analysis for ${dimension}`);
    return this.authorityAnalyzer.analyze(page.html, page.url);
  }

  private async analyzeFreshness(page: any, metadata: any): Promise<any> {
    // Freshness is straightforward date extraction - can use static analyzer
    // AI would be overkill for this dimension
    return this.freshnessAnalyzer.analyze(page.html, page.metadata);
  }

  private async analyzeStructure(page: any, metadata: any): Promise<any> {
    // For now, use static analyzer
    // TODO: Implement AI analyzer for structure
    return this.structureAnalyzer.analyze(page.html);
  }

  private async analyzeSnippet(page: any, metadata: any): Promise<any> {
    // For now, use static analyzer
    // TODO: Implement AI analyzer for snippet extractability
    return this.snippetAnalyzer.analyze(page.html);
  }

  private async analyzeBrand(page: any, project: any, metadata: any): Promise<any> {
    // For now, use static analyzer
    // TODO: Implement AI analyzer for brand alignment
    return this.brandAnalyzer.analyze(
      page.html,
      project.keyBrandAttributes || [],
      project.brandName
    );
  }

  private addIssuesToList(
    list: KPIAnalysisResult['issues'],
    dimension: string,
    issues: any[]
  ): void {
    if (!Array.isArray(issues)) return;
    
    for (const issue of issues) {
      list.push({
        dimension,
        severity: issue.severity || 'medium',
        description: issue.description || 'Unspecified issue',
        recommendation: issue.recommendation || 'Review content',
      });
    }
  }
}