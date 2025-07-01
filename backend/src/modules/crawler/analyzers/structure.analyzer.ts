import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { ScoringRulesService } from '../services/scoring-rules.service';
import { StructureCriteria } from '../interfaces/scoring-rules.interface';
import { ScoreIssue } from '../schemas/content-score.schema';
import { StructureAnalysisResultWithCalc, ScoreCalculationDetails, SubScore } from '../interfaces/score-calculation.interface';
import { STRUCTURE_CONSTANTS, SCORING_CONSTANTS } from '../config/scoring-constants';

export interface StructureAnalysisResult extends StructureAnalysisResultWithCalc {
  score: number;
  h1Count: number;
  headingHierarchy: boolean;
  headingHierarchyScore: number;
  schemaTypes: string[];
  avgSentenceWords: number;
  issues: ScoreIssue[];
  calculationDetails: ScoreCalculationDetails;
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
    const h1Texts = $('h1').map((_, el) => $(el).text().trim()).get();
    const { isValid: headingHierarchy, hierarchy: headingStructure } = this.checkHeadingHierarchy($);

    // Extract schema types
    const schemaTypes = this.extractSchemaTypes($);

    // Calculate average sentence length
    const avgSentenceWords = this.calculateAverageSentenceWords($);

    // Calculate score
    let score = STRUCTURE_CONSTANTS.SCORES.BASE; // Base score
    const issues: ScoreIssue[] = [];

    // Track sub-scores for calculation details
    let h1Score = 0;
    let hierarchyScore = 0;
    let schemaScore = 0;
    let readabilityScore = 0;

    // Check H1 tags
    if (h1Count === 0) {
      issues.push({
        dimension: 'structure',
        severity: 'high',
        description: 'No H1 tag found',
        recommendation: 'Add a single H1 tag to define the main topic of the page',
      });
    } else if (h1Count === 1) {
      score += STRUCTURE_CONSTANTS.SCORES.H1_SINGLE;
      h1Score = STRUCTURE_CONSTANTS.SCORES.H1_SINGLE;
    } else {
      issues.push({
        dimension: 'structure',
        severity: 'medium',
        description: `Multiple H1 tags found (${h1Count})`,
        recommendation: 'Use only one H1 tag per page for better semantic structure',
        affectedElements: $('h1').map((_, el) => $(el).text().trim()).get(),
      });
      score += STRUCTURE_CONSTANTS.SCORES.H1_MULTIPLE; // Partial credit
      h1Score = STRUCTURE_CONSTANTS.SCORES.H1_MULTIPLE;
    }

    // Check heading hierarchy
    if (headingHierarchy) {
      score += STRUCTURE_CONSTANTS.SCORES.HIERARCHY_VALID;
      hierarchyScore = STRUCTURE_CONSTANTS.SCORES.HIERARCHY_VALID;
    } else {
      issues.push({
        dimension: 'structure',
        severity: 'medium',
        description: 'Heading hierarchy is broken (e.g., H3 follows H1 without H2)',
        recommendation: 'Ensure proper heading hierarchy (H1 → H2 → H3, etc.)',
      });
      score += STRUCTURE_CONSTANTS.SCORES.HIERARCHY_PARTIAL; // Partial credit
      hierarchyScore = STRUCTURE_CONSTANTS.SCORES.HIERARCHY_PARTIAL;
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
      score += STRUCTURE_CONSTANTS.SCORES.SCHEMA_PRESENT;
      schemaScore = STRUCTURE_CONSTANTS.SCORES.SCHEMA_PRESENT;
      
      // Check for complete Article schema
      const hasCompleteSchema = this.checkCompleteArticleSchema($);
      if (hasCompleteSchema) {
        score += STRUCTURE_CONSTANTS.SCORES.SCHEMA_COMPLETE_BONUS; // Bonus for complete schema
        schemaScore += STRUCTURE_CONSTANTS.SCORES.SCHEMA_COMPLETE_BONUS;
      } else {
        issues.push({
          dimension: 'structure',
          severity: 'low',
          description: 'Article schema is incomplete',
          recommendation: 'Add dateModified, author, and publisher properties to Article schema',
        });
      }
    } else {
      score += STRUCTURE_CONSTANTS.SCORES.SCHEMA_PARTIAL; // Partial credit for any schema
      schemaScore = STRUCTURE_CONSTANTS.SCORES.SCHEMA_PARTIAL;
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
        const points = Math.min(20, threshold.score * 0.2); // Max 20 points for readability
        score += points;
        readabilityScore = points;
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

    // Calculate heading hierarchy score for frontend display
    const headingHierarchyScore = hierarchyScore * 5; // Convert 20 point scale to 100

    // Generate calculation details
    const calculationDetails = this.generateCalculationDetails(
      h1Score,
      hierarchyScore,
      schemaScore,
      readabilityScore,
      score,
      {
        h1Texts,
        headingStructure,
        schemaTypes,
        avgSentenceWords
      }
    );

    return {
      score,
      h1Count,
      headingHierarchy,
      headingHierarchyScore,
      schemaTypes,
      avgSentenceWords,
      issues,
      calculationDetails,
    };
  }

