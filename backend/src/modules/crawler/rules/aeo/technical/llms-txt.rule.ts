import { Injectable } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';

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
    let score = 0; // Start with 0, only gets points if llms.txt exists
    let hasLlmsTxtReference = false;
    let hasAIUserAgents = false;

    try {
      const domain = this.getDomain(url);
      const llmsTxtUrl = `https://${domain}/llms.txt`;
      
      evidence.push(EvidenceHelper.info(`Checking for llms.txt at: ${llmsTxtUrl}`));

      // Note: In a real implementation, this would need to make an HTTP request
      // For now, we'll check if there are any references to llms.txt in the HTML
      hasLlmsTxtReference = this.checkForLlmsTxtReference(content.html || '');
      
      if (hasLlmsTxtReference) {
        score = 100;
        evidence.push(EvidenceHelper.success('Llms.txt file reference found', { score: 100 }));
        evidence.push(EvidenceHelper.success('Site appears to have AI-specific guidelines for crawlers'));
      } else {
        score = 0;
        evidence.push(EvidenceHelper.error('No llms.txt file detected', { score: 0 }));
        evidence.push(EvidenceHelper.warning('Consider adding an llms.txt file to provide AI-specific crawling guidelines'));
        recommendations.push('Llms.txt helps AI systems understand how to properly crawl and use your content');
      }

      // Check robots.txt for AI-specific user agents as an alternative signal
      hasAIUserAgents = this.checkForAIUserAgents(content.html || '');
      if (hasAIUserAgents && score === 0) {
        score = 50; // Partial credit for having AI considerations in robots.txt
        evidence.push(EvidenceHelper.warning('Found AI-specific user agent rules in robots.txt (partial credit)', { score: 50 }));
      }

    } catch (error) {
      evidence.push(EvidenceHelper.info(`Error checking llms.txt: ${error.message}`));
      score = 0;
    }

    // Calculate score breakdown
    let scoreBreakdown = '';
    if (hasLlmsTxtReference) {
      scoreBreakdown = 'Llms.txt found: +100';
    } else if (hasAIUserAgents) {
      scoreBreakdown = 'No llms.txt: 0, AI user agents in robots.txt: +50';
    } else {
      scoreBreakdown = 'No llms.txt file: 0';
    }
    evidence.push(EvidenceHelper.score(`Final Score: ${score}/100 (${scoreBreakdown})`));
    
    return this.createResult(score, evidence, [], {}, recommendations);
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