import { BaseRule } from '../base/base-rule';
import { RuleContext, RuleResult, RuleDimension, RuleApplicability } from '../interfaces/rule.interface';
import { AUTHORITY_CONSTANTS } from '../../config/scoring-constants';

/**
 * Rule that evaluates citation quality and count using LLM
 * This wraps the existing logic from HybridKPIAnalyzerService
 */
export class CitationQualityRule extends BaseRule {
  id = 'citation-quality';
  name = 'Citation Quality & References';
  dimension: RuleDimension = 'authority';
  description = 'Evaluates the quality and quantity of citations and references';
  priority = 90;
  weight = 0.3; // 30% of authority score
  
  applicability: RuleApplicability = {
    scope: 'category',
    categories: ['blog_article', 'documentation_help', 'about_company', 'case_study']
  };
  
  async evaluate(context: RuleContext): Promise<RuleResult> {
    try {
      // Extract citation information from the content
      // This would use the LLM to identify and evaluate citations
      const citationAnalysis = await this.analyzeCitations(context);
      
      // Calculate score based on citation count and quality
      // Using the existing logic from AUTHORITY_CONSTANTS
      const citationContribution = Math.min(
        citationAnalysis.count * AUTHORITY_CONSTANTS.CITATION_MULTIPLIER,
        AUTHORITY_CONSTANTS.CITATION_MAX_CONTRIBUTION
      );
      
      // Convert to 0-100 scale for this rule
      const score = (citationContribution / AUTHORITY_CONSTANTS.CITATION_MAX_CONTRIBUTION) * 100;
      
      const evidence: string[] = [];
      const details = {
        citationCount: citationAnalysis.count,
        highQualityCitations: citationAnalysis.highQuality,
        citationTypes: citationAnalysis.types
      };
      
      if (citationAnalysis.count > 0) {
        evidence.push(`Found ${citationAnalysis.count} citations/references`);
        if (citationAnalysis.highQuality.length > 0) {
          evidence.push(`High-quality sources: ${citationAnalysis.highQuality.slice(0, 3).join(', ')}`);
        }
      } else {
        evidence.push('No citations or references found');
      }
      
      // Generate issues based on citation analysis
      const issues = [];
      if (citationAnalysis.count === 0) {
        issues.push(this.createIssue(
          'medium',
          'No citations or references found',
          'Add credible sources and references to support claims and build authority'
        ));
      } else if (citationAnalysis.count < 2) {
        issues.push(this.createIssue(
          'low',
          'Limited citations found',
          'Consider adding more references to strengthen authority'
        ));
      }
      
      return this.createResult(score, 100, evidence, details, issues);
      
    } catch (error) {
      this.logger.error('Error evaluating citations:', error);
      return this.createResult(
        0,
        100,
        ['Failed to analyze citations'],
        { error: error.message },
        [this.createIssue('high', 'Citation analysis failed', 'Check content structure and retry')]
      );
    }
  }
  
  /**
   * Analyze citations using LLM
   * In practice, this would access the LLM results or run analysis
   */
  private async analyzeCitations(context: RuleContext): Promise<{
    count: number;
    highQuality: string[];
    types: string[];
  }> {
    // Check if we have LLM results in the context
    const llmResults = (context as any).llmResults;
    
    if (llmResults?.authority) {
      // Extract citation data from LLM results
      const citationCount = llmResults.authority.citationCount || 0;
      
      // For now, we'll use simple heuristics for quality and types
      // In a full implementation, this could be enhanced with more detailed LLM analysis
      const highQuality = [];
      const types = [];
      
      if (citationCount > 0) {
        // Extract any trusted citations mentioned in the response
        if (llmResults.authority.trustedCitations) {
          highQuality.push(...llmResults.authority.trustedCitations);
        }
        
        // Categorize types based on count
        if (citationCount >= 3) {
          types.push('research', 'academic');
        } else if (citationCount >= 1) {
          types.push('reference');
        }
      }
      
      return {
        count: citationCount,
        highQuality,
        types
      };
    }
    
    // If no LLM results available, return default
    this.logger.warn(`No LLM results available for citation analysis of ${context.url}`);
    return {
      count: 0,
      highQuality: [],
      types: []
    };
  }
}