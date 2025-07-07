const { BaseRule, EvidenceHelper } = require('../base-rule');
const { URL } = require('url');

class UrlStructureRule extends BaseRule {
  constructor() {
    super(
      'url_structure',
      'URL Structure',
      'technical',
      {
        impactScore: 2, // Medium-high impact
        pageTypes: [], // Applies to all page types
        isDomainLevel: false
      }
    );
  }

  async evaluate(url, content) {
    const evidence = [];
    const issues = [];
    const recommendations = [];
    let score = 100;
    const scoreBreakdown = [
      { component: 'Base score', points: 100 }
    ];

    evidence.push(EvidenceHelper.base(100));

    try {
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname;
      
      // Check URL length
      if (url.length > 200) {
        score -= 20;
        scoreBreakdown.push({ component: 'URL too long', points: -20 });
        evidence.push(EvidenceHelper.warning('Length', `URL is ${url.length} characters (recommended < 200)`));
        issues.push(this.createIssue(
          'medium',
          'URL is too long',
          'Keep URLs under 200 characters for better usability'
        ));
      } else if (url.length > 100) {
        score -= 10;
        scoreBreakdown.push({ component: 'URL somewhat long', points: -10 });
        evidence.push(EvidenceHelper.info('Length', `URL is ${url.length} characters`));
      } else {
        evidence.push(EvidenceHelper.success('Length', `URL length is good (${url.length} characters)`));
      }

      // Check for keyword stuffing in URL
      const pathSegments = pathname.split('/').filter(s => s.length > 0);
      const keywordPattern = /^(.+)-\1-\1|(.+)_\2_\2/;
      const stuffedSegments = pathSegments.filter(segment => keywordPattern.test(segment));
      
      if (stuffedSegments.length > 0) {
        score -= 15;
        scoreBreakdown.push({ component: 'Keyword stuffing', points: -15 });
        evidence.push(EvidenceHelper.warning('Keywords', 'Possible keyword stuffing detected in URL'));
        issues.push(this.createIssue(
          'medium',
          'URL appears to have keyword stuffing',
          'Use natural, descriptive URLs without repetition'
        ));
      }

      // Check for special characters
      const specialChars = pathname.match(/[^a-zA-Z0-9\-_\/\.]/g);
      if (specialChars && specialChars.length > 0) {
        score -= 15;
        scoreBreakdown.push({ component: 'Special characters', points: -15 });
        evidence.push(EvidenceHelper.warning('Characters', `Found special characters: ${[...new Set(specialChars)].join(', ')}`));
        issues.push(this.createIssue(
          'medium',
          'URL contains special characters',
          'Use only letters, numbers, hyphens, and underscores in URLs'
        ));
      }

      // Check for excessive parameters
      const paramCount = parsedUrl.searchParams.toString().split('&').filter(p => p).length;
      if (paramCount > 3) {
        score -= 10;
        scoreBreakdown.push({ component: 'Too many parameters', points: -10 });
        evidence.push(EvidenceHelper.warning('Parameters', `URL has ${paramCount} parameters`));
        issues.push(this.createIssue(
          'low',
          'URL has many parameters',
          'Consider using cleaner URLs with fewer parameters'
        ));
      } else if (paramCount > 0) {
        evidence.push(EvidenceHelper.info('Parameters', `URL has ${paramCount} parameter(s)`));
      }

      // Check URL depth
      const depth = pathSegments.length;
      if (depth > 5) {
        score -= 10;
        scoreBreakdown.push({ component: 'Deep nesting', points: -10 });
        evidence.push(EvidenceHelper.warning('Depth', `URL is ${depth} levels deep`));
        issues.push(this.createIssue(
          'low',
          'URL structure is deeply nested',
          'Keep URL structure shallow (3-4 levels max)'
        ));
      } else {
        evidence.push(EvidenceHelper.success('Depth', `URL depth is good (${depth} levels)`));
      }

      // Check for uppercase letters
      if (pathname !== pathname.toLowerCase()) {
        score -= 10;
        scoreBreakdown.push({ component: 'Mixed case', points: -10 });
        evidence.push(EvidenceHelper.warning('Case', 'URL contains uppercase letters'));
        issues.push(this.createIssue(
          'medium',
          'URL contains uppercase letters',
          'Use lowercase URLs for consistency'
        ));
      }

      // Check for file extensions
      const hasHtmlExtension = pathname.endsWith('.html') || pathname.endsWith('.htm');
      if (hasHtmlExtension) {
        score -= 5;
        scoreBreakdown.push({ component: 'HTML extension', points: -5 });
        evidence.push(EvidenceHelper.info('Extension', 'URL includes .html extension'));
        recommendations.push('Consider removing .html extensions for cleaner URLs');
      }

    } catch (error) {
      evidence.push(EvidenceHelper.error('URL', `Error analyzing URL structure: ${error.message}`));
      score = 0;
    }

    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    return this.createResult(score, evidence, issues, {}, recommendations);
  }
}

module.exports = UrlStructureRule;