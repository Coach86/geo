import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { ScoringRulesService } from '../services/scoring-rules.service';
import { SnippetCriteria } from '../interfaces/scoring-rules.interface';
import { ScoreIssue } from '../schemas/content-score.schema';

export interface SnippetAnalysisResult {
  score: number;
  avgSentenceWords: number;
  listCount: number;
  qaBlockCount: number;
  extractableBlocks: number;
  issues: ScoreIssue[];
}

@Injectable()
export class SnippetAnalyzer {
  private readonly logger = new Logger(SnippetAnalyzer.name);

  constructor(private readonly scoringRulesService: ScoringRulesService) {}

  analyze(html: string): SnippetAnalysisResult {
    const $ = cheerio.load(html);
    const rules = this.scoringRulesService.getDimensionRules('snippet');
    const criteria = rules.criteria as SnippetCriteria;

    // Analyze content structure
    const avgSentenceWords = this.calculateAverageSentenceWords($);
    const listCount = this.countLists($);
    const qaBlockCount = this.countQABlocks($);
    const extractableBlocks = this.countExtractableBlocks($);

    // Calculate score
    let score = 20; // Base score
    const issues: ScoreIssue[] = [];

    // Check sentence length
    if (avgSentenceWords <= criteria.maxSentenceWords) {
      score += 20;
    } else {
      const severity = avgSentenceWords > 40 ? 'high' : avgSentenceWords > 30 ? 'medium' : 'low';
      issues.push({
        dimension: 'snippet',
        severity,
        description: `Average sentence length is ${avgSentenceWords.toFixed(1)} words (should be ≤${criteria.maxSentenceWords})`,
        recommendation: 'Use shorter sentences to improve snippet extraction potential',
      });
    }

    // Check for lists
    if (listCount > 0) {
      score += 15;
      if (listCount >= 3) {
        score += 5; // Bonus for multiple lists
      }
    } else if (criteria.requireLists) {
      issues.push({
        dimension: 'snippet',
        severity: 'medium',
        description: 'No lists (ul/ol) found in content',
        recommendation: 'Add bulleted or numbered lists to make content more extractable',
      });
    }

    // Check for Q&A blocks
    if (qaBlockCount > 0) {
      score += 15;
      if (qaBlockCount >= 3) {
        score += 5; // Bonus for multiple Q&A sections
      }
    } else if (criteria.requireQA) {
      issues.push({
        dimension: 'snippet',
        severity: 'medium',
        description: 'No Q&A sections or FAQ blocks found',
        recommendation: 'Add FAQ sections or Q&A formatting to improve featured snippet potential',
      });
    }

    // Check extractable blocks
    if (extractableBlocks >= criteria.minExtractableBlocks) {
      score += 20;
    } else if (extractableBlocks > 0) {
      score += 10;
      issues.push({
        dimension: 'snippet',
        severity: 'low',
        description: `Only ${extractableBlocks} extractable blocks found (recommended: ${criteria.minExtractableBlocks}+)`,
        recommendation: 'Add more concise, self-contained answer blocks',
      });
    } else {
      issues.push({
        dimension: 'snippet',
        severity: 'high',
        description: 'No easily extractable content blocks found',
        recommendation: 'Structure content with clear definitions, lists, and direct answers',
      });
    }

    // Check for wall of text
    const hasWallOfText = this.detectWallOfText($);
    if (hasWallOfText) {
      score = Math.max(score - 20, 20); // Penalty for wall of text
      issues.push({
        dimension: 'snippet',
        severity: 'high',
        description: 'Large unbroken paragraphs detected (wall of text)',
        recommendation: 'Break content into smaller paragraphs with clear headings',
      });
    }

    // Cap score at 100
    score = Math.min(score, 100);

    return {
      score,
      avgSentenceWords,
      listCount,
      qaBlockCount,
      extractableBlocks,
      issues,
    };
  }

  private calculateAverageSentenceWords($: cheerio.CheerioAPI): number {
    // Get paragraphs from main content
    const paragraphs = $('p').filter((_, el) => {
      const text = $(el).text().trim();
      return text.length > 50; // Only consider substantial paragraphs
    });

    if (paragraphs.length === 0) return 0;

    let totalWords = 0;
    let totalSentences = 0;

    paragraphs.each((_, el) => {
      const text = $(el).text().trim();
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
      
      sentences.forEach(sentence => {
        const words = sentence.trim().split(/\s+/).filter(w => w.length > 0);
        if (words.length > 0) {
          totalWords += words.length;
          totalSentences++;
        }
      });
    });

    return totalSentences > 0 ? totalWords / totalSentences : 0;
  }

