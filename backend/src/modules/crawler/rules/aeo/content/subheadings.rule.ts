import { Injectable, Logger } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';

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
      'CONTENT' as Category,
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
    
    // Extract all heading levels
    const h2Matches = html.match(/<h2[^>]*>([^<]+)<\/h2>/gi) || [];
    const h3Matches = html.match(/<h3[^>]*>([^<]+)<\/h3>/gi) || [];
    const h4Matches = html.match(/<h4[^>]*>([^<]+)<\/h4>/gi) || [];
    const h5Matches = html.match(/<h5[^>]*>([^<]+)<\/h5>/gi) || [];
    const h6Matches = html.match(/<h6[^>]*>([^<]+)<\/h6>/gi) || [];
    
    const totalSubheadings = h2Matches.length + h3Matches.length + h4Matches.length + h5Matches.length + h6Matches.length;
    
    // Calculate word count
    const wordCount = cleanText.split(/\s+/).filter(word => word.length > 0).length;
    
    // Initialize variables for broader scope
    let wordsPerSubheading = 0;
    let questionPercentage = 0;
    
    // If no content or very short, not applicable
    if (wordCount < 50) {
      evidence.push(EvidenceHelper.warning('Content too short to evaluate subheadings'));
      return this.createResult(0, evidence);
    }
    
    // Check if there are any subheadings
    if (totalSubheadings === 0) {
      evidence.push(EvidenceHelper.error('No subheadings found (<h2>-<h6>)', { target: 'Add descriptive subheadings to break up content', score: 20 }));
      score = 20;
      scoreBreakdown.push({ component: 'No subheadings', points: 20 });
    } else {
      // Calculate subheading density
      wordsPerSubheading = Math.round(wordCount / totalSubheadings);
      
      // Build heading counts summary
      const headingCounts: string[] = [];
      if (h2Matches.length > 0) headingCounts.push(`${h2Matches.length} H2`);
      if (h3Matches.length > 0) headingCounts.push(`${h3Matches.length} H3`);
      if (h4Matches.length > 0) headingCounts.push(`${h4Matches.length} H4`);
      if (h5Matches.length > 0) headingCounts.push(`${h5Matches.length} H5`);
      if (h6Matches.length > 0) headingCounts.push(`${h6Matches.length} H6`);
      
      // Build heading structure for code snippet
      const headingStructure = this.buildHeadingStructure(html);
      
      evidence.push(EvidenceHelper.info(`Found ${totalSubheadings} subheadings (${headingCounts.join(', ')})`, { code: headingStructure }));
      
      // Score based on density and show density info in single line
      if (wordsPerSubheading <= 100) {
        evidence.push(EvidenceHelper.success(`Excellent density: 1 subheading every ${wordsPerSubheading} words (≤100 words per subheading)`, { target: '≤100 words per subheading', score: 100 }));
        score = 100;
        scoreBreakdown.push({ component: 'Excellent density (≤100 words)', points: 100 });
      } else if (wordsPerSubheading <= 199) {
        evidence.push(EvidenceHelper.success(`Good density: 1 subheading every ${wordsPerSubheading} words (100-199 words per subheading)`, { target: '≤100 words per subheading for +20 points', score: 80 }));
        score = 80;
        scoreBreakdown.push({ component: 'Good density (100-199 words)', points: 80 });
      } else if (wordsPerSubheading <= 300) {
        evidence.push(EvidenceHelper.warning(`Moderate density: 1 subheading every ${wordsPerSubheading} words (200-300 words per subheading)`, { target: '≤100 words per subheading for +40 points', score: 60 }));
        score = 60;
        scoreBreakdown.push({ component: 'Moderate density (200-300 words)', points: 60 });
      } else {
        evidence.push(EvidenceHelper.error(`Poor density: 1 subheading every ${wordsPerSubheading} words (>300 words per subheading)`, { target: '≤100 words per subheading for +60 points', score: 40 }));
        score = 40;
        scoreBreakdown.push({ component: 'Poor density (>300 words)', points: 40 });
      }
      
      // Analyze subheading quality
      const h2Texts = h2Matches.map(match => {
        const textMatch = match.match(/<h2[^>]*>([^<]+)<\/h2>/i);
        return textMatch ? textMatch[1].trim() : '';
      }).filter(text => text.length > 0);
      
      // Check for question-based H2s
      const questionH2s = h2Texts.filter(text => text.includes('?'));
      questionPercentage = h2Texts.length > 0 ? (questionH2s.length / h2Texts.length) * 100 : 0;
      
      if (questionPercentage >= 30) {
        evidence.push(EvidenceHelper.success(`${Math.round(questionPercentage)}% of H2s are question-based`, { target: '≥30% question-based H2s', score: 10 }));
        if (score >= 80) {
          score += 10; // Bonus for question-based headers
          scoreBreakdown.push({ component: 'Question-based H2s bonus', points: 10 });
        }
      } else if (questionPercentage > 0) {
        evidence.push(EvidenceHelper.warning(`${Math.round(questionPercentage)}% of H2s are question-based`, { target: '≥30% for +10 points bonus', score: 0 }));
      } else {
        evidence.push(EvidenceHelper.warning('No question-based H2s found', { target: '≥30% question-based H2s for +10 points bonus', score: 0 }));
        if (score >= 80) {
          score -= 10; // Penalty for lack of questions
          scoreBreakdown.push({ component: 'No question-based H2s penalty', points: -10 });
        }
      }
      
      // Check for generic headings
      const genericHeadings = ['Introduction', 'Overview', 'More Info', 'Details', 'Conclusion', 'Summary'];
      const genericCount = h2Texts.filter(text => 
        genericHeadings.some(generic => text.toLowerCase() === generic.toLowerCase())
      ).length;
      
      if (genericCount > 0) {
        const penalty = genericCount * 5;
        evidence.push(EvidenceHelper.warning(`Found ${genericCount} generic subheading(s)`, { target: 'Use descriptive, keyword-rich subheadings', score: -penalty }));
        score = Math.max(20, score - penalty);
        scoreBreakdown.push({ component: 'Generic headings penalty', points: -penalty });
      }
      
      // Check heading hierarchy
      const hasProperHierarchy = this.checkHeadingHierarchy(html);
      if (!hasProperHierarchy) {
        evidence.push(EvidenceHelper.warning('Improper heading hierarchy detected', { target: 'Ensure H3s follow H2s, H4s follow H3s, etc.', score: -10 }));
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
    
    return this.createResult(score, evidence);
  }
  
  private buildHeadingStructure(html: string): string {
    const headingRegex = /<h([2-6])[^>]*>([^<]+)<\/h([2-6])>/gi;
    const structure: string[] = [];
    let match;
    
    while ((match = headingRegex.exec(html)) !== null) {
      const level = parseInt(match[1]);
      const text = match[2].trim();
      const indent = '  '.repeat(level - 2);
      structure.push(`${indent}H${level}: ${text}`);
    }
    
    // Limit to first 10 headings to avoid too long output
    if (structure.length > 10) {
      return structure.slice(0, 10).join('\n') + '\n  ... (truncated)';
    }
    
    return structure.join('\n');
  }

  private checkHeadingHierarchy(html: string): boolean {
    // Extract all headings with their level
    const headingRegex = /<h([2-6])[^>]*>/gi;
    const headings: number[] = [];
    let match;
    
    while ((match = headingRegex.exec(html)) !== null) {
      headings.push(parseInt(match[1]));
    }
    
    // Check that heading levels don't skip (e.g., H2 → H4 without H3)
    for (let i = 1; i < headings.length; i++) {
      const currentLevel = headings[i];
      const previousLevel = headings[i - 1];
      
      // If current level is deeper, it should only be 1 level deeper
      if (currentLevel > previousLevel && currentLevel - previousLevel > 1) {
        return false;
      }
    }
    
    return true;
  }
}