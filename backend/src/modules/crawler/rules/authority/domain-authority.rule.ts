import { BaseRule } from '../base/base-rule';
import { RuleContext, RuleResult, RuleDimension, RuleApplicability } from '../interfaces/rule.interface';
import { LlmProvider } from '../../../llm/interfaces/llm-provider.enum';
import { AUTHORITY_CONSTANTS, HYBRID_CONSTANTS } from '../../config/scoring-constants';

/**
 * Rule that evaluates domain authority using Perplexity web search
 * This wraps the existing domain authority logic from HybridKPIAnalyzerService
 */
export class DomainAuthorityRule extends BaseRule {
  id = 'domain-authority';
  name = 'Domain Authority & Reputation';
  dimension: RuleDimension = 'authority';
  description = 'Evaluates the overall authority and reputation of the domain';
  priority = 80;
  weight = 0.3; // 30% of authority score
  
  applicability: RuleApplicability = {
    scope: 'domain' // Applies to all pages on the domain
  };
  
  // Cache for domain authority to avoid repeated Perplexity calls
  private static domainAuthorityCache = new Map<string, string>();
  private static domainLevelCache = new Map<string, 'low' | 'medium' | 'high' | 'unknown'>();
  
  async evaluate(context: RuleContext): Promise<RuleResult> {
    try {
      const domain = this.extractDomain(context.url);
      
      // Get domain authority information (uses cache if available)
      const domainInfo = await this.getDomainAuthorityInfo(domain, context);
      
      // Assess the domain authority level
      const authorityLevel = this.assessDomainAuthorityLevel(domain, domainInfo);
      
      // Calculate score based on authority level
      let score = 0;
      const evidence: string[] = [];
      const details = {
        domain,
        authorityLevel,
        domainInfo: domainInfo.substring(0, 200) // First 200 chars of research
      };
      
      switch (authorityLevel) {
        case 'high':
          score = 100;
          evidence.push(`High authority domain: ${domain}`);
          break;
        case 'medium':
          score = 60;
          evidence.push(`Medium authority domain: ${domain}`);
          break;
        case 'low':
          score = 20;
          evidence.push(`Low authority domain: ${domain}`);
          break;
        default:
          score = 10;
          evidence.push(`Unknown domain authority: ${domain}`);
      }
      
      // Extract justification from Perplexity response
      const justificationMatch = domainInfo.match(/JUSTIFICATION:\s*(.+?)(?:\n|$)/i);
      if (justificationMatch) {
        evidence.push(justificationMatch[1].trim());
      }
      
      // Generate issues based on authority level
      const issues = [];
      if (authorityLevel === 'low' || authorityLevel === 'unknown') {
        issues.push(this.createIssue(
          'medium',
          `Domain has ${authorityLevel} authority`,
          'Build domain reputation through quality content, backlinks, and consistent branding'
        ));
      }
      
      return this.createResult(score, 100, evidence, details, issues);
      
    } catch (error) {
      this.logger.error('Error evaluating domain authority:', error);
      return this.createResult(
        10,
        100,
        ['Failed to analyze domain authority'],
        { error: error.message },
        [this.createIssue('high', 'Domain authority analysis failed', 'Check network connectivity and retry')]
      );
    }
  }
  
  /**
   * Get domain authority information using Perplexity (cached)
   * This is the exact logic from HybridKPIAnalyzerService
   */
  private async getDomainAuthorityInfo(domain: string, context: RuleContext): Promise<string> {
    // Check cache first
    if (DomainAuthorityRule.domainAuthorityCache.has(domain)) {
      this.logger.log(`Using cached domain authority info for: ${domain}`);
      return DomainAuthorityRule.domainAuthorityCache.get(domain)!;
    }
    
    if (!context.llmService) {
      return `Domain: ${domain} - LLM service not available for authority research`;
    }
    
    try {
      this.logger.log(`Requesting domain authority info for: ${domain}`);
      
      // Use the exact same prompt as HybridKPIAnalyzerService
      const domainPrompt = `Research the domain authority and credibility of "${domain}". 

Based on your research, classify the domain authority as one of: HIGH, MEDIUM, LOW, or UNKNOWN.

Consider:
- Company age and establishment date
- Market position and industry recognition  
- Trust signals and user base size
- Media coverage and reputation
- Government/education (.gov/.edu) status

Respond with:
1. CLASSIFICATION: [HIGH/MEDIUM/LOW/UNKNOWN]
2. BRIEF JUSTIFICATION: [One sentence explaining why]`;

      const response = await context.llmService.call(
        LlmProvider.Perplexity,
        domainPrompt,
        {
          model: HYBRID_CONSTANTS.PERPLEXITY.MODEL,
          temperature: HYBRID_CONSTANTS.PERPLEXITY.TEMPERATURE,
          maxTokens: HYBRID_CONSTANTS.PERPLEXITY.MAX_TOKENS,
        }
      );
      
      const result = response.text || `Domain: ${domain} - Research completed but no specific information found.`;
      
      // Cache the result
      DomainAuthorityRule.domainAuthorityCache.set(domain, result);
      
      this.logger.log(`Domain authority research complete for ${domain}`);
      
      return result;
    } catch (error) {
      const fallback = `Domain: ${domain} - Unable to research domain authority. Fallback: Treat as unknown commercial domain.`;
      DomainAuthorityRule.domainAuthorityCache.set(domain, fallback);
      this.logger.error(`Failed to get domain authority info for ${domain}:`, error);
      return fallback;
    }
  }
  
  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.hostname.toLowerCase();
    } catch {
      return url.toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    }
  }
  
  /**
   * Assess domain authority level based on Perplexity research
   */
  private assessDomainAuthorityLevel(domain: string, domainInfo: string): 'low' | 'medium' | 'high' | 'unknown' {
    // Check cache first
    if (DomainAuthorityRule.domainLevelCache.has(domain)) {
      return DomainAuthorityRule.domainLevelCache.get(domain)!;
    }
    
    let level: 'low' | 'medium' | 'high' | 'unknown' = 'unknown';
    
    // Parse Perplexity's classification from the response
    const upperInfo = domainInfo.toUpperCase();
    
    // Look for "CLASSIFICATION: HIGH/MEDIUM/LOW/UNKNOWN" pattern
    const classificationMatch = upperInfo.match(/CLASSIFICATION:\s*(HIGH|MEDIUM|LOW|UNKNOWN)/);
    
    if (classificationMatch) {
      level = classificationMatch[1].toLowerCase() as 'low' | 'medium' | 'high' | 'unknown';
      this.logger.debug(`Parsed Perplexity classification for ${domain}: ${level}`);
    } else {
      // Fallback: look for keywords
      if (upperInfo.includes('HIGH AUTHORITY') || upperInfo.includes('WELL-ESTABLISHED')) {
        level = 'high';
      } else if (upperInfo.includes('MEDIUM AUTHORITY') || upperInfo.includes('MODERATE')) {
        level = 'medium';
      } else if (upperInfo.includes('LOW AUTHORITY') || upperInfo.includes('UNKNOWN')) {
        level = 'low';
      }
    }
    
    // Cache the assessment
    DomainAuthorityRule.domainLevelCache.set(domain, level);
    
    return level;
  }
}