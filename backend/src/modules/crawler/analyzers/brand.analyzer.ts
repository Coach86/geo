import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { ScoringRulesService } from '../services/scoring-rules.service';
import { BrandCriteria } from '../interfaces/scoring-rules.interface';
import { ScoreIssue } from '../schemas/content-score.schema';

export interface BrandAnalysisResult {
  score: number;
  brandKeywordMatches: number;
  requiredTermsFound: string[];
  outdatedTermsFound: string[];
  brandConsistency: number;
  issues: ScoreIssue[];
}

@Injectable()
export class BrandAnalyzer {
  private readonly logger = new Logger(BrandAnalyzer.name);

  constructor(private readonly scoringRulesService: ScoringRulesService) {}

  analyze(html: string, projectBrandKeywords: string[], projectName: string): BrandAnalysisResult {
    const $ = cheerio.load(html);
    const rules = this.scoringRulesService.getDimensionRules('brand');
    
    // Get project-specific brand criteria
    const criteria = this.scoringRulesService.updateBrandCriteria(
      projectName,
      projectBrandKeywords
    );

    // Extract text content
    const textContent = this.extractTextContent($);

    // Analyze brand elements
    const brandKeywordMatches = this.countBrandKeywords(textContent, criteria.brandKeywords);
    const requiredTermsFound = this.findRequiredTerms(textContent, criteria.requiredTerms);
    const outdatedTermsFound = this.findOutdatedTerms(textContent, criteria.outdatedTerms);
    const brandConsistency = this.calculateBrandConsistency(
      brandKeywordMatches,
      criteria.brandKeywords.length,
      textContent
    );

    // Calculate score
    let score = 60; // Base score (most pages aren't heavily brand-focused)
    const issues: ScoreIssue[] = [];

    // Check if page seems brand-relevant
    const isBrandRelevant = this.isPageBrandRelevant($, textContent, projectName);

    if (!isBrandRelevant) {
      // Generic content, not penalized
      score = 100;
      return {
        score,
        brandKeywordMatches,
        requiredTermsFound,
        outdatedTermsFound,
        brandConsistency,
        issues,
      };
    }

    // For brand-relevant pages, apply stricter scoring
    
    // Check brand keyword presence
    if (brandKeywordMatches === 0) {
      score = 20;
      issues.push({
        dimension: 'brand',
        severity: 'high',
        description: 'No brand keywords found on brand-relevant page',
        recommendation: `Include brand terms like "${criteria.brandKeywords.slice(0, 3).join('", "')}" to reinforce brand identity`,
      });
    } else if (brandKeywordMatches < 3) {
      score = 40;
      issues.push({
        dimension: 'brand',
        severity: 'medium',
        description: `Only ${brandKeywordMatches} brand keyword mentions found`,
        recommendation: 'Increase brand keyword usage while maintaining natural flow',
      });
    } else if (brandKeywordMatches >= 3) {
      score = 80;
    }

    // Check for outdated terms
    if (outdatedTermsFound.length > 0) {
      score = Math.max(score - 20, 20);
      issues.push({
        dimension: 'brand',
        severity: 'high',
        description: `Outdated terms found: ${outdatedTermsFound.join(', ')}`,
        recommendation: 'Update content to use current brand terminology and features',
        affectedElements: outdatedTermsFound,
      });
    }

    // Check for required terms (if any)
    if (criteria.requiredTerms.length > 0) {
      const missingRequired = criteria.requiredTerms.filter(
        term => !requiredTermsFound.includes(term)
      );
      
      if (missingRequired.length > 0) {
        score = Math.max(score - 10, 20);
        issues.push({
          dimension: 'brand',
          severity: 'medium',
          description: `Missing required brand terms: ${missingRequired.join(', ')}`,
          recommendation: 'Include all current brand terminology and product names',
        });
      }
    }

    // Check brand consistency
    if (brandConsistency < 50) {
      issues.push({
        dimension: 'brand',
        severity: 'low',
        description: 'Low brand consistency throughout content',
        recommendation: 'Maintain consistent brand voice and terminology',
      });
    } else if (brandConsistency >= 80) {
      score = Math.min(score + 20, 100);
    }

    // Check for year references
    const yearIssues = this.checkYearReferences(textContent, criteria.currentYear);
    if (yearIssues.length > 0) {
      score = Math.max(score - 10, 20);
      issues.push(...yearIssues);
    }

    return {
      score,
      brandKeywordMatches,
      requiredTermsFound,
      outdatedTermsFound,
      brandConsistency,
      issues,
    };
  }

