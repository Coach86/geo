import { Injectable } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';

@Injectable()
export class PageSpeedRule extends BaseAEORule {
  constructor() {
    super(
      'page_speed',
      'Page Speed & Core Web Vitals',
      'TECHNICAL' as Category,
      {
        impactScore: 2,
        pageTypes: [],
        isDomainLevel: true
      }
    );
  }

  async evaluate(url: string, content: PageContent): Promise<RuleResult> {
    const evidence: EvidenceItem[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Check if performance metrics are available
    if (!content.performanceMetrics || !content.performanceMetrics.loadTime) {
      evidence.push(EvidenceHelper.info('Performance metrics not available'));
      recommendations.push('Consider running PageSpeed Insights');
      evidence.push(EvidenceHelper.score('Final Score: 50/100 (No performance data available)'));
      return this.createResult(50, evidence, [], {}, recommendations); // Return neutral score when no data
    }

    const metrics = content.performanceMetrics;
    
    // Check load time
    if (metrics.loadTime !== undefined) {
      const loadTimeSeconds = metrics.loadTime / 1000;
      if (loadTimeSeconds <= 2) {
        evidence.push(EvidenceHelper.success(`Excellent load time: ${loadTimeSeconds.toFixed(2)}s`));
      } else if (loadTimeSeconds <= 3) {
        evidence.push(EvidenceHelper.info(`◐ Good load time: ${loadTimeSeconds.toFixed(2)}s`, { score: -10 }));
        score -= 10;
      } else if (loadTimeSeconds <= 5) {
        evidence.push(EvidenceHelper.warning(`Moderate load time: ${loadTimeSeconds.toFixed(2)}s`, { score: -30 }));
        score -= 30;
      } else {
        evidence.push(EvidenceHelper.error(`Poor load time: ${loadTimeSeconds.toFixed(2)}s`, { score: -50 }));
        score -= 50;
      }
    }

    // Check Core Web Vitals
    let cwvGoodCount = 0;
    let cwvTotalCount = 0;

    // Largest Contentful Paint (LCP)
    if (metrics.lcp !== undefined) {
      cwvTotalCount++;
      if (metrics.lcp <= 2500) {
        evidence.push(EvidenceHelper.success(`LCP Good: ${metrics.lcp}ms (≤2.5s)`));
        cwvGoodCount++;
      } else if (metrics.lcp <= 4000) {
        evidence.push(EvidenceHelper.warning(`LCP Needs Improvement: ${metrics.lcp}ms (2.5-4s)`, { score: -10 }));
        score -= 10;
      } else {
        evidence.push(EvidenceHelper.error(`LCP Poor: ${metrics.lcp}ms (>4s)`, { score: -20 }));
        score -= 20;
      }
    }

    // First Input Delay (FID) / Total Blocking Time
    if (metrics.fid !== undefined) {
      cwvTotalCount++;
      if (metrics.fid <= 100) {
        evidence.push(EvidenceHelper.success(`FID Good: ${metrics.fid}ms (≤100ms)`));
        cwvGoodCount++;
      } else if (metrics.fid <= 300) {
        evidence.push(EvidenceHelper.warning(`FID Needs Improvement: ${metrics.fid}ms (100-300ms)`, { score: -10 }));
        score -= 10;
      } else {
        evidence.push(EvidenceHelper.error(`FID Poor: ${metrics.fid}ms (>300ms)`, { score: -20 }));
        score -= 20;
      }
    }

    // Cumulative Layout Shift (CLS)
    if (metrics.cls !== undefined) {
      cwvTotalCount++;
      if (metrics.cls <= 0.1) {
        evidence.push(EvidenceHelper.success(`CLS Good: ${metrics.cls} (≤0.1)`));
        cwvGoodCount++;
      } else if (metrics.cls <= 0.25) {
        evidence.push(EvidenceHelper.warning(`CLS Needs Improvement: ${metrics.cls} (0.1-0.25)`, { score: -10 }));
        score -= 10;
      } else {
        evidence.push(EvidenceHelper.error(`CLS Poor: ${metrics.cls} (>0.25)`, { score: -20 }));
        score -= 20;
      }
    }

    // Overall Core Web Vitals assessment
    if (cwvTotalCount > 0) {
      const cwvPassRate = (cwvGoodCount / cwvTotalCount) * 100;
      evidence.push(EvidenceHelper.info(`Core Web Vitals: ${cwvGoodCount}/${cwvTotalCount} metrics pass (${cwvPassRate.toFixed(0)}%)`));
      
      if (cwvPassRate === 100) {
        evidence.push(EvidenceHelper.info('● All Core Web Vitals pass!'));
      } else if (cwvPassRate >= 66) {
        evidence.push(EvidenceHelper.info('◐ Most Core Web Vitals pass'));
      } else {
        evidence.push(EvidenceHelper.warning('Core Web Vitals need improvement'));
      }
    } else {
      evidence.push(EvidenceHelper.info('Core Web Vitals data not available'));
    }

    // Final score adjustment
    score = Math.max(0, score);

    if (score >= 90) {
      evidence.push(EvidenceHelper.info('● Excellent page speed performance'));
    } else if (score >= 70) {
      evidence.push(EvidenceHelper.info('◐ Good page speed with room for improvement'));
    } else if (score >= 50) {
      evidence.push(EvidenceHelper.warning('Moderate page speed - optimization recommended'));
    } else {
      evidence.push(EvidenceHelper.error('Poor page speed - significant optimization needed'));
    }

    // Calculate score breakdown
    const loadTimeDeduction = metrics.loadTime && metrics.loadTime > 5000 ? 50 : 
                              metrics.loadTime && metrics.loadTime > 3000 ? 30 : 
                              metrics.loadTime && metrics.loadTime > 2000 ? 10 : 0;
    const cwvDeduction = cwvTotalCount > 0 ? (cwvTotalCount - cwvGoodCount) * 20 : 0;
    evidence.push(EvidenceHelper.score(`Final Score: ${score}/100 (Base: 100, Load Time: -${loadTimeDeduction}, CWV: -${cwvDeduction})`));
    
    return this.createResult(score, evidence, [], {}, recommendations);
  }
}