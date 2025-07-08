import { Injectable } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category, EvidenceItem, RuleIssue } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';
import { CleanHtmlStructureIssueId, createCleanHtmlStructureIssue } from './clean-html-structure.issues';
import { HtmlValidate, Message, Severity } from 'html-validate';

// Evidence topics for this rule
enum CleanHtmlTopic {
  SCORING_INFO = 'Scoring Info',
  SEMANTIC_TAGS = 'Semantic HTML5 Tags',
  CONTENT_RATIO = 'Content Ratio',
  HTML_VALIDATION = 'HTML Validation',
  DIV_USAGE = 'Div Usage',
  LANG_ATTRIBUTE = 'Lang Attribute'
}

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

    // Add base score evidence item
    evidence.push(EvidenceHelper.base(100));
    
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
      evidence.push(EvidenceHelper.success(CleanHtmlTopic.SEMANTIC_TAGS, `Found ${foundSemanticTags.length}: ${foundSemanticTags.join(', ')}`, { target: '≥5 semantic tags for optimal structure' }));
    } else {
      evidence.push(EvidenceHelper.error(CleanHtmlTopic.SEMANTIC_TAGS, 'No semantic HTML5 tags found', { target: 'Add header, nav, main, article, section, footer', score: -40 }));
      recommendations.push('Add semantic HTML5 tags (header, nav, main, article, section, footer)');
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
        evidence.push(EvidenceHelper.warning(CleanHtmlTopic.CONTENT_RATIO, `Low ratio (${(contentRatio * 100).toFixed(1)}%) - content may be loaded via JavaScript`, { target: '≥30% content in raw HTML', score: -30 }));
        recommendations.push('Ensure 30%+ of content is in raw HTML (not JS-loaded)');
        score -= 30;
        scoreBreakdown.push({ component: 'Low content ratio', points: -30 });
      } else {
        evidence.push(EvidenceHelper.success(CleanHtmlTopic.CONTENT_RATIO, `Good ratio (${(contentRatio * 100).toFixed(1)}%) - content is present in raw HTML`, { target: '≥30% content in raw HTML' }));
      }
    }
    
    // HTML validation using html-validate library
    const validationResult = await this.checkHtmlValidation(html);
    
    if (validationResult.errorCount > 15) {
      const penalty = score - 20;
      score = Math.min(score, 20);
      scoreBreakdown.push({ component: 'Critical HTML errors', points: -penalty });
      evidence.push(EvidenceHelper.error(CleanHtmlTopic.HTML_VALIDATION, `Critical: ${validationResult.errorCount} validation errors found`, { 
        target: '≤5 errors for good HTML quality',
        code: validationResult.samples.join('\n'),
        score: -penalty
      }));
      recommendations.push('Fix HTML validation errors for up to 80 points');
    } else if (validationResult.errorCount > 10) {
      const penalty = score - 40;
      score = Math.min(score, 40);
      scoreBreakdown.push({ component: 'High HTML errors', points: -penalty });
      evidence.push(EvidenceHelper.error(CleanHtmlTopic.HTML_VALIDATION, `High: ${validationResult.errorCount} validation errors found`, { 
        target: '≤5 errors for good HTML quality',
        code: validationResult.samples.join('\n'),
        score: -penalty
      }));
      recommendations.push('Fix HTML validation errors for up to 60 points');
    } else if (validationResult.errorCount > 5) {
      const penalty = score - 60;
      score = Math.min(score, 60);
      scoreBreakdown.push({ component: 'Moderate HTML errors', points: -penalty });
      evidence.push(EvidenceHelper.warning(CleanHtmlTopic.HTML_VALIDATION, `Moderate: ${validationResult.errorCount} validation errors found`, { 
        target: '≤5 errors for good HTML quality',
        code: validationResult.samples.join('\n'),
        score: -penalty
      }));
      recommendations.push('Fix HTML validation errors for up to 40 points');
    } else if (validationResult.errorCount > 0) {
      const penalty = score - 80;
      score = Math.min(score, 80);
      scoreBreakdown.push({ component: 'Minor HTML errors', points: -penalty });
      evidence.push(EvidenceHelper.warning(CleanHtmlTopic.HTML_VALIDATION, `Minor: ${validationResult.errorCount} validation errors found`, { 
        target: '0 errors for perfect score',
        code: validationResult.samples.join('\n'),
        score: -penalty
      }));
      recommendations.push('Fix all HTML validation errors for +20 points');
    } else {
      evidence.push(EvidenceHelper.success(CleanHtmlTopic.HTML_VALIDATION, 'Excellent: No validation errors found', { target: '≤5 errors for good HTML quality' }));
    }
    
    // Check for excessive div usage (divitis)
    const divCount = (html.match(/<div[^>]*>/gi) || []).length;
    const allTagsCount = (html.match(/<[^>]+>/gi) || []).length;
    const divRatio = divCount / allTagsCount;
    
    if (divRatio > 0.5) {
      evidence.push(EvidenceHelper.warning(CleanHtmlTopic.DIV_USAGE, `High usage (${(divRatio * 100).toFixed(1)}% of all tags) - possible "divitis"`, { target: '<50% div usage', score: -20 }));
      recommendations.push('Replace generic divs with semantic HTML tags');
      score -= 20;
      scoreBreakdown.push({ component: 'Excessive div usage', points: -20 });
    } else {
      evidence.push(EvidenceHelper.success(CleanHtmlTopic.DIV_USAGE, `Acceptable usage (${(divRatio * 100).toFixed(1)}% of all tags)`, { target: '<50% div usage' }));
    }
    
    // Check for accessibility basics
    const hasLangAttribute = /<html[^>]*lang=/i.test(html);
    if (!hasLangAttribute) {
      evidence.push(EvidenceHelper.warning(CleanHtmlTopic.LANG_ATTRIBUTE, 'Missing lang attribute on html tag', { score: -10 }));
      recommendations.push('Add lang="en" (or appropriate language) to html tag');
      score -= 10;
      scoreBreakdown.push({ component: 'Missing lang attribute', points: -10 });
    } else {
      evidence.push(EvidenceHelper.success(CleanHtmlTopic.LANG_ATTRIBUTE, 'HTML tag has lang attribute'));
    }
    
    // Add score calculation explanation
    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, Math.max(0, score), 100));
    
    // Generate issues based on problems found
    const issues: RuleIssue[] = [];
    
    // Check for doctype
    const hasDoctype = /<!DOCTYPE\s+html/i.test(html);
    if (!hasDoctype) {
      issues.push(createCleanHtmlStructureIssue(CleanHtmlStructureIssueId.MISSING_DOCTYPE));
    }
    
    // Check for deprecated tags
    const deprecatedTagsList = ['font', 'center', 'marquee', 'blink', 'frame', 'frameset'];
    const foundDeprecatedTags = deprecatedTagsList.filter(tag => {
      const regex = new RegExp(`<${tag}[^>]*>`, 'gi');
      return regex.test(html);
    });
    
    if (foundDeprecatedTags.length > 0) {
      issues.push(createCleanHtmlStructureIssue(
        CleanHtmlStructureIssueId.DEPRECATED_TAGS,
        foundDeprecatedTags,
        `Using deprecated HTML tags: ${foundDeprecatedTags.join(', ')}`
      ));
    }
    
    if (scoreBreakdown.some(item => item.component === 'No semantic HTML')) {
      issues.push(createCleanHtmlStructureIssue(CleanHtmlStructureIssueId.NO_SEMANTIC_TAGS));
    }
    
    if (scoreBreakdown.some(item => item.component === 'Missing lang attribute')) {
      issues.push(createCleanHtmlStructureIssue(CleanHtmlStructureIssueId.MISSING_LANG_ATTRIBUTE));
    }
    
    // Check for inline styles
    const inlineStyleCount = (html.match(/style=["'][^"']*["']/gi) || []).length;
    if (inlineStyleCount > 50) {
      issues.push(createCleanHtmlStructureIssue(
        CleanHtmlStructureIssueId.EXCESSIVE_INLINE_STYLES,
        undefined,
        `Excessive inline styles found (${inlineStyleCount} instances)`
      ));
    }
    
    // Check for validation errors
    if (validationResult.errorCount > 15) {
      issues.push(createCleanHtmlStructureIssue(
        CleanHtmlStructureIssueId.CRITICAL_VALIDATION_ERRORS,
        undefined,
        `Critical HTML validation errors (${validationResult.errorCount} errors found)`
      ));
    } else if (validationResult.errorCount > 5) {
      issues.push(createCleanHtmlStructureIssue(
        CleanHtmlStructureIssueId.HIGH_VALIDATION_ERRORS,
        undefined,
        `High number of HTML validation errors (${validationResult.errorCount} errors found)`
      ));
    }
    
    // Check for low content ratio
    if (scoreBreakdown.some(item => item.component === 'Low content ratio')) {
      issues.push(createCleanHtmlStructureIssue(CleanHtmlStructureIssueId.LOW_CONTENT_RATIO));
    }
    
    // Check for excessive div usage
    if (scoreBreakdown.some(item => item.component === 'Excessive div usage')) {
      issues.push(createCleanHtmlStructureIssue(
        CleanHtmlStructureIssueId.EXCESSIVE_DIV_USAGE,
        undefined,
        `High div usage (${(divRatio * 100).toFixed(1)}% of all tags)`
      ));
    }
    
    return this.createResult(Math.max(0, score), evidence, issues, undefined, recommendations);
  }
  
  private async checkHtmlValidation(html: string): Promise<{
    errorCount: number;
    warningCount: number;
    samples: string[];
  }> {
    try {
      const htmlvalidate = new HtmlValidate({
        rules: {
          // Core validation errors
          'void-style': 'error',
          'deprecated': 'error',
          'attr-quotes': 'error',
          'doctype-style': 'warn',
          
          // Content & structure
          'element-permitted-content': 'error',
          'no-missing-references': 'warn',
          
          // AEO-specific checks
          'no-inline-style': 'warn',
          'prefer-native-element': 'warn'
        }
      });
      
      const report = await htmlvalidate.validateString(html);
      const messages = report.results[0]?.messages || [];
      
      const errors = messages.filter((msg: Message) => msg.severity === Severity.ERROR);
      const warnings = messages.filter((msg: Message) => msg.severity === Severity.WARN);
      
      // Generate sample error messages
      const samples = messages
        .slice(0, 5) // Limit to 5 samples
        .map((msg: Message) => {
          const icon = msg.severity === Severity.ERROR ? '❌' : '⚠️';
          const location = msg.line ? ` (Line ${msg.line})` : '';
          return `${icon} ${msg.message}${location}`;
        });
      
      return {
        errorCount: errors.length,
        warningCount: warnings.length,
        samples
      };
    } catch (error) {
      // Fallback to simplified validation if html-validate fails
      console.warn('html-validate failed, using fallback validation:', error.message);
      return this.fallbackValidation(html);
    }
  }

  private fallbackValidation(html: string): {
    errorCount: number;
    warningCount: number;
    samples: string[];
  } {
    let errors = 0;
    const samples: string[] = [];
    
    // Check for deprecated tags
    const deprecatedTags = ['font', 'center', 'marquee', 'blink', 'frame', 'frameset'];
    deprecatedTags.forEach(tag => {
      const regex = new RegExp(`<${tag}[^>]*>`, 'gi');
      const matches = html.match(regex) || [];
      if (matches.length > 0) {
        errors += matches.length;
        samples.push(`❌ Deprecated tag: <${tag}>`);
      }
    });
    
    // Check for unquoted attributes
    const unquotedAttrs = html.match(/\s[a-z-]+=(?!["'])[^\s>]+/gi) || [];
    if (unquotedAttrs.length > 0) {
      errors += unquotedAttrs.length;
      samples.push(`❌ Unquoted attribute: ${unquotedAttrs[0]?.trim()}`);
    }
    
    return {
      errorCount: errors,
      warningCount: 0,
      samples: samples.slice(0, 3)
    };
  }

}