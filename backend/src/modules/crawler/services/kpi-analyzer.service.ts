import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../../llm/services/llm.service';
import { LlmProvider } from '../../llm/interfaces/llm-provider.enum';
import { PageSignalExtractorService } from './page-signal-extractor.service';
import { RuleBasedAuthorityAnalyzer } from '../analyzers/rule-based-authority.analyzer';
import { RuleBasedFreshnessAnalyzer } from '../analyzers/rule-based-freshness.analyzer';
import { RuleBasedStructureAnalyzer } from '../analyzers/rule-based-structure.analyzer';
import { RuleBasedBrandAnalyzer } from '../analyzers/rule-based-brand.analyzer';
import { PageCategorizerService } from './page-categorizer.service';
import { PageCategoryType, AnalysisLevel } from '../interfaces/page-category.interface';
import { HYBRID_CONSTANTS, BRAND_CONSTANTS } from '../config/scoring-constants';

interface AnalysisContext {
  brandName: string;
  keyBrandAttributes: string[];
  competitors: string[];
}

interface HybridAnalysisResult {
  scores: {
    authority: number;
    freshness: number;
    structure: number;
    brandAlignment: number;
  };
  details: {
    authority: any;
    freshness: any;
    structure: any;
    brand: any;
  };
  issues: any[];
  explanation: string;
  calculationDetails: {
    authority: any;
    freshness: any;
    structure: any;
    brandAlignment: any;
  };
  pageCategory?: any;
}

/**
 * Hybrid KPI Analyzer that uses rule-based analyzers throughout
 * Clean implementation without backward compatibility
 */
@Injectable()
export class KPIAnalyzerService {
  private readonly logger = new Logger(KPIAnalyzerService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly pageSignalExtractor: PageSignalExtractorService,
    private readonly authorityAnalyzer: RuleBasedAuthorityAnalyzer,
    private readonly freshnessAnalyzer: RuleBasedFreshnessAnalyzer,
    private readonly structureAnalyzer: RuleBasedStructureAnalyzer,
    private readonly brandAnalyzer: RuleBasedBrandAnalyzer,
    private readonly pageCategorizerService: PageCategorizerService,
  ) {}

  /**
   * Main analysis method using rule-based analyzers
   */
  async analyze(
    html: string,
    metadata: any,
    context: AnalysisContext,
    url?: string
  ): Promise<HybridAnalysisResult> {
    try {
      // Step 1: Categorize the page
      const pageCategory = url ? 
        await this.pageCategorizerService.categorize(url, html, metadata) : 
        { 
          type: PageCategoryType.UNKNOWN, 
          confidence: 0, 
          analysisLevel: AnalysisLevel.FULL, 
          reason: 'No URL provided' 
        };
      
      this.logger.log(`Page categorized as ${pageCategory.type} with confidence ${pageCategory.confidence}`);

      // Step 2: Extract page signals
      const pageSignals = this.pageSignalExtractor.extract(html, metadata, context);
      const cleanContent = this.pageSignalExtractor.getCleanContent(html);

      // Step 3: Run all analyzers in parallel for better performance
      const [
        authorityResult,
        freshnessResult,
        structureResult,
        brandResult
      ] = await Promise.all([
        // Authority uses LLM internally via rules
        this.authorityAnalyzer.analyze(html, metadata, context, url),
        // Freshness is rule-based
        this.freshnessAnalyzer.analyze(html, metadata, url, context),
        // Structure is now rule-based
        this.structureAnalyzer.analyze(
          pageSignals,
          pageCategory,
          this.extractDomain(url || ''),
          url || '',
          html,
          cleanContent,
          metadata,
          context
        ),
        // Brand is now rule-based
        this.brandAnalyzer.analyze(
          pageSignals,
          pageCategory,
          this.extractDomain(url || ''),
          url || '',
          html,
          cleanContent,
          metadata,
          context
        )
      ]);

      // Step 4: Combine all results
      const result: HybridAnalysisResult = {
        scores: {
          authority: authorityResult.score,
          freshness: freshnessResult.score,
          structure: structureResult.score,
          brandAlignment: brandResult.score
        },
        details: {
          authority: authorityResult.details,
          freshness: {
            daysSinceUpdate: freshnessResult.daysSinceUpdate ?? null,
            hasDateSignals: freshnessResult.hasDateSignals,
            publishDate: freshnessResult.publishDate?.toISOString() ?? null,
            modifiedDate: freshnessResult.modifiedDate?.toISOString() ?? null,
          },
          structure: {
            h1Count: structureResult.details.h1Count,
            avgSentenceWords: structureResult.details.avgSentenceWords,
            hasSchema: structureResult.details.schemaTypes.length > 0,
            headingHierarchyScore: structureResult.details.headingHierarchyScore,
          },
          brand: {
            brandMentions: brandResult.details.brandKeywordMatches,
            alignmentIssues: brandResult.issues.map(i => i.description),
            consistencyScore: brandResult.details.brandConsistency,
            missingKeywords: []  // Calculate from requiredTermsFound vs keyBrandAttributes
          }
        },
        issues: [
          ...(authorityResult.issues || []),
          ...(freshnessResult.issues || []),
          ...(structureResult.issues || []),
          ...(brandResult.issues || [])
        ],
        explanation: this.generateExplanation(
          authorityResult,
          freshnessResult,
          structureResult,
          brandResult
        ),
        calculationDetails: {
          authority: authorityResult.calculationDetails,
          freshness: freshnessResult.calculationDetails,
          structure: structureResult.calculationDetails,
          brandAlignment: brandResult.calculationDetails
        }
      };

      // Add page category if available
      if (pageCategory) {
        result.pageCategory = pageCategory;
      }

      this.logger.log(`Analysis complete for ${url}`);
      this.logger.debug('Final scores:', result.scores);

      return result;

    } catch (error) {
      this.logger.error('Error in hybrid KPI analysis:', error);
      throw new Error(`Hybrid KPI analysis failed: ${error.message}`);
    }
  }

  /**
   * Generate overall explanation from individual analyzer results
   */
  private generateExplanation(...results: any[]): string {
    const explanations: string[] = [];
    
    results.forEach(result => {
      if (result.explanation) {
        explanations.push(result.explanation);
      }
    });

    return explanations.join(' ') || 'Analysis complete.';
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return 'unknown';
    }
  }
}