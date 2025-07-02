import { Injectable } from '@nestjs/common';
import { BaseRule } from '../base/base-rule';
import { RuleContext, RuleResult, RuleDimension, RuleApplicability, RuleExecutionScope } from '../interfaces/rule.interface';
import { LlmProvider } from '../../../llm/interfaces/llm-provider.enum';
import { AUTHORITY_CONSTANTS, HYBRID_CONSTANTS } from '../../config/scoring-constants';
import { DomainAuthorityRepository } from '../../repositories/domain-authority.repository';

/**
 * Rule that evaluates domain authority using Perplexity web search
 * This wraps the existing domain authority logic from KPIAnalyzerService
 * Now uses database storage for consistency across analyses
 */
@Injectable()
export class DomainAuthorityRule extends BaseRule {
  id = 'domain-authority';
  name = 'Domain Authority & Reputation';
  dimension: RuleDimension = 'authority';
  description = 'Evaluates the overall authority and reputation of the domain';
  priority = 80;
  weight = 0.3; // 30% of authority score
  
  applicability: RuleApplicability = {
    scope: 'all' as const
  };
  
  executionScope: RuleExecutionScope = 'domain';

  constructor(
    private readonly domainAuthorityRepository: DomainAuthorityRepository,
  ) {
    super();
  }
  
