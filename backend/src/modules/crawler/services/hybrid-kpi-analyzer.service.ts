import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../../llm/services/llm.service';
import { LlmProvider } from '../../llm/interfaces/llm-provider.enum';
import { PageSignals, PageSignalExtractorService } from './page-signal-extractor.service';

interface StaticAnalysisResult {
  scores: {
    freshness: number;
    structure: number;
    snippetExtractability: number;
  };
  details: {
    freshness: {
      daysSinceUpdate: number | null;
      hasDateSignals: boolean;
      publishDate: string | null;
      modifiedDate: string | null;
    };
    structure: {
      h1Count: number;
      avgSentenceWords: number;
      hasSchema: boolean;
      headingHierarchyScore: number;
    };
    snippet: {
      extractableBlocks: number;
      listCount: number;
      qaBlockCount: number;
      avgSentenceLength: number;
    };
  };
}

interface LLMAnalysisResult {
  scores: {
    authority: number;
    brandAlignment: number;
  };
  details: {
    authority: {
      hasAuthor: boolean;
      authorName: string | null;
      citationCount: number;
      domainAuthority: 'low' | 'medium' | 'high' | 'unknown';
      authorCredentials: boolean;
    };
    brand: {
      brandMentions: number;
      alignmentIssues: string[];
      consistencyScore: number;
      missingKeywords: string[];
    };
  };
  issues: Array<{
    dimension: 'authority' | 'brand';
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    recommendation: string;
  }>;
  explanation: string;
}

interface HybridAnalysisResult {
  scores: {
    authority: number;
    freshness: number;
    structure: number;
    snippetExtractability: number;
    brandAlignment: number;
  };
  details: StaticAnalysisResult['details'] & LLMAnalysisResult['details'];
  issues: LLMAnalysisResult['issues'];
  explanation: string;
  llmData?: {
    prompt: string;
    response: string;
    model: string;
    tokensUsed?: { input: number; output: number; };
  };
}

interface AnalysisContext {
  brandName: string;
  keyBrandAttributes: string[];
  competitors: string[];
}

@Injectable()
export class HybridKPIAnalyzerService {
  private readonly logger = new Logger(HybridKPIAnalyzerService.name);
  
  // Cache domain authority info to avoid repeated Perplexity calls
  private readonly domainAuthorityCache = new Map<string, string>();
  
  // Cache domain authority assessment to ensure consistency across pages
  private readonly domainAuthorityAssessmentCache = new Map<string, 'low' | 'medium' | 'high' | 'unknown'>();
  
  // High authority domains database
  private readonly highAuthorityDomains = new Set([
    // French Telecoms
    'orange.fr', 'sfr.fr', 'bouyguestelecom.fr', 'free.fr',
    // Major French Companies
    'bnpparibas.fr', 'axa.fr', 'carrefour.fr', 'renault.fr', 'peugeot.fr',
    // Government & Education
    'gouv.fr', 'education.gouv.fr', 'ameli.fr', 'pole-emploi.fr',
    // Media
    'lemonde.fr', 'lefigaro.fr', 'france24.com', 'francetvinfo.fr',
    // Global High Authority
    'google.com', 'microsoft.com', 'apple.com', 'amazon.com', 'facebook.com',
    'youtube.com', 'wikipedia.org', 'github.com', 'stackoverflow.com',
    // News & Media
    'bbc.com', 'cnn.com', 'reuters.com', 'nytimes.com',
  ]);

  private readonly mediumAuthorityDomains = new Set([
    // Regional telecoms, smaller companies, well-known brands
    'red-by-sfr.fr', 'sosh.fr', 'b-and-you.fr',
  ]);

  constructor(
    private readonly llmService: LlmService,
    private readonly pageSignalExtractor: PageSignalExtractorService,
  ) {}

