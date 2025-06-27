import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { ScoringRulesService } from '../services/scoring-rules.service';
import { StructureCriteria } from '../interfaces/scoring-rules.interface';
import { ScoreIssue } from '../schemas/content-score.schema';

export interface StructureAnalysisResult {
  score: number;
  h1Count: number;
  headingHierarchy: boolean;
  schemaTypes: string[];
  avgSentenceWords: number;
  issues: ScoreIssue[];
}

@Injectable()
export class StructureAnalyzer {
  private readonly logger = new Logger(StructureAnalyzer.name);

  constructor(private readonly scoringRulesService: ScoringRulesService) {}

  analyze(html: string): StructureAnalysisResult {
    const $ = cheerio.load(html);
    const rules = this.scoringRulesService.getDimensionRules('structure');
    const criteria = rules.criteria as StructureCriteria;

    // Analyze heading structure
    const h1Count = $('h1').length;
    const headingHierarchy = this.checkHeadingHierarchy($);

    // Extract schema types
    const schemaTypes = this.extractSchemaTypes($);

    // Calculate average sentence length
    const avgSentenceWords = this.calculateAverageSentenceWords($);

    // Calculate score
    let score = 20; // Base score
    const issues: ScoreIssue[] = [];

    // Check H1 tags
    if (h1Count === 0) {
      issues.push({
        dimension: 'structure',
        severity: 'high',
        description: 'No H1 tag found',
        recommendation: 'Add a single H1 tag to define the main topic of the page',
      });
    } else if (h1Count === 1) {
      score += 20;
    } else {
      issues.push({
        dimension: 'structure',
        severity: 'medium',
        description: `Multiple H1 tags found (${h1Count})`,
        recommendation: 'Use only one H1 tag per page for better semantic structure',
        affectedElements: $('h1').map((_, el) => $(el).text().trim()).get(),
      });
      score += 10; // Partial credit
    }

    // Check heading hierarchy
    if (headingHierarchy) {
      score += 20;
    } else {
      issues.push({
        dimension: 'structure',
        severity: 'medium',
        description: 'Heading hierarchy is broken (e.g., H3 follows H1 without H2)',
        recommendation: 'Ensure proper heading hierarchy (H1 → H2 → H3, etc.)',
      });
      score += 10; // Partial credit
    }

    // Check schema markup
    const hasRelevantSchema = schemaTypes.some(type => 
      criteria.schemaTypes.includes(type)
    );

    if (schemaTypes.length === 0) {
      issues.push({
        dimension: 'structure',
        severity: 'high',
        description: 'No structured data (schema.org) found',
        recommendation: `Add Article, BlogPosting, or FAQPage schema markup for rich results`,
      });
    } else if (hasRelevantSchema) {
      score += 20;
      
      // Check for complete Article schema
      const hasCompleteSchema = this.checkCompleteArticleSchema($);
      if (hasCompleteSchema) {
        score += 10; // Bonus for complete schema
      } else {
        issues.push({
          dimension: 'structure',
          severity: 'low',
          description: 'Article schema is incomplete',
          recommendation: 'Add dateModified, author, and publisher properties to Article schema',
        });
      }
    } else {
      score += 10; // Partial credit for any schema
      issues.push({
        dimension: 'structure',
        severity: 'medium',
        description: `Schema types found (${schemaTypes.join(', ')}) but no Article/BlogPosting/FAQPage`,
        recommendation: 'Add Article or FAQPage schema for better content understanding',
      });
    }

    // Check sentence length
    for (const threshold of criteria.sentenceWordThresholds) {
      if (avgSentenceWords <= threshold.maxWords) {
        score += Math.min(20, threshold.score * 0.2); // Max 20 points for readability
        break;
      }
    }

    if (avgSentenceWords > 30) {
      issues.push({
        dimension: 'structure',
        severity: 'high',
        description: `Average sentence length is ${avgSentenceWords.toFixed(1)} words (should be ≤20)`,
        recommendation: 'Break long sentences into shorter, more digestible chunks',
      });
    } else if (avgSentenceWords > 25) {
      issues.push({
        dimension: 'structure',
        severity: 'medium',
        description: `Average sentence length is ${avgSentenceWords.toFixed(1)} words (should be ≤20)`,
        recommendation: 'Consider shortening sentences for better readability',
      });
    } else if (avgSentenceWords > 20) {
      issues.push({
        dimension: 'structure',
        severity: 'low',
        description: `Average sentence length is ${avgSentenceWords.toFixed(1)} words (optimal is ≤20)`,
        recommendation: 'Sentences are readable but could be slightly shorter',
      });
    }

    // Cap score at 100
    score = Math.min(score, 100);

    return {
      score,
      h1Count,
      headingHierarchy,
      schemaTypes,
      avgSentenceWords,
      issues,
    };
  }