  private extractTextContent($: cheerio.CheerioAPI): string {
    // Remove script and style tags
    $('script, style, noscript').remove();

    // Get text from relevant content areas
    const contentSelectors = [
      'main',
      'article',
      '#content',
      '.content',
      '.main-content',
      'body',
    ];

    let text = '';
    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        text = element.text();
        break;
      }
    }

    // Also include important meta content
    const title = $('title').text() || '';
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    
    return `${title} ${metaDescription} ${text}`.toLowerCase();
  }

  private countBrandKeywords(text: string, keywords: string[]): number {
    let count = 0;
    
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'gi');
      const matches = text.match(regex);
      count += matches ? matches.length : 0;
    });

    return count;
  }

  private findRequiredTerms(text: string, requiredTerms: string[]): string[] {
    return requiredTerms.filter(term => {
      const regex = new RegExp(`\\b${term.toLowerCase()}\\b`, 'i');
      return regex.test(text);
    });
  }

  private findOutdatedTerms(text: string, outdatedTerms: string[]): string[] {
    return outdatedTerms.filter(term => {
      const regex = new RegExp(`\\b${term.toLowerCase()}\\b`, 'i');
      return regex.test(text);
    });
  }

  private calculateBrandConsistency(
    keywordMatches: number,
    totalKeywords: number,
    text: string
  ): number {
    if (totalKeywords === 0) return 100;

    // Calculate based on keyword distribution
    const wordCount = text.split(/\s+/).length;
    const keywordDensity = (keywordMatches / wordCount) * 100;

    // Ideal density is 1-3%
    if (keywordDensity >= 1 && keywordDensity <= 3) {
      return 100;
    } else if (keywordDensity < 1) {
      return Math.max(50, keywordDensity * 100);
    } else {
      // Over-optimization penalty
      return Math.max(50, 100 - (keywordDensity - 3) * 10);
    }
  }

  private isPageBrandRelevant($: cheerio.CheerioAPI, text: string, brandName: string): boolean {
    // Check if it's a brand-specific page
    const brandPageIndicators = [
      'about',
      'features',
      'pricing',
      'product',
      'service',
      'solution',
      'case study',
      'testimonial',
      'customer',
      'success story',
      'comparison',
      'vs',
      'alternative',
    ];

    const pageUrl = $('link[rel="canonical"]').attr('href') || '';
    const pageTitle = $('title').text().toLowerCase();

    // Check URL
    for (const indicator of brandPageIndicators) {
      if (pageUrl.includes(indicator) || pageTitle.includes(indicator)) {
        return true;
      }
    }

    // Check if brand name appears in title or early content
    const brandRegex = new RegExp(`\\b${brandName.toLowerCase()}\\b`, 'i');
    if (brandRegex.test(pageTitle)) {
      return true;
    }

    // Check first 500 characters
    const earlyContent = text.substring(0, 500);
    if (brandRegex.test(earlyContent)) {
      return true;
    }

    return false;
  }

  private checkYearReferences(text: string, currentYear: number): ScoreIssue[] {
    const issues: ScoreIssue[] = [];
    const oldYearThreshold = currentYear - 2;

    // Look for year patterns
    const yearRegex = /\b(20\d{2})\b/g;
    const matches = text.match(yearRegex);

    if (matches) {
      const years = matches.map(y => parseInt(y)).filter(y => y < oldYearThreshold);
      const uniqueYears = [...new Set(years)];

      if (uniqueYears.length > 0) {
        issues.push({
          dimension: 'brand',
          severity: 'medium',
          description: `References to outdated years found: ${uniqueYears.join(', ')}`,
          recommendation: `Update year references to ${currentYear} or remove specific year mentions`,
          affectedElements: uniqueYears.map(y => y.toString()),
        });
      }
    }

    // Check for "last updated" type text with old years
    const lastUpdatedRegex = /(updated|modified|revised|current as of|last (updated|modified)).*?(20\d{2})/gi;
    let match;
    while ((match = lastUpdatedRegex.exec(text)) !== null) {
      const year = parseInt(match[2]);
      if (year < currentYear) {
        issues.push({
          dimension: 'brand',
          severity: 'high',
          description: `Page shows "last updated" date from ${year}`,
          recommendation: 'Update the page or remove outdated "last updated" references',
        });
        break; // Only report once
      }
    }

    return issues;
  }
}