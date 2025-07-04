/**
 * NOT IMPLEMENTED - MONITORING KPI RULE
 * 
 * This is a Monitoring KPI rule that would require external data sources and analysis
 * For now, we return a placeholder result indicating external monitoring is needed
 */

import { Injectable } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult,
  PageContent,
  Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';

@Injectable()
export class BrandMentionsRule extends BaseAEORule {
  constructor() {
    super(
      'brand-mentions',
      'Brand Mentions',
      'MONITORING_KPI',
      {
        impactScore: 3, // High impact
        pageTypes: [], // Off-site monitoring
        isDomainLevel: true // Domain-level analysis
      }
    );
  }
  
  async evaluate(url: string, content: PageContent): Promise<RuleResult> {
    const evidence: EvidenceItem[] = [];
    const details: Record<string, any> = {};
    
    // Note: This is a Monitoring KPI rule that would require external data sources
    // For now, we return a placeholder result indicating external analysis is needed
    
    evidence.push(EvidenceHelper.info('Brand mentions monitoring requires comprehensive tracking tools'));
    evidence.push(EvidenceHelper.info('Would analyze: Brand name appearances across AI platforms'));
    evidence.push(EvidenceHelper.info('Would check: Context and sentiment of brand mentions'));
    evidence.push(EvidenceHelper.info('Would measure: Mention frequency and reach metrics'));
    evidence.push(EvidenceHelper.info('Would track: Share of voice compared to competitors'));
    
    // Placeholder score - in production, this would integrate with brand monitoring APIs
    const score = 0;
    
    details.analysisType = 'monitoring-kpi';
    details.requiresExternalData = true;
    details.dataNeeded = [
      'Brand mention tracking across platforms',
      'AI-generated content monitoring',
      'Mention context and sentiment analysis',
      'Competitive share of voice metrics',
      'Trend analysis and reporting'
    ];
    details.criteria = 'Brand Authority';
    details.element = 'Brand Mentions';
    details.applicationLevel = 'Own analysis - mint';
    details.seoLlmType = 'SEO adapted to LLM';
    details.impact = 'High';
    details.importance = 'Frequent, positive brand mentions help AI engines recognize and trust your brand, increasing your visibility in generative search results.';
    details.checklist = [
      'Define the brand name, product names, and relevant variants to monitor',
      'Track mentions across AI-generated responses',
      'Analyze mention context and sentiment',
      'Monitor mention frequency trends',
      'Compare with competitor mention rates'
    ];
    details.issueMessage = 'Low brand mention frequency in AI outputs limits visibility and recognition in generative search results.';
    details.recommendationMessage = '<target>Increase brand visibility through strategic content creation, PR efforts, and community engagement to boost natural brand mentions that AI systems will recognize and reference</target>.';
    
    evidence.push(EvidenceHelper.score(`Final Score: ${score}/100 (Monitoring KPI - requires external data sources for tracking)`));
    
    return this.createResult(score, evidence, score < 60 ? [{
      severity: 'high',
      description: details.issueMessage,
      recommendation: details.recommendationMessage
    }] : undefined, details);
  }
}