  /**
   * Clear domain authority cache (useful for testing or memory management)
   */
  clearDomainCache(): void {
    const cacheSize = this.domainAuthorityCache.size;
    this.domainAuthorityCache.clear();
    this.domainAuthorityAssessmentCache.clear();
    this.logger.log(`[HYBRID-ANALYZER] Cleared domain authority cache (${cacheSize} entries)`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; domains: string[] } {
    return {
      size: this.domainAuthorityCache.size,
      domains: Array.from(this.domainAuthorityCache.keys()),
    };
  }

  /**
   * Hybrid analysis: Static analysis first, then targeted LLM for authority & brand
   */
  async analyze(
    html: string, 
    metadata: any, 
    context: AnalysisContext,
    url?: string
  ): Promise<HybridAnalysisResult> {
    try {
      // Step 1: Extract page signals
      const pageSignals = this.pageSignalExtractor.extract(html, metadata);
      const cleanContent = this.pageSignalExtractor.getCleanContent(html);

      // Step 2: Fast static analysis (freshness, structure, snippet)
      const staticResults = this.runStaticAnalysis(pageSignals, html, metadata);

      // Step 3: Targeted LLM analysis (authority, brand only)
      const llmResults = await this.runLLMAnalysis(pageSignals, cleanContent, context, url);

      // Step 4: Combine results
      return this.combineResults(staticResults, llmResults, context, cleanContent);
    } catch (error) {
      this.logger.error('Error in hybrid KPI analysis:', error);
      throw new Error(`Hybrid KPI analysis failed: ${error.message}`);
    }
  }

  /**
   * Static analysis for deterministic metrics
   */
  private runStaticAnalysis(pageSignals: PageSignals, html: string, metadata: any): StaticAnalysisResult {
    return {
      scores: {
        freshness: this.calculateFreshnessScore(pageSignals, metadata),
        structure: this.calculateStructureScore(pageSignals, html),
        snippetExtractability: this.calculateSnippetScore(pageSignals, html),
      },
      details: {
        freshness: this.extractFreshnessDetails(pageSignals, metadata),
        structure: this.extractStructureDetails(pageSignals, html),
        snippet: this.extractSnippetDetails(pageSignals, html),
      },
    };
  }

  /**
   * Targeted LLM analysis for semantic understanding (authority + brand only)
   */
  private async runLLMAnalysis(
    pageSignals: PageSignals, 
    cleanContent: string, 
    context: AnalysisContext,
    url?: string
  ): Promise<LLMAnalysisResult & { llmData: any }> {
    // First, get domain authority info using Perplexity (with web search)
    const domain = url ? this.extractDomain(url) : 'unknown-domain.com';
    const domainAuthorityInfo = await this.getDomainAuthorityInfo(domain);
    
    // Assess domain authority level consistently for all pages on this domain
    const domainAuthorityLevel = this.assessDomainAuthorityLevel(domain, domainAuthorityInfo);
    
    // Then analyze the page content with enhanced context
    const prompt = this.buildTargetedPrompt(pageSignals, cleanContent, context, domainAuthorityInfo);
    
    const model = 'gpt-3.5-turbo-0125';
    const response = await this.llmService.call(
      LlmProvider.OpenAILangChain,
      prompt,
      {
        model,
        temperature: 0,
        maxTokens: 600,
      }
    );

    const parsedResult = this.parseTargetedResponse(response.text);
    
    // CRITICAL: Override LLM's domain authority with our consistent assessment
    parsedResult.details.authority.domainAuthority = domainAuthorityLevel;
    this.logger.debug(`[HYBRID-ANALYZER] Overriding LLM domain authority for ${domain}: ${domainAuthorityLevel} (was: ${parsedResult.details.authority.domainAuthority})`);
    
    return {
      ...parsedResult,
      llmData: {
        prompt,
        response: response.text,
        model,
        tokensUsed: response.tokenUsage ? {
          input: response.tokenUsage.input,
          output: response.tokenUsage.output,
        } : undefined,
      },
    };
  }

  /**
   * Get domain authority information using Perplexity with web search (cached)
   */
  private async getDomainAuthorityInfo(domain: string): Promise<string> {
    // Check cache first
    if (this.domainAuthorityCache.has(domain)) {
      this.logger.log(`[HYBRID-ANALYZER] Using cached domain authority info for: ${domain}`);
      return this.domainAuthorityCache.get(domain)!;
    }

    try {
      this.logger.log(`[HYBRID-ANALYZER] Requesting domain authority info for: ${domain} (not cached)`);
      
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

      const response = await this.llmService.call(
        LlmProvider.Perplexity,
        domainPrompt,
        {
          model: 'llama-3.1-sonar-small-128k-online',
          temperature: 0,
          maxTokens: 300,
        }
      );

      const result = response.text || `Domain: ${domain} - Research completed but no specific information found.`;
      
      // Cache the result
      this.domainAuthorityCache.set(domain, result);
      
      this.logger.log(`[HYBRID-ANALYZER] Domain authority research complete for ${domain}, response length: ${result.length}, cached for future use`);
      this.logger.debug(`[HYBRID-ANALYZER] Domain authority research result: ${result.substring(0, 200)}...`);
      
      return result;
    } catch (error) {
      const fallback = `Domain: ${domain} - Unable to research domain authority (${error.message}). Fallback: Treat as unknown commercial domain.`;
      
      // Cache the error fallback too (to avoid repeated failures)
      this.domainAuthorityCache.set(domain, fallback);
      
      this.logger.error(`[HYBRID-ANALYZER] Failed to get domain authority info for ${domain}:`, error);
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
   * This ensures consistent assessment across all pages of the same domain
   */
  private assessDomainAuthorityLevel(domain: string, domainInfo: string): 'low' | 'medium' | 'high' | 'unknown' {
    // Check cache first
    if (this.domainAuthorityAssessmentCache.has(domain)) {
      return this.domainAuthorityAssessmentCache.get(domain)!;
    }

    let level: 'low' | 'medium' | 'high' | 'unknown' = 'unknown';

    // Check known high authority domains first (hardcoded for common domains)
    if (this.highAuthorityDomains.has(domain)) {
      level = 'high';
    } else if (this.mediumAuthorityDomains.has(domain)) {
      level = 'medium';
    } else {
      // Parse Perplexity's classification from the response
      const upperInfo = domainInfo.toUpperCase();
      
      // Look for "CLASSIFICATION: HIGH/MEDIUM/LOW/UNKNOWN" pattern
      const classificationMatch = upperInfo.match(/CLASSIFICATION:\s*(HIGH|MEDIUM|LOW|UNKNOWN)/);
      
      if (classificationMatch) {
        const classification = classificationMatch[1].toLowerCase() as 'high' | 'medium' | 'low' | 'unknown';
        level = classification;
        this.logger.debug(`[HYBRID-ANALYZER] Parsed Perplexity classification for ${domain}: ${classification}`);
      } else {
        // Fallback: if Perplexity didn't follow format, look for the words directly
        if (upperInfo.includes('HIGH AUTHORITY') || upperInfo.includes('HIGH DOMAIN AUTHORITY')) {
          level = 'high';
        } else if (upperInfo.includes('MEDIUM AUTHORITY') || upperInfo.includes('MEDIUM DOMAIN AUTHORITY')) {
          level = 'medium';
        } else if (upperInfo.includes('LOW AUTHORITY') || upperInfo.includes('LOW DOMAIN AUTHORITY')) {
          level = 'low';
        } else {
          this.logger.warn(`[HYBRID-ANALYZER] Could not parse domain authority from Perplexity response for ${domain}`);
          level = 'unknown';
        }
      }
    }

    // Cache the assessment
    this.domainAuthorityAssessmentCache.set(domain, level);
    this.logger.log(`[HYBRID-ANALYZER] Domain authority assessment for ${domain}: ${level}`);
    
    return level;
  }

  /**
   * Build focused prompt for authority and brand analysis only
   */
  private buildTargetedPrompt(
    pageSignals: PageSignals, 
    cleanContent: string, 
    context: AnalysisContext,
    domainAuthorityInfo: string
  ): string {
    return `You are an expert content analyst. Analyze ONLY authority and brand alignment for this webpage.

PRE-EXTRACTED SIGNALS:
${JSON.stringify(pageSignals, null, 2)}

DOMAIN AUTHORITY RESEARCH:
${domainAuthorityInfo}

CONTENT (truncated):
${cleanContent.substring(0, 2000)}

BRAND CONTEXT:
- Brand: ${context.brandName}
- Key attributes: ${context.keyBrandAttributes.join(', ')}
- Competitors: ${context.competitors.join(', ')}

ANALYZE ONLY THESE 2 DIMENSIONS:

AUTHORITY (0-100) - Use the domain research above to inform your assessment:
- 20: No authority signals + unknown/low-trust domain
- 40: Little trust; generic content; vague author + commercial domain
- 60: Moderate signals (author OR domain authority OR citations)
- 80: Strong signals (credible author + established domain OR multiple citations)
- 100: High-authority domain + expert author + citations + industry recognition

DOMAIN AUTHORITY GUIDELINES:
- Use the research above to assess if this is a well-known, established organization
- Government (.gov), education (.edu), major corporations = higher authority
- Consider company age, industry standing, recognition mentioned in research
- Unknown domains or those with no establishment info = lower authority

IMPORTANT: Extract the actual author name from bylines, author bios, or author tags if present. Look for patterns like "By [Name]", "Author: [Name]", or author information in meta tags.

LOGICAL CONSISTENCY RULES:
- If hasAuthor = false, then authorCredentials MUST be false and authorName MUST be null
- If hasAuthor = true, then check if author has credentials (expert, PhD, professional title, etc.)

BRAND ALIGNMENT (0-100):
- 20: Completely off-brand
- 40: Significant mismatch
- 60: Some outdated/missing elements
- 80: Minor tone/terminology drift
- 100: Flawless alignment

BRAND MENTION COUNTING:
- Count ALL explicit mentions of "${context.brandName}" (case-insensitive)
- Include variations, logos, and branded terms
- Look in titles, headers, navigation, content, and metadata
- Include partial brand mentions and abbreviated forms

Return JSON:
{
  "scores": {
    "authority": number,
    "brandAlignment": number
  },
  "details": {
    "authority": { "hasAuthor": boolean, "authorName": string|null, "citationCount": number, "domainAuthority": "low|medium|high", "authorCredentials": boolean },
    "brand": { "brandMentions": number (total count of "${context.brandName}" mentions found), "alignmentIssues": [string], "consistencyScore": number, "missingKeywords": [string] }
  },
  "issues": [
    {
      "dimension": "authority|brand",
      "severity": "critical|high|medium|low",
      "description": "specific issue",
      "recommendation": "actionable fix"
    }
  ],
  "explanation": "Brief explanation focusing on authority and brand analysis"
}`;
  }

  /**
   * Parse LLM response for authority and brand analysis
   */
  private parseTargetedResponse(response: string): LLMAnalysisResult {
    try {
      this.logger.log(`[HYBRID-ANALYZER] Parsing LLM response, length: ${response.length}`);
      this.logger.debug(`[HYBRID-ANALYZER] Raw LLM response: ${response.substring(0, 500)}...`);
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const jsonStr = jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      
      this.logger.log(`[HYBRID-ANALYZER] Parsed LLM response successfully`);
      this.logger.debug(`[HYBRID-ANALYZER] Parsed data:`, {
        authorityScore: parsed.scores?.authority,
        brandScore: parsed.scores?.brandAlignment,
        hasAuthor: parsed.details?.authority?.hasAuthor,
        authorName: parsed.details?.authority?.authorName,
        domainAuthority: parsed.details?.authority?.domainAuthority,
        brandMentions: parsed.details?.brand?.brandMentions,
      });
      
      // Validate required fields
      if (!parsed.scores?.authority || !parsed.scores?.brandAlignment) {
        throw new Error('Missing required scores');
      }
      
      // CRITICAL FIX: Enforce logical consistency for author credentials
      if (parsed.details?.authority) {
        const hasAuthor = parsed.details.authority.hasAuthor;
        // If no author, then author credentials must be false
        if (!hasAuthor) {
          parsed.details.authority.authorCredentials = false;
          parsed.details.authority.authorName = null;
          this.logger.debug(`[HYBRID-ANALYZER] Fixed inconsistency: No author detected, set authorCredentials to false`);
        }
      }
      
      return parsed;
    } catch (error) {
      this.logger.error(`[HYBRID-ANALYZER] Failed to parse targeted LLM response:`, error);
      this.logger.error(`[HYBRID-ANALYZER] Raw response that failed to parse: ${response}`);
      
      // Fallback for authority and brand only (with logical consistency)
      return {
        scores: {
          authority: 50,
          brandAlignment: 50,
        },
        details: {
          authority: {
            hasAuthor: false,
            authorName: null, // Consistent: no author = no name
            citationCount: 0,
            domainAuthority: 'unknown',
            authorCredentials: false, // Consistent: no author = no credentials
          },
          brand: {
            brandMentions: 0,
            alignmentIssues: ['Analysis failed - using fallback'],
            consistencyScore: 50,
            missingKeywords: [],
          },
        },
        issues: [
          {
            dimension: 'authority',
            severity: 'medium',
            description: 'LLM analysis failed - fallback result used',
            recommendation: 'Retry analysis or check content format',
          },
        ],
        explanation: 'Authority and brand analysis failed, using fallback values.',
      };
    }
  }

  /**
   * Calculate freshness score from page signals
   */
  private calculateFreshnessScore(pageSignals: PageSignals, metadata: any): number {
    const { modifiedDate, publishDate } = pageSignals.freshness || {};
    
    if (!modifiedDate && !publishDate) return 20; // No date signals
    
    const mostRecentDate = modifiedDate || publishDate;
    if (!mostRecentDate) return 20;
    
    const daysSinceUpdate = Math.floor((Date.now() - new Date(mostRecentDate).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceUpdate <= 90) return 100;
    if (daysSinceUpdate <= 180) return 80;
    if (daysSinceUpdate <= 365) return 60;
    return 40;
  }

  /**
   * Calculate structure score from page signals
   */
  private calculateStructureScore(pageSignals: PageSignals, html: string): number {
    let score = 0;
    
    // H1 count (proper SEO: exactly 1 H1)
    const h1Count = pageSignals.structure?.h1Count || 0;
    if (h1Count === 1) score += 25;
    else if (h1Count > 1) score += 10; // Multiple H1s are bad
    
    // Heading hierarchy (check if we have h2, h3 etc in the hierarchy array)
    const hierarchy = pageSignals.structure?.headingHierarchy || [];
    const hasH2 = hierarchy.some(h => h.toLowerCase().startsWith('h2'));
    const hasH3 = hierarchy.some(h => h.toLowerCase().startsWith('h3'));
    if (hasH2) score += 15;
    if (hasH3) score += 10;
    
    // Schema markup
    const hasSchema = html.includes('application/ld+json') || html.includes('itemscope') || 
                     (pageSignals.structure?.schemaTypes?.length || 0) > 0;
    if (hasSchema) score += 25;
    
    // Sentence length (readability)
    const avgSentenceWords = pageSignals.content?.avgSentenceLength || 30;
    if (avgSentenceWords <= 20) score += 25;
    else if (avgSentenceWords <= 25) score += 15;
    else if (avgSentenceWords <= 30) score += 10;
    
    return Math.min(score, 100);
  }

  /**
   * Calculate snippet extractability score
   */
  private calculateSnippetScore(pageSignals: PageSignals, html: string): number {
    let score = 0;
    
    // Lists (good for featured snippets)
    const listCount = (html.match(/<ul|<ol/g) || []).length;
    if (listCount >= 3) score += 30;
    else if (listCount >= 1) score += 20;
    
    // Q&A patterns
    const qaPatterns = [
      /<dt>.*?<\/dt>/gi,
      /<details>/gi,
      /\?.*?:/g, // Question: Answer pattern
    ];
    const qaCount = qaPatterns.reduce((count, pattern) => count + (html.match(pattern) || []).length, 0);
    if (qaCount >= 3) score += 25;
    else if (qaCount >= 1) score += 15;
    
    // Paragraph structure
    const paragraphs = (html.match(/<p>/g) || []).length;
    const avgWordsPerParagraph = pageSignals.content?.wordCount ? pageSignals.content.wordCount / paragraphs : 100;
    if (avgWordsPerParagraph <= 50) score += 25;
    else if (avgWordsPerParagraph <= 100) score += 15;
    
    // Tables (structured data)
    const tableCount = (html.match(/<table/g) || []).length;
    if (tableCount > 0) score += 20;
    
    return Math.min(score, 100);
  }

  /**
   * Extract freshness details
   */
  private extractFreshnessDetails(pageSignals: PageSignals, metadata: any) {
    const { modifiedDate, publishDate } = pageSignals.freshness || {};
    
    let daysSinceUpdate = null;
    if (modifiedDate) {
      daysSinceUpdate = Math.floor((Date.now() - new Date(modifiedDate).getTime()) / (1000 * 60 * 60 * 24));
    }
    
    return {
      daysSinceUpdate,
      hasDateSignals: !!(modifiedDate || publishDate),
      publishDate: publishDate || null,
      modifiedDate: modifiedDate || null,
    };
  }

  /**
   * Extract structure details
   */
  private extractStructureDetails(pageSignals: PageSignals, html: string) {
    const h1Count = pageSignals.structure?.h1Count || 0;
    const avgSentenceWords = pageSignals.content?.avgSentenceLength || 0;
    const hasSchema = html.includes('application/ld+json') || html.includes('itemscope') ||
                     (pageSignals.structure?.schemaTypes?.length || 0) > 0;
    
    // Calculate hierarchy score based on heading hierarchy array
    const hierarchy = pageSignals.structure?.headingHierarchy || [];
    
    let hierarchyScore = 0;
    if (h1Count === 1) hierarchyScore += 40;
    
    const hasH2 = hierarchy.some(h => h.toLowerCase().startsWith('h2'));
    const hasH3 = hierarchy.some(h => h.toLowerCase().startsWith('h3'));
    
    if (hasH2) hierarchyScore += 30;
    if (hasH3) hierarchyScore += 30;
    
    return {
      h1Count,
      avgSentenceWords,
      hasSchema,
      headingHierarchyScore: hierarchyScore,
    };
  }

  /**
   * Extract snippet details
   */
  private extractSnippetDetails(pageSignals: PageSignals, html: string) {
    const listCount = (html.match(/<ul|<ol/g) || []).length;
    const qaBlockCount = (html.match(/<dt>.*?<\/dt>|<details>/gi) || []).length;
    const paragraphs = (html.match(/<p>/g) || []).length;
    
    // Estimate extractable blocks
    let extractableBlocks = 0;
    if (listCount > 0) extractableBlocks += listCount;
    if (qaBlockCount > 0) extractableBlocks += qaBlockCount;
    if ((html.match(/<table/g) || []).length > 0) extractableBlocks += 1;
    
    return {
      extractableBlocks,
      listCount,
      qaBlockCount,
      avgSentenceLength: pageSignals.content?.avgSentenceLength || 0,
    };
  }

  /**
   * Combine static and LLM results
   */
  private combineResults(
    staticResults: StaticAnalysisResult, 
    llmResults: LLMAnalysisResult & { llmData: any },
    context: AnalysisContext,
    cleanContent: string
  ): HybridAnalysisResult {
    // Cross-check brand mentions with simple text analysis of actual content
    const staticBrandMentions = this.countBrandMentionsStatic(context.brandName, cleanContent);
    
    // If LLM found 0 mentions but static analysis found some, use static count
    if (llmResults.details.brand.brandMentions === 0 && staticBrandMentions > 0) {
      this.logger.warn(`LLM missed brand mentions. LLM: 0, Static: ${staticBrandMentions}. Using static count.`);
      llmResults.details.brand.brandMentions = staticBrandMentions;
    }

    return {
      scores: {
        ...staticResults.scores,
        ...llmResults.scores,
      },
      details: {
        ...staticResults.details,
        ...llmResults.details,
      },
      issues: llmResults.issues,
      explanation: llmResults.explanation,
      llmData: llmResults.llmData,
    };
  }

  /**
   * Simple static brand mention counter as fallback
   */
  private countBrandMentionsStatic(brandName: string, content: string): number {
    if (!content || !brandName) return 0;
    
    // Create case-insensitive regex to count brand mentions
    const escapedBrandName = brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedBrandName, 'gi');
    const matches = content.match(regex);
    
    return matches ? matches.length : 0;
  }
}