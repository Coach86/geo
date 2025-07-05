import { Injectable } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';


// Evidence topics for this rule
enum RobotsTxtTopic {
  ROBOTS_ANALYSIS = 'Robots Analysis',
  INDEXING_DIRECTIVES = 'Indexing Directives',
  LINKING = 'Linking',
  NO_RESTRICTIONS = 'No Restrictions',
  SITEMAP = 'Sitemap'
}

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
    const scoreBreakdown: { component: string; points: number }[] = [
      { component: 'Base score', points: 100 }
    ];

    // Add base score evidence item
    evidence.push(EvidenceHelper.base(100));

    try {
      const domain = this.getDomain(url);
      const robotsTxtUrl = `https://${domain}/robots.txt`;
      
      evidence.push(EvidenceHelper.info(RobotsTxtTopic.ROBOTS_ANALYSIS, `Checking robots.txt at: ${robotsTxtUrl}`));

      // Check for robots meta tags in HTML as a proxy
      const robotsMetaTags = this.extractRobotsMetaTags(content.html || '');
      
      if (robotsMetaTags.length > 0) {
        // Add evidence with code snippets for each meta tag found
        robotsMetaTags.forEach(tagInfo => {
          evidence.push(EvidenceHelper.info(
            RobotsTxtTopic.ROBOTS_ANALYSIS, 
            `Found robots meta tag: ${tagInfo.content}`,
            { code: tagInfo.tag }
          ));
        });
        
        // Analyze robots meta content
        hasNoIndex = robotsMetaTags.some(tag => tag.content.includes('noindex'));
        hasNoFollow = robotsMetaTags.some(tag => tag.content.includes('nofollow'));
        hasNoArchive = robotsMetaTags.some(tag => tag.content.includes('noarchive'));
        
        if (hasNoIndex) {
          const noIndexTag = robotsMetaTags.find(tag => tag.content.includes('noindex'));
          score = 0;
          scoreBreakdown.push({ component: 'NoIndex penalty', points: -100 });
          evidence.push(EvidenceHelper.error(
            RobotsTxtTopic.INDEXING_DIRECTIVES, 
            'Critical: Page has noindex directive - will not be indexed by AI', 
            { 
              score: 0, 
              target: 'Remove noindex to avoid penalty',
              code: noIndexTag?.tag
            }
          ));
        } else if (hasNoFollow) {
          const noFollowTag = robotsMetaTags.find(tag => tag.content.includes('nofollow'));
          score = 40;
          scoreBreakdown.push({ component: 'NoFollow penalty', points: -60 });
          evidence.push(EvidenceHelper.warning(
            RobotsTxtTopic.LINKING, 
            'Page has nofollow directive - links won\'t be followed', 
            { 
              score: 0, 
              target: 'Remove nofollow to avoid penalty',
              code: noFollowTag?.tag
            }
          ));
        } else if (hasNoArchive) {
          const noArchiveTag = robotsMetaTags.find(tag => tag.content.includes('noarchive'));
          score = 60;
          scoreBreakdown.push({ component: 'NoArchive penalty', points: -40 });
          evidence.push(EvidenceHelper.warning(
            RobotsTxtTopic.ROBOTS_ANALYSIS, 
            'Page has noarchive directive - content won\'t be cached', 
            { 
              score: 0, 
              target: 'Remove noarchive to avoid penalty',
              code: noArchiveTag?.tag
            }
          ));
        } else {
          // Show the actual meta tags that have no restrictions
          const allowedTags = robotsMetaTags.filter(tag => 
            !tag.content.includes('noindex') && 
            !tag.content.includes('nofollow') && 
            !tag.content.includes('noarchive')
          );
          
          evidence.push(EvidenceHelper.success(
            RobotsTxtTopic.NO_RESTRICTIONS, 
            'No restrictive robots directives found', 
            { 
              target: 'Optimal robots configuration',
              code: allowedTags.map(t => t.tag).join('\n')
            }
          ));
        }
      }

      // Check for AI-specific considerations (BONUS POINTS)
      evidence.push(EvidenceHelper.heading('AI Bot Optimization (Bonus Points)'));
      hasAIConsiderations = this.checkForAIBotConsiderations(content);
      if (hasAIConsiderations) {
        evidence.push(EvidenceHelper.success(RobotsTxtTopic.INDEXING_DIRECTIVES, 'Detected AI-specific bot considerations (+20 BONUS POINTS)', { score: 20, maxScore: 20, target: 'AI bot optimization bonus achieved' }));
        if (score < 100) {
          score += 20; // Bonus for AI considerations
          scoreBreakdown.push({ component: 'AI bot support bonus', points: 20 });
        }
      } else {
        evidence.push(EvidenceHelper.info(RobotsTxtTopic.NO_RESTRICTIONS, 'No AI-specific bot considerations found (BONUS AVAILABLE)', { score: 0, maxScore: 20, target: 'Add AI-specific rules for +20 BONUS POINTS' }));
        recommendations.push('Consider adding AI-specific user-agent rules (GPTBot, ChatGPT-User, etc.) for +20 BONUS POINTS');
      }

      // Check for sitemap reference (usually in robots.txt)
      const hasSitemapRef = content.html?.toLowerCase().includes('sitemap.xml');
      if (hasSitemapRef) {
        evidence.push(EvidenceHelper.success(RobotsTxtTopic.SITEMAP, 'Sitemap reference detected'));
      }

    } catch (error) {
      evidence.push(EvidenceHelper.info(RobotsTxtTopic.ROBOTS_ANALYSIS, `Error evaluating robots.txt: ${error.message}`));
      score = 0;
    }

    // Calculate final score and add score calculation evidence
    const finalScore = Math.min(100, Math.max(0, score));
    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, finalScore, 100));
    
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

  private extractRobotsMetaTags(html: string): Array<{ content: string; tag: string }> {
    const tags: Array<{ content: string; tag: string }> = [];
    const metaRobotsRegex = /<meta\s+name=["']robots["']\s+content=["']([^"']+)["'][^>]*>/gi;
    
    let match;
    while ((match = metaRobotsRegex.exec(html)) !== null) {
      tags.push({
        content: match[1].toLowerCase(),
        tag: match[0]
      });
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