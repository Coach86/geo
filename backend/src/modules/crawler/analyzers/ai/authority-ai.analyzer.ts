import { Injectable } from '@nestjs/common';
import { BaseAIAnalyzer, AIAnalysisResult } from './base-ai.analyzer';
import * as cheerio from 'cheerio';

export interface AuthorityDetails {
  hasAuthor: boolean;
  authorCredentials: string;
  authorName: string;
  outboundCitations: number;
  trustedCitations: number;
  citationDomains: string[];
  domainAuthority: 'high' | 'medium' | 'low';
  trustSignals: string[];
}

@Injectable()
export class AuthorityAIAnalyzer extends BaseAIAnalyzer<AuthorityDetails> {
  getDimension(): string {
    return 'authority';
  }

  getModelPriority(): string[] {
    // Claude 3 Opus is best at understanding credibility and E-E-A-T signals
    return [
      'claude-3-opus',
      'gpt-4-turbo', 
      'claude-3-sonnet',
      'gemini-pro',
      'gpt-3.5-turbo'
    ];
  }

  buildPrompt(html: string, context: { url: string }): string {
    const cleanedHtml = this.cleanHtml(html);
    const truncatedContent = this.truncateContent(cleanedHtml, 15000);
    
    // Pre-extract some signals to help the LLM
    const $ = cheerio.load(html);
    const links = $('a[href^="http"]').map((_, el) => $(el).attr('href')).get();
    const authorElements = $('[class*="author"], [id*="author"], [rel="author"]').text();

    return `Analyze this webpage for authority and evidence signals according to E-E-A-T principles. Score 0-100 based on these specific criteria:

SCORING CRITERIA:
- 20 points: No authority signals (no author, no citations, low-quality domain)
- 40 points: Little trust; generic/unattributed links; vague or missing author information
- 60 points: Moderate authority (recognized niche site) OR has 1 credible outbound citation
- 80 points: Has any two of: named expert author, domain authority, or 2+ quality citations
- 100 points: High-authority domain AND credentialed author AND 2+ reputable outbound citations

ANALYSIS CONTEXT:
- URL: ${context.url}
- Outbound links found: ${links.length}
- Author elements detected: ${authorElements ? 'Yes' : 'No'}

KEY SIGNALS TO IDENTIFY:
1. Author Information:
   - Is there a named author? (not just "admin" or "team")
   - Are credentials/bio provided?
   - Is the author an recognized expert?

2. Citations & Links:
   - Count outbound citations (links to external sources)
   - Identify trusted/authoritative domains (news sites, .gov, .edu, research papers)
   - Distinguish between generic links and true citations

3. Domain Authority:
   - Is this a recognized brand/publication?
   - Domain age and reputation indicators
   - SSL, professional design, about/contact pages

4. Trust Signals:
   - Professional editing/proofreading evident
   - Disclosure statements
   - Clear sourcing and fact-checking

CONTENT TO ANALYZE:
${truncatedContent}

OUTBOUND LINKS DETECTED:
${links.slice(0, 20).join('\n')}

Return a JSON response with this exact structure:
{
  "score": <number 0-100 based on criteria above>,
  "hasAuthor": <boolean>,
  "authorName": "<name or empty string>",
  "authorCredentials": "<credentials/bio summary or empty>",
  "outboundCitations": <total count>,
  "trustedCitations": <count of high-authority citations>,
  "citationDomains": ["<domain1>", "<domain2>", ...],
  "domainAuthority": "<high|medium|low>",
  "trustSignals": ["<signal1>", "<signal2>", ...],
  "issues": [
    {
      "severity": "<critical|high|medium|low>",
      "description": "<specific issue found>",
      "recommendation": "<actionable fix>"
    }
  ],
  "explanation": "<2-3 sentences explaining the score with specific examples>"
}

IMPORTANT SCORING NOTES:
- Missing author bio and <2 citations is a common issue - this should score 40 or below
- Generic links to homepages don't count as citations
- Focus on E-E-A-T: Experience, Expertise, Authoritativeness, Trustworthiness
- Be strict but fair - most content lacks proper authority signals`;
  }

  parseResponse(response: any): AIAnalysisResult<AuthorityDetails> {
    try {
      // Handle both string and object responses
      const data = typeof response === 'string' ? JSON.parse(response) : response;
      
      // Validate required fields
      if (typeof data.score !== 'number' || data.score < 0 || data.score > 100) {
        throw new Error('Invalid score');
      }

      // Ensure arrays are arrays
      const citationDomains = Array.isArray(data.citationDomains) ? data.citationDomains : [];
      const trustSignals = Array.isArray(data.trustSignals) ? data.trustSignals : [];
      const issues = Array.isArray(data.issues) ? data.issues : [];

      return {
        score: Math.round(data.score),
        details: {
          hasAuthor: Boolean(data.hasAuthor),
          authorName: data.authorName || '',
          authorCredentials: data.authorCredentials || '',
          outboundCitations: Number(data.outboundCitations) || 0,
          trustedCitations: Number(data.trustedCitations) || 0,
          citationDomains: citationDomains.slice(0, 10), // Limit to top 10
          domainAuthority: data.domainAuthority || 'low',
          trustSignals,
        },
        issues: issues.map(issue => ({
          severity: issue.severity || 'medium',
          description: issue.description || 'Unspecified issue',
          recommendation: issue.recommendation || 'Review content quality',
        })),
        explanation: data.explanation || 'No explanation provided',
        model: '', // Will be set by base class
        cost: 0, // Will be set by base class
        duration: 0, // Will be set by base class
      };
    } catch (error) {
      this.logger.error('Failed to parse authority response:', error);
      throw new Error(`Invalid response format: ${error.message}`);
    }
  }
}

// Example usage comments:
/*
Expected scores based on common patterns:

1. High-quality article (Score: 80-100):
   - Named author with credentials: "Dr. Jane Smith, PhD in Computer Science"
   - 3+ citations to reputable sources (IEEE, ACM, nature.com)
   - Published on recognized tech blog or news site
   
2. Typical corporate blog (Score: 40-60):
   - Generic "Marketing Team" byline
   - Links mostly to internal pages
   - 1-2 external links but not true citations
   
3. Low-quality content (Score: 20-40):
   - No author information
   - No external links or only affiliate links
   - Thin content on unknown domain

Common issues to detect:
- "Roughly half of articles still lack named author bios and ≥2 authoritative outbound citations"
- "Limiting trust signals for Google and LLMs"
- "Only 14% of articles list a credentialed author or link to ≥2 authoritative sources"
*/