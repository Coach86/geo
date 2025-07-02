import { Injectable } from '@nestjs/common';
import { ScoreIssue } from '../schemas/content-score.schema';

export type KPIDimension = 'authority' | 'freshness' | 'structure' | 'brandAlignment';

export interface IssueThresholds {
  critical: number; // 0-34: Critical issues
  high: number;     // 35-59: High priority issues  
  medium: number;   // 60-79: Medium priority issues
  // 80-100: No issues (well optimized)
}

@Injectable()
export class IssueFactoryService {
  private readonly DEFAULT_THRESHOLDS: IssueThresholds = {
    critical: 35,
    high: 60, 
    medium: 80,
  };

  /**
   * Generate issues based on dimension scores
   * This ensures every low score produces actionable issues
   */
  generateIssuesFromScore(
    dimension: KPIDimension,
    score: number,
    details?: string
  ): ScoreIssue[] {
    const bucket = this.getSeverityBucket(score);
    if (!bucket) return []; // Score 80+ = no issues

    const description = details || this.getDefaultDescription(dimension, score, bucket);
    const recommendation = this.getDefaultRecommendation(dimension, bucket);

    return [{
      dimension,
      severity: bucket,
      description,
      recommendation,
    }];
  }

  /**
   * Determine severity based on score
   */
  private getSeverityBucket(score: number): 'critical' | 'high' | 'medium' | null {
    const t = this.DEFAULT_THRESHOLDS;
    
    if (score < t.critical) return 'critical';
    if (score < t.high) return 'high'; 
    if (score < t.medium) return 'medium';
    return null; // 80+ = well optimized
  }

  /**
   * Generate default issue descriptions based on dimension and score
   */
  private getDefaultDescription(dimension: KPIDimension, score: number, severity: string): string {
    const scoreDesc = `(score: ${score})`;
    
    switch (dimension) {
      case 'authority':
        if (severity === 'critical') return `Page lacks authority signals ${scoreDesc}. No author information, citations, or domain credibility found.`;
        if (severity === 'high') return `Page has limited authority ${scoreDesc}. Missing author credentials or credible citations.`;
        return `Page has moderate authority concerns ${scoreDesc}. Some authority signals present but could be stronger.`;

      case 'freshness':
        if (severity === 'critical') return `Content appears very outdated ${scoreDesc}. No publication or modification dates found.`;
        if (severity === 'high') return `Content may be outdated ${scoreDesc}. Last update over 1 year ago or unclear dating.`;
        return `Content freshness could be improved ${scoreDesc}. Consider adding recent update information.`;

      case 'structure':
        if (severity === 'critical') return `Page structure is poorly organized ${scoreDesc}. Missing proper headings, schema, or logical hierarchy.`;
        if (severity === 'high') return `Page structure needs improvement ${scoreDesc}. Heading hierarchy or schema markup issues detected.`;
        return `Page structure has minor issues ${scoreDesc}. Some organizational improvements possible.`;

      case 'brandAlignment':
        if (severity === 'critical') return `Content is off-brand ${scoreDesc}. Significant misalignment with brand guidelines detected.`;
        if (severity === 'high') return `Content has brand alignment issues ${scoreDesc}. Some messaging inconsistencies found.`;
        return `Content has minor brand alignment concerns ${scoreDesc}. Small adjustments needed for consistency.`;

      default:
        return `${dimension} needs improvement ${scoreDesc}.`;
    }
  }

  /**
   * Generate actionable recommendations based on dimension and severity
   */
  private getDefaultRecommendation(dimension: KPIDimension, severity: string): string {
    switch (dimension) {
      case 'authority':
        if (severity === 'critical') return 'Add clear author bylines, include expert credentials, and cite authoritative sources.';
        if (severity === 'high') return 'Strengthen author information and add more credible citations or expert quotes.';
        return 'Consider adding author bio section and linking to authoritative external sources.';

      case 'freshness':
        if (severity === 'critical') return 'Add clear publication and last-modified dates. Update content with recent information.';
        if (severity === 'high') return 'Update content with recent data and add "last updated" timestamp.';
        return 'Add publication date and consider periodic content reviews for freshness.';

      case 'structure':
        if (severity === 'critical') return 'Implement proper H1-H6 hierarchy and add structured data markup (JSON-LD).';
        if (severity === 'high') return 'Fix heading hierarchy issues and add relevant schema.org markup.';
        return 'Review heading structure and consider adding structured data for better organization.';

      case 'brandAlignment':
        if (severity === 'critical') return 'Review content against brand guidelines and update messaging to match brand voice.';
        if (severity === 'high') return 'Align terminology and tone with brand standards and update outdated references.';
        return 'Review content for brand consistency and update any misaligned terminology.';

      default:
        return `Improve ${dimension} according to best practices.`;
    }
  }
}