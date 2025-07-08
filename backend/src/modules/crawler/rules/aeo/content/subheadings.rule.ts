import { Injectable, Logger } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category, EvidenceItem, RuleIssue } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';
import { SubheadingsIssueId, createSubheadingsIssue } from './subheadings.issues';
import * as cheerio from 'cheerio';


// Evidence topics for this rule
enum SubheadingsTopic {
  HEADING_ANALYSIS = 'Heading Analysis',
  HEADING_HIERARCHY = 'Heading Hierarchy',
  NO_SUBHEADINGS = 'No Subheadings',
  SUBHEADINGS = 'Subheadings',
  QUESTION_BASED_H2S = 'Question-based H2s',
  GENERIC_HEADINGS = 'Generic Headings'
}

@Injectable()
export class SubheadingsRule extends BaseAEORule {
  private readonly logger = new Logger(SubheadingsRule.name);
  
  /**
   * SCORING BREAKDOWN (from CSV):
   * 20: No subheadings
   * 40: Subheadings every >300 words
   * 60: Every 200-300 words
   * 80: Every 100-199 words with keyword variants
   * 100: Every ≤100 words, keyword variants + question-form H2s
   * 
   * Score 3 (Excellent):
   * - Density: Subheadings every ≤100 words
   * - Quality: Descriptive, logical, keyword variants, question-based
   * 
   * Score 2 (Good):
   * - Density: Subheadings every 100-199 words
   * - Quality: Descriptive with some keywords, logical structure
   * 
   * Score 1 (Poor):
   * - Density: Subheadings every 200-300+ words
   * - Quality: Generic subheadings lacking keywords
   * 
   * Score 0 (Not present):
   * - No subheadings at all
   */
  
  constructor() {
    super(
      'subheadings',
      'Subheadings (<h2>-<h6>)',
      'STRUCTURE' as Category,
      {
        impactScore: 3,
        pageTypes: [], // Applies to all page types
        isDomainLevel: false
      }
    );
  }

