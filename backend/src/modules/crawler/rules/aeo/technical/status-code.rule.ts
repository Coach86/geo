import { Injectable } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';

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

    // Standard status code analysis without GSC integration

    try {
      // Since we have content, we can assume a successful response
      // In a real implementation, this would check actual HTTP status from crawler metadata
      const statusCode = content.metadata?.statusCode || 200;
      
      evidence.push(EvidenceHelper.info(`HTTP Status Code: ${statusCode}`));

      // Check various status code ranges
      if (statusCode >= 200 && statusCode < 300) {
        score = 100;
        evidence.push(EvidenceHelper.success('Success status code (2xx)', { score: 100 }));
        
        if (statusCode === 200) {
          evidence.push(EvidenceHelper.success('Standard success response'));
        } else if (statusCode === 201) {
          evidence.push(EvidenceHelper.success('Resource created successfully'));
        } else if (statusCode === 204) {
          evidence.push(EvidenceHelper.success('No content (intentional)'));
        }
      } else if (statusCode >= 300 && statusCode < 400) {
        score = 60;
        evidence.push(EvidenceHelper.warning('Redirect status code (3xx)', { score: -40 }));
        
        if (statusCode === 301) {
          evidence.push(EvidenceHelper.warning('Permanent redirect - ensure redirect chain is minimal'));
        } else if (statusCode === 302) {
          evidence.push(EvidenceHelper.warning('Temporary redirect - consider using 301 for permanent moves'));
        } else if (statusCode === 304) {
          evidence.push(EvidenceHelper.warning('Not modified - good for caching'));
        }
      } else if (statusCode >= 400 && statusCode < 500) {
        score = 0;
        evidence.push(EvidenceHelper.error('Client error status code (4xx)', { score: -100 }));
        
        if (statusCode === 404) {
          evidence.push(EvidenceHelper.error('Page not found - fix broken link or implement redirect'));
        } else if (statusCode === 403) {
          evidence.push(EvidenceHelper.error('Forbidden - check access permissions'));
        } else if (statusCode === 401) {
          evidence.push(EvidenceHelper.error('Unauthorized - authentication required'));
        }
      } else if (statusCode >= 500) {
        score = 0;
        evidence.push(EvidenceHelper.error('Server error status code (5xx)', { score: -100 }));
        evidence.push(EvidenceHelper.error('Critical: Server errors prevent AI from accessing content'));
      }

      // Check for soft 404 indicators
      const soft404Indicators = this.checkForSoft404(content.html || '', statusCode);
      if (soft404Indicators.length > 0) {
        score = Math.max(0, score - 40);
        soft404Indicators.forEach(indicator => evidence.push(indicator));
      }

      // Check for redirect chains or loops (would need crawler data)
      if (content.metadata?.redirectCount) {
        const redirects = content.metadata.redirectCount;
        if (redirects > 0) {
          evidence.push(EvidenceHelper.info(`Redirect detection: Detected ${redirects} redirect(s)`));
          if (redirects > 2) {
            score = Math.max(0, score - 20);
            evidence.push(EvidenceHelper.warning('Long redirect chain detected (>2 hops)', { score: -20 }));
          }
        }
      }

    } catch (error) {
      evidence.push(EvidenceHelper.info(`Error evaluating status code: ${error.message}`));
      score = 0;
    }

    // Calculate score breakdown
    const scoreBreakdown: { component: string; points: number }[] = [
      { component: 'Base score', points: 100 }
    ];
    
    if (score < 100) {
      scoreBreakdown.push({ component: 'Status code issues', points: score - 100 });
    }
    
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
      indicators.push(EvidenceHelper.warning('Possible soft 404: Page returns 200 but contains error messages'));
      indicators.push(EvidenceHelper.info(`  Found patterns: ${matchedPatterns.join(', ')}`));
    }
    
    // Check for very short content that might indicate an error page
    const textContent = html.replace(/<[^>]*>/g, '').trim();
    if (textContent.length < 200 && matchedPatterns.length > 0) {
      indicators.push(EvidenceHelper.warning('Very short content with error patterns suggests soft 404'));
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