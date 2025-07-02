import { BaseRule } from '../base/base-rule';
import { RuleContext, RuleResult, RuleDimension, RuleApplicability, RuleExecutionScope } from '../interfaces/rule.interface';
import { LlmProvider } from '../../../llm/interfaces/llm-provider.enum';
import { AUTHORITY_CONSTANTS } from '../../config/scoring-constants';

/**
 * Rule that evaluates author presence and credentials using LLM
 * This wraps the existing logic from KPIAnalyzerService
 */
export class AuthorPresenceRule extends BaseRule {
  id = 'author-presence';
  name = 'Author Presence & Credentials';
  dimension: RuleDimension = 'authority';
  description = 'Evaluates if content has clear author attribution and credentials';
  priority = 100;
  weight = 0.4; // 40% of authority score (combines author presence + credentials)
  
  applicability: RuleApplicability = {
    scope: 'all' // Applies to all pages
  };
  
  executionScope: RuleExecutionScope = 'page';
  
  async evaluate(context: RuleContext): Promise<RuleResult> {
    try {
      // Extract author information from the LLM-analyzed content
      // Note: This assumes the KPIAnalyzer has already run and we have the results
      // In the actual implementation, we'll need to either:
      // 1. Run the LLM analysis here, or
      // 2. Access the cached/stored LLM results
      
      // For now, we'll implement the logic that would analyze author presence
      const authorAnalysis = await this.analyzeAuthorPresence(context);
      
      // Calculate score based on author presence and credentials
      let score = 0;
      const evidence: string[] = [];
      const details: any = {
        hasAuthor: authorAnalysis.hasAuthor,
        authorName: authorAnalysis.authorName,
        hasCredentials: authorAnalysis.hasCredentials
      };
      
      // Base score for having an author (50% of this rule's weight)
      if (authorAnalysis.hasAuthor) {
        score += 50;
        evidence.push(`Author found: ${authorAnalysis.authorName || 'Name detected but not extracted'}`);
      } else {
        evidence.push('No author information found');
      }
      
      // Additional score for credentials (50% of this rule's weight)
      if (authorAnalysis.hasAuthor && authorAnalysis.hasCredentials) {
        score += 50;
        evidence.push('Author has professional credentials or expertise indicators');
      } else if (authorAnalysis.hasAuthor) {
        evidence.push('No author credentials found');
      }
      
      // Generate issues if needed
      const issues = [];
      if (!authorAnalysis.hasAuthor) {
        issues.push(this.createIssue(
          'medium',
          'No author attribution found',
          'Add clear author information to build trust and authority'
        ));
      } else if (!authorAnalysis.hasCredentials) {
        issues.push(this.createIssue(
          'low',
          'Author credentials not displayed',
          'Include author expertise, credentials, or bio to enhance authority'
        ));
      }
      
      return this.createResult(score, 100, evidence, details, issues);
      
    } catch (error) {
      this.logger.error('Error evaluating author presence:', error);
      return this.createResult(
        0,
        100,
        ['Failed to analyze author information'],
        { error: error.message },
        [this.createIssue('high', 'Author analysis failed', 'Check content structure and retry')]
      );
    }
  }
  
  /**
   * Analyze author presence using existing LLM logic
   * In practice, this would either call the LLM or access cached results
   */
  private async analyzeAuthorPresence(context: RuleContext): Promise<{
    hasAuthor: boolean;
    authorName: string | null;
    hasCredentials: boolean;
  }> {
    // Check if we have LLM results in the context
    const llmResults = (context as any).llmResults;
    
    if (llmResults?.authority) {
      return {
        hasAuthor: llmResults.authority.hasAuthor,
        authorName: llmResults.authority.authorName,
        hasCredentials: llmResults.authority.authorCredentials
      };
    }
    
    // Fall back to pageSignals if no LLM results
    const { pageSignals } = context;
    if (pageSignals?.content) {
      return {
        hasAuthor: pageSignals.content.hasAuthor,
        authorName: pageSignals.content.authorName || null,
        hasCredentials: pageSignals.content.hasAuthorBio
      };
    }
    
    // If neither available, return default
    return {
      hasAuthor: false,
      authorName: null,
      hasCredentials: false
    };
  }
}