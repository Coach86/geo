import { Injectable, Logger } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category, EvidenceItem, RuleIssue } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';
import { LlmService } from '../../../../llm/services/llm.service';
import { LlmProvider } from '../../../../llm/interfaces/llm-provider.enum';
import { z } from 'zod';
import { MetaDescriptionIssueId, createMetaDescriptionIssue } from './meta-description.issues';

// Evidence topics for this rule
enum MetaDescriptionTopic {
  TAG_PRESENCE = 'Tag Presence',
  CONTENT_LENGTH = 'Content Length',
  KEYWORD_STUFFING = 'Keyword Stuffing',
  COMPELLING_LANGUAGE = 'Compelling Language',
  SPECIAL_CHARS = 'Special Characters',
  UNIQUENESS = 'Uniqueness',
  OVERALL_QUALITY = 'Overall Quality'
}

// Zod schema for LLM analysis of compelling language
const CompellingLanguageSchema = z.object({
  hasCompellingLanguage: z.boolean().describe('Whether the meta description contains compelling call-to-action or persuasive language'),
  compellingWords: z.array(z.string()).describe('List of compelling/action-oriented words found (if any)'),
  language: z.string().describe('Detected language of the meta description'),
  analysis: z.string().describe('Brief explanation of why the language is or is not compelling'),
  suggestions: z.array(z.string()).describe('Specific suggestions for improving compelling language (if needed)')
});

type CompellingLanguageAnalysis = z.infer<typeof CompellingLanguageSchema>;

@Injectable()
export class MetaDescriptionRule extends BaseAEORule {
  private readonly logger = new Logger(MetaDescriptionRule.name);
  
  // LLM configuration
  private static readonly LLM_TEMPERATURE = 0.3;
  private static readonly LLM_MAX_TOKENS = 1000;
  
  // Provider chain for compelling language analysis
  private static readonly LLM_PROVIDERS: Array<{ provider: LlmProvider; model: string }> = [
    { provider: LlmProvider.OpenAI, model: 'gpt-4o-mini' }, // Primary
    { provider: LlmProvider.Anthropic, model: 'claude-3-5-sonnet' }, // Latest Claude
    { provider: LlmProvider.Google, model: 'gemini-2.0-flash' }, // Latest Gemini
  ];
  
