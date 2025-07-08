const { BaseRule, EvidenceHelper } = require('../base-rule');

class CleanHtmlStructureRule extends BaseRule {
  constructor() {
    super(
      'clean_html_structure',
      'Clean HTML Structure',
      'technical',
      {
        impactScore: 3, // High impact
        pageTypes: [], // Applies to all page types
        isDomainLevel: false
      }
    );
  }

  async evaluate(url, content) {
    const evidence = [];
    const issues = [];
    const recommendations = [];
    let score = 100; // Start with perfect score and deduct
    const scoreBreakdown = [
      { component: 'Base score', points: 100 }
    ];

    // Add base score evidence item
    evidence.push(EvidenceHelper.base(100));
    
    // Parse HTML to check for issues
    const html = content.html || '';
    const $ = content.$;
    const cleanText = $('body').text() || '';
    
    // Check for semantic HTML5 tags
    const semanticTags = ['article', 'section', 'nav', 'header', 'footer', 'main', 'aside'];
    const foundSemanticTags = [];
    
    for (const tag of semanticTags) {
      const regex = new RegExp(`<${tag}[^>]*>`, 'i');
      if (regex.test(html)) {
        foundSemanticTags.push(tag);
      }
    }
    
    if (foundSemanticTags.length > 0) {
      evidence.push(EvidenceHelper.success('Semantic HTML5 Tags', `Found ${foundSemanticTags.length}: ${foundSemanticTags.join(', ')}`, { target: '≥5 semantic tags for optimal structure' }));
    } else {
      evidence.push(EvidenceHelper.error('Semantic HTML5 Tags', 'No semantic HTML5 tags found', { target: 'Add header, nav, main, article, section, footer', score: -40 }));
      recommendations.push('Add semantic HTML5 tags (header, nav, main, article, section, footer)');
      score -= 40;
      scoreBreakdown.push({ component: 'No semantic HTML', points: -40 });
    }
    
    // Check if content is present in raw HTML vs being loaded by JS
    const scriptTags = (html.match(/<script[^>]*>/gi) || []).length;
    const contentLength = cleanText.length;
    const htmlBodyContent = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').length;
    
    if (contentLength > 0 && htmlBodyContent > 0) {
      const contentRatio = contentLength / htmlBodyContent;
      if (contentRatio < 0.3) {
        evidence.push(EvidenceHelper.warning('Content Ratio', `Low ratio (${(contentRatio * 100).toFixed(1)}%) - content may be loaded via JavaScript`, { target: '≥30% content in raw HTML', score: -30 }));
        recommendations.push('Ensure 30%+ of content is in raw HTML (not JS-loaded)');
        score -= 30;
        scoreBreakdown.push({ component: 'Low content ratio', points: -30 });
      } else {
        evidence.push(EvidenceHelper.success('Content Ratio', `Good ratio (${(contentRatio * 100).toFixed(1)}%) - content is present in raw HTML`, { target: '≥30% content in raw HTML' }));
      }
    }
    
    // Count HTML validation errors (simplified check)
    const htmlErrors = this.checkHtmlValidation(html);
    const errorSample = this.generateErrorSample(html);
    
    if (htmlErrors > 15) {
      const penalty = score - 20;
      score = Math.min(score, 20);
      scoreBreakdown.push({ component: 'Critical HTML errors', points: -penalty });
      evidence.push(EvidenceHelper.error('HTML Validation', `Critical: ${htmlErrors} validation errors per 100 lines`, { 
        target: '<5 errors per 100 lines',
        code: errorSample,
        score: -penalty
      }));
      recommendations.push('Fix HTML validation errors for up to 80 points');
    } else if (htmlErrors > 10) {
      const penalty = score - 40;
      score = Math.min(score, 40);
      scoreBreakdown.push({ component: 'High HTML errors', points: -penalty });
      evidence.push(EvidenceHelper.error('HTML Validation', `High: ${htmlErrors} validation errors per 100 lines`, { 
        target: '<5 errors per 100 lines',
        code: errorSample,
        score: -penalty
      }));
      recommendations.push('Reduce errors to <5 per 100 lines for up to 60 points');
    } else if (htmlErrors > 5) {
      const penalty = score - 60;
      score = Math.min(score, 60);
      scoreBreakdown.push({ component: 'Moderate HTML errors', points: -penalty });
      evidence.push(EvidenceHelper.warning('HTML Validation', `Moderate: ${htmlErrors} validation errors per 100 lines`, { 
        target: '<5 errors per 100 lines',
        code: errorSample,
        score: -penalty
      }));
      recommendations.push('Reduce errors to <5 per 100 lines for up to 40 points');
    } else if (htmlErrors > 0) {
      const penalty = score - 80;
      score = Math.min(score, 80);
      scoreBreakdown.push({ component: 'Minor HTML errors', points: -penalty });
      evidence.push(EvidenceHelper.warning('HTML Validation', `Minor: ${htmlErrors} validation errors per 100 lines`, { 
        target: '0 errors for perfect score',
        code: errorSample,
        score: -penalty
      }));
      recommendations.push('Fix all HTML validation errors for +20 points');
    } else {
      evidence.push(EvidenceHelper.success('HTML Validation', 'No HTML validation errors detected', { target: '0 errors per 100 lines' }));
    }
    
    // Check for excessive div usage (divitis)
    const divCount = (html.match(/<div[^>]*>/gi) || []).length;
    const allTagsCount = (html.match(/<[^>]+>/gi) || []).length;
    const divRatio = divCount / allTagsCount;
    
    if (divRatio > 0.5) {
      evidence.push(EvidenceHelper.warning('Div Usage', `High usage (${(divRatio * 100).toFixed(1)}% of all tags) - possible "divitis"`, { target: '<50% div usage', score: -20 }));
      recommendations.push('Replace generic divs with semantic HTML tags');
      score -= 20;
      scoreBreakdown.push({ component: 'Excessive div usage', points: -20 });
    } else {
      evidence.push(EvidenceHelper.success('Div Usage', `Acceptable usage (${(divRatio * 100).toFixed(1)}% of all tags)`, { target: '<50% div usage' }));
    }
    
    // Check for accessibility basics
    const hasLangAttribute = /<html[^>]*lang=/i.test(html);
    if (!hasLangAttribute) {
      evidence.push(EvidenceHelper.warning('Lang Attribute', 'Missing lang attribute on html tag', { score: -10 }));
      recommendations.push('Add lang="en" (or appropriate language) to html tag');
      score -= 10;
      scoreBreakdown.push({ component: 'Missing lang attribute', points: -10 });
    } else {
      evidence.push(EvidenceHelper.success('Lang Attribute', 'HTML tag has lang attribute'));
    }
    
    // Add score calculation explanation
    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, Math.max(0, score), 100));
    
    // Generate issues based on problems found
    
    // Check for doctype
    const hasDoctype = /<!DOCTYPE\s+html/i.test(html);
    if (!hasDoctype) {
      issues.push(this.createIssue(
        'medium',
        'Missing HTML5 doctype declaration',
        'Add <!DOCTYPE html> at the beginning of the document'
      ));
    }
    
    // Check for deprecated tags
    const deprecatedTagsList = ['font', 'center', 'marquee', 'blink', 'frame', 'frameset'];
    const foundDeprecatedTags = deprecatedTagsList.filter(tag => {
      const regex = new RegExp(`<${tag}[^>]*>`, 'gi');
      return regex.test(html);
    });
    
    if (foundDeprecatedTags.length > 0) {
      issues.push(this.createIssue(
        'medium',
        `Using deprecated HTML tags: ${foundDeprecatedTags.join(', ')}`,
        'Replace deprecated tags with modern HTML5 equivalents'
      ));
    }
    
    if (scoreBreakdown.some(item => item.component === 'No semantic HTML')) {
      issues.push(this.createIssue(
        'high',
        'No semantic HTML5 tags found',
        'Add semantic HTML5 tags like header, nav, main, article, section, footer'
      ));
    }
    
    if (scoreBreakdown.some(item => item.component === 'Missing lang attribute')) {
      issues.push(this.createIssue(
        'medium',
        'Missing lang attribute on html tag',
        'Add lang="en" (or appropriate language) to html tag for accessibility'
      ));
    }
    
    // Check for inline styles
    const inlineStyleCount = (html.match(/style=["'][^"']*["']/gi) || []).length;
    if (inlineStyleCount > 50) {
      issues.push(this.createIssue(
        'medium',
        `Excessive inline styles found (${inlineStyleCount} instances)`,
        'Move inline styles to external CSS files for better maintainability'
      ));
    }
    
    // Check for validation errors
    if (htmlErrors > 15) {
      issues.push(this.createIssue(
        'critical',
        `Critical HTML validation errors (${htmlErrors} errors per 100 lines)`,
        'Fix HTML validation errors to improve browser compatibility and SEO'
      ));
    } else if (htmlErrors > 5) {
      issues.push(this.createIssue(
        'high',
        `High number of HTML validation errors (${htmlErrors} errors per 100 lines)`,
        'Reduce HTML validation errors to improve code quality'
      ));
    }
    
    // Check for low content ratio
    if (scoreBreakdown.some(item => item.component === 'Low content ratio')) {
      issues.push(this.createIssue(
        'medium',
        'Low content-to-HTML ratio suggests heavy JavaScript dependency',
        'Ensure important content is present in raw HTML for better SEO and accessibility'
      ));
    }
    
    // Check for excessive div usage
    if (scoreBreakdown.some(item => item.component === 'Excessive div usage')) {
      issues.push(this.createIssue(
        'medium',
        `High div usage (${(divRatio * 100).toFixed(1)}% of all tags)`,
        'Replace generic divs with semantic HTML tags where appropriate'
      ));
    }
    
    return this.createResult(Math.max(0, score), evidence, issues, {}, recommendations);
  }
  
  checkHtmlValidation(html) {
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

  generateErrorSample(html) {
    const errorSamples = [];
    
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

module.exports = CleanHtmlStructureRule;