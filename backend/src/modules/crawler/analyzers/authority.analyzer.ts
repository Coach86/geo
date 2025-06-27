import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import { ScoringRulesService } from '../services/scoring-rules.service';
import { AuthorityCriteria } from '../interfaces/scoring-rules.interface';
import { ScoreIssue } from '../schemas/content-score.schema';

export interface AuthorityAnalysisResult {
  score: number;
  hasAuthor: boolean;
  authorCredentials: string[];
  outboundCitations: number;
  trustedCitations: string[];
  issues: ScoreIssue[];
}

@Injectable()
export class AuthorityAnalyzer {
  private readonly logger = new Logger(AuthorityAnalyzer.name);

  constructor(private readonly scoringRulesService: ScoringRulesService) {}

  analyze(html: string, url: string): AuthorityAnalysisResult {
    const $ = cheerio.load(html);
    const rules = this.scoringRulesService.getDimensionRules('authority');
    const criteria = rules.criteria as AuthorityCriteria;

    // Extract author information
    const { hasAuthor, authorCredentials } = this.extractAuthorInfo($, criteria);

    // Extract outbound citations
    const { outboundCitations, trustedCitations } = this.extractCitations($, url, criteria);

    // Calculate score based on findings
    let score = 20; // Base score
    const issues: ScoreIssue[] = [];

    // Check for author
    if (hasAuthor) {
      score += 20;
      if (authorCredentials.length > 0) {
        score += 20; // Additional points for credentialed author
      } else {
        issues.push({
          dimension: 'authority',
          severity: 'medium',
          description: 'Author found but no credentials detected',
          recommendation: 'Add author credentials (e.g., PhD, Expert, Certified) to improve authority signals',
        });
      }
    } else {
      issues.push({
        dimension: 'authority',
        severity: 'high',
        description: 'No author information found',
        recommendation: 'Add author byline with credentials to establish expertise',
      });
    }

    // Check for citations
    if (outboundCitations >= criteria.minOutboundCitations) {
      score += 20;
      if (trustedCitations.length >= criteria.minOutboundCitations) {
        score += 20; // Additional points for high-authority citations
      } else if (trustedCitations.length > 0) {
        score += 10;
        issues.push({
          dimension: 'authority',
          severity: 'low',
          description: `Only ${trustedCitations.length} trusted citations found (minimum ${criteria.minOutboundCitations} recommended)`,
          recommendation: 'Add more citations to authoritative sources like academic journals, government sites, or Wikipedia',
        });
      }
    } else {
      issues.push({
        dimension: 'authority',
        severity: 'high',
        description: `Only ${outboundCitations} outbound citations found (minimum ${criteria.minOutboundCitations} required)`,
        recommendation: 'Add at least 2 authoritative outbound citations to support claims and build trust',
      });
    }

    // Cap score at 100
    score = Math.min(score, 100);

    return {
      score,
      hasAuthor,
      authorCredentials,
      outboundCitations,
      trustedCitations,
      issues,
    };
  }

  private extractAuthorInfo($: cheerio.CheerioAPI, criteria: AuthorityCriteria): {
    hasAuthor: boolean;
    authorCredentials: string[];
  } {
    // Check various author selectors
    const authorSelectors = [
      'meta[name="author"]',
      'meta[property="article:author"]',
      '[rel="author"]',
      '.author-name',
      '.by-author',
      '.author',
      '.post-author',
      '.entry-author',
      '[itemprop="author"]',
      '.byline',
    ];

    let authorText = '';
    for (const selector of authorSelectors) {
      const element = $(selector).first();
      if (element.length) {
        authorText = element.attr('content') || element.text().trim();
        if (authorText) break;
      }
    }

    // Check for author in JSON-LD
    if (!authorText) {
      $('script[type="application/ld+json"]').each((_, element) => {
        try {
          const json = JSON.parse($(element).html() || '{}');
          if (json.author) {
            authorText = typeof json.author === 'string' ? json.author : json.author.name || '';
          }
        } catch (error) {
          // Ignore parse errors
        }
      });
    }

    const hasAuthor = !!authorText;
    const authorCredentials: string[] = [];

    if (authorText) {
      // Check for credentials in author text
      for (const keyword of criteria.authorCredentialKeywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(authorText)) {
          authorCredentials.push(keyword);
        }
      }
    }

    return { hasAuthor, authorCredentials };
  }

  private extractCitations($: cheerio.CheerioAPI, pageUrl: string, criteria: AuthorityCriteria): {
    outboundCitations: number;
    trustedCitations: string[];
  } {
    const trustedCitations: string[] = [];
    const seenUrls = new Set<string>();

    // Find all external links
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (!href) return;

      try {
        const linkUrl = new URL(href, pageUrl);
        const pageUrlObj = new URL(pageUrl);

        // Only count external links
        if (linkUrl.hostname !== pageUrlObj.hostname) {
          const normalizedUrl = `${linkUrl.hostname}${linkUrl.pathname}`;
          
          if (!seenUrls.has(normalizedUrl)) {
            seenUrls.add(normalizedUrl);

            // Check if it's a trusted domain
            for (const trustedDomain of criteria.trustedDomains) {
              if (linkUrl.hostname.includes(trustedDomain) || 
                  (trustedDomain.startsWith('.') && linkUrl.hostname.endsWith(trustedDomain))) {
                trustedCitations.push(linkUrl.toString());
                break;
              }
            }
          }
        }
      } catch (error) {
        // Invalid URL, skip
      }
    });

    return {
      outboundCitations: seenUrls.size,
      trustedCitations: trustedCitations.slice(0, 10), // Limit to 10 for storage
    };
  }
}