  async evaluate(url: string, content: PageContent): Promise<RuleResult> {
    const evidence: EvidenceItem[] = [];
    let score = 0;
    const scoreBreakdown: { component: string; points: number }[] = [];
    
    const html = content.html || '';
    const cleanText = content.cleanContent || '';
    const $ = cheerio.load(html);
    
    // Extract all heading levels using Cheerio
    const h2Elements = $('h2');
    const h3Elements = $('h3');
    const h4Elements = $('h4');
    const h5Elements = $('h5');
    const h6Elements = $('h6');
    
    const totalSubheadings = h2Elements.length + h3Elements.length + h4Elements.length + h5Elements.length + h6Elements.length;
    
    // Calculate word count
    const wordCount = cleanText.split(/\s+/).filter(word => word.length > 0).length;
    
    // Initialize variables for broader scope
    let wordsPerSubheading = 0;
    let questionPercentage = 0;
    
    // If no content or very short, not applicable
    if (wordCount < 50) {
      evidence.push(EvidenceHelper.warning(SubheadingsTopic.HEADING_ANALYSIS, 'Content too short to evaluate subheadings'));
      return this.createResult(0, evidence);
    }
    
    // Check if there are any subheadings
    if (totalSubheadings === 0) {
      evidence.push(EvidenceHelper.error(SubheadingsTopic.NO_SUBHEADINGS, 'No subheadings found (<h2>-<h6>)', { target: 'Add descriptive subheadings to break up content', score: 20, maxScore: 100 }));
      score = 20;
      scoreBreakdown.push({ component: 'No subheadings', points: 20 });
    } else {
      // Calculate subheading density
      wordsPerSubheading = Math.round(wordCount / totalSubheadings);
      
      // Build heading counts summary
      const headingCounts: string[] = [];
      if (h2Elements.length > 0) headingCounts.push(`${h2Elements.length} H2`);
      if (h3Elements.length > 0) headingCounts.push(`${h3Elements.length} H3`);
      if (h4Elements.length > 0) headingCounts.push(`${h4Elements.length} H4`);
      if (h5Elements.length > 0) headingCounts.push(`${h5Elements.length} H5`);
      if (h6Elements.length > 0) headingCounts.push(`${h6Elements.length} H6`);
      
      // Build heading structure for code snippet
      const headingStructure = this.buildHeadingStructure(html);
      
      evidence.push(EvidenceHelper.info(SubheadingsTopic.HEADING_ANALYSIS, `Found ${totalSubheadings} subheadings (${headingCounts.join(', ')})`, { code: headingStructure }));
      
      // Score based on density and show density info in single line
      if (wordsPerSubheading <= 100) {
        evidence.push(EvidenceHelper.success(SubheadingsTopic.SUBHEADINGS, `Excellent density: 1 subheading every ${wordsPerSubheading} words (≤100 words per subheading)`, { target: '≤100 words per subheading', score: 90, maxScore: 90 }));
        score = 90;
        scoreBreakdown.push({ component: 'Excellent density (≤100 words)', points: 90 });
      } else if (wordsPerSubheading <= 199) {
        evidence.push(EvidenceHelper.success(SubheadingsTopic.SUBHEADINGS, `Good density: 1 subheading every ${wordsPerSubheading} words (100-199 words per subheading)`, { target: '≤100 words per subheading for +10 points', score: 80, maxScore: 90 }));
        score = 80;
        scoreBreakdown.push({ component: 'Good density (100-199 words)', points: 80 });
      } else if (wordsPerSubheading <= 300) {
        evidence.push(EvidenceHelper.warning(SubheadingsTopic.SUBHEADINGS, `Moderate density: 1 subheading every ${wordsPerSubheading} words (200-300 words per subheading)`, { target: '≤100 words per subheading for +30 points', score: 60, maxScore: 90 }));
        score = 60;
        scoreBreakdown.push({ component: 'Moderate density (200-300 words)', points: 60 });
      } else {
        evidence.push(EvidenceHelper.error(SubheadingsTopic.SUBHEADINGS, `Poor density: 1 subheading every ${wordsPerSubheading} words (>300 words per subheading)`, { target: '≤100 words per subheading for +50 points', score: 40, maxScore: 90 }));
        score = 40;
        scoreBreakdown.push({ component: 'Poor density (>300 words)', points: 40 });
      }
      
      // Analyze subheading quality
      const h2Texts = h2Elements.map((i, el) => {
        return $(el).text().replace(/\s+/g, ' ').trim();
      }).get().filter(text => text.length > 0);
      
      // Check for question-based H2s
      const questionH2s = h2Texts.filter(text => text.includes('?'));
      questionPercentage = h2Texts.length > 0 ? (questionH2s.length / h2Texts.length) * 100 : 0;
      
      if (questionPercentage >= 30) {
        evidence.push(EvidenceHelper.success(SubheadingsTopic.QUESTION_BASED_H2S, `${Math.round(questionPercentage)}% of H2s are question-based`, { target: '≥30% question-based H2s', score: 10, maxScore: 10 }));
        score += 10; // Add question-based bonus to reach full 100
        scoreBreakdown.push({ component: 'Question-based H2s bonus', points: 10 });
      } else if (questionPercentage > 0) {
        evidence.push(EvidenceHelper.warning(SubheadingsTopic.QUESTION_BASED_H2S, `${Math.round(questionPercentage)}% of H2s are question-based`, { target: '≥30% for +10 points', score: Math.round(questionPercentage * 10 / 30), maxScore: 10 }));
        const partialBonus = Math.round(questionPercentage * 10 / 30);
        score += partialBonus;
        scoreBreakdown.push({ component: 'Partial question-based H2s bonus', points: partialBonus });
      } else {
        evidence.push(EvidenceHelper.warning(SubheadingsTopic.QUESTION_BASED_H2S, 'No question-based H2s found', { target: '≥30% question-based H2s for +10 points', score: 0, maxScore: 10 }));
        scoreBreakdown.push({ component: 'No question-based H2s', points: 0 });
      }
      
      // Check for generic headings
      const genericHeadings = ['Introduction', 'Overview', 'More Info', 'Details', 'Conclusion', 'Summary'];
      const genericCount = h2Texts.filter(text => 
        genericHeadings.some(generic => text.toLowerCase() === generic.toLowerCase())
      ).length;
      
      if (genericCount > 0) {
        const penalty = genericCount * 5;
        evidence.push(EvidenceHelper.warning(SubheadingsTopic.GENERIC_HEADINGS, `Found ${genericCount} generic subheading(s)`, { target: 'Use descriptive, keyword-rich subheadings', score: -penalty, maxScore: penalty }));
        score = Math.max(20, score - penalty);
        scoreBreakdown.push({ component: 'Generic headings penalty', points: -penalty });
      }
      
      // Check heading hierarchy
      const hierarchyResult = this.checkHeadingHierarchy(html);
      if (!hierarchyResult.isValid) {
        evidence.push(EvidenceHelper.warning(SubheadingsTopic.HEADING_HIERARCHY, 'Improper heading hierarchy detected', { 
          target: 'Ensure H3s follow H2s, H4s follow H3s, etc.', 
          score: -10, 
          maxScore: 10,
          code: hierarchyResult.inconsistencies
        }));
        score = Math.max(20, score - 10);
        scoreBreakdown.push({ component: 'Improper hierarchy penalty', points: -10 });
      } else {
        scoreBreakdown.push({ component: 'Proper heading hierarchy', points: 0 });
      }
    }
    
    // Cap score at 100
    score = Math.min(100, Math.max(20, score));
    
    // Add score calculation explanation using the same format as structured-data
    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    // Generate issues based on problems found
    const issues: RuleIssue[] = [];
    
    // Check heading hierarchy
    const hierarchyResult = this.checkHeadingHierarchy(html);
    
    if (h2Elements.length === 0 && totalSubheadings > 0) {
      issues.push(createSubheadingsIssue(SubheadingsIssueId.NO_H2_HEADINGS));
    }
    
    if (totalSubheadings === 0) {
      issues.push(createSubheadingsIssue(SubheadingsIssueId.NO_SUBHEADINGS));
    } else if (totalSubheadings < 3 && wordCount > 300) {
      issues.push(createSubheadingsIssue(
        SubheadingsIssueId.TOO_FEW_SUBHEADINGS,
        undefined,
        `Only ${totalSubheadings} subheading(s) found for ${wordCount} words`
      ));
    }
    
    if (!hierarchyResult.isValid) {
      issues.push(createSubheadingsIssue(SubheadingsIssueId.BROKEN_HIERARCHY));
    }
    
    // Check for missing H3 when having H4
    if (h4Elements.length > 0 && h3Elements.length === 0) {
      issues.push(createSubheadingsIssue(SubheadingsIssueId.H4_WITHOUT_H3));
    }
    
    // Check for poor density
    if (wordsPerSubheading > 300) {
      issues.push(createSubheadingsIssue(
        SubheadingsIssueId.POOR_DENSITY,
        undefined,
        `Content has ${wordsPerSubheading} words per subheading`
      ));
    }
    
    // Check question percentage
    if (questionPercentage === 0 && totalSubheadings > 3) {
      issues.push(createSubheadingsIssue(SubheadingsIssueId.NO_QUESTIONS));
    }
    
    return this.createResult(score, evidence, issues);
  }
  
