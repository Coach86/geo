const { BaseRule, EvidenceHelper } = require('../base-rule');
const { URL } = require('url');

class HttpsSecurityRule extends BaseRule {
  constructor() {
    super(
      'https_security',
      'HTTPS Security',
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
    let score = 0;
    const scoreBreakdown = [];

    try {
      const parsedUrl = new URL(url);
      
      if (parsedUrl.protocol === 'https:') {
        score = 100;
        scoreBreakdown.push({ component: 'HTTPS enabled', points: 100 });
        evidence.push(EvidenceHelper.success('HTTPS', 'Page served over secure HTTPS connection'));
        
        // Check for mixed content
        const mixedContent = this.checkMixedContent(content.html, parsedUrl.origin);
        if (mixedContent.found) {
          score = 70;
          scoreBreakdown.push({ component: 'Mixed content penalty', points: -30 });
          evidence.push(EvidenceHelper.warning('Mixed Content', `Found ${mixedContent.count} insecure resources`));
          issues.push(this.createIssue(
            'medium',
            'Mixed content detected',
            'Load all resources over HTTPS to avoid security warnings',
            mixedContent.urls.slice(0, 3)
          ));
        }
      } else {
        score = 0;
        scoreBreakdown.push({ component: 'No HTTPS', points: 0 });
        evidence.push(EvidenceHelper.error('HTTPS', 'Page not served over HTTPS'));
        issues.push(this.createIssue(
          'critical',
          'Missing HTTPS encryption',
          'Enable HTTPS to secure user data and improve search rankings'
        ));
        recommendations.push('Implement SSL/TLS certificate and redirect HTTP to HTTPS');
      }
      
      // Check security headers
      const securityHeaders = this.checkSecurityHeaders(content);
      if (securityHeaders.missing.length > 0) {
        evidence.push(EvidenceHelper.info('Security Headers', `Missing headers: ${securityHeaders.missing.join(', ')}`));
        if (securityHeaders.missing.length >= 3) {
          score = Math.max(0, score - 10);
          scoreBreakdown.push({ component: 'Missing security headers', points: -10 });
        }
      }

    } catch (error) {
      evidence.push(EvidenceHelper.error('HTTPS', `Error checking HTTPS: ${error.message}`));
      score = 0;
    }

    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    return this.createResult(score, evidence, issues, {}, recommendations);
  }

  checkMixedContent(html, origin) {
    if (!html) return { found: false, count: 0, urls: [] };
    
    const insecureUrls = [];
    
    // Check for http:// URLs in various attributes
    const patterns = [
      /<(?:img|script|link|iframe|source|embed|object)[^>]+(?:src|href)=["']?(http:\/\/[^"'\s>]+)/gi,
      /<(?:audio|video)[^>]+src=["']?(http:\/\/[^"'\s>]+)/gi
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        if (match[1] && !match[1].startsWith(origin)) {
          insecureUrls.push(match[1]);
        }
      }
    }
    
    return {
      found: insecureUrls.length > 0,
      count: insecureUrls.length,
      urls: [...new Set(insecureUrls)]
    };
  }

  checkSecurityHeaders(content) {
    // In a real implementation, we'd check response headers
    // For now, we'll check meta tags that indicate security policies
    const $ = content.$;
    const foundHeaders = [];
    const missingHeaders = [];
    
    // Check for Content Security Policy meta tag
    if ($('meta[http-equiv="Content-Security-Policy"]').length > 0) {
      foundHeaders.push('CSP');
    } else {
      missingHeaders.push('CSP');
    }
    
    // Check for X-Frame-Options equivalent
    if ($('meta[http-equiv="X-Frame-Options"]').length > 0) {
      foundHeaders.push('X-Frame-Options');
    }
    
    return {
      found: foundHeaders,
      missing: missingHeaders
    };
  }
}

module.exports = HttpsSecurityRule;