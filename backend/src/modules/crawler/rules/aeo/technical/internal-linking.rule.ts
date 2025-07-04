import { Injectable, Logger } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';
import { PageCategoryType } from '../../../interfaces/page-category.interface';

@Injectable()
export class InternalLinkingRule extends BaseAEORule {
  private readonly logger = new Logger(InternalLinkingRule.name);
  
  constructor() {
    super(
      'internal_linking',
      'Internal Linking',
      'TECHNICAL' as Category,
      {
        impactScore: 3,
        pageTypes: [], // Applies to all page types (domain-level rule)
        isDomainLevel: true
      }
    );
  }

  async evaluate(url: string, content: PageContent): Promise<RuleResult> {
    const evidence: EvidenceItem[] = [];
    let score = 0;

    try {
      const siteUrl = this.getSiteUrl(url);

      // Standard internal linking analysis without GSC integration
      evidence.push(EvidenceHelper.warning('Internal linking analysis limited without Google Search Console data'));
      evidence.push(EvidenceHelper.info('For comprehensive internal linking analysis:'));
      evidence.push(EvidenceHelper.info('• Use tools like Screaming Frog or Sitebulb'));
      evidence.push(EvidenceHelper.info('• Verify site structure in Google Search Console'));
      evidence.push(EvidenceHelper.info('• Monitor internal linking through site audits'));
      
      // Basic fallback analysis based on best practices
      score = 50; // Neutral score without external data

      // Tertiary analysis: Check for pillar page and topic cluster architecture
      const pillarPageAnalysis = await this.analyzePillarPageArchitecture(siteUrl);
      if (pillarPageAnalysis.hasPillarPages) {
        score = Math.min(100, score + 15);
        evidence.push(EvidenceHelper.success(`Pillar page architecture detected (${pillarPageAnalysis.pillarCount} pillars)`, { score: 15 }));
        if (pillarPageAnalysis.wellConnectedClusters > 0) {
          score = Math.min(100, score + 10);
          evidence.push(EvidenceHelper.success(`Topic clusters are well-connected to pillar pages`, { score: 10 }));
        }
      } else {
        evidence.push(EvidenceHelper.warning(`No clear pillar page architecture identified`, { target: 'Consider creating pillar pages as content hubs for topic clusters' }));
      }

      // Final scoring and recommendations
      if (score >= 90) {
        evidence.push(EvidenceHelper.info(`● Excellent internal linking structure`));
      } else if (score >= 70) {
        evidence.push(EvidenceHelper.info(`◐ Good internal linking with room for improvement`));
      } else if (score >= 50) {
        evidence.push(EvidenceHelper.warning(`Moderate internal linking structure`));
      } else if (score > 0) {
        evidence.push(EvidenceHelper.warning(`Poor internal linking structure needs attention`));
      } else {
        evidence.push(EvidenceHelper.error(`Critical internal linking issues detected`));
      }

      this.addInternalLinkingRecommendations(evidence, score);

    } catch (error) {
      evidence.push(EvidenceHelper.info(`Error evaluating internal linking: ${error.message}`));
      score = 0;
    }

    // Calculate score breakdown
    const scoreBreakdown: { component: string; points: number }[] = [
      { component: 'Base score (no GSC data)', points: 50 }
    ];
    
    if (score > 50) {
      scoreBreakdown.push({ component: 'Additional factors', points: score - 50 });
    }
    
    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    return this.createResult(score, evidence);
  }


  private getSiteUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}/`;
    } catch {
      return url;
    }
  }

  private async analyzePillarPageArchitecture(siteUrl: string): Promise<{
    hasPillarPages: boolean;
    pillarCount: number;
    wellConnectedClusters: number;
  }> {
    try {
      // This would ideally use site crawl data or GSC data to identify pillar pages
      // For now, we'll do a basic heuristic analysis
      
      // Check for common pillar page patterns
      const pillarPatterns = [
        'ultimate-guide',
        'complete-guide',
        'everything-you-need-to-know',
        'comprehensive-guide',
        'pillar'
      ];
      
      // This is a placeholder implementation
      // In a real implementation, you would:
      // 1. Get site structure from sitemap or crawl data
      // 2. Analyze URL patterns and content depth
      // 3. Check for hub-and-spoke linking patterns
      // 4. Use GSC internal linking data to identify central pages
      
      return {
        hasPillarPages: false, // Default to false until proper analysis is implemented
        pillarCount: 0,
        wellConnectedClusters: 0
      };
    } catch (error) {
      this.logger.debug('Error analyzing pillar page architecture:', error);
      return {
        hasPillarPages: false,
        pillarCount: 0,
        wellConnectedClusters: 0
      };
    }
  }

  private addInternalLinkingRecommendations(evidence: EvidenceItem[], score: number): void {
    evidence.push(EvidenceHelper.heading('Recommendations'));
    if (score < 50) {
      evidence.push(EvidenceHelper.info('Configure Google Search Console to get detailed internal linking insights'));
      evidence.push(EvidenceHelper.info('Create pillar pages as content hubs for related topic clusters'));
      evidence.push(EvidenceHelper.info('Ensure all important pages receive internal links'));
      evidence.push(EvidenceHelper.info('Use descriptive anchor text instead of generic phrases'));
    } else if (score < 80) {
      evidence.push(EvidenceHelper.info('Review orphaned pages and add strategic internal links'));
      evidence.push(EvidenceHelper.info('Improve anchor text variety and descriptiveness'));
      evidence.push(EvidenceHelper.info('Strengthen topic cluster architecture with better hub-and-spoke linking'));
    } else {
      evidence.push(EvidenceHelper.info('Continue monitoring internal linking health through GSC'));
      evidence.push(EvidenceHelper.info('Expand topic cluster architecture for new content areas'));
    }
  }
}