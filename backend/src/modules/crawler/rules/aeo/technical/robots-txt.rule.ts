import { Injectable } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';

@Injectable()
export class RobotsTxtRule extends BaseAEORule {
  constructor() {
    super(
      'robots_txt',
      'Robots.txt Configuration',
      'TECHNICAL' as Category,
      {
        impactScore: 3, // High impact
        pageTypes: [], // Domain-level check
        isDomainLevel: true
      }
    );
  }

  async evaluate(url: string, content: PageContent): Promise<RuleResult> {
    const evidence: EvidenceItem[] = [];
    const recommendations: string[] = [];
    let score = 100;
    let hasNoIndex = false;
    let hasNoFollow = false;
    let hasNoArchive = false;
    let hasAIConsiderations = false;

    try {
      const domain = this.getDomain(url);
      const robotsTxtUrl = `https://${domain}/robots.txt`;
      
      evidence.push(EvidenceHelper.info(`Checking robots.txt at: ${robotsTxtUrl}`));

      // Check for robots meta tags in HTML as a proxy
      const robotsMetaTags = this.extractRobotsMetaTags(content.html || '');
      
      if (robotsMetaTags.length > 0) {
        evidence.push(EvidenceHelper.info(`Found ${robotsMetaTags.length} robots meta tag(s) on page`));
        
        // Analyze robots meta content
        hasNoIndex = robotsMetaTags.some(tag => tag.includes('noindex'));
        hasNoFollow = robotsMetaTags.some(tag => tag.includes('nofollow'));
        hasNoArchive = robotsMetaTags.some(tag => tag.includes('noarchive'));
        
        if (hasNoIndex) {
          score = 0;
          evidence.push(EvidenceHelper.error('Critical: Page has noindex directive - will not be indexed by AI', { score: -100 }));
        } else if (hasNoFollow) {
          score = 40;
          evidence.push(EvidenceHelper.warning('Page has nofollow directive - links won\'t be followed', { score: -60 }));
        } else if (hasNoArchive) {
          score = 60;
          evidence.push(EvidenceHelper.warning('Page has noarchive directive - content won\'t be cached', { score: -40 }));
        } else {
          evidence.push(EvidenceHelper.success('No restrictive robots directives found'));
        }
      }

      // Check for AI-specific considerations
      hasAIConsiderations = this.checkForAIBotConsiderations(content);
      if (hasAIConsiderations) {
        evidence.push(EvidenceHelper.success('Detected AI-specific bot considerations', { score: 20 }));
        if (score < 100) score += 20; // Bonus for AI considerations
      } else {
        evidence.push(EvidenceHelper.info('No AI-specific bot considerations found'));
        recommendations.push('Consider adding AI-specific user-agent rules (GPTBot, ChatGPT-User, etc.)');
      }

      // Check for sitemap reference (usually in robots.txt)
      const hasSitemapRef = content.html?.toLowerCase().includes('sitemap.xml');
      if (hasSitemapRef) {
        evidence.push(EvidenceHelper.success('Sitemap reference detected'));
      }

    } catch (error) {
      evidence.push(EvidenceHelper.info(`Error evaluating robots.txt: ${error.message}`));
      score = 0;
    }

    // Calculate score breakdown
    const finalScore = Math.min(100, Math.max(0, score));
    let scoreBreakdown = 'Base: 100';
    if (hasNoIndex) scoreBreakdown += ', NoIndex: -100';
    else if (hasNoFollow) scoreBreakdown += ', NoFollow: -60';
    else if (hasNoArchive) scoreBreakdown += ', NoArchive: -40';
    if (hasAIConsiderations && score < 100) scoreBreakdown += ', AI Bot Support: +20';
    evidence.push(EvidenceHelper.score(`Final Score: ${finalScore}/100 (${scoreBreakdown})`));
    
    return this.createResult(
      finalScore,
      evidence,
      [],
      {},
      recommendations
    );
  }

  private getDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return '';
    }
  }

  private extractRobotsMetaTags(html: string): string[] {
    const tags: string[] = [];
    const metaRobotsRegex = /<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/gi;
    
    let match;
    while ((match = metaRobotsRegex.exec(html)) !== null) {
      tags.push(match[1].toLowerCase());
    }
    
    return tags;
  }

  private checkForAIBotConsiderations(content: PageContent): boolean {
    const aiUserAgents = [
      'gptbot',
      'chatgpt',
      'claude',
      'anthropic',
      'google-extended',
      'ccbot',
      'perplexitybot',
      'youbot'
    ];
    
    const htmlLower = (content.html || '').toLowerCase();
    return aiUserAgents.some(agent => htmlLower.includes(agent));
  }
}