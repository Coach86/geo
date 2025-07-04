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
export class ExpertReviewsRule extends BaseAEORule {
  constructor() {
    super(
      'expert-reviews-comparison-sites',
      'Expert Reviews & Comparison Sites',
      'AUTHORITY',
      {
        impactScore: 3, // High impact
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
    
    evidence.push(EvidenceHelper.info('Expert review analysis requires external review site data'));
    evidence.push(EvidenceHelper.info('Would analyze: Presence on G2, Capterra, TrustRadius, etc.'));
    evidence.push(EvidenceHelper.info('Would check: Industry-specific review platforms'));
    evidence.push(EvidenceHelper.info('Would measure: Review scores and sentiment'));
    evidence.push(EvidenceHelper.info('Would track: Inclusion in comparison articles and roundups'));
    
    // Placeholder score - in production, this would integrate with external APIs
    const score = 0;
    
    details.analysisType = 'off-site';
    details.requiresExternalData = true;
    details.dataNeeded = [
      'G2 platform presence and ratings',
      'Capterra listing and review analysis',
      'TrustRadius expert review scores',
      'GetApp marketplace positioning',
      'Industry-specific review site mentions',
      'Expert blog comparison inclusion analysis'
    ];
    details.criteria = 'Brand Authority';
    details.element = 'Expert Reviews & Comparison Sites';
    details.applicationLevel = 'Off-Site';
    details.seoLlmType = 'SEO adapted to LLM';
    details.impact = 'High';
    details.importance = 'Presence in expert reviews and comparison sites establishes third-party validation and industry authority.';
    details.checklist = [
      'Featured in major industry review sites',
      'Included in expert comparisons and roundups',
      'Positive ratings from trusted reviewers',
      'Presence in "best of" lists',
      'Citations by industry experts'
    ];
    details.issueMessage = 'Limited presence in expert reviews and comparisons reduces third-party authority signals.';
    details.recommendationMessage = 'Pursue inclusion in major review sites and expert comparisons through outreach and product excellence.';
    
    evidence.push(EvidenceHelper.score(`Final Score: ${score}/100 (Requires external monitoring or manual assessment)`));
    
    return this.createResult(score, evidence, score < 60 ? [{
      severity: 'high',
      description: details.issueMessage,
      recommendation: details.recommendationMessage
    }] : undefined, details);
  }
}