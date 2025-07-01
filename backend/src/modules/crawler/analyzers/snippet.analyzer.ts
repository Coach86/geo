import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { ScoringRulesService } from '../services/scoring-rules.service';
import { SnippetCriteria } from '../interfaces/scoring-rules.interface';
import { ScoreIssue } from '../schemas/content-score.schema';
import { SnippetAnalysisResultWithCalc, ScoreCalculationDetails, SubScore } from '../interfaces/score-calculation.interface';
import { SNIPPET_CONSTANTS, SCORING_CONSTANTS } from '../config/scoring-constants';

export interface SnippetAnalysisResult extends SnippetAnalysisResultWithCalc {
  score: number;
  avgSentenceWords: number;
  listCount: number;
  qaBlockCount: number;
  extractableBlocks: number;
  issues: ScoreIssue[];
  calculationDetails: ScoreCalculationDetails;
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
    const listData = this.countLists($);
    const qaData = this.countQABlocks($);
    const extractableData = this.countExtractableBlocks($);
    
    const listCount = listData.count;
    const qaBlockCount = qaData.count;
    const extractableBlocks = extractableData.count;

    // Calculate score
    let score = SNIPPET_CONSTANTS.SCORES.BASE; // Base score
    const issues: ScoreIssue[] = [];

    // Track sub-scores for calculation details
    let sentenceLengthScore = 0;
    let listScore = 0;
    let qaScore = 0;
    let extractableScore = 0;
    let wallOfTextPenalty = 0;

    // Use sentence length for internal scoring but don't expose as separate metric
    // Longer sentences hurt extractability
    if (avgSentenceWords <= criteria.maxSentenceWords) {
      sentenceLengthScore = SNIPPET_CONSTANTS.SCORES.SENTENCE_LENGTH_GOOD;
    } else {
      // Apply sentence length penalty internally (absorbed into other scoring)
      sentenceLengthScore = 0;
    }

