import { Injectable } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';


// Evidence topics for this rule
enum StatusCodeTopic {
  HTTP_STATUS = 'Http Status',
  PAGE_NOT_FOUND = 'Page Not Found',
  STATUS_SUCCESS = 'Status Success',
  STATUS = 'Status'
}

@Injectable()
export class StatusCodeRule extends BaseAEORule {
  constructor() {
    super(
      'status_code',
      'HTTP Status Code',
      'TECHNICAL' as Category,
      {
        impactScore: 3, // High impact
        pageTypes: [], // Applies to all page types
        isDomainLevel: true
      }
    );
  }

  async evaluate(url: string, content: PageContent): Promise<RuleResult> {
    const evidence: EvidenceItem[] = [];
    const recommendations: string[] = [];
    let score = 100; // Assume success if we have content
    const scoreBreakdown: { component: string; points: number }[] = [
      { component: 'Base score', points: 100 }
    ];

    // Add base score evidence item
    evidence.push(EvidenceHelper.base(100));

    // Standard status code analysis without GSC integration

    try {
      // Since we have content, we can assume a successful response
      // In a real implementation, this would check actual HTTP status from crawler metadata
      const statusCode = content.metadata?.statusCode || 200;
      
      evidence.push(EvidenceHelper.info(StatusCodeTopic.HTTP_STATUS, `HTTP Status Code: ${statusCode}`));

      // Check various status code ranges
      if (statusCode >= 200 && statusCode < 300) {
        score = 100;
        evidence.push(EvidenceHelper.success(StatusCodeTopic.STATUS, 'Success status code (2xx)', { score: 0 }));
        
        if (statusCode === 200) {
          evidence.push(EvidenceHelper.success(StatusCodeTopic.STATUS_SUCCESS, 'Standard success response'));
        } else if (statusCode === 201) {
          evidence.push(EvidenceHelper.success(StatusCodeTopic.STATUS_SUCCESS, 'Resource created successfully'));
        } else if (statusCode === 204) {
          evidence.push(EvidenceHelper.success(StatusCodeTopic.HTTP_STATUS, 'No content (intentional)'));
        }
      } else if (statusCode >= 300 && statusCode < 400) {
        score = 60;
        scoreBreakdown.push({ component: 'Redirect penalty', points: -40 });
        evidence.push(EvidenceHelper.warning(StatusCodeTopic.STATUS, 'Redirect status code (3xx)', { score: -40, target: 'Use direct URLs to avoid penalty' }));
        
        if (statusCode === 301) {
          evidence.push(EvidenceHelper.warning(StatusCodeTopic.STATUS_SUCCESS, 'Permanent redirect - ensure redirect chain is minimal'));
        } else if (statusCode === 302) {
          evidence.push(EvidenceHelper.warning(StatusCodeTopic.STATUS_SUCCESS, 'Temporary redirect - consider using 301 for permanent moves'));
        } else if (statusCode === 304) {
          evidence.push(EvidenceHelper.warning(StatusCodeTopic.STATUS_SUCCESS, 'Not modified - good for caching'));
        }
      } else if (statusCode >= 400 && statusCode < 500) {
        score = 0;
        scoreBreakdown.push({ component: 'Client error penalty', points: -100 });
        evidence.push(EvidenceHelper.error(StatusCodeTopic.STATUS, 'Client error status code (4xx)', { score: -100, target: 'Fix client errors to avoid penalty' }));
        
        if (statusCode === 404) {
          evidence.push(EvidenceHelper.error(StatusCodeTopic.PAGE_NOT_FOUND, 'Page not found - fix broken link or implement redirect'));
        } else if (statusCode === 403) {
          evidence.push(EvidenceHelper.error(StatusCodeTopic.STATUS_SUCCESS, 'Forbidden - check access permissions'));
        } else if (statusCode === 401) {
          evidence.push(EvidenceHelper.error(StatusCodeTopic.STATUS_SUCCESS, 'Unauthorized - authentication required'));
        }
      } else if (statusCode >= 500) {
        score = 0;
        scoreBreakdown.push({ component: 'Server error penalty', points: -100 });
        evidence.push(EvidenceHelper.error(StatusCodeTopic.STATUS, 'Server error status code (5xx)', { score: -100, target: 'Fix server errors to avoid penalty' }));
        evidence.push(EvidenceHelper.error(StatusCodeTopic.HTTP_STATUS, 'Critical: Server errors prevent AI from accessing content'));
      }

      // Check for soft 404 indicators
      const soft404Indicators = this.checkForSoft404(content.html || '', statusCode);
      if (soft404Indicators.length > 0) {
        score = Math.max(0, score - 40);
        scoreBreakdown.push({ component: 'Soft 404 penalty', points: -40 });
        soft404Indicators.forEach(indicator => evidence.push(indicator));
      }

      // Check for redirect chains or loops (would need crawler data)
      if (content.metadata?.redirectCount) {
        const redirects = content.metadata.redirectCount;
        if (redirects > 0) {
          evidence.push(EvidenceHelper.info(StatusCodeTopic.HTTP_STATUS, `Redirect detection: Detected ${redirects} redirect(s)`));
          if (redirects > 2) {
            score = Math.max(0, score - 20);
            scoreBreakdown.push({ component: 'Long redirect chain penalty', points: -20 });
            evidence.push(EvidenceHelper.warning(StatusCodeTopic.STATUS_SUCCESS, 'Long redirect chain detected (>2 hops)', { score: -20, target: 'Reduce redirect hops to avoid penalty' }));
          }
        }
      }

    } catch (error) {
      evidence.push(EvidenceHelper.info(StatusCodeTopic.HTTP_STATUS, `Error evaluating status code: ${error.message}`));
      score = 0;
    }

    // Add standardized score calculation
    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    return this.createResult(score, evidence, [], {}, recommendations);
  }

  private checkForSoft404(html: string, statusCode: number): EvidenceItem[] {
    const indicators: EvidenceItem[] = [];
    
    // Only check for soft 404 if status is 200
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
      indicators.push(EvidenceHelper.warning(StatusCodeTopic.STATUS_SUCCESS, 'Possible soft 404: Page returns 200 but contains error messages'));
      indicators.push(EvidenceHelper.info(StatusCodeTopic.PAGE_NOT_FOUND, `  Found patterns: ${matchedPatterns.join(', ')}`));
    }
    
    // Check for very short content that might indicate an error page
    const textContent = html.replace(/<[^>]*>/g, '').trim();
    if (textContent.length < 200 && matchedPatterns.length > 0) {
      indicators.push(EvidenceHelper.warning(StatusCodeTopic.HTTP_STATUS, 'Very short content with error patterns suggests soft 404'));
    }
    
    return indicators;
  }

  private getSiteUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}/`;
    } catch {
      return url;
    }
  }

  private truncateUrl(url: string): string {
    if (url.length > 50) {
      return url.substring(0, 47) + '...';
    }
    return url;
  }
}