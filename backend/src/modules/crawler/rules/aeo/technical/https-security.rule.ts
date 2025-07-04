import { Injectable } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';

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

    // Standard HTTPS analysis without GSC integration

    // Check if security info is available
    const securityInfo = content.securityInfo || {
      isHttps: url.startsWith('https://'),
      hasMixedContent: false,
      certificateValid: true
    };

    // Check HTTPS status
    if (securityInfo.isHttps) {
      evidence.push(EvidenceHelper.success('Site is served over HTTPS protocol', { score: 100 }));
    } else {
      evidence.push(EvidenceHelper.error('Site is NOT using HTTPS protocol', { score: -100 }));
      score = 0;
    }

    // Check certificate validity
    if (securityInfo.certificateValid) {
      if (securityInfo.sslDetails?.expiryDate) {
        evidence.push(EvidenceHelper.success(`SSL certificate is valid (expires: ${securityInfo.sslDetails.expiryDate})`, { score: 0 }));
      } else {
        evidence.push(EvidenceHelper.success('SSL certificate is valid', { score: 0 }));
      }
    } else if (securityInfo.isHttps) {
      evidence.push(EvidenceHelper.error('SSL certificate has issues', { score: -60 }));
      if (securityInfo.sslDetails?.error) {
        evidence.push(EvidenceHelper.info(`  Error: ${securityInfo.sslDetails.error}`));
      }
      score = Math.min(score, 40);
    }

    // Check for mixed content
    if (securityInfo.hasMixedContent) {
      const mixedCount = securityInfo.sslDetails?.mixedContentCount || 'unknown number of';
      evidence.push(EvidenceHelper.warning(`Found ${mixedCount} mixed content resources`, { score: -40 }));
      score = Math.min(score, 60);
    } else if (securityInfo.isHttps) {
      evidence.push(EvidenceHelper.success('No mixed content issues detected', { score: 0 }));
    }

    // Additional checks for URL structure
    if (url.includes('http://') && url.includes('https://')) {
      evidence.push(EvidenceHelper.warning('URL contains both HTTP and HTTPS protocols - possible configuration issue', { score: -20 }));
      score = Math.min(score, 80);
    }

    // Check for www/non-www consistency (if HTTPS)
    if (securityInfo.isHttps) {
      const hasWww = url.includes('://www.');
      evidence.push(EvidenceHelper.info(hasWww ? '○ Using www subdomain' : '○ Using non-www domain'));
      recommendations.push('Ensure consistent use of www/non-www across all pages');
    }

    // Final score adjustment
    if (score === 100 && securityInfo.isHttps && !securityInfo.hasMixedContent && securityInfo.certificateValid) {
      evidence.push(EvidenceHelper.info('● Full HTTPS implementation with no issues detected'));
    }

    // Calculate score breakdown
    const scoreBreakdown: { component: string; points: number }[] = [
      { component: 'Base score', points: 100 }
    ];
    
    if (!securityInfo.isHttps) {
      scoreBreakdown.push({ component: 'No HTTPS', points: -100 });
    } else {
      if (!securityInfo.certificateValid) {
        scoreBreakdown.push({ component: 'Certificate issues', points: -60 });
      }
      if (securityInfo.hasMixedContent) {
        scoreBreakdown.push({ component: 'Mixed content', points: -40 });
      }
    }
    
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
