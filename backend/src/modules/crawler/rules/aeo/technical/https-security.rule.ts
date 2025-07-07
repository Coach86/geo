import { Injectable } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';

// Evidence topics for this rule
enum HttpsSecurityTopic {
  PROTOCOL = 'HTTPS Protocol',
  CERTIFICATE = 'SSL Certificate',
  MIXED_CONTENT = 'Mixed Content',
  URL_CONSISTENCY = 'URL Consistency',
  DOMAIN_FORMAT = 'Domain Format'
}

@Injectable()
export class HttpsSecurityRule extends BaseAEORule {
  constructor() {
    super(
      'https_security',
      'HTTPS Security',
      'TECHNICAL' as Category,
      {
        impactScore: 3,
        pageTypes: [],
        isDomainLevel: true
      }
    );
  }

  async evaluate(url: string, content: PageContent): Promise<RuleResult> {
    const evidence: EvidenceItem[] = [];
    const recommendations: string[] = [];
    let score = 100;
    const scoreBreakdown: { component: string; points: number }[] = [
      { component: 'Base score', points: 100 }
    ];

    // Add base score evidence item
    evidence.push(EvidenceHelper.base(100));

    // Standard HTTPS analysis without GSC integration

    // Check if security info is available
    const securityInfo = content.securityInfo || {
      isHttps: url.startsWith('https://'),
      hasMixedContent: false,
      certificateValid: true
    };

    // Check HTTPS status
    if (securityInfo.isHttps) {
      evidence.push(EvidenceHelper.success(HttpsSecurityTopic.PROTOCOL, 'Site is served over HTTPS protocol', { 
        score: 0,
        target: 'HTTPS required for security'
      }));
    } else {
      evidence.push(EvidenceHelper.error(HttpsSecurityTopic.PROTOCOL, 'Site is NOT using HTTPS protocol', { 
        score: -100,
        target: 'Implement HTTPS to avoid penalty'
      }));
      score = 0;
      scoreBreakdown.push({ component: 'No HTTPS', points: -100 });
      recommendations.push('Implement HTTPS protocol immediately for security and SEO benefits');
    }

    // Check certificate validity
    if (securityInfo.certificateValid) {
      if (securityInfo.sslDetails?.expiryDate) {
        evidence.push(EvidenceHelper.success(HttpsSecurityTopic.CERTIFICATE, `SSL certificate is valid (expires: ${securityInfo.sslDetails.expiryDate})`, { 
          score: 0,
          target: 'Valid certificate required'
        }));
      } else {
        evidence.push(EvidenceHelper.success(HttpsSecurityTopic.CERTIFICATE, 'SSL certificate is valid', { 
          score: 0,
          target: 'Valid certificate required'
        }));
      }
    } else if (securityInfo.isHttps) {
      evidence.push(EvidenceHelper.error(HttpsSecurityTopic.CERTIFICATE, 'SSL certificate has issues', { 
        score: -60,
        target: 'Fix certificate to avoid penalty',
        code: securityInfo.sslDetails?.error ? `Error: ${securityInfo.sslDetails.error}` : undefined
      }));
      score = Math.min(score, 40);
      scoreBreakdown.push({ component: 'Certificate issues', points: -60 });
      recommendations.push('Fix SSL certificate issues to restore trust and security');
    }

    // Check for mixed content
    if (securityInfo.hasMixedContent) {
      const mixedCount = securityInfo.sslDetails?.mixedContentCount || 'unknown number of';
      evidence.push(EvidenceHelper.warning(HttpsSecurityTopic.MIXED_CONTENT, `Found ${mixedCount} mixed content resources`, { 
        score: -40,
        target: 'Fix mixed content to avoid penalty'
      }));
      score = Math.min(score, 60);
      scoreBreakdown.push({ component: 'Mixed content', points: -40 });
      recommendations.push('Update all resource URLs (images, scripts, stylesheets) to use HTTPS');
    } else if (securityInfo.isHttps) {
      evidence.push(EvidenceHelper.success(HttpsSecurityTopic.MIXED_CONTENT, 'No mixed content issues detected', { 
        score: 0,
        target: 'All resources via HTTPS'
      }));
    }

    // Additional checks for URL structure
    if (url.includes('http://') && url.includes('https://')) {
      evidence.push(EvidenceHelper.warning(HttpsSecurityTopic.URL_CONSISTENCY, 'URL contains both HTTP and HTTPS protocols - possible configuration issue', { 
        score: -20,
        target: 'Fix protocol confusion to avoid penalty'
      }));
      score = Math.min(score, 80);
      scoreBreakdown.push({ component: 'Protocol confusion', points: -20 });
      recommendations.push('Fix URL to use only HTTPS protocol');
    }

    // Check for www/non-www consistency (if HTTPS)
    if (securityInfo.isHttps) {
      const hasWww = url.includes('://www.');
      evidence.push(EvidenceHelper.info(HttpsSecurityTopic.DOMAIN_FORMAT, hasWww ? 'Using www subdomain' : 'Using non-www domain', {
        score: 0,
        target: 'Consistent domain format'
      }));
      if (!recommendations.some(r => r.includes('www/non-www'))) {
        recommendations.push('Ensure consistent use of www/non-www across all pages with proper redirects');
      }
    }

    // Final score adjustment
    if (score === 100 && securityInfo.isHttps && !securityInfo.hasMixedContent && securityInfo.certificateValid) {
      evidence.push(EvidenceHelper.success(HttpsSecurityTopic.PROTOCOL, 'Full HTTPS implementation with no issues detected', {
        target: 'Perfect security score'
      }));
    }

    // Add score calculation
    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    return this.createResult(score, evidence, undefined, undefined, recommendations);
  }

  private getSiteUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}/`;
    } catch {
      return url;
    }
  }
}