  async evaluate(context: RuleContext): Promise<RuleResult> {
    try {
      const domain = this.extractDomain(context.url);
      this.logger.log(`Evaluating domain authority for: ${domain}`);
      
      // Check if we have domain authority in database
      let domainAuthority;
      try {
        domainAuthority = await this.domainAuthorityRepository.findByDomain(domain);
        
        if (domainAuthority) {
          this.logger.log(`Found existing domain authority for ${domain}: ${domainAuthority.authorityLevel}`);
          
          // Check if data is expired
          const isExpired = await this.domainAuthorityRepository.isExpired(domain);
          this.logger.log(`Domain authority data expired for ${domain}: ${isExpired}`);
          
          if (!isExpired) {
            this.logger.log(`Using cached domain authority for ${domain}`);
          }
        } else {
          this.logger.log(`No existing domain authority found for ${domain}`);
        }
      } catch (dbError) {
        this.logger.error(`Database error when checking domain authority for ${domain}:`, dbError);
        // Continue without cached data
        domainAuthority = null;
      }
      
      // If not found or expired, fetch new data
      const needsFreshData = !domainAuthority || (domainAuthority && await this.domainAuthorityRepository.isExpired(domain).catch(err => {
        this.logger.error(`Error checking expiration for ${domain}:`, err);
        return true; // Assume expired if we can't check
      }));
      
      if (needsFreshData) {
        this.logger.log(`Fetching new domain authority info for ${domain}`);
        const domainInfo = await this.fetchDomainAuthorityInfo(domain, context);
        this.logger.log(`Received domain info (${domainInfo.length} chars): ${domainInfo.substring(0, 200)}...`);
        
        const authorityLevel = this.assessDomainAuthorityLevel(domain, domainInfo);
        this.logger.log(`Assessed authority level for ${domain}: ${authorityLevel}`);
        
        const justification = this.extractJustification(domainInfo);
        
        // Calculate score based on authority level
        let score = 0;
        switch (authorityLevel) {
          case 'high': score = 100; break;
          case 'medium': score = 60; break;
          case 'low': score = 20; break;
          default: score = 10;
        }
        
        this.logger.log(`Calculated score for ${domain}: ${score} (level: ${authorityLevel})`);
        
        // Store in database
        try {
          domainAuthority = await this.domainAuthorityRepository.upsert({
            domain,
            authorityLevel,
            authorityInfo: domainInfo,
            justification,
            score,
            ttlDays: 30, // Re-check domain authority every 30 days
          });
          
          this.logger.log(`Stored domain authority for ${domain} in database`);
        } catch (dbError) {
          this.logger.error(`Database error when storing domain authority for ${domain}:`, dbError);
          // Create a temporary object to continue processing
          domainAuthority = {
            domain,
            authorityLevel,
            authorityInfo: domainInfo,
            justification,
            score,
            ttlDays: 30,
            lastCheckedAt: new Date()
          } as any;
          this.logger.log(`Created temporary domain authority object for ${domain}`);
        }
      }
      
      // Generate result from database data
      const evidence: string[] = [];
      const details = {
        domain,
        authorityLevel: domainAuthority.authorityLevel,
        domainInfo: domainAuthority.authorityInfo.substring(0, 200), // First 200 chars of research
        fromCache: domainAuthority.lastCheckedAt 
          ? new Date().getTime() - domainAuthority.lastCheckedAt.getTime() > 60000 // More than 1 minute old
          : false
      };
      
      switch (domainAuthority.authorityLevel) {
        case 'high':
          evidence.push(`High authority domain: ${domain} (target: high authority)`);
          break;
        case 'medium':
          evidence.push(`Medium authority domain: ${domain} (target: high authority)`);
          break;
        case 'low':
          evidence.push(`Low authority domain: ${domain} (target: high authority)`);
          break;
        default:
          evidence.push(`Unknown domain authority: ${domain} (target: high authority)`);
      }
      
      // Add justification if available
      if (domainAuthority.justification) {
        evidence.push(domainAuthority.justification);
      }
      
      // Generate issues based on authority level
      const issues = [];
      if (domainAuthority.authorityLevel === 'low' || domainAuthority.authorityLevel === 'unknown') {
        issues.push(this.createIssue(
          'medium',
          `Domain has ${domainAuthority.authorityLevel} authority`,
          'Build domain reputation through quality content, backlinks, and consistent branding'
        ));
      }
      
      return this.createResult(domainAuthority.score, 100, evidence, details, issues);
      
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
   * Fetch domain authority information using Perplexity
   */
  private async fetchDomainAuthorityInfo(domain: string, context: RuleContext): Promise<string> {
    if (!context.trackedLLMService) {
      this.logger.error(`TrackedLLMService not available for domain authority research of ${domain}`);
      return `Domain: ${domain} - LLM service not available for authority research`;
    }
    
    try {
      this.logger.log(`Requesting domain authority info for: ${domain} using Perplexity`);
      
      // Use the exact same prompt as KPIAnalyzerService
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

      this.logger.log(`Making Perplexity API call for ${domain} with model: ${HYBRID_CONSTANTS.PERPLEXITY.MODEL}`);
      
      const response = await context.trackedLLMService.call(
        context.url,
        'domain_authority',
        LlmProvider.Perplexity,
        domainPrompt,
        {
          model: HYBRID_CONSTANTS.PERPLEXITY.MODEL,
          temperature: HYBRID_CONSTANTS.PERPLEXITY.TEMPERATURE,
          maxTokens: HYBRID_CONSTANTS.PERPLEXITY.MAX_TOKENS,
        }
      );
      
      this.logger.log(`Perplexity API call successful for ${domain}. Response length: ${response.text?.length || 0}`);
      
      const result = response.text || `Domain: ${domain} - Research completed but no specific information found.`;
      
      this.logger.log(`Domain authority research complete for ${domain}`);
      
      return result;
    } catch (error) {
      const fallback = `Domain: ${domain} - Unable to research domain authority. Fallback: Treat as unknown commercial domain.`;
      this.logger.error(`Failed to get domain authority info for ${domain}:`, error);
      this.logger.error(`Error details: ${error.message}`);
      if (error.stack) {
        this.logger.error(`Error stack: ${error.stack}`);
      }
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
   * Extract justification from Perplexity response
   */
  private extractJustification(domainInfo: string): string | undefined {
    const justificationMatch = domainInfo.match(/JUSTIFICATION:\s*(.+?)(?:\n|$)/i);
    return justificationMatch ? justificationMatch[1].trim() : undefined;
  }
  
  /**
   * Assess domain authority level based on Perplexity research
   */
  private assessDomainAuthorityLevel(domain: string, domainInfo: string): 'low' | 'medium' | 'high' | 'unknown' {
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
    
    return level;
  }
}