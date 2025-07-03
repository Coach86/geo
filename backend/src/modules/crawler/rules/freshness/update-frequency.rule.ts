import { BaseRule } from '../base/base-rule';
import { RuleContext, RuleResult, RuleDimension, RuleApplicability, RuleExecutionScope } from '../interfaces/rule.interface';
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
  weight = 1.0; // 100% of freshness score (only freshness rule)
  
  applicability: RuleApplicability = {
    scope: 'all'
  };
  
  executionScope: RuleExecutionScope = 'page';
  
  async evaluate(context: RuleContext): Promise<RuleResult> {
    try {
      // Debug logging to see available metadata fields
      this.logger.debug(`Freshness rule for ${context.url} - Available metadata fields:`, {
        metadataKeys: context.metadata ? Object.keys(context.metadata) : [],
        updatedAt: context.metadata?.updatedAt,
        lastModifiedAt: context.metadata?.lastModifiedAt,
        createdAt: context.metadata?.createdAt,
        modifiedTime: context.metadata?.modifiedTime,
        publishedTime: context.metadata?.publishedTime
      });
      
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
        evidence.push(`Content updated today (${dateStr}) (target: ≤90 days for optimal score)`);
      } else if (daysSinceUpdate === 1) {
        evidence.push(`Content updated yesterday (${dateStr}) (target: ≤90 days for optimal score)`);
      } else if (daysSinceUpdate < 7) {
        evidence.push(`Content updated ${daysSinceUpdate} days ago (${dateStr}) (target: ≤90 days for optimal score)`);
      } else if (daysSinceUpdate < 30) {
        evidence.push(`Content updated ${Math.floor(daysSinceUpdate / 7)} weeks ago (${dateStr}) (target: ≤90 days for optimal score)`);
      } else if (daysSinceUpdate <= 90) {
        evidence.push(`Content updated ${Math.floor(daysSinceUpdate / 30)} months ago (${dateStr}) (target: ≤90 days for optimal score)`);
      } else if (daysSinceUpdate <= 180) {
        evidence.push(`Content updated ${daysSinceUpdate} days ago (${dateStr}) (target: ≤90 days for optimal score)`);
      } else if (daysSinceUpdate <= 365) {
        evidence.push(`Content updated ${daysSinceUpdate} days ago (${dateStr}) (target: ≤90 days for optimal score)`);
      } else {
        evidence.push(`Content updated ${Math.floor(daysSinceUpdate / 365)} years ago (${dateStr}) (target: ≤90 days for optimal score)`);
      }
      
      // Add source of date information
      if (context.pageSignals?.freshness?.publishDate || context.pageSignals?.freshness?.modifiedDate) {
        evidence.push(`Date retrieved from: ${context.pageSignals.freshness.modifiedDate ? 'modified date' : 'publish date'} meta tag`);
      } else if (context.metadata?.updatedAt) {
        evidence.push(`Date retrieved from: updatedAt metadata field`);
      } else if (context.metadata?.lastModifiedAt) {
        evidence.push(`Date retrieved from: lastModifiedAt metadata field`);
      } else if (context.metadata?.modifiedTime) {
        evidence.push(`Date retrieved from: modifiedTime metadata field`);
      } else if (context.metadata?.createdAt) {
        evidence.push(`Date retrieved from: createdAt metadata field`);
      } else if (context.metadata?.publishedTime) {
        evidence.push(`Date retrieved from: publishedTime metadata field`);
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
    
    // Check metadata for various date field names
    try {
      if (context.metadata?.updatedAt) {
        const dateValue = new Date(context.metadata.updatedAt);
        if (!isNaN(dateValue.getTime())) {
          lastUpdate = dateValue;
          this.logger.debug(`Found updatedAt date: ${context.metadata.updatedAt} -> ${lastUpdate.toISOString()}`);
        }
      } else if (context.metadata?.lastModifiedAt) {
        const dateValue = new Date(context.metadata.lastModifiedAt);
        if (!isNaN(dateValue.getTime())) {
          lastUpdate = dateValue;
          this.logger.debug(`Found lastModifiedAt date: ${context.metadata.lastModifiedAt} -> ${lastUpdate.toISOString()}`);
        }
      } else if (context.metadata?.modifiedTime) {
        const dateValue = new Date(context.metadata.modifiedTime);
        if (!isNaN(dateValue.getTime())) {
          lastUpdate = dateValue;
          this.logger.debug(`Found modifiedTime date: ${context.metadata.modifiedTime} -> ${lastUpdate.toISOString()}`);
        }
      } else if (context.metadata?.createdAt) {
        const dateValue = new Date(context.metadata.createdAt);
        if (!isNaN(dateValue.getTime())) {
          lastUpdate = dateValue;
          this.logger.debug(`Found createdAt date: ${context.metadata.createdAt} -> ${lastUpdate.toISOString()}`);
        }
      } else if (context.metadata?.publishedTime) {
        const dateValue = new Date(context.metadata.publishedTime);
        if (!isNaN(dateValue.getTime())) {
          lastUpdate = dateValue;
          this.logger.debug(`Found publishedTime date: ${context.metadata.publishedTime} -> ${lastUpdate.toISOString()}`);
        }
      }
    } catch (error) {
      this.logger.error('Error parsing date from metadata:', error);
    }
    
    // Set publish date if available
    if (context.metadata?.createdAt) {
      publishDate = new Date(context.metadata.createdAt);
    } else if (context.metadata?.publishedTime) {
      publishDate = new Date(context.metadata.publishedTime);
    }
    
    // Check page signals as fallback
    if (!lastUpdate && context.pageSignals?.freshness?.modifiedDate) {
      lastUpdate = new Date(context.pageSignals.freshness.modifiedDate);
    } else if (!lastUpdate && context.pageSignals?.freshness?.publishDate) {
      lastUpdate = new Date(context.pageSignals.freshness.publishDate);
    }
    
    // If still no date found, scan the entire page content for date patterns
    if (!lastUpdate) {
      lastUpdate = this.extractDatesFromContent(context.html, context.cleanContent);
    }
    
    return { publishDate, lastUpdate };
  }

  /**
   * Extract dates from page content using regex patterns
   */
  private extractDatesFromContent(html: string, cleanContent: string): Date | null {
    const content = html + ' ' + cleanContent;
    
    // Common date patterns to look for
    const datePatterns = [
      // ISO 8601 dates: 2025-07-02T11:02:11.000Z
      /"updatedAt":\s*"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)"/g,
      /"lastModifiedAt":\s*"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)"/g,
      /"modifiedAt":\s*"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)"/g,
      /"createdAt":\s*"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)"/g,
      /"publishedAt":\s*"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)"/g,
      // Date strings: "2025-07-02"
      /"updatedAt":\s*"(\d{4}-\d{2}-\d{2})"/g,
      /"lastModifiedAt":\s*"(\d{4}-\d{2}-\d{2})"/g,
      // Meta tag content
      /content="(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)"/g,
      /datetime="(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)"/g,
      // General ISO pattern
      /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)/g,
    ];
    
    const foundDates: Date[] = [];
    
    for (const pattern of datePatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const dateStr = match[1];
        const date = new Date(dateStr);
        if (!isNaN(date.getTime()) && date.getFullYear() > 2000 && date.getFullYear() <= new Date().getFullYear() + 1) {
          foundDates.push(date);
          this.logger.debug(`Found date in content: ${dateStr} -> ${date.toISOString()}`);
        }
      }
    }
    
    // Return the most recent date found
    if (foundDates.length > 0) {
      const mostRecentDate = foundDates.reduce((latest, current) => 
        current > latest ? current : latest
      );
      this.logger.debug(`Using most recent date from content: ${mostRecentDate.toISOString()}`);
      return mostRecentDate;
    }
    
    return null;
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