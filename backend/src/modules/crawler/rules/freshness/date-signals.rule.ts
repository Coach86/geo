import { BaseRule } from '../base/base-rule';
import { RuleContext, RuleResult, RuleDimension, RuleApplicability } from '../interfaces/rule.interface';
import { FRESHNESS_CONSTANTS } from '../../config/scoring-constants';

/**
 * Rule that evaluates date signals presence and validity
 * This wraps the existing logic from FreshnessAnalyzer
 */
export class DateSignalsRule extends BaseRule {
  id = 'date-signals';
  name = 'Date Signals Presence';
  dimension: RuleDimension = 'freshness';
  description = 'Evaluates if content has clear date signals';
  priority = 100;
  weight = 0.3; // 30% of freshness score
  
  applicability: RuleApplicability = {
    scope: 'all' // Applies to all pages
  };
  
  async evaluate(context: RuleContext): Promise<RuleResult> {
    try {
      const pageSignals = context.pageSignals;
      const metadata = context.metadata;
      
      // Extract date information from page signals and metadata
      const dateInfo = this.extractDateSignals(pageSignals, metadata, context.html);
      
      let score = 0;
      const evidence: string[] = [];
      const details = {
        hasDateSignals: dateInfo.hasDateSignals,
        publishDate: dateInfo.publishDate,
        modifiedDate: dateInfo.modifiedDate,
        dateSource: dateInfo.source
      };
      
      if (dateInfo.hasDateSignals) {
        score = 100; // Full score if date signals are present
        evidence.push(`Date signals found via ${dateInfo.source}`);
        
        if (dateInfo.publishDate) {
          evidence.push(`Published: ${new Date(dateInfo.publishDate).toLocaleDateString()}`);
        }
        if (dateInfo.modifiedDate && dateInfo.modifiedDate !== dateInfo.publishDate) {
          evidence.push(`Last modified: ${new Date(dateInfo.modifiedDate).toLocaleDateString()}`);
        }
        
        // Add additional date signal information
        if (pageSignals?.freshness) {
          if (pageSignals.freshness.hasDateInUrl) {
            evidence.push('Date found in URL');
          }
          if (pageSignals.freshness.hasDateInTitle) {
            evidence.push('Date found in page title');
          }
          if (pageSignals.freshness.updateIndicators?.length > 0) {
            evidence.push(`Update indicators found: ${pageSignals.freshness.updateIndicators.join(', ')}`);
          }
        }
      } else {
        score = 0;
        evidence.push('No date signals found in content or metadata');
        evidence.push('Searched in: metadata, structured data, content, URL, and title');
      }
      
      // Generate issues
      const issues = [];
      if (!dateInfo.hasDateSignals) {
        issues.push(this.createIssue(
          'medium',
          'No date information found',
          'Add publish date and last modified date to improve content freshness signals'
        ));
      }
      
      return this.createResult(score, 100, evidence, details, issues);
      
    } catch (error) {
      this.logger.error('Error evaluating date signals:', error);
      return this.createResult(
        0,
        100,
        ['Failed to analyze date signals'],
        { error: error.message },
        [this.createIssue('high', 'Date signal analysis failed', 'Check content structure and retry')]
      );
    }
  }
  
  /**
   * Extract date signals from various sources
   * Based on FreshnessAnalyzer logic
   */
  private extractDateSignals(pageSignals: any, metadata: any, html: string): {
    hasDateSignals: boolean;
    publishDate: string | null;
    modifiedDate: string | null;
    source: string;
  } {
    let publishDate: string | null = null;
    let modifiedDate: string | null = null;
    let source = 'none';
    
    // 1. Check metadata first (most reliable)
    if (metadata) {
      if (metadata.publishedTime) {
        publishDate = metadata.publishedTime;
        source = 'metadata';
      }
      if (metadata.modifiedTime) {
        modifiedDate = metadata.modifiedTime;
        source = 'metadata';
      }
    }
    
    // 2. Check page signals for freshness data
    if (!publishDate && pageSignals?.freshness) {
      if (pageSignals.freshness.publishDate) {
        publishDate = pageSignals.freshness.publishDate;
        source = 'page signals';
      }
      if (pageSignals.freshness.modifiedDate) {
        modifiedDate = pageSignals.freshness.modifiedDate;
        source = 'page signals';
      }
    }
    
    // 3. Check for date patterns in content
    if (!publishDate && pageSignals?.content?.dates?.length > 0) {
      publishDate = pageSignals.content.dates[0];
      source = 'content extraction';
    }
    
    // 4. Last resort: check HTML for common date patterns
    if (!publishDate) {
      const datePatterns = [
        /<time[^>]*datetime=['"]([^'"]+)['"]/i,
        /published[:\s]+([0-9]{4}-[0-9]{2}-[0-9]{2})/i,
        /date[:\s]+([0-9]{4}-[0-9]{2}-[0-9]{2})/i
      ];
      
      for (const pattern of datePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          publishDate = match[1];
          source = 'HTML pattern';
          break;
        }
      }
    }
    
    return {
      hasDateSignals: !!(publishDate || modifiedDate),
      publishDate,
      modifiedDate: modifiedDate || publishDate, // Use publish date as modified if not specified
      source
    };
  }
}