  private buildHeadingStructure(html: string): string {
    const $ = cheerio.load(html);
    const structure: string[] = [];
    
    // Get all heading elements h2-h6 in document order
    $('h2, h3, h4, h5, h6').each((i, el) => {
      const level = parseInt(el.tagName.substring(1));
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      const indent = '  '.repeat(level - 2);
      structure.push(`${indent}H${level}: ${text}`);
    });
    
    // Limit to first 10 headings to avoid too long output
    if (structure.length > 10) {
      return structure.slice(0, 10).join('\n') + '\n  ... (truncated)';
    }
    
    return structure.join('\n');
  }

  private checkHeadingHierarchy(html: string): { isValid: boolean; inconsistencies: string } {
    const $ = cheerio.load(html);
    const headings: { level: number; text: string }[] = [];
    const inconsistencies: string[] = [];
    
    // Extract all headings with their level and text using Cheerio
    $('h2, h3, h4, h5, h6').each((i, el) => {
      const level = parseInt(el.tagName.substring(1));
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      headings.push({ level, text });
    });
    
    // Check that heading levels don't skip (e.g., H2 → H4 without H3)
    for (let i = 1; i < headings.length; i++) {
      const current = headings[i];
      const previous = headings[i - 1];
      
      // If current level is deeper, it should only be 1 level deeper
      if (current.level > previous.level && current.level - previous.level > 1) {
        inconsistencies.push(`H${previous.level}: "${previous.text}" → H${current.level}: "${current.text}" (skipped H${previous.level + 1})`);
      }
    }
    
    return {
      isValid: inconsistencies.length === 0,
      inconsistencies: inconsistencies.length > 0 ? inconsistencies.join('\n') : ''
    };
  }
}