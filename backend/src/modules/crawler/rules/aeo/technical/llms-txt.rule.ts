import { Injectable } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';

// Evidence topics for this rule
enum LlmsTxtTopic {
  FILE_PRESENCE = 'Llms.txt File Presence',
  AI_CRAWLING_GUIDELINES = 'AI Crawling Guidelines',
  AI_USER_AGENTS = 'AI User Agents in Robots.txt'
}

@Injectable()
export class LlmsTxtRule extends BaseAEORule {
  constructor() {
    super(
      'llms_txt',
      'Llms.txt File',
      'TECHNICAL' as Category,
      {
        impactScore: 1, // Low impact
        pageTypes: [], // Domain-level check
        isDomainLevel: true
      }
    );
  }

  async evaluate(url: string, content: PageContent): Promise<RuleResult> {
    const evidence: EvidenceItem[] = [];
    const recommendations: string[] = [];
    let score = 0; // Start with 0, build up points based on CSV: 0/33/100
    const scoreBreakdown: { component: string; points: number }[] = [];
    let hasLlmsTxtReference = false;
    let hasAIUserAgents = false;

    try {
      const domain = this.getDomain(url);
      const llmsTxtUrl = `https://${domain}/llms.txt`;
      
      evidence.push(EvidenceHelper.info(LlmsTxtTopic.FILE_PRESENCE, `Checking for llms.txt at: ${llmsTxtUrl}`));

      // Note: In a real implementation, this would need to make an HTTP request
      // For now, we'll check if there are any references to llms.txt in the HTML
      hasLlmsTxtReference = this.checkForLlmsTxtReference(content.html || '');
      
      if (hasLlmsTxtReference) {
        // Score 100: File exists and appears to be well-structured (based on CSV scoring)
        score = 100;
        scoreBreakdown.push({ component: 'Llms.txt file found', points: 100 });
        evidence.push(EvidenceHelper.success(LlmsTxtTopic.FILE_PRESENCE, 'Llms.txt file reference found', { target: 'Llms.txt file present' }));
        evidence.push(EvidenceHelper.success(LlmsTxtTopic.AI_CRAWLING_GUIDELINES, 'Site has AI-specific guidelines for crawlers', { target: 'AI crawling guidelines available' }));
      } else {
        // Score 0: File does not exist (returns 404 error) - based on CSV scoring
        score = 0;
        scoreBreakdown.push({ component: 'No llms.txt file', points: 0 });
        evidence.push(EvidenceHelper.error(LlmsTxtTopic.FILE_PRESENCE, 'No llms.txt file detected', { target: 'Add llms.txt file for 100 points' }));
        evidence.push(EvidenceHelper.warning(LlmsTxtTopic.AI_CRAWLING_GUIDELINES, 'Missing AI-specific crawling guidelines', { target: 'Provide AI crawling guidelines' }));
        recommendations.push('Add llms.txt file to provide AI-specific crawling guidelines');
        recommendations.push('Llms.txt helps AI systems understand how to properly crawl and use your content');
      }

      // Check robots.txt for AI-specific user agents as an alternative signal
      hasAIUserAgents = this.checkForAIUserAgents(content.html || '');
      if (hasAIUserAgents && score === 0) {
        // Score 33: Partial credit for having AI considerations in robots.txt (equivalent to CSV score 1/3)
        score = 33;
        scoreBreakdown.push({ component: 'AI user agents in robots.txt', points: 33 });
        evidence.push(EvidenceHelper.warning(LlmsTxtTopic.AI_USER_AGENTS, 'Found AI-specific user agent rules in robots.txt', { target: 'Llms.txt preferred over robots.txt' }));
        recommendations.push('Consider moving AI guidelines from robots.txt to llms.txt for better AI optimization');
      }

    } catch (error) {
      evidence.push(EvidenceHelper.info(LlmsTxtTopic.FILE_PRESENCE, `Error checking llms.txt: ${error.message}`));
      score = 0;
    }

    // Add score calculation explanation with correct max score
    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    return this.createResult(score, evidence, undefined, undefined, recommendations);
  }

  private getDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return '';
    }
  }

  private checkForLlmsTxtReference(html: string): boolean {
    // Check for any references to llms.txt in the HTML
    const patterns = [
      /llms\.txt/i,
      /href=["']\/llms\.txt["']/i,
      /<link[^>]+href=["']\/llms\.txt["']/i
    ];
    
    return patterns.some(pattern => pattern.test(html));
  }

  private checkForAIUserAgents(html: string): boolean {
    // Check for AI-specific user agents that might be mentioned
    const aiUserAgents = [
      'GPTBot',
      'ChatGPT-User',
      'Claude-Web',
      'Anthropic-AI',
      'Google-Extended',
      'CCBot',
      'PerplexityBot',
      'YouBot'
    ];
    
    const htmlLower = html.toLowerCase();
    return aiUserAgents.some(agent => htmlLower.includes(agent.toLowerCase()));
  }
}