  constructor(
    private readonly llmService: LlmService
  ) {
    super(
      'meta_description',
      'Meta Description',
      'STRUCTURE' as Category,
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
      evidence.push(EvidenceHelper.error(MetaDescriptionTopic.TAG_PRESENCE, 'No meta description found'));
      recommendations.push('Add a meta description tag with 120-160 characters');
      
      const issues = [createMetaDescriptionIssue(MetaDescriptionIssueId.NO_META_DESCRIPTION)];
      
      return this.createResult(0, evidence, issues, undefined, recommendations);
    }
    
    const metaDescription = metaDescMatch[1].trim();
    const descLength = metaDescription.length;
    
    score += 20;
    scoreBreakdown.push({ component: 'Meta description present', points: 20 });
    evidence.push(EvidenceHelper.info(MetaDescriptionTopic.TAG_PRESENCE, 'Meta description present', { score: 20, maxScore: 20 }));
    
    // Check length and create combined evidence item
    if (descLength >= 120 && descLength <= 160) {
      evidence.push(EvidenceHelper.success(MetaDescriptionTopic.CONTENT_LENGTH, `Good meta description found (${descLength} characters)`, { 
        code: metaDescription,
        target: '120-160 characters',
        score: 35,
        maxScore: 35
      }));
      score += 35;
      scoreBreakdown.push({ component: 'Optimal length', points: 35 });
    } else if (descLength >= 50 && descLength < 120) {
      evidence.push(EvidenceHelper.warning(MetaDescriptionTopic.CONTENT_LENGTH, `Too short meta description found (${descLength} characters)`, { 
        code: metaDescription,
        target: '120-160 characters for +35 points',
        score: 18,
        maxScore: 35
      }));
      recommendations.push('Expand meta description to 120-160 characters');
      score += 18;
      scoreBreakdown.push({ component: 'Short length', points: 18 });
    } else if (descLength > 160 && descLength <= 200) {
      evidence.push(EvidenceHelper.warning(MetaDescriptionTopic.CONTENT_LENGTH, `Too long meta description found (${descLength} characters)`, { 
        code: metaDescription,
        target: '120-160 characters for +35 points',
        score: 18,
        maxScore: 35
      }));
      recommendations.push('Shorten meta description to 120-160 characters');
      score += 18;
      scoreBreakdown.push({ component: 'Long length', points: 18 });
    } else if (descLength > 200) {
      evidence.push(EvidenceHelper.error(MetaDescriptionTopic.CONTENT_LENGTH, `Much too long meta description found (${descLength} characters)`, { 
        code: metaDescription,
        target: '120-160 characters for +35 points',
        score: 8,
        maxScore: 35
      }));
      recommendations.push('Significantly shorten meta description to 120-160 characters');
      score += 8;
      scoreBreakdown.push({ component: 'Very long length', points: 8 });
    } else {
      evidence.push(EvidenceHelper.error(MetaDescriptionTopic.CONTENT_LENGTH, `Much too short meta description found (${descLength} characters)`, { 
        code: metaDescription,
        target: '120-160 characters for +35 points',
        score: 8,
        maxScore: 35
      }));
      recommendations.push('Significantly expand meta description to 120-160 characters');
      score += 8;
      scoreBreakdown.push({ component: 'Very short length', points: 8 });
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
      evidence.push(EvidenceHelper.warning(MetaDescriptionTopic.KEYWORD_STUFFING, `Possible keyword stuffing: ${repeatedWords.map(([word, count]) => `"${word}" (${count}x)`).join(', ')}`, { score: -10, maxScore: 10 }));
      score -= 10;
      scoreBreakdown.push({ component: 'Keyword stuffing penalty', points: -10 });
    } else {
      evidence.push(EvidenceHelper.success(MetaDescriptionTopic.KEYWORD_STUFFING, 'No keyword stuffing detected', { score: 10, maxScore: 10 }));
      score += 10;
      scoreBreakdown.push({ component: 'No keyword stuffing', points: 10 });
    }
    
    // Check for call-to-action or compelling language using LLM (multilingual support)
    score = await this.analyzeCompellingLanguage(metaDescription, evidence, recommendations, scoreBreakdown, score);
    
    // Check for special characters that enhance SERP appearance
    const hasSpecialChars = /[→•✓★†‡§¶]/.test(metaDescription);
    if (hasSpecialChars) {
      evidence.push(EvidenceHelper.success(MetaDescriptionTopic.SPECIAL_CHARS, 'Uses special characters for SERP enhancement', { score: 5, maxScore: 5 }));
      score += 5;
      scoreBreakdown.push({ component: 'Special characters', points: 5 });
    } else {
      evidence.push(EvidenceHelper.info(MetaDescriptionTopic.SPECIAL_CHARS, 'No special characters used', { 
        score: 0, 
        maxScore: 5,
        target: 'Consider adding special characters (→•✓★) for visual appeal'
      }));
      scoreBreakdown.push({ component: 'No special characters', points: 0 });
    }
    
    // Check if it's unique (not duplicate of title or H1)
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    
    if (titleMatch && metaDescription.toLowerCase() === titleMatch[1].toLowerCase()) {
      evidence.push(EvidenceHelper.error(MetaDescriptionTopic.UNIQUENESS, 'Duplicates title tag', { 
        code: titleMatch[1],
        score: -15,
        maxScore: 15
      }));
      score -= 15;
      scoreBreakdown.push({ component: 'Duplicates title penalty', points: -15 });
    } else if (h1Match && metaDescription.toLowerCase() === h1Match[1].replace(/<[^>]+>/g, '').trim().toLowerCase()) {
      const h1Text = h1Match[1].replace(/<[^>]+>/g, '').trim();
      evidence.push(EvidenceHelper.error(MetaDescriptionTopic.UNIQUENESS, 'Duplicates H1 tag', { 
        code: h1Text,
        score: -15,
        maxScore: 15
      }));
      score -= 15;
      scoreBreakdown.push({ component: 'Duplicates H1 penalty', points: -15 });
    } else {
      // Show a snippet of the unique description
      const snippet = metaDescription.length > 60 ? metaDescription.substring(0, 60) + '...' : metaDescription;
      evidence.push(EvidenceHelper.success(MetaDescriptionTopic.UNIQUENESS, 'Unique description (not duplicate of title/H1)', { 
        code: snippet,
        score: 15,
        maxScore: 15
      }));
      score += 15;
      scoreBreakdown.push({ component: 'Unique description', points: 15 });
    }
    
    // Final scoring
    score = Math.min(100, Math.max(0, score));
    
    if (score >= 60) {
      evidence.push(EvidenceHelper.success(MetaDescriptionTopic.OVERALL_QUALITY, 'Good meta description'));
    } else if (score >= 40) {
      evidence.push(EvidenceHelper.warning(MetaDescriptionTopic.OVERALL_QUALITY, 'Meta description needs improvement'));
    } else {
      evidence.push(EvidenceHelper.error(MetaDescriptionTopic.OVERALL_QUALITY, 'Poor meta description'));
    }
    
    // Add score calculation explanation using the same format as structured-data
    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    // Generate issues based on problems found
    const issues: RuleIssue[] = [];
    
    if (descLength < 50) {
      issues.push(createMetaDescriptionIssue(
        MetaDescriptionIssueId.TOO_SHORT,
        [metaDescription],
        `Meta description too short (${descLength} characters)`
      ));
    } else if (descLength > 170) {
      issues.push(createMetaDescriptionIssue(
        MetaDescriptionIssueId.TOO_LONG,
        [metaDescription],
        `Meta description too long (${descLength} characters)`
      ));
    }
    
    // Check for compelling language score
    const compellingScore = scoreBreakdown.find(item => item.component.includes('Compelling language'))?.points || 0;
    if (compellingScore < 10) {
      issues.push(createMetaDescriptionIssue(MetaDescriptionIssueId.LACKS_COMPELLING));
    }
    
    // Check for duplicates
    const duplicatesTitle = scoreBreakdown.some(item => item.component.includes('Duplicates title'));
    const duplicatesH1 = scoreBreakdown.some(item => item.component.includes('Duplicates H1'));
    
    if (duplicatesTitle) {
      issues.push(createMetaDescriptionIssue(MetaDescriptionIssueId.DUPLICATES_TITLE));
    } else if (duplicatesH1) {
      issues.push(createMetaDescriptionIssue(MetaDescriptionIssueId.DUPLICATES_H1));
    }
    
    // Check for keyword stuffing
    if (repeatedWords.length > 0) {
      issues.push(createMetaDescriptionIssue(
        MetaDescriptionIssueId.KEYWORD_STUFFING,
        repeatedWords.map(([word]) => word),
        `Possible keyword stuffing: ${repeatedWords.map(([word, count]) => `"${word}" (${count}x)`).join(', ')}`
      ));
    }
    
    return this.createResult(score, evidence, issues, undefined, recommendations);
  }
  
