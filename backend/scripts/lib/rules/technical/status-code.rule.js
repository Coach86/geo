const { BaseRule, EvidenceHelper } = require('../base-rule');

class StatusCodeRule extends BaseRule {
  constructor() {
    super(
      'status_code',
      'HTTP Status Code',
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
    let score = 100;
    const scoreBreakdown = [
      { component: 'Base score', points: 100 }
    ];

    evidence.push(EvidenceHelper.base(100));

    try {
      const statusCode = content.metadata?.statusCode || 200;
      
      evidence.push(EvidenceHelper.info('HTTP Status', `HTTP Status Code: ${statusCode}`));

      // Check various status code ranges
      if (statusCode >= 200 && statusCode < 300) {
        score = 100;
        evidence.push(EvidenceHelper.success('Status', 'Success status code (2xx)', { score: 0 }));
      } else if (statusCode >= 300 && statusCode < 400) {
        score = 60;
        scoreBreakdown.push({ component: 'Redirect penalty', points: -40 });
        evidence.push(EvidenceHelper.warning('Status', 'Redirect status code (3xx)', { score: -40 }));
        issues.push(this.createIssue(
          'medium',
          'Page returns redirect status',
          'Use direct URLs to avoid redirect chains'
        ));
      } else if (statusCode >= 400 && statusCode < 500) {
        score = 0;
        scoreBreakdown.push({ component: 'Client error penalty', points: -100 });
        evidence.push(EvidenceHelper.error('Status', 'Client error status code (4xx)', { score: -100 }));
        issues.push(this.createIssue(
          'critical',
          `Page returns ${statusCode} error`,
          'Fix the error to make content accessible to search engines'
        ));
      } else if (statusCode >= 500) {
        score = 0;
        scoreBreakdown.push({ component: 'Server error penalty', points: -100 });
        evidence.push(EvidenceHelper.error('Status', 'Server error status code (5xx)', { score: -100 }));
        issues.push(this.createIssue(
          'critical',
          `Server error ${statusCode}`,
          'Fix server errors to ensure content availability'
        ));
      }

      // Check for soft 404 indicators
      const soft404Indicators = this.checkForSoft404(content.html || '', statusCode);
      if (soft404Indicators.length > 0) {
        score = Math.max(0, score - 40);
        scoreBreakdown.push({ component: 'Soft 404 penalty', points: -40 });
        soft404Indicators.forEach(indicator => evidence.push(indicator));
        issues.push(this.createIssue(
          'high',
          'Possible soft 404 detected',
          'Return proper 404 status code for missing content'
        ));
      }

    } catch (error) {
      evidence.push(EvidenceHelper.info('Status', `Error evaluating status code: ${error.message}`));
      score = 0;
    }

    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    return this.createResult(score, evidence, issues, {}, recommendations);
  }

  checkForSoft404(html, statusCode) {
    const indicators = [];
    
    if (statusCode !== 200) {
      return indicators;
    }
    
    const htmlLower = html.toLowerCase();
    const soft404Patterns = [
      'page not found',
      '404 error',
      'file not found',
      'nothing found',
      'no results found',
      'the page you requested',
      'could not be found',
      'does not exist'
    ];
    
    const matchedPatterns = soft404Patterns.filter(pattern => htmlLower.includes(pattern));
    
    if (matchedPatterns.length > 0) {
      indicators.push(EvidenceHelper.warning('Status', 'Possible soft 404: Page returns 200 but contains error messages'));
      indicators.push(EvidenceHelper.info('Page Not Found', `Found patterns: ${matchedPatterns.join(', ')}`));
    }
    
    // Check for very short content that might indicate an error page
    const textContent = html.replace(/<[^>]*>/g, '').trim();
    if (textContent.length < 200 && matchedPatterns.length > 0) {
      indicators.push(EvidenceHelper.warning('Status', 'Very short content with error patterns suggests soft 404'));
    }
    
    return indicators;
  }
}

module.exports = StatusCodeRule;