  private countLists($: cheerio.CheerioAPI): number {
    // Count ul and ol elements with actual content
    const lists = $('ul, ol').filter((_, el) => {
      const items = $(el).find('li');
      return items.length > 0;
    });

    return lists.length;
  }

  private countQABlocks($: cheerio.CheerioAPI): number {
    let qaCount = 0;

    // Pattern 1: FAQ schema
    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        const json = JSON.parse($(element).html() || '{}');
        if (json['@type'] === 'FAQPage' && json.mainEntity) {
          qaCount += Array.isArray(json.mainEntity) ? json.mainEntity.length : 1;
        }
      } catch (error) {
        // Ignore
      }
    });

    // Pattern 2: Question-like headings followed by content
    const questionPatterns = [
      /^(what|how|why|when|where|who|which|can|should|is|are|do|does)/i,
      /\?$/,
    ];

    $('h2, h3, h4').each((_, el) => {
      const text = $(el).text().trim();
      const hasQuestionPattern = questionPatterns.some(pattern => pattern.test(text));
      
      if (hasQuestionPattern) {
        // Check if followed by answer content
        const nextElement = $(el).next();
        if (nextElement.length && nextElement.text().trim().length > 20) {
          qaCount++;
        }
      }
    });

    // Pattern 3: DT/DD pairs (definition lists)
    const dlCount = $('dl').filter((_, el) => {
      return $(el).find('dt').length > 0 && $(el).find('dd').length > 0;
    }).length;
    qaCount += dlCount;

    // Pattern 4: FAQ class/id patterns
    const faqSelectors = [
      '.faq',
      '#faq',
      '.faqs',
      '.qa',
      '.question-answer',
      '[class*="faq"]',
      '[id*="faq"]',
    ];

    faqSelectors.forEach(selector => {
      const elements = $(selector);
      if (elements.length > 0) {
        // Count question-like elements within
        elements.find('h3, h4, h5, .question').each(() => {
          qaCount++;
        });
      }
    });

    return qaCount;
  }

  private countExtractableBlocks($: cheerio.CheerioAPI): number {
    let extractableCount = 0;

    // Pattern 1: Short paragraphs (good for snippets)
    const shortParagraphs = $('p').filter((_, el) => {
      const text = $(el).text().trim();
      const wordCount = text.split(/\s+/).length;
      return wordCount >= 15 && wordCount <= 50;
    });
    extractableCount += Math.floor(shortParagraphs.length / 2); // Count every 2 short paragraphs as 1 block

    // Pattern 2: Lists with intro text
    $('p + ul, p + ol, h2 + ul, h2 + ol, h3 + ul, h3 + ol').each(() => {
      extractableCount++;
    });

    // Pattern 3: Definitions or key takeaways
    const definitionPatterns = [
      /^(definition:|what is|in short|in summary|key takeaway|bottom line)/i,
      /:\s*$/,
    ];

    $('p, div').each((_, el) => {
      const text = $(el).text().trim();
      if (definitionPatterns.some(pattern => pattern.test(text)) && text.length < 200) {
        extractableCount++;
      }
    });

    // Pattern 4: Structured data blocks
    const structuredSelectors = [
      '.summary',
      '.tldr',
      '.key-points',
      '.highlights',
      '.quick-answer',
      '.definition',
      '[class*="summary"]',
      '[class*="highlight"]',
    ];

    structuredSelectors.forEach(selector => {
      extractableCount += $(selector).length;
    });

    // Pattern 5: Tables with clear headers
    const tables = $('table').filter((_, el) => {
      return $(el).find('th').length > 0 || $(el).find('thead').length > 0;
    });
    extractableCount += tables.length;

    return extractableCount;
  }

  private detectWallOfText($: cheerio.CheerioAPI): boolean {
    // Check for very long paragraphs
    const longParagraphs = $('p').filter((_, el) => {
      const text = $(el).text().trim();
      const wordCount = text.split(/\s+/).length;
      return wordCount > 100;
    });

    // If more than 30% of paragraphs are very long, it's a wall of text
    const totalParagraphs = $('p').filter((_, el) => $(el).text().trim().length > 20).length;
    
    if (totalParagraphs > 0) {
      const ratio = longParagraphs.length / totalParagraphs;
      return ratio > 0.3;
    }

    return false;
  }
}