  private checkHeadingHierarchy($: cheerio.CheerioAPI): boolean {
    const headings = $('h1, h2, h3, h4, h5, h6');
    let lastLevel = 0;
    let isValid = true;

    headings.each((_, element) => {
      const tagName = element.tagName.toLowerCase();
      const level = parseInt(tagName.substring(1));

      if (level > lastLevel + 1) {
        isValid = false;
        return false; // Break the loop
      }
      lastLevel = level;
    });

    return isValid;
  }

  private extractSchemaTypes($: cheerio.CheerioAPI): string[] {
    const types = new Set<string>();

    // Extract from JSON-LD
    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        const json = JSON.parse($(element).html() || '{}');
        if (json['@type']) {
          if (Array.isArray(json['@type'])) {
            json['@type'].forEach(type => types.add(type));
          } else {
            types.add(json['@type']);
          }
        }

        // Check @graph
        if (json['@graph'] && Array.isArray(json['@graph'])) {
          json['@graph'].forEach(item => {
            if (item['@type']) {
              if (Array.isArray(item['@type'])) {
                item['@type'].forEach(type => types.add(type));
              } else {
                types.add(item['@type']);
              }
            }
          });
        }
      } catch (error) {
        // Ignore parse errors
      }
    });

    // Extract from microdata
    $('[itemtype]').each((_, element) => {
      const itemType = $(element).attr('itemtype');
      if (itemType) {
        const type = itemType.split('/').pop();
        if (type) types.add(type);
      }
    });

    return Array.from(types);
  }

  private checkCompleteArticleSchema($: cheerio.CheerioAPI): boolean {
    let hasCompleteSchema = false;

    $('script[type="application/ld+json"]').each((_, element) => {
      if (hasCompleteSchema) return;

      try {
        const json = JSON.parse($(element).html() || '{}');
        
        const checkArticle = (obj: any) => {
          if (obj['@type'] === 'Article' || obj['@type'] === 'BlogPosting' || obj['@type'] === 'NewsArticle') {
            // Check required properties for complete schema
            if (obj.headline && obj.datePublished && obj.author && obj.publisher) {
              hasCompleteSchema = true;
            }
          }
        };

        checkArticle(json);

        // Check @graph
        if (json['@graph'] && Array.isArray(json['@graph'])) {
          json['@graph'].forEach(checkArticle);
        }
      } catch (error) {
        // Ignore parse errors
      }
    });

    return hasCompleteSchema;
  }

  private calculateAverageSentenceWords($: cheerio.CheerioAPI): number {
    // Get main content text
    const contentSelectors = [
      'main',
      'article',
      '[role="main"]',
      '#main-content',
      '#content',
      '.main-content',
      '.content',
      '.entry-content',
      '.post-content',
    ];

    let contentText = '';
    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        // Remove script and style content
        element.find('script, style').remove();
        contentText = element.text();
        break;
      }
    }

    if (!contentText) {
      // Fallback to body
      $('body').find('script, style').remove();
      contentText = $('body').text();
    }

    // Clean and split into sentences
    contentText = contentText.replace(/\s+/g, ' ').trim();
    
    // Split by sentence endings
    const sentences = contentText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length === 0) return 0;

    // Calculate average words per sentence
    let totalWords = 0;
    sentences.forEach(sentence => {
      const words = sentence.trim().split(/\s+/).filter(w => w.length > 0);
      totalWords += words.length;
    });

    return totalWords / sentences.length;
  }
}