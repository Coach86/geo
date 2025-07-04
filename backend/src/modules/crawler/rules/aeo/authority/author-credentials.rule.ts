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
export class AuthorCredentialsRule extends BaseAEORule {
  constructor() {
    super(
      'author-credentials-bio-pages',
      'Author Credentials & Bio Pages',
      'AUTHORITY',
      {
        impactScore: 3, // High impact
        pageTypes: [], // Off-site rule - applies to domain level
        isDomainLevel: true // Domain-level analysis
      }
    );
  }
  
  async evaluate(url: string, content: PageContent): Promise<RuleResult> {
    const evidence: EvidenceItem[] = [];
    const details: Record<string, any> = {};
    
    // Note: This is an Off-Site rule that would require external data sources
    // For now, we return a placeholder result indicating external analysis is needed
    
    evidence.push(EvidenceHelper.info('Author credentials analysis requires external data sources'));
    evidence.push(EvidenceHelper.info('Would analyze: Author bio page existence across domain'));
    evidence.push(EvidenceHelper.info('Would check: Bio page linking from articles'));
    evidence.push(EvidenceHelper.info('Would verify: Person and ProfilePage schema implementation'));
    evidence.push(EvidenceHelper.info('Would assess: Credential detail and professional experience documentation'));
    
    // Placeholder score - in production, this would integrate with external APIs
    const score = 0;
    
    details.analysisType = 'off-site';
    details.requiresExternalData = true;
    details.dataNeeded = [
      'Domain-wide author bio page inventory',
      'Article-to-author linking analysis',
      'Schema markup verification',
      'Author credential completeness assessment'
    ];
    details.criteria = 'Brand Authority';
    details.element = 'Author Credentials & Bio Pages';
    details.applicationLevel = 'Off-Site';
    details.seoLlmType = 'SEO adapted to LLM';
    details.impact = 'High';
    details.importance = 'Establishes credibility and expertise through dedicated author bio pages with proper linking and schema markup.';
    details.checklist = [
      'Every author has a dedicated, unique bio page',
      'Every article links to author bio page',
      'Bio pages detail professional credentials and experience',
      'Uses Person and ProfilePage schema markup',
      'Author pages are discoverable and indexed'
    ];
    details.issueMessage = 'Missing or incomplete author bio pages reduces content credibility and authority signals.';
    details.recommendationMessage = 'Create comprehensive author bio pages with proper schema markup and ensure all content links to author bios.';
    
    evidence.push(EvidenceHelper.score(`Final Score: ${score}/100 (Requires external monitoring or manual assessment)`));
    
    return this.createResult(score, evidence, score < 60 ? [{
      severity: 'high',
      description: details.issueMessage,
      recommendation: details.recommendationMessage
    }] : undefined, details);
  }
}