    // Check for lists
    if (listCount > 0) {
      score += SNIPPET_CONSTANTS.SCORES.LISTS_PRESENT;
      listScore = SNIPPET_CONSTANTS.SCORES.LISTS_PRESENT;
      if (listCount >= SNIPPET_CONSTANTS.THRESHOLDS.MIN_LISTS_FOR_BONUS) {
        score += SNIPPET_CONSTANTS.SCORES.LISTS_MULTIPLE_BONUS; // Bonus for multiple lists
        listScore += SNIPPET_CONSTANTS.SCORES.LISTS_MULTIPLE_BONUS;
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
      score += SNIPPET_CONSTANTS.SCORES.QA_PRESENT;
      qaScore = SNIPPET_CONSTANTS.SCORES.QA_PRESENT;
      if (qaBlockCount >= SNIPPET_CONSTANTS.THRESHOLDS.MIN_QA_FOR_BONUS) {
        score += SNIPPET_CONSTANTS.SCORES.QA_MULTIPLE_BONUS; // Bonus for multiple Q&A sections
        qaScore += SNIPPET_CONSTANTS.SCORES.QA_MULTIPLE_BONUS;
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
      score += SNIPPET_CONSTANTS.SCORES.EXTRACTABLE_SUFFICIENT;
      extractableScore = SNIPPET_CONSTANTS.SCORES.EXTRACTABLE_SUFFICIENT;
    } else if (extractableBlocks > 0) {
      score += SNIPPET_CONSTANTS.SCORES.EXTRACTABLE_SOME;
      extractableScore = SNIPPET_CONSTANTS.SCORES.EXTRACTABLE_SOME;
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
      wallOfTextPenalty = SNIPPET_CONSTANTS.SCORES.WALL_OF_TEXT_PENALTY;
      score = Math.max(score - wallOfTextPenalty, SNIPPET_CONSTANTS.SCORES.BASE); // Penalty for wall of text
      issues.push({
        dimension: 'snippet',
        severity: 'high',
        description: 'Large unbroken paragraphs detected (wall of text)',
        recommendation: 'Break content into smaller paragraphs with clear headings',
      });
    }

    // Cap score at 100
    score = Math.min(score, SCORING_CONSTANTS.BASE_SCORE.PERFECT);

    // Generate calculation details
    const calculationDetails = this.generateCalculationDetails(
      sentenceLengthScore,
      listScore,
      qaScore,
      extractableScore,
      wallOfTextPenalty,
      score,
      {
        avgSentenceWords,
        listEvidence: listData.evidence,
        qaEvidence: qaData.evidence,
        extractableBlocks,
        extractableEvidence: extractableData.evidence
      }
    );

    return {
      score,
      avgSentenceWords,
      listCount,
      qaBlockCount,
      extractableBlocks,
      issues,
      calculationDetails,
    };
  }

  private calculateAverageSentenceWords($: cheerio.CheerioAPI): number {
    // Use the same robust content extraction as structure analyzer
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
    
    if (!contentText) {
      this.logger.debug(`[SNIPPET-ANALYZER] No content text found for sentence analysis`);
      return 0;
    }
    
    // Common abbreviations to handle
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
      .filter(s => s.trim().length > SCORING_CONSTANTS.TEXT_ANALYSIS.MIN_SENTENCE_LENGTH);
    
    if (sentences.length === 0) {
      this.logger.debug(`[SNIPPET-ANALYZER] No substantial sentences found for analysis`);
      return 0;
    }

    // Calculate average words per sentence
    let totalWords = 0;
    sentences.forEach(sentence => {
      const words = sentence.trim().split(/\s+/).filter(w => w.length > 0);
      totalWords += words.length;
    });

    const result = totalWords / sentences.length;
    this.logger.debug(`[SNIPPET-ANALYZER] Calculated avgSentenceWords: ${result.toFixed(1)} (${totalWords} words / ${sentences.length} sentences)`);
    return result;
  }

  private countLists($: cheerio.CheerioAPI): { count: number; evidence: string[] } {
    // Count ul and ol elements with actual content
    const listEvidence: string[] = [];
    const lists = $('ul, ol').filter((_, el) => {
      const items = $(el).find('li');
      if (items.length > 0) {
        const listType = el.tagName.toLowerCase() === 'ul' ? 'Unordered' : 'Ordered';
        const firstItems = items.slice(0, 3).map((_, item) => $(item).text().trim().substring(0, 40)).get();
        listEvidence.push(`${listType} list (${items.length} items): ${firstItems.join(', ')}${items.length > 3 ? '...' : ''}`);
        return true;
      }
      return false;
    });

    return { count: lists.length, evidence: listEvidence };
  }

  private countQABlocks($: cheerio.CheerioAPI): { count: number; evidence: string[] } {
    const foundQA = new Set<string>();
    const qaEvidence: string[] = [];

    // Pattern 1: FAQ schema
    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        const json = JSON.parse($(element).html() || '{}');
        if (json['@type'] === 'FAQPage' && json.mainEntity) {
          const count = Array.isArray(json.mainEntity) ? json.mainEntity.length : 1;
          foundQA.add(`schema-faq-${count}`);
          qaEvidence.push(`FAQ Schema: ${count} Q&A pairs`);
        }
      } catch (error) {
        // Ignore
      }
    });

    // Pattern 2: Question-like headings followed by content
    const questionPatterns = [
      SNIPPET_CONSTANTS.QA_PATTERNS.QUESTION_STARTERS,
      SNIPPET_CONSTANTS.QA_PATTERNS.QUESTION_MARK,
    ];

    $('h2, h3, h4').each((i, el) => {
      const text = $(el).text().trim();
      const hasQuestionPattern = questionPatterns.some(pattern => pattern.test(text));
      
      if (hasQuestionPattern) {
        // Check if followed by answer content
        const nextElement = $(el).next();
        if (nextElement.length && nextElement.text().trim().length > SNIPPET_CONSTANTS.QA_PATTERNS.MIN_ANSWER_LENGTH) {
          // Use element index to avoid duplicates
          foundQA.add(`heading-qa-${i}-${text.substring(0, 20)}`);
          qaEvidence.push(`Q: ${text.substring(0, 60)}${text.length > 60 ? '...' : ''}`);
        }
      }
    });

    // Pattern 3: DT/DD pairs (definition lists)
    $('dl').each((i, el) => {
      const dtCount = $(el).find('dt').length;
      const ddCount = $(el).find('dd').length;
      if (dtCount > 0 && ddCount > 0) {
        foundQA.add(`dl-${i}-pairs-${Math.min(dtCount, ddCount)}`);
        qaEvidence.push(`Definition List: ${Math.min(dtCount, ddCount)} Q&A pairs`);
      }
    });

    // Pattern 4: FAQ class/id patterns (but avoid double counting)
    const faqSelectors = SNIPPET_CONSTANTS.FAQ_SELECTORS;

    let faqSectionQAs = 0;
    faqSelectors.forEach(selector => {
      const elements = $(selector);
      if (elements.length > 0) {
        // Count question elements, but check if we already counted them as headings
        elements.find('h3, h4, h5, .question').each((i, el) => {
          const text = $(el).text().trim();
          const key = `faq-section-${selector}-${i}-${text.substring(0, 20)}`;
          if (!foundQA.has(`heading-qa-${i}-${text.substring(0, 20)}`)) {
            foundQA.add(key);
            faqSectionQAs++;
          }
        });
      }
    });

    return { count: foundQA.size, evidence: qaEvidence };
  }

  private countExtractableBlocks($: cheerio.CheerioAPI): { count: number; evidence: string[] } {
    let extractableCount = 0;
    const extractableEvidence: string[] = [];

    // Pattern 1: Short paragraphs (good for snippets)
    const shortParagraphs = $('p').filter((_, el) => {
      const text = $(el).text().trim();
      const wordCount = text.split(/\s+/).length;
      return wordCount >= SNIPPET_CONSTANTS.THRESHOLDS.SHORT_PARAGRAPH_MIN_WORDS && wordCount <= SNIPPET_CONSTANTS.THRESHOLDS.SHORT_PARAGRAPH_MAX_WORDS;
    });
    const shortParaCount = Math.floor(shortParagraphs.length / SNIPPET_CONSTANTS.THRESHOLDS.SHORT_PARAGRAPH_DIVISOR);
    if (shortParaCount > 0) {
      extractableCount += shortParaCount;
      extractableEvidence.push(`Short paragraphs: ${shortParaCount} blocks (${shortParagraphs.length} paragraphs)`);
    }

    // Pattern 2: Lists with intro text
    let listWithIntroCount = 0;
    $('p + ul, p + ol, h2 + ul, h2 + ol, h3 + ul, h3 + ol').each((_, el) => {
      listWithIntroCount++;
      const tagName = $(el).prop('tagName');
      const listType = tagName ? tagName.toLowerCase() : 'list';
      const itemCount = $(el).find('li').length;
      const firstItems = $(el).find('li').slice(0, 2).map((_, item) => $(item).text().trim().substring(0, 30)).get();
      extractableEvidence.push(`${listType.toUpperCase()} list with intro (${itemCount} items): ${firstItems.join(', ')}${itemCount > 2 ? '...' : ''}`);
    });
    extractableCount += listWithIntroCount;

    // Pattern 3: Definitions or key takeaways
    const definitionPatterns = [
      /^(definition:|what is|in short|in summary|key takeaway|bottom line)/i,
      /:\s*$/,
    ];

    let definitionCount = 0;
    $('p, div').each((_, el) => {
      const text = $(el).text().trim();
      if (definitionPatterns.some(pattern => pattern.test(text)) && text.length < SNIPPET_CONSTANTS.THRESHOLDS.DEFINITION_MAX_LENGTH) {
        definitionCount++;
        extractableEvidence.push(`Definition/summary: "${text.substring(0, 60)}${text.length > 60 ? '...' : ''}"`);
      }
    });
    extractableCount += definitionCount;

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

    let structuredCount = 0;
    structuredSelectors.forEach(selector => {
      const elements = $(selector);
      if (elements.length > 0) {
        structuredCount += elements.length;
        elements.each((_, el) => {
          const className = $(el).attr('class') || selector;
          const text = $(el).text().trim();
          extractableEvidence.push(`Structured block (${className}): "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
        });
      }
    });
    extractableCount += structuredCount;

    // Pattern 5: Tables with clear headers
    const tables = $('table').filter((_, el) => {
      return $(el).find('th').length > 0 || $(el).find('thead').length > 0;
    });
    if (tables.length > 0) {
      extractableCount += tables.length;
      tables.each((_, el) => {
        const headers = $(el).find('th').slice(0, 3).map((_, th) => $(th).text().trim()).get();
        const rowCount = $(el).find('tr').length;
        extractableEvidence.push(`Table with headers (${rowCount} rows): ${headers.join(', ')}${headers.length > 3 ? '...' : ''}`);
      });
    }

    return { count: extractableCount, evidence: extractableEvidence };
  }

  private detectWallOfText($: cheerio.CheerioAPI): boolean {
    // Get all substantial paragraphs
    const paragraphs = $('p').filter((_, el) => {
      const text = $(el).text().trim();
      return text.length > SCORING_CONSTANTS.TEXT_ANALYSIS.MIN_PARAGRAPH_LENGTH;
    });

    if (paragraphs.length === 0) return false;

    let longParagraphCount = 0;
    let veryLongParagraphCount = 0;
    let totalWordCount = 0;

    paragraphs.each((_, el) => {
      const text = $(el).text().trim();
      const wordCount = text.split(/\s+/).length;
      totalWordCount += wordCount;
      
      if (wordCount > SNIPPET_CONSTANTS.THRESHOLDS.LONG_PARAGRAPH_WORDS) {
        longParagraphCount++;
        if (wordCount > SNIPPET_CONSTANTS.THRESHOLDS.VERY_LONG_PARAGRAPH_WORDS) {
          veryLongParagraphCount++;
        }
      }
    });

    const avgWordsPerParagraph = totalWordCount / paragraphs.length;
    const longParagraphRatio = longParagraphCount / paragraphs.length;
    
    // Wall of text if:
    // 1. More than 40% of paragraphs are >100 words
    // 2. OR average paragraph length > 80 words
    // 3. OR any paragraph is extremely long (>200 words) and there are few paragraphs
    return longParagraphRatio > SNIPPET_CONSTANTS.THRESHOLDS.WALL_OF_TEXT_RATIO || 
           avgWordsPerParagraph > SNIPPET_CONSTANTS.THRESHOLDS.WALL_OF_TEXT_AVG_WORDS ||
           (veryLongParagraphCount > 0 && paragraphs.length < SNIPPET_CONSTANTS.THRESHOLDS.WALL_OF_TEXT_MIN_PARAGRAPHS);
  }

  private generateCalculationDetails(
    sentenceLengthScore: number,
    listScore: number,
    qaScore: number,
    extractableScore: number,
    wallOfTextPenalty: number,
    finalScore: number,
    evidence: {
      avgSentenceWords: number;
      listEvidence: string[];
      qaEvidence: string[];
      extractableBlocks: number;
      extractableEvidence: string[];
    }
  ): ScoreCalculationDetails {
    const subScores: SubScore[] = [
      {
        name: 'Base Score',
        value: SNIPPET_CONSTANTS.SCORES.BASE,
        weight: SNIPPET_CONSTANTS.WEIGHTS.BASE,
        maxValue: SNIPPET_CONSTANTS.SCORES.BASE,
        contribution: SNIPPET_CONSTANTS.SCORES.BASE,
        evidence: 'Base extractability score for all content',
      },
      {
        name: 'Lists & Structure',
        value: listScore + sentenceLengthScore, // Include sentence length for extractability
        weight: SNIPPET_CONSTANTS.WEIGHTS.LISTS + SNIPPET_CONSTANTS.WEIGHTS.SENTENCE_LENGTH,
        maxValue: SNIPPET_CONSTANTS.SCORES.LISTS_PRESENT + SNIPPET_CONSTANTS.SCORES.LISTS_MULTIPLE_BONUS + SNIPPET_CONSTANTS.SCORES.SENTENCE_LENGTH_GOOD,
        contribution: listScore + sentenceLengthScore,
        evidence: evidence.listEvidence.length > 0 ? evidence.listEvidence : 'No lists found',
      },
      {
        name: 'Q&A Blocks',
        value: qaScore,
        weight: SNIPPET_CONSTANTS.WEIGHTS.QA_BLOCKS,
        maxValue: SNIPPET_CONSTANTS.SCORES.QA_PRESENT + SNIPPET_CONSTANTS.SCORES.QA_MULTIPLE_BONUS,
        contribution: qaScore,
        evidence: evidence.qaEvidence.length > 0 ? evidence.qaEvidence : 'No Q&A blocks found',
      },
      {
        name: 'Extractable Content',
        value: extractableScore,
        weight: SNIPPET_CONSTANTS.WEIGHTS.EXTRACTABLE_BLOCKS,
        maxValue: SNIPPET_CONSTANTS.SCORES.EXTRACTABLE_SUFFICIENT,
        contribution: extractableScore,
        evidence: evidence.extractableEvidence.length > 0 
          ? evidence.extractableEvidence 
          : `${evidence.extractableBlocks} extractable content blocks found (no details available)`,
      },
    ];

    if (wallOfTextPenalty > 0) {
      subScores.push({
        name: 'Readability Penalty',
        value: wallOfTextPenalty,
        weight: SNIPPET_CONSTANTS.WEIGHTS.WALL_OF_TEXT_PENALTY,
        maxValue: SNIPPET_CONSTANTS.SCORES.WALL_OF_TEXT_PENALTY,
        contribution: -wallOfTextPenalty,
        evidence: 'Large unbroken paragraphs detected (wall of text)',
      });
    }

    return {
      formula: 'Score = Base (20) + Lists & Structure (40) + Q&A (20) + Extractable (20) - Readability Penalty',
      subScores,
      finalScore,
      explanation: `Snippet extractability score of ${finalScore} based on content structure, formatting, and readability factors.`,
    };
  }
}