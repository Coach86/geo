import { Injectable } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';

@Injectable()
export class MetaDescriptionRule extends BaseAEORule {
  constructor() {
    super(
      'meta_description',
      'Meta Description',
      'CONTENT' as Category,
      {
        impactScore: 3,
        pageTypes: [],
        isDomainLevel: false
      }
    );
  }

  async evaluate(url: string, content: PageContent): Promise<RuleResult> {
    const evidence: EvidenceItem[] = [];
    const recommendations: string[] = [];
    let score = 0;
    const scoreBreakdown: { component: string; points: number }[] = [];
    
    const html = content.html || '';
    
    // Extract meta description
    const metaDescPattern = /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*?)["'][^>]*>/i;
    const metaDescMatch = html.match(metaDescPattern);
    
    if (!metaDescMatch) {
      evidence.push(EvidenceHelper.error('No meta description found'));
      recommendations.push('Add a meta description tag with 120-160 characters');
      return this.createResult(0, evidence, undefined, undefined, recommendations);
    }
    
    const metaDescription = metaDescMatch[1].trim();
    const descLength = metaDescription.length;
    
    score += 20;
    scoreBreakdown.push({ component: 'Meta description present', points: 20 });
    evidence.push(EvidenceHelper.info('Meta description present', { score: 20 }));
    
    // Check length and create combined evidence item
    if (descLength >= 120 && descLength <= 160) {
      evidence.push(EvidenceHelper.success(`Good meta description found (${descLength} characters)`, { 
        code: metaDescription,
        target: '120-160 characters',
        score: 30
      }));
      score += 30;
      scoreBreakdown.push({ component: 'Optimal length', points: 30 });
    } else if (descLength >= 50 && descLength < 120) {
      evidence.push(EvidenceHelper.warning(`Too short meta description found (${descLength} characters)`, { 
        code: metaDescription,
        target: '120-160 characters for +30 points',
        score: 15
      }));
      recommendations.push('Expand meta description to 120-160 characters');
      score += 15;
      scoreBreakdown.push({ component: 'Short length', points: 15 });
    } else if (descLength > 160 && descLength <= 200) {
      evidence.push(EvidenceHelper.warning(`Too long meta description found (${descLength} characters)`, { 
        code: metaDescription,
        target: '120-160 characters for +30 points',
        score: 15
      }));
      recommendations.push('Shorten meta description to 120-160 characters');
      score += 15;
      scoreBreakdown.push({ component: 'Long length', points: 15 });
    } else if (descLength > 200) {
      evidence.push(EvidenceHelper.error(`Much too long meta description found (${descLength} characters)`, { 
        code: metaDescription,
        target: '120-160 characters for +30 points',
        score: 5
      }));
      recommendations.push('Significantly shorten meta description to 120-160 characters');
      score += 5;
      scoreBreakdown.push({ component: 'Very long length', points: 5 });
    } else {
      evidence.push(EvidenceHelper.error(`Much too short meta description found (${descLength} characters)`, { 
        code: metaDescription,
        target: '120-160 characters for +30 points',
        score: 5
      }));
      recommendations.push('Significantly expand meta description to 120-160 characters');
      score += 5;
      scoreBreakdown.push({ component: 'Very short length', points: 5 });
    }
    
    // Check for keyword stuffing
    const words = metaDescription.toLowerCase().split(/\s+/);
    const wordFreq: Record<string, number> = {};
    words.forEach(word => {
      if (word.length > 3) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });
    
    const repeatedWords = Object.entries(wordFreq).filter(([_, count]) => count > 2);
    if (repeatedWords.length > 0) {
      evidence.push(EvidenceHelper.warning(`Possible keyword stuffing: ${repeatedWords.map(([word, count]) => `"${word}" (${count}x)`).join(', ')}`, { score: -10 }));
      score -= 10;
      scoreBreakdown.push({ component: 'Keyword stuffing penalty', points: -10 });
    } else {
      evidence.push(EvidenceHelper.success('No keyword stuffing detected', { score: 10 }));
      score += 10;
      scoreBreakdown.push({ component: 'No keyword stuffing', points: 10 });
    }
    
    // Check for call-to-action or compelling language
    const ctaPatterns = [
      /\b(?:learn|discover|find out|explore|get|start|try|see|read)\b/i,
      /\b(?:best|top|guide|how to|tips|free|new|exclusive)\b/i
    ];
    
    // Find which compelling words are present
    const compellingWords: string[] = [];
    ctaPatterns.forEach(pattern => {
      const matches = metaDescription.match(pattern);
      if (matches) {
        compellingWords.push(...matches);
      }
    });
    
    if (compellingWords.length > 0) {
      evidence.push(EvidenceHelper.success('Contains compelling/action-oriented language', { 
        code: compellingWords.join(', '),
        score: 15
      }));
      score += 15;
      scoreBreakdown.push({ component: 'Compelling language', points: 15 });
    } else {
      evidence.push(EvidenceHelper.warning('Lacks compelling call-to-action language', {
        target: 'Add action-oriented words for +15 points',
        score: 0
      }));
      recommendations.push('Add action-oriented words (learn, discover, explore, etc.) for +15 points');
    }
    
    // Check for special characters that enhance SERP appearance
    const hasSpecialChars = /[→•✓★†‡§¶]/.test(metaDescription);
    if (hasSpecialChars) {
      evidence.push(EvidenceHelper.success('Uses special characters for SERP enhancement', { score: 5 }));
      score += 5;
      scoreBreakdown.push({ component: 'Special characters', points: 5 });
    }
    
    // Check if it's unique (not duplicate of title or H1)
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    
    if (titleMatch && metaDescription.toLowerCase() === titleMatch[1].toLowerCase()) {
      evidence.push(EvidenceHelper.error('Duplicates title tag', { 
        code: titleMatch[1],
        score: -15
      }));
      score -= 15;
      scoreBreakdown.push({ component: 'Duplicates title penalty', points: -15 });
    } else if (h1Match && metaDescription.toLowerCase() === h1Match[1].replace(/<[^>]+>/g, '').trim().toLowerCase()) {
      const h1Text = h1Match[1].replace(/<[^>]+>/g, '').trim();
      evidence.push(EvidenceHelper.error('Duplicates H1 tag', { 
        code: h1Text,
        score: -15
      }));
      score -= 15;
      scoreBreakdown.push({ component: 'Duplicates H1 penalty', points: -15 });
    } else {
      // Show a snippet of the unique description
      const snippet = metaDescription.length > 60 ? metaDescription.substring(0, 60) + '...' : metaDescription;
      evidence.push(EvidenceHelper.success('Unique description (not duplicate of title/H1)', { 
        code: snippet,
        score: 10
      }));
      score += 10;
      scoreBreakdown.push({ component: 'Unique description', points: 10 });
    }
    
    // Final scoring
    score = Math.min(100, Math.max(0, score));
    
    if (score >= 60) {
      evidence.push(EvidenceHelper.success('Good meta description'));
    } else if (score >= 40) {
      evidence.push(EvidenceHelper.warning('Meta description needs improvement'));
    } else {
      evidence.push(EvidenceHelper.error('Poor meta description'));
    }
    
    // Add score calculation explanation using the same format as structured-data
    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    return this.createResult(score, evidence, undefined, undefined, recommendations);
  }
}