  private checkHeadingHierarchy($: cheerio.CheerioAPI): { isValid: boolean; hierarchy: string[] } {
    const headings = $('h1, h2, h3, h4, h5, h6');
    const levelStack: number[] = [];
    let isValid = true;
    const hierarchy: string[] = [];

    headings.each((_, element) => {
      const tagName = element.tagName.toLowerCase();
      const level = parseInt(tagName.substring(1));
      const text = $(element).text().trim();
      
      // Add to hierarchy with indentation
      const indent = '  '.repeat(level - 1);
      hierarchy.push(`${indent}${tagName.toUpperCase()}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);

      // Pop stack until we find a level less than current
      while (levelStack.length > 0 && levelStack[levelStack.length - 1] >= level) {
        levelStack.pop();
      }

      // Check if level is valid (at most 1 level jump from parent)
      if (levelStack.length > 0) {
        const parentLevel = levelStack[levelStack.length - 1];
        if (level > parentLevel + 1) {
          isValid = false;
          return false; // Break the loop
        }
      }
      
      levelStack.push(level);
    });

    return { isValid, hierarchy };
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
        // Clone to avoid mutating the original DOM
        const clonedElement = element.clone();
        // Remove script and style content
        clonedElement.find('script, style').remove();
        contentText = clonedElement.text();
        break;
      }
    }

    if (!contentText) {
      // Fallback to body (clone to avoid mutation)
      const bodyClone = $('body').clone();
      bodyClone.find('script, style').remove();
      contentText = bodyClone.text();
    }

    // Clean and normalize whitespace
    contentText = contentText.replace(/\s+/g, ' ').trim();
    
    // Improved sentence splitting that handles abbreviations
    const abbreviations = SCORING_CONSTANTS.ABBREVIATIONS;
    
    // Replace abbreviations temporarily to avoid splitting
    let processedText = contentText;
    abbreviations.forEach((abbr) => {
      const regex = new RegExp(`\\b${abbr.replace('.', '\\.')}\\b`, 'gi');
      processedText = processedText.replace(regex, abbr.replace('.', '¤'));
    });
    
    // Split by sentence endings
    const sentences = processedText.split(/[.!?]+/)
      .map(s => s.replace(/¤/g, '.')) // Restore periods in abbreviations
      .filter(s => s.trim().length > SCORING_CONSTANTS.TEXT_ANALYSIS.MIN_SENTENCE_LENGTH); // Only count substantial sentences
    
    if (sentences.length === 0) return 0;

    // Calculate average words per sentence
    let totalWords = 0;
    sentences.forEach(sentence => {
      const words = sentence.trim().split(/\s+/).filter(w => w.length > 0);
      totalWords += words.length;
    });

    return totalWords / sentences.length;
  }

  private generateCalculationDetails(
    h1Score: number,
    hierarchyScore: number,
    schemaScore: number,
    readabilityScore: number,
    finalScore: number,
    evidence: {
      h1Texts: string[];
      headingStructure: string[];
      schemaTypes: string[];
      avgSentenceWords: number;
    }
  ): ScoreCalculationDetails {
    const subScores: SubScore[] = [
      {
        name: 'Base Score',
        value: STRUCTURE_CONSTANTS.SCORES.BASE,
        weight: STRUCTURE_CONSTANTS.WEIGHTS.BASE,
        maxValue: STRUCTURE_CONSTANTS.SCORES.BASE,
        contribution: STRUCTURE_CONSTANTS.SCORES.BASE,
      },
      {
        name: 'H1 Tag',
        value: h1Score,
        weight: STRUCTURE_CONSTANTS.WEIGHTS.H1_TAG,
        maxValue: STRUCTURE_CONSTANTS.SCORES.H1_SINGLE,
        contribution: h1Score,
        evidence: evidence.h1Texts.length > 0 ? evidence.h1Texts : 'No H1 tags found',
      },
      {
        name: 'Heading Hierarchy',
        value: hierarchyScore,
        weight: STRUCTURE_CONSTANTS.WEIGHTS.HEADING_HIERARCHY,
        maxValue: STRUCTURE_CONSTANTS.SCORES.HIERARCHY_VALID,
        contribution: hierarchyScore,
        evidence: evidence.headingStructure,
      },
      {
        name: 'Schema Markup',
        value: schemaScore,
        weight: STRUCTURE_CONSTANTS.WEIGHTS.SCHEMA_MARKUP,
        maxValue: STRUCTURE_CONSTANTS.SCORES.SCHEMA_PRESENT + STRUCTURE_CONSTANTS.SCORES.SCHEMA_COMPLETE_BONUS,
        contribution: schemaScore,
        evidence: evidence.schemaTypes.length > 0 ? evidence.schemaTypes : 'No schema markup found',
      },
      {
        name: 'Readability',
        value: readabilityScore,
        weight: STRUCTURE_CONSTANTS.WEIGHTS.READABILITY,
        maxValue: STRUCTURE_CONSTANTS.SCORES.READABILITY_MAX,
        contribution: readabilityScore,
        evidence: `Average sentence length: ${evidence.avgSentenceWords.toFixed(1)} words`,
      },
    ];

    return {
      formula: 'Score = Base (20) + H1 (20) + Hierarchy (20) + Schema (30) + Readability (20)',
      subScores,
      finalScore,
      explanation: `Structure score of ${finalScore} based on H1 usage, heading hierarchy, schema markup, and readability.`,
    };
  }
}