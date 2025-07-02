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
        // No date information available - score 0 (complete failure)
        return this.createResult(
          0, // 0: No date signals means complete failure
          100,
          ['No update date information available'],
          { reason: 'Cannot determine update frequency without date information' },
          [this.createIssue('critical', 'Missing update date', 'Add last modified date to content for freshness signals')]
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
        scoreThreshold: this.getScoreThreshold(daysSinceUpdate)
      };
      
      // Format the date nicely
      const dateStr = dateInfo.lastUpdate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      // Generate evidence with threshold information and actual date
      if (daysSinceUpdate === 0) {
        evidence.push(`Content updated today (${dateStr}) - ≤90 days threshold`);
      } else if (daysSinceUpdate === 1) {
        evidence.push(`Content updated yesterday (${dateStr}) - ≤90 days threshold`);
      } else if (daysSinceUpdate < 7) {
        evidence.push(`Content updated ${daysSinceUpdate} days ago (${dateStr}) - ≤90 days threshold`);
      } else if (daysSinceUpdate < 30) {
        evidence.push(`Content updated ${Math.floor(daysSinceUpdate / 7)} weeks ago (${dateStr}) - ≤90 days threshold`);
      } else if (daysSinceUpdate <= 90) {
        evidence.push(`Content updated ${Math.floor(daysSinceUpdate / 30)} months ago (${dateStr}) - ≤90 days threshold`);
      } else if (daysSinceUpdate <= 180) {
        evidence.push(`Content updated ${daysSinceUpdate} days ago (${dateStr}) - 91-180 days threshold`);
      } else if (daysSinceUpdate <= 365) {
        evidence.push(`Content updated ${daysSinceUpdate} days ago (${dateStr}) - 181-365 days threshold`);
      } else {
        evidence.push(`Content updated ${Math.floor(daysSinceUpdate / 365)} years ago (${dateStr}) - >365 days threshold`);
      }
      
      // Add source of date information
      if (context.pageSignals?.freshness?.publishDate || context.pageSignals?.freshness?.modifiedDate) {
        evidence.push(`Date retrieved from: ${context.pageSignals.freshness.modifiedDate ? 'modified date' : 'publish date'} meta tag`);
      } else if (context.metadata?.modifiedTime || context.metadata?.publishedTime) {
        evidence.push(`Date retrieved from: ${context.metadata.modifiedTime ? 'modified time' : 'published time'} metadata`);
      }
      
      // Generate issues based on fixed thresholds
      const issues = [];
      if (daysSinceUpdate > 365) {
        issues.push(this.createIssue(
          'high',
          `Content is ${daysSinceUpdate} days old (>365 days)`,
          'Content should be updated within 365 days for better freshness score'
        ));
      } else if (daysSinceUpdate > 180) {
        issues.push(this.createIssue(
          'medium',
          `Content is ${daysSinceUpdate} days old (181-365 days)`,
          'Content should be updated within 180 days for better freshness score'
        ));
      } else if (daysSinceUpdate > 90) {
        issues.push(this.createIssue(
          'low',
          `Content is ${daysSinceUpdate} days old (91-180 days)`,
          'Content should be updated within 90 days for optimal freshness score'
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
   * Get expected update frequency based on fixed thresholds from plan
   * FRESHNESS (0-100):
   * - 20: No date signals
   * - 40: >365 days old
   * - 60: 181-365 days old  
   * - 80: 91-180 days old
   * - 100: ≤90 days old
   */
  private getExpectedFrequency(pageType: string): {
    label: string;
    idealDays: number;
    warningDays: number;
    criticalDays: number;
  } {
    // Use fixed thresholds from the plan regardless of page type
    return {
      label: 'standard',
      idealDays: 90,      // 100 score: ≤90 days
      warningDays: 180,   // 80 score: 91-180 days
      criticalDays: 365   // 60 score: 181-365 days, 40 score: >365 days
    };
  }
  
  /**
   * Calculate freshness score based on fixed thresholds from plan
   * FRESHNESS (0-100):
   * - 100: ≤90 days old
   * - 80: 91-180 days old
   * - 60: 181-365 days old  
   * - 40: >365 days old
   * - 20: No date signals (handled elsewhere)
   */
  private calculateFreshnessScore(daysSinceUpdate: number, frequency: any): number {
    if (daysSinceUpdate <= 90) {
      // ≤90 days old
      return 100;
    } else if (daysSinceUpdate <= 180) {
      // 91-180 days old
      return 80;
    } else if (daysSinceUpdate <= 365) {
      // 181-365 days old
      return 60;
    } else {
      // >365 days old
      return 40;
    }
  }
  
  /**
   * Get the score threshold description for a given days since update
   */
  private getScoreThreshold(daysSinceUpdate: number): string {
    if (daysSinceUpdate <= 90) {
      return '≤90 days (score: 100)';
    } else if (daysSinceUpdate <= 180) {
      return '91-180 days (score: 80)';
    } else if (daysSinceUpdate <= 365) {
      return '181-365 days (score: 60)';
    } else {
      return '>365 days (score: 40)';
    }
  }
}