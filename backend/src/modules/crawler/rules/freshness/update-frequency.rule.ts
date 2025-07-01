import { BaseRule } from '../base/base-rule';
import { RuleContext, RuleResult, RuleDimension, RuleApplicability } from '../interfaces/rule.interface';
import { FRESHNESS_CONSTANTS } from '../../config/scoring-constants';

/**
 * Rule that evaluates content update frequency
 * Different page types have different freshness expectations
 */
export class UpdateFrequencyRule extends BaseRule {
  id = 'update-frequency';
  name = 'Content Update Frequency';
  dimension: RuleDimension = 'freshness';
  description = 'Evaluates how recently content was updated based on page type';
  priority = 90;
  weight = 0.4; // 40% of freshness score
  
  applicability: RuleApplicability = {
    scope: 'all'
  };
  
  async evaluate(context: RuleContext): Promise<RuleResult> {
    try {
      // Get date information from page signals
      const dateInfo = this.extractDates(context);
      
      if (!dateInfo.lastUpdate) {
        // No date information available
        return this.createResult(
          50, // Middle score when no date info
          100,
          ['No update date information available'],
          { reason: 'Cannot determine update frequency without date information' },
          [this.createIssue('low', 'Missing update date', 'Add last modified date to content')]
        );
      }
      
      // Calculate days since last update
      const daysSinceUpdate = this.calculateDaysSince(dateInfo.lastUpdate);
      
      // Get expected update frequency based on page type
      const expectedFrequency = this.getExpectedFrequency(context.pageCategory.type);
      
      // Calculate score based on how well the page meets freshness expectations
      const score = this.calculateFreshnessScore(daysSinceUpdate, expectedFrequency);
      
      const evidence: string[] = [];
      const details = {
        daysSinceUpdate,
        lastUpdate: dateInfo.lastUpdate,
        expectedFrequency: expectedFrequency.label,
        pageType: context.pageCategory.type
      };
      
      // Generate evidence
      if (daysSinceUpdate === 0) {
        evidence.push('Content updated today');
      } else if (daysSinceUpdate === 1) {
        evidence.push('Content updated yesterday');
      } else if (daysSinceUpdate < 7) {
        evidence.push(`Content updated ${daysSinceUpdate} days ago`);
      } else if (daysSinceUpdate < 30) {
        evidence.push(`Content updated ${Math.floor(daysSinceUpdate / 7)} weeks ago`);
      } else if (daysSinceUpdate < 365) {
        evidence.push(`Content updated ${Math.floor(daysSinceUpdate / 30)} months ago`);
      } else {
        evidence.push(`Content updated ${Math.floor(daysSinceUpdate / 365)} years ago`);
      }
      
      evidence.push(`Expected update frequency: ${expectedFrequency.label}`);
      
      // Generate issues based on freshness
      const issues = [];
      if (daysSinceUpdate > expectedFrequency.warningDays) {
        const severity = daysSinceUpdate > expectedFrequency.criticalDays ? 'high' : 'medium';
        issues.push(this.createIssue(
          severity,
          `Content is ${daysSinceUpdate} days old`,
          `${context.pageCategory.type} content should be updated ${expectedFrequency.label}`
        ));
      }
      
      return this.createResult(score, 100, evidence, details, issues);
      
    } catch (error) {
      this.logger.error('Error evaluating update frequency:', error);
      return this.createResult(
        50,
        100,
        ['Failed to analyze update frequency'],
        { error: error.message },
        [this.createIssue('medium', 'Update frequency analysis failed', 'Check date information')]
      );
    }
  }
  
  /**
   * Extract date information from context
   */
  private extractDates(context: RuleContext): {
    publishDate: Date | null;
    lastUpdate: Date | null;
  } {
    // Try to get dates from various sources
    let publishDate: Date | null = null;
    let lastUpdate: Date | null = null;
    
    // Check metadata
    if (context.metadata?.modifiedTime) {
      lastUpdate = new Date(context.metadata.modifiedTime);
    } else if (context.metadata?.publishedTime) {
      lastUpdate = new Date(context.metadata.publishedTime);
    }
    
    // Check page signals
    if (!lastUpdate && context.pageSignals?.freshness?.modifiedDate) {
      lastUpdate = new Date(context.pageSignals.freshness.modifiedDate);
    } else if (!lastUpdate && context.pageSignals?.freshness?.publishDate) {
      lastUpdate = new Date(context.pageSignals.freshness.publishDate);
    }
    
    return { publishDate, lastUpdate };
  }
  
  /**
   * Calculate days since a given date
   */
  private calculateDaysSince(date: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }
  
  /**
   * Get expected update frequency based on page type
   */
  private getExpectedFrequency(pageType: string): {
    label: string;
    idealDays: number;
    warningDays: number;
    criticalDays: number;
  } {
    // Define freshness expectations by page type
    const frequencies: Record<string, any> = {
      homepage: {
        label: 'weekly',
        idealDays: 7,
        warningDays: 30,
        criticalDays: 90
      },
      blog_article: {
        label: 'monthly',
        idealDays: 30,
        warningDays: 180,
        criticalDays: 365
      },
      documentation_help: {
        label: 'quarterly',
        idealDays: 90,
        warningDays: 180,
        criticalDays: 365
      },
      product_page: {
        label: 'monthly',
        idealDays: 30,
        warningDays: 90,
        criticalDays: 180
      },
      pricing_page: {
        label: 'monthly',
        idealDays: 30,
        warningDays: 60,
        criticalDays: 90
      },
      about_company: {
        label: 'quarterly',
        idealDays: 90,
        warningDays: 365,
        criticalDays: 730
      },
      case_study: {
        label: 'yearly',
        idealDays: 365,
        warningDays: 730,
        criticalDays: 1095
      },
      faq: {
        label: 'quarterly',
        idealDays: 90,
        warningDays: 180,
        criticalDays: 365
      },
      news_article: {
        label: 'daily',
        idealDays: 1,
        warningDays: 7,
        criticalDays: 30
      },
      landing_page: {
        label: 'monthly',
        idealDays: 30,
        warningDays: 90,
        criticalDays: 180
      },
      legal_page: {
        label: 'yearly',
        idealDays: 365,
        warningDays: 730,
        criticalDays: 1095
      },
      contact_page: {
        label: 'quarterly',
        idealDays: 90,
        warningDays: 365,
        criticalDays: 730
      }
    };
    
    return frequencies[pageType] || {
      label: 'quarterly',
      idealDays: 90,
      warningDays: 180,
      criticalDays: 365
    };
  }
  
  /**
   * Calculate freshness score based on days since update and expected frequency
   */
  private calculateFreshnessScore(daysSinceUpdate: number, frequency: any): number {
    if (daysSinceUpdate <= frequency.idealDays) {
      // Content is fresh
      return 100;
    } else if (daysSinceUpdate <= frequency.warningDays) {
      // Content is acceptable but aging
      // Linear decay from 100 to 50
      const ratio = (daysSinceUpdate - frequency.idealDays) / (frequency.warningDays - frequency.idealDays);
      return Math.round(100 - (ratio * 50));
    } else if (daysSinceUpdate <= frequency.criticalDays) {
      // Content is stale
      // Linear decay from 50 to 20
      const ratio = (daysSinceUpdate - frequency.warningDays) / (frequency.criticalDays - frequency.warningDays);
      return Math.round(50 - (ratio * 30));
    } else {
      // Content is very stale
      return 20;
    }
  }
}