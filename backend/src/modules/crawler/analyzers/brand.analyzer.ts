import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { ScoringRulesService } from '../services/scoring-rules.service';
import { BrandCriteria } from '../interfaces/scoring-rules.interface';
import { ScoreIssue } from '../schemas/content-score.schema';
import { BrandAnalysisResultWithCalc, ScoreCalculationDetails, SubScore } from '../interfaces/score-calculation.interface';
import { BRAND_CONSTANTS, SCORING_CONSTANTS } from '../config/scoring-constants';

export interface BrandAnalysisResult extends BrandAnalysisResultWithCalc {
  score: number;
  brandKeywordMatches: number;
  requiredTermsFound: string[];
  outdatedTermsFound: string[];
  brandConsistency: number;
  issues: ScoreIssue[];
  calculationDetails: ScoreCalculationDetails;
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

    // Analyze brand elements with evidence
    const { count: brandKeywordMatches, evidence: brandKeywordEvidence } = this.countBrandKeywordsWithEvidence(textContent, criteria.brandKeywords);
    const requiredTermsFound = this.findRequiredTerms(textContent, criteria.requiredTerms);
    const outdatedTermsFound = this.findOutdatedTerms(textContent, criteria.outdatedTerms);
    const brandConsistency = this.calculateBrandConsistency(
      brandKeywordMatches,
      criteria.brandKeywords.length,
      textContent
    );

    // Calculate score
    let score = SCORING_CONSTANTS.BASE_SCORE.HIGH; // Base score (most pages aren't heavily brand-focused)
    const issues: ScoreIssue[] = [];

    // Check if page seems brand-relevant
    const isBrandRelevant = this.isPageBrandRelevant($, textContent, projectName);

    if (!isBrandRelevant) {
      // Non-brand pages: score based on actual brand presence
      // If no brand mentions at all, low score
      if (brandKeywordMatches === 0) {
        score = BRAND_CONSTANTS.SCORES.NON_BRAND_NO_MENTIONS;
        issues.push({
          dimension: 'brand',
          severity: 'low',
          description: 'No brand presence on non-brand page',
          recommendation: 'This is normal for generic content pages',
        });
      } else if (brandKeywordMatches < BRAND_CONSTANTS.THRESHOLDS.MIN_BRAND_MENTIONS_NON_BRAND) {
        score = BRAND_CONSTANTS.SCORES.NON_BRAND_FEW_MENTIONS;
      } else {
        // Has some brand mentions even on non-brand page - good
        score = BRAND_CONSTANTS.SCORES.NON_BRAND_GOOD_MENTIONS;
      }
      
      return {
        score,
        brandKeywordMatches,
        requiredTermsFound,
        outdatedTermsFound,
        brandConsistency,
        issues,
        calculationDetails: this.calculateScoreDetails(
          brandKeywordMatches,
          brandConsistency,
          requiredTermsFound.length,
          criteria.requiredTerms.length,
          outdatedTermsFound.length,
          score,
          {
            brandKeywordEvidence,
            requiredTermsFound,
            outdatedTermsFound,
            criteria
          }
        ),
      };
    }

    // For brand-relevant pages, apply stricter scoring
    
    // Check brand keyword presence
    if (brandKeywordMatches === 0) {
      score = BRAND_CONSTANTS.SCORES.BRAND_PAGE_NO_MENTIONS;
      issues.push({
        dimension: 'brand',
        severity: 'high',
        description: 'No brand keywords found on brand-relevant page',
        recommendation: `Include brand terms like "${criteria.brandKeywords.slice(0, 3).join('", "')}" to reinforce brand identity`,
      });
    } else if (brandKeywordMatches < BRAND_CONSTANTS.THRESHOLDS.MIN_BRAND_MENTIONS_BRAND_PAGE) {
      score = BRAND_CONSTANTS.SCORES.BRAND_PAGE_FEW_MENTIONS;
      issues.push({
        dimension: 'brand',
        severity: 'medium',
        description: `Only ${brandKeywordMatches} brand keyword mentions found`,
        recommendation: 'Increase brand keyword usage while maintaining natural flow',
      });
    } else if (brandKeywordMatches >= BRAND_CONSTANTS.THRESHOLDS.MIN_BRAND_MENTIONS_BRAND_PAGE) {
      score = BRAND_CONSTANTS.SCORES.BRAND_PAGE_GOOD_MENTIONS;
    }