  private async analyzeCompellingLanguage(
    metaDescription: string,
    evidence: EvidenceItem[],
    recommendations: string[],
    scoreBreakdown: { component: string; points: number }[],
    currentScore: number
  ): Promise<number> {
    let score = currentScore;
    
    // Create analysis prompt
    const prompt = `Analyze this meta description for compelling, action-oriented language that would encourage clicks in search results:

Meta Description: "${metaDescription}"

Evaluate whether it contains:
1. Call-to-action words (learn, discover, explore, get, try, etc.)
2. Compelling adjectives (best, top, exclusive, new, free, etc.)
3. Persuasive language that encourages engagement
4. Action-oriented verbs

Consider this in ANY language - not just English. Detect the language and analyze appropriately.

Return structured analysis including:
- Whether it has compelling language
- List of compelling words found
- Language detected
- Brief analysis
- Suggestions for improvement (if needed)`;

    let llmResponse: CompellingLanguageAnalysis | null = null;
    let successfulProvider: string | null = null;
    let lastError: Error | null = null;
    
    try {
      // Try providers in order
      for (const { provider, model } of MetaDescriptionRule.LLM_PROVIDERS) {
        try {
          if (this.llmService.isProviderAvailable(provider)) {
            llmResponse = await this.llmService.getStructuredOutput(
              provider,
              prompt,
              CompellingLanguageSchema,
              { 
                model,
                temperature: MetaDescriptionRule.LLM_TEMPERATURE,
                maxTokens: MetaDescriptionRule.LLM_MAX_TOKENS
              }
            );
            successfulProvider = `${provider}/${model}`;
            this.logger.log(`MetaDescriptionRule: Successfully used ${successfulProvider} for compelling language analysis`);
            break;
          }
        } catch (error) {
          this.logger.error(`MetaDescriptionRule: Provider ${provider}/${model} failed:`, error);
          lastError = new Error(`${provider}/${model} failed: ${error.message}`);
          continue;
        }
      }
      
      if (!llmResponse) {
        throw lastError || new Error('All LLM providers failed to analyze compelling language');
      }
      
      // Process LLM response
      if (llmResponse.hasCompellingLanguage) {
        evidence.push(EvidenceHelper.success(MetaDescriptionTopic.COMPELLING_LANGUAGE, 
          `Contains compelling language (${llmResponse.language})`, { 
          code: llmResponse.compellingWords.join(', '),
          target: llmResponse.analysis,
          score: 15,
          maxScore: 15
        }));
        score += 15;
        scoreBreakdown.push({ component: 'Compelling language', points: 15 });
      } else {
        evidence.push(EvidenceHelper.warning(MetaDescriptionTopic.COMPELLING_LANGUAGE, 
          `Lacks compelling call-to-action language (${llmResponse.language})`, {
          target: llmResponse.analysis,
          score: 0,
          maxScore: 15
        }));
        
        // Add specific suggestions from LLM
        if (llmResponse.suggestions.length > 0) {
          llmResponse.suggestions.forEach(suggestion => {
            recommendations.push(suggestion);
          });
        } else {
          recommendations.push('Add action-oriented words for +15 points');
        }
      }
      
    } catch (error) {
      // Fallback to basic regex patterns if LLM fails
      this.logger.error('MetaDescriptionRule: LLM analysis failed, falling back to regex patterns:', error);
      
      const ctaPatterns = [
        /\b(?:learn|discover|find out|explore|get|start|try|see|read)\b/i,
        /\b(?:best|top|guide|how to|tips|free|new|exclusive)\b/i
      ];
      
      const compellingWords: string[] = [];
      ctaPatterns.forEach(pattern => {
        const matches = metaDescription.match(pattern);
        if (matches) {
          compellingWords.push(...matches);
        }
      });
      
      if (compellingWords.length > 0) {
        evidence.push(EvidenceHelper.success(MetaDescriptionTopic.COMPELLING_LANGUAGE, 'Contains compelling/action-oriented language (basic analysis)', { 
          code: compellingWords.join(', '),
          score: 15,
          maxScore: 15
        }));
        score += 15;
        scoreBreakdown.push({ component: 'Compelling language', points: 15 });
      } else {
        evidence.push(EvidenceHelper.warning(MetaDescriptionTopic.COMPELLING_LANGUAGE, 'Lacks compelling call-to-action language (basic analysis)', {
          target: 'Add action-oriented words for +15 points',
          score: 0,
          maxScore: 15
        }));
        recommendations.push('Add action-oriented words (learn, discover, explore, etc.) for +15 points');
      }
    }
    
    return score;
  }
}