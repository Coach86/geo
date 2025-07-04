import { Injectable } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult,
  PageContent,
  Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';

/**
 * NOT IMPLEMENTED - OFF-SITE RULE
 * 
 * This is an Off-Site rule that would require external data sources
 * For now, we return a placeholder result indicating external analysis is needed
 */
@Injectable()
export class PodcastingRule extends BaseAEORule {
  constructor() {
    super(
      'podcasting-authority',
      'Podcasting Authority',
      'AUTHORITY',
      {
        impactScore: 2, // Medium impact
        pageTypes: [], // Off-site rule
        isDomainLevel: true // Domain-level analysis
      }
    );
  }
  
  async evaluate(url: string, content: PageContent): Promise<RuleResult> {
    const evidence: EvidenceItem[] = [];
    const details: Record<string, any> = {};
    
    // Note: This is an Off-Site rule that would require external data sources
    // For now, we return a placeholder result indicating external analysis is needed
    
    evidence.push(EvidenceHelper.info('Podcasting authority analysis requires external podcast platform data'));
    evidence.push(EvidenceHelper.info('Would analyze: Podcast presence and hosting frequency'));
    evidence.push(EvidenceHelper.info('Would check: Guest appearances on industry podcasts'));
    evidence.push(EvidenceHelper.info('Would measure: Download counts and listener engagement'));
    evidence.push(EvidenceHelper.info('Would assess: Audio content quality and thought leadership'));
    
    const score = 0;
    
    details.analysisType = 'off-site';
    details.requiresExternalData = true;
    details.dataNeeded = [
      'Podcast platform presence tracking',
      'Guest appearance frequency analysis',
      'Podcast download and engagement metrics',
      'Audio content quality assessment',
      'Industry podcast participation evaluation'
    ];
    details.criteria = 'Authority Building';
    details.element = 'Podcasting Authority';
    details.applicationLevel = 'Off-Site';
    details.seoLlmType = 'SEO adapted to LLM';
    details.impact = 'Medium';
    details.importance = 'Podcast presence and guest appearances establish thought leadership through audio content.';
    details.checklist = [
      'Regular podcast hosting or guest appearances',
      'High-quality audio content production',
      'Industry-relevant topics and discussions',
      'Growing listener base and engagement',
      'Cross-platform podcast promotion'
    ];
    details.issueMessage = 'Limited podcasting presence misses audio content opportunities for thought leadership.';
    details.recommendationMessage = 'Develop podcast strategy through hosting or guest appearances on industry-relevant shows.';
    
    evidence.push(EvidenceHelper.score(`Final Score: ${score}/100 (Requires external monitoring or manual assessment)`));
    
    return this.createResult(score, evidence, score < 60 ? [{
      severity: 'medium',
      description: details.issueMessage,
      recommendation: details.recommendationMessage
    }] : undefined, details);
  }
}