    // Check for outdated terms
    if (outdatedTermsFound.length > 0) {
      score = Math.max(score - BRAND_CONSTANTS.SCORES.OUTDATED_TERMS_PENALTY, SCORING_CONSTANTS.BASE_SCORE.LOW);
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
        score = Math.max(score - BRAND_CONSTANTS.SCORES.MISSING_REQUIRED_PENALTY, SCORING_CONSTANTS.BASE_SCORE.LOW);
        issues.push({
          dimension: 'brand',
          severity: 'medium',
          description: `Missing required brand terms: ${missingRequired.join(', ')}`,
          recommendation: 'Include all current brand terminology and product names',
        });
      }
    }

    // Check brand consistency
    if (brandConsistency < BRAND_CONSTANTS.THRESHOLDS.MIN_CONSISTENCY_FOR_PENALTY) {
      issues.push({
        dimension: 'brand',
        severity: 'low',
        description: 'Low brand consistency throughout content',
        recommendation: 'Maintain consistent brand voice and terminology',
      });
    } else if (brandConsistency >= BRAND_CONSTANTS.THRESHOLDS.MIN_CONSISTENCY_FOR_BONUS) {
      score = Math.min(score + BRAND_CONSTANTS.SCORES.CONSISTENCY_BONUS, SCORING_CONSTANTS.BASE_SCORE.PERFECT);
    }

    // Check for year references
    const yearIssues = this.checkYearReferences(textContent, criteria.currentYear);
    if (yearIssues.length > 0) {
      score = Math.max(score - BRAND_CONSTANTS.SCORES.YEAR_REFERENCE_PENALTY, SCORING_CONSTANTS.BASE_SCORE.LOW);
      issues.push(...yearIssues);
    }

    return {
      score,
      brandKeywordMatches,
      requiredTermsFound,
      outdatedTermsFound,
      brandConsistency,
      issues,
      calculationDetails: this.calculateScoreDetails(
        brandKeywordMatches,
        brandConsistency,
        requiredTermsFound.length,
        criteria.requiredTerms.length,
        outdatedTermsFound.length,
        score,
        {
          brandKeywordEvidence,
          requiredTermsFound,
          outdatedTermsFound,
          criteria
        }
      ),
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
      // Escape special regex characters in keyword
      const escapedKeyword = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'gi');
      const matches = text.match(regex);
      count += matches ? matches.length : 0;
    });

    return count;
  }

  private countBrandKeywordsWithEvidence(text: string, keywords: string[]): { count: number; evidence: Record<string, number> } {
    let totalCount = 0;
    const evidence: Record<string, number> = {};
    
    keywords.forEach(keyword => {
      // Escape special regex characters in keyword
      const escapedKeyword = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'gi');
      const matches = text.match(regex);
      const count = matches ? matches.length : 0;
      if (count > 0) {
        evidence[keyword] = count;
        totalCount += count;
      }
    });

    return { count: totalCount, evidence };
  }

  private findRequiredTerms(text: string, requiredTerms: string[]): string[] {
    return requiredTerms.filter(term => {
      const escapedTerm = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedTerm}\\b`, 'i');
      return regex.test(text);
    });
  }

  private findOutdatedTerms(text: string, outdatedTerms: string[]): string[] {
    return outdatedTerms.filter(term => {
      const escapedTerm = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedTerm}\\b`, 'i');
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
    if (keywordDensity >= BRAND_CONSTANTS.THRESHOLDS.IDEAL_DENSITY_MIN && keywordDensity <= BRAND_CONSTANTS.THRESHOLDS.IDEAL_DENSITY_MAX) {
      return 100;
    } else if (keywordDensity < BRAND_CONSTANTS.THRESHOLDS.IDEAL_DENSITY_MIN) {
      return Math.max(BRAND_CONSTANTS.THRESHOLDS.MIN_DENSITY_SCORE, keywordDensity * BRAND_CONSTANTS.THRESHOLDS.DENSITY_FALLBACK_MULTIPLIER);
    } else {
      // Over-optimization penalty
      return Math.max(BRAND_CONSTANTS.THRESHOLDS.MIN_DENSITY_SCORE, 100 - (keywordDensity - BRAND_CONSTANTS.THRESHOLDS.IDEAL_DENSITY_MAX) * BRAND_CONSTANTS.THRESHOLDS.DENSITY_OVEROPTIMIZATION_FACTOR);
    }
  }

  private isPageBrandRelevant($: cheerio.CheerioAPI, text: string, brandName: string): boolean {
    // Check if it's a brand-specific page
    const brandPageIndicators = BRAND_CONSTANTS.BRAND_PAGE_INDICATORS;

    const pageUrl = $('link[rel="canonical"]').attr('href') || '';
    const pageTitle = $('title').text().toLowerCase();

    // Check URL
    for (const indicator of brandPageIndicators) {
      if (pageUrl.includes(indicator) || pageTitle.includes(indicator)) {
        return true;
      }
    }

    // Check if brand name appears in title or early content
    const escapedBrandName = brandName.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const brandRegex = new RegExp(`\\b${escapedBrandName}\\b`, 'i');
    if (brandRegex.test(pageTitle)) {
      return true;
    }

    // Check first 500 characters
    const earlyContent = text.substring(0, SCORING_CONSTANTS.TEXT_ANALYSIS.MIN_CONTENT_LENGTH);
    if (brandRegex.test(earlyContent)) {
      return true;
    }

    return false;
  }

  private checkYearReferences(text: string, currentYear: number): ScoreIssue[] {
    const issues: ScoreIssue[] = [];
    const oldYearThreshold = currentYear - BRAND_CONSTANTS.THRESHOLDS.OLD_YEAR_THRESHOLD;

    // Look for year patterns with better context to avoid false positives
    // Match years that are likely date references (not product codes, etc.)
    const yearContextKeywords = BRAND_CONSTANTS.YEAR_CONTEXT_KEYWORDS.join('|');
    const yearContextRegex = new RegExp(`(?:(?:${yearContextKeywords})\\s*:?\\s*)?(\\b20\\d{2}\\b)(?:\\s*[-–—]\\s*20\\d{2})?`, 'gi');
    const matches: string[] = [];
    let match;
    
    while ((match = yearContextRegex.exec(text)) !== null) {
      const year = parseInt(match[1]);
      // Only consider years between 2000 and currentYear + 1 (to allow for scheduling)
      if (year >= 2000 && year <= currentYear + 1) {
        matches.push(match[1]);
      }
    }

    if (matches.length > 0) {
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
    const lastUpdatedRegex = /(updated|modified|revised|current as of|last (?:updated|modified)).*?(20\d{2})/gi;
    let lastUpdatedMatch;
    while ((lastUpdatedMatch = lastUpdatedRegex.exec(text)) !== null) {
      const year = parseInt(lastUpdatedMatch[2]);
      if (year >= 2000 && year < currentYear) {
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

  private calculateScoreDetails(
    brandMentions: number,
    consistencyScore: number,
    requiredTermsFound: number,
    totalRequiredTerms: number,
    outdatedTermsCount: number,
    finalScore: number,
    evidence: {
      brandKeywordEvidence: Record<string, number>;
      requiredTermsFound: string[];
      outdatedTermsFound: string[];
      criteria: BrandCriteria;
    }
  ): ScoreCalculationDetails {
    const brandKeywordDetails = Object.entries(evidence.brandKeywordEvidence)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([keyword, count]) => `${keyword}: ${count}x`);

    const subScores: SubScore[] = [
      {
        name: 'Brand Mentions',
        value: brandMentions,
        weight: BRAND_CONSTANTS.WEIGHTS.BRAND_MENTIONS,
        maxValue: BRAND_CONSTANTS.BRAND_MENTIONS_MAX, // Assume 10+ mentions is max
        contribution: Math.min(brandMentions / BRAND_CONSTANTS.BRAND_MENTIONS_MAX, 1) * (BRAND_CONSTANTS.WEIGHTS.BRAND_MENTIONS * 100),
        evidence: brandKeywordDetails.length > 0 ? brandKeywordDetails : 'No brand keywords found',
      },
      {
        name: 'Brand Consistency',
        value: consistencyScore,
        weight: BRAND_CONSTANTS.WEIGHTS.CONSISTENCY,
        maxValue: 100,
        contribution: (consistencyScore / 100) * (BRAND_CONSTANTS.WEIGHTS.CONSISTENCY * 100),
        evidence: `${consistencyScore.toFixed(1)}% keyword distribution consistency`,
      },
      {
        name: 'Required Terms Coverage',
        value: totalRequiredTerms > 0 ? (requiredTermsFound / totalRequiredTerms) * 100 : 100,
        weight: BRAND_CONSTANTS.WEIGHTS.REQUIRED_TERMS,
        maxValue: 100,
        contribution: totalRequiredTerms > 0 ? (requiredTermsFound / totalRequiredTerms) * (BRAND_CONSTANTS.WEIGHTS.REQUIRED_TERMS * 100) : (BRAND_CONSTANTS.WEIGHTS.REQUIRED_TERMS * 100),
        evidence: totalRequiredTerms > 0 
          ? (evidence.requiredTermsFound.length > 0 
            ? `Found: ${evidence.requiredTermsFound.join(', ')}` 
            : 'No required terms found')
          : 'No required terms defined',
      },
      {
        name: 'Outdated Terms Penalty',
        value: outdatedTermsCount,
        weight: BRAND_CONSTANTS.WEIGHTS.OUTDATED_TERMS_PENALTY,
        maxValue: BRAND_CONSTANTS.OUTDATED_TERMS_MAX, // More than 5 outdated terms = max penalty
        contribution: -Math.min(outdatedTermsCount / BRAND_CONSTANTS.OUTDATED_TERMS_MAX, 1) * Math.abs(BRAND_CONSTANTS.WEIGHTS.OUTDATED_TERMS_PENALTY * 100),
        evidence: outdatedTermsCount > 0 
          ? `Found outdated: ${evidence.outdatedTermsFound.join(', ')}`
          : 'No outdated terms found',
      },
    ];

    const calculatedScore = subScores.reduce((sum, sub) => sum + sub.contribution, 0);

    return {
      formula: 'Score = (Brand Mentions × 40%) + (Consistency × 30%) + (Required Terms × 20%) - (Outdated Terms × 10%)',
      subScores,
      finalScore,
      explanation: `Brand alignment score of ${finalScore} based on ${brandMentions} brand mentions, ${consistencyScore}% consistency, ${requiredTermsFound}/${totalRequiredTerms} required terms, and ${outdatedTermsCount} outdated terms.`,
    };
  }
}