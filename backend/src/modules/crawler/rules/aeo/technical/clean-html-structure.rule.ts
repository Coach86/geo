import { Injectable } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category, EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';

@Injectable()
export class CleanHtmlStructureRule extends BaseAEORule {
  constructor() {
    super(
      'clean_html_structure',
      'Clean HTML Structure',
      'TECHNICAL' as Category,
      {
        impactScore: 3,
        pageTypes: [], // Applies to all page types
        isDomainLevel: false
      }
    );
  }

  async evaluate(url: string, content: PageContent): Promise<RuleResult> {
    const evidence: EvidenceItem[] = [];
    const recommendations: string[] = [];
    let score = 100; // Start with perfect score and deduct
    const scoreBreakdown: { component: string; points: number }[] = [
      { component: 'Base score', points: 100 }
    ];
    
    // Parse HTML to check for issues
    const html = content.html || '';
    const cleanContent = content.cleanContent || '';
    
    // Check for semantic HTML5 tags
    const semanticTags = ['article', 'section', 'nav', 'header', 'footer', 'main', 'aside'];
    const foundSemanticTags: string[] = [];
    
    for (const tag of semanticTags) {
      const regex = new RegExp(`<${tag}[^>]*>`, 'i');
      if (regex.test(html)) {
        foundSemanticTags.push(tag);
      }
    }
    
    if (foundSemanticTags.length > 0) {
      evidence.push(EvidenceHelper.success(`Found ${foundSemanticTags.length} semantic HTML5 tags: ${foundSemanticTags.join(', ')}`, { target: '≥5 semantic tags for optimal structure' }));
    } else {
      evidence.push(EvidenceHelper.error('No semantic HTML5 tags found', { target: 'Add header, nav, main, article, section, footer for +40 points', score: -40 }));
      recommendations.push('Add semantic HTML5 tags (header, nav, main, article, section, footer) for +40 points');
      score -= 40;
      scoreBreakdown.push({ component: 'No semantic HTML', points: -40 });
    }
    
    // Check if content is present in raw HTML vs being loaded by JS
    const scriptTags = (html.match(/<script[^>]*>/gi) || []).length;
    const contentLength = cleanContent.length;
    const htmlBodyContent = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').length;
    
    if (contentLength > 0 && htmlBodyContent > 0) {
      const contentRatio = contentLength / htmlBodyContent;
      if (contentRatio < 0.3) {
        evidence.push(EvidenceHelper.warning(`Low content ratio (${(contentRatio * 100).toFixed(1)}%) - content may be loaded via JavaScript`, { target: '≥30% content in raw HTML for +30 points', score: -30 }));
        recommendations.push('Ensure 30%+ of content is in raw HTML (not JS-loaded) for +30 points');
        score -= 30;
        scoreBreakdown.push({ component: 'Low content ratio', points: -30 });
      } else {
        evidence.push(EvidenceHelper.success(`Good content ratio (${(contentRatio * 100).toFixed(1)}%) - content is present in raw HTML`, { target: '≥30% content in raw HTML' }));
      }
    }
    
    // Count HTML validation errors (simplified check)
    const htmlErrors = this.checkHtmlValidation(html);
    const errorSample = this.generateErrorSample(html);
    
    if (htmlErrors > 15) {
      const penalty = score - 20;
      score = Math.min(score, 20);
      scoreBreakdown.push({ component: 'Critical HTML errors', points: -penalty });
      evidence.push(EvidenceHelper.error(`Critical: ${htmlErrors} HTML validation errors per 100 lines`, { 
        target: '<5 errors per 100 lines for +80 points',
        code: errorSample,
        score: -penalty 
      }));
      recommendations.push('Fix HTML validation errors for up to 80 points');
    } else if (htmlErrors > 10) {
      const penalty = score - 40;
      score = Math.min(score, 40);
      scoreBreakdown.push({ component: 'High HTML errors', points: -penalty });
      evidence.push(EvidenceHelper.error(`High: ${htmlErrors} HTML validation errors per 100 lines`, { 
        target: '<5 errors per 100 lines for +60 points',
        code: errorSample,
        score: -penalty 
      }));
      recommendations.push('Reduce errors to <5 per 100 lines for up to 60 points');
    } else if (htmlErrors > 5) {
      const penalty = score - 60;
      score = Math.min(score, 60);
      scoreBreakdown.push({ component: 'Moderate HTML errors', points: -penalty });
      evidence.push(EvidenceHelper.warning(`Moderate: ${htmlErrors} HTML validation errors per 100 lines`, { 
        target: '<5 errors per 100 lines for +40 points',
        code: errorSample,
        score: -penalty 
      }));
      recommendations.push('Reduce errors to <5 per 100 lines for up to 40 points');
    } else if (htmlErrors > 0) {
      const penalty = score - 80;
      score = Math.min(score, 80);
      scoreBreakdown.push({ component: 'Minor HTML errors', points: -penalty });
      evidence.push(EvidenceHelper.warning(`Minor: ${htmlErrors} HTML validation errors per 100 lines`, { 
        target: '0 errors for +20 points',
        code: errorSample,
        score: -penalty 
      }));
      recommendations.push('Fix all HTML validation errors for +20 points');
    } else {
      evidence.push(EvidenceHelper.success('No HTML validation errors detected', { target: '0 errors per 100 lines' }));
    }
    
    // Check for excessive div usage (divitis)
    const divCount = (html.match(/<div[^>]*>/gi) || []).length;
    const allTagsCount = (html.match(/<[^>]+>/gi) || []).length;
    const divRatio = divCount / allTagsCount;
    
    if (divRatio > 0.5) {
      evidence.push(EvidenceHelper.warning(`High div usage (${(divRatio * 100).toFixed(1)}% of all tags) - possible "divitis"`, { target: '<50% div usage for +20 points', score: -20 }));
      recommendations.push('Replace generic divs with semantic HTML tags for +20 points');
      score -= 20;
      scoreBreakdown.push({ component: 'Excessive div usage', points: -20 });
    } else {
      evidence.push(EvidenceHelper.success(`Acceptable div usage (${(divRatio * 100).toFixed(1)}% of all tags)`, { target: '<50% div usage' }));
    }
    
    // Check for accessibility basics
    const hasLangAttribute = /<html[^>]*lang=/i.test(html);
    if (!hasLangAttribute) {
      evidence.push(EvidenceHelper.warning('Missing lang attribute on html tag', { score: -10 }));
      recommendations.push('Add lang="en" (or appropriate language) to html tag for +10 points');
      score -= 10;
      scoreBreakdown.push({ component: 'Missing lang attribute', points: -10 });
    } else {
      evidence.push(EvidenceHelper.success('HTML tag has lang attribute'));
    }
    
    // Add score calculation explanation
    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, Math.max(0, score), 100));
    
    return this.createResult(Math.max(0, score), evidence, undefined, undefined, recommendations);
  }
  
  private checkHtmlValidation(html: string): number {
    // Simplified HTML validation check - counts common errors
    let errors = 0;
    const lines = html.split('\n').length;
    
    // Check for unclosed tags
    const openTags = html.match(/<([a-z]+)(?:\s|>)/gi) || [];
    const closeTags = html.match(/<\/([a-z]+)>/gi) || [];
    errors += Math.abs(openTags.length - closeTags.length) * 2;
    
    // Check for missing quotes in attributes
    const unquotedAttrs = html.match(/\s[a-z-]+=(?!["'])[^\s>]+/gi) || [];
    errors += unquotedAttrs.length;
    
    // Check for deprecated tags
    const deprecatedTags = ['font', 'center', 'marquee', 'blink', 'frame', 'frameset'];
    deprecatedTags.forEach(tag => {
      const regex = new RegExp(`<${tag}[^>]*>`, 'gi');
      const matches = html.match(regex) || [];
      errors += matches.length * 3;
    });
    
    // Calculate errors per 100 lines
    return Math.round((errors / lines) * 100);
  }

  private generateErrorSample(html: string): string {
    const errorSamples: string[] = [];
    
    // Find unquoted attributes
    const unquotedAttrs = html.match(/\s[a-z-]+=(?!["'])[^\s>]+/gi) || [];
    if (unquotedAttrs.length > 0 && unquotedAttrs[0]) {
      errorSamples.push(`❌ Unquoted attribute: ${unquotedAttrs[0].trim()}`);
    }
    
    // Find deprecated tags
    const deprecatedTags = ['font', 'center', 'marquee', 'blink', 'frame', 'frameset'];
    for (const tag of deprecatedTags) {
      const regex = new RegExp(`<${tag}[^>]*>`, 'gi');
      const match = html.match(regex);
      if (match && match[0]) {
        errorSamples.push(`❌ Deprecated tag: ${match[0]}`);
        break;
      }
    }
    
    // Find potential unclosed tags (simplified detection)
    const unclosedPattern = /<(div|span|p|a)\s[^>]*>(?![\s\S]*<\/\1>)/gi;
    const unclosedMatch = html.match(unclosedPattern);
    if (unclosedMatch && unclosedMatch[0]) {
      errorSamples.push(`❌ Potentially unclosed: ${unclosedMatch[0]}`);
    }
    
    // Find missing alt attributes on images
    const imgWithoutAlt = html.match(/<img(?![^>]*alt=)[^>]*>/gi);
    if (imgWithoutAlt && imgWithoutAlt[0]) {
      errorSamples.push(`❌ Missing alt attribute: ${imgWithoutAlt[0]}`);
    }
    
    // Find inline styles (not validation errors but poor practice)
    const inlineStyles = html.match(/<[^>]*style=["'][^"']*["'][^>]*>/gi);
    if (inlineStyles && inlineStyles[0]) {
      errorSamples.push(`⚠️ Inline style: ${inlineStyles[0].substring(0, 60)}...`);
    }
    
    return errorSamples.length > 0 
      ? errorSamples.slice(0, 3).join('\n') 
      : 'Sample HTML validation errors not found in current analysis';
  }
}