import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { ScoringRulesService } from '../services/scoring-rules.service';
import { FreshnessCriteria } from '../interfaces/scoring-rules.interface';
import { ScoreIssue } from '../schemas/content-score.schema';
import { PageMetadata } from '../schemas/crawled-page.schema';

export interface FreshnessAnalysisResult {
  score: number;
  publishDate?: Date;
  modifiedDate?: Date;
  daysSinceUpdate?: number;
  hasDateSignals: boolean;
  issues: ScoreIssue[];
}

@Injectable()
export class FreshnessAnalyzer {
  private readonly logger = new Logger(FreshnessAnalyzer.name);

  constructor(private readonly scoringRulesService: ScoringRulesService) {}

  analyze(html: string, metadata: PageMetadata): FreshnessAnalysisResult {
    const $ = cheerio.load(html);
    const rules = this.scoringRulesService.getDimensionRules('freshness');
    const criteria = rules.criteria as FreshnessCriteria;

    // Use metadata dates if available, otherwise extract from HTML
    const publishDate = metadata.publishDate || this.extractDate($, 'publish');
    const modifiedDate = metadata.modifiedDate || this.extractDate($, 'modified');

    // Use the most recent date
    const mostRecentDate = this.getMostRecentDate(publishDate, modifiedDate);
    const hasDateSignals = !!(publishDate || modifiedDate);
    
    let daysSinceUpdate: number | undefined;
    let score = 20; // Base score for no date signals
    const issues: ScoreIssue[] = [];

    if (!hasDateSignals) {
      issues.push({
        dimension: 'freshness',
        severity: 'high',
        description: 'No date signals found (publish or modified date)',
        recommendation: 'Add datePublished and dateModified schema markup, or visible date stamps',
      });
    } else if (mostRecentDate) {
      // Calculate days since update
      const now = new Date();
      daysSinceUpdate = Math.floor((now.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24));

      // Calculate score based on days
      for (const range of criteria.dayRanges) {
        if (daysSinceUpdate <= range.maxDays) {
          score = range.score;
          break;
        }
      }

      // Add issues based on age
      if (daysSinceUpdate > 365) {
        issues.push({
          dimension: 'freshness',
          severity: 'high',
          description: `Content is ${daysSinceUpdate} days old (last updated ${mostRecentDate.toLocaleDateString()})`,
          recommendation: 'Update content to maintain freshness signals for search engines and AI systems',
        });
      } else if (daysSinceUpdate > 180) {
        issues.push({
          dimension: 'freshness',
          severity: 'medium',
          description: `Content is ${daysSinceUpdate} days old (last updated ${mostRecentDate.toLocaleDateString()})`,
          recommendation: 'Consider updating content to improve freshness signals',
        });
      } else if (daysSinceUpdate > 90) {
        issues.push({
          dimension: 'freshness',
          severity: 'low',
          description: `Content is ${daysSinceUpdate} days old (last updated ${mostRecentDate.toLocaleDateString()})`,
          recommendation: 'Content is relatively fresh but approaching the 90-day optimal window',
        });
      }

      // Check for missing dateModified if content is old
      if (!modifiedDate && publishDate && daysSinceUpdate > 90) {
        issues.push({
          dimension: 'freshness',
          severity: 'medium',
          description: 'No dateModified found for older content',
          recommendation: 'Add dateModified schema markup to signal content updates',
        });
      }
    }

    return {
      score,
      publishDate,
      modifiedDate,
      daysSinceUpdate,
      hasDateSignals,
      issues,
    };
  }

  private extractDate($: cheerio.CheerioAPI, type: 'publish' | 'modified'): Date | undefined {
    const selectors = type === 'publish' 
      ? [
          'meta[property="article:published_time"]',
          'meta[property="datePublished"]',
          'meta[name="publish_date"]',
          'meta[name="publication_date"]',
          'time[datetime]:not(.updated)',
          'time[pubdate]',
          '.publish-date',
          '.posted-on',
          '.entry-date:not(.updated)',
          '[itemprop="datePublished"]',
        ]
      : [
          'meta[property="article:modified_time"]',
          'meta[property="dateModified"]',
          'meta[name="last-modified"]',
          'meta[name="revision_date"]',
          'time[datetime].updated',
          'time.updated',
          '.last-updated',
          '.modified-date',
          '.updated',
          '[itemprop="dateModified"]',
        ];

    // Try meta tags first
    for (const selector of selectors.slice(0, 4)) {
      const element = $(selector).first();
      if (element.length) {
        const dateStr = element.attr('content');
        if (dateStr) {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
    }

    // Try other selectors
    for (const selector of selectors.slice(4)) {
      const element = $(selector).first();
      if (element.length) {
        const dateStr = element.attr('datetime') || element.text().trim();
        if (dateStr) {
          const date = this.parseDate(dateStr);
          if (date) return date;
        }
      }
    }

    // Check JSON-LD
    const jsonLdDate = this.extractDateFromJsonLd($, type);
    if (jsonLdDate) return jsonLdDate;

    return undefined;
  }

  private extractDateFromJsonLd($: cheerio.CheerioAPI, type: 'publish' | 'modified'): Date | undefined {
    let foundDate: Date | undefined;

    $('script[type="application/ld+json"]').each((_, element) => {
      if (foundDate) return; // Already found

      try {
        const json = JSON.parse($(element).html() || '{}');
        const dateField = type === 'publish' ? 'datePublished' : 'dateModified';
        
        if (json[dateField]) {
          const date = new Date(json[dateField]);
          if (!isNaN(date.getTime())) {
            foundDate = date;
          }
        }

        // Check nested article
        if (json['@type'] === 'Article' || json['@type'] === 'BlogPosting') {
          if (json[dateField]) {
            const date = new Date(json[dateField]);
            if (!isNaN(date.getTime())) {
              foundDate = date;
            }
          }
        }
      } catch (error) {
        // Ignore parse errors
      }
    });

    return foundDate;
  }

  private parseDate(dateStr: string): Date | undefined {
    // Try standard date parsing
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }

    // Try common date formats
    const patterns = [
      /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
      /(\d{2})\/(\d{2})\/(\d{4})/, // MM/DD/YYYY
      /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
      /(\w+)\s+(\d{1,2}),\s+(\d{4})/, // Month DD, YYYY
      /(\d{1,2})\s+(\w+)\s+(\d{4})/, // DD Month YYYY
    ];

    for (const pattern of patterns) {
      const match = dateStr.match(pattern);
      if (match) {
        const parsed = new Date(match[0]);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }

    return undefined;
  }

  private getMostRecentDate(date1?: Date, date2?: Date): Date | undefined {
    if (!date1) return date2;
    if (!date2) return date1;
    return date1 > date2 ? date1 : date2;
  }
}