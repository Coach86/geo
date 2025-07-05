import { Injectable } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';

// Evidence topics for this rule
enum XmlSitemapTopic {
  SITEMAP_FOUND = 'Sitemap Found',
  SITEMAP_CHECK = 'Sitemap Check',
  NO_SITEMAP = 'No Sitemap',
  SITEMAP = 'Sitemap'
}

@Injectable()
export class XmlSitemapRule extends BaseAEORule {
  constructor() {
    super(
      'xml_sitemap',
      'XML Sitemap Configuration',
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
    let score = 15; // Base score
    let validSitemaps: any[] = [];
    let robotsSitemaps: string[] = [];

    // Add base score evidence
    evidence.push(EvidenceHelper.base(15));

    // Standard sitemap detection without GSC integration

    try {
      const domain = this.getDomain(url);
      const sitemapUrls = [
        `https://${domain}/sitemap.xml`,
        `https://${domain}/sitemap_index.xml`,
        `https://${domain}/sitemaps/sitemap.xml`
      ];
      
      evidence.push(EvidenceHelper.info(XmlSitemapTopic.SITEMAP_CHECK, `Checking for XML sitemap at standard locations`));

      // First, directly check if sitemaps exist at standard locations
      validSitemaps = await this.checkSitemapLocations(sitemapUrls);
      
      if (validSitemaps.length > 0) {
        score = Math.max(score, 85); // Base score (15) + sitemap found (70)
        evidence.push(EvidenceHelper.success(XmlSitemapTopic.SITEMAP_FOUND, `Found ${validSitemaps.length} accessible sitemap(s):`, { score: 70, maxScore: 70 }));
        validSitemaps.forEach(sitemap => {
          evidence.push(EvidenceHelper.info(XmlSitemapTopic.SITEMAP_CHECK, `  • ${sitemap.url} (${sitemap.type})`));
          if (sitemap.urls > 0) {
            evidence.push(EvidenceHelper.info(XmlSitemapTopic.SITEMAP_CHECK, `Contains ${sitemap.urls} URL(s)`));
          }
          if (sitemap.lastModified) {
            evidence.push(EvidenceHelper.info(XmlSitemapTopic.SITEMAP_CHECK, `Last modified: ${sitemap.lastModified}`));
          }
        });
      }

      // Check for sitemap references in HTML (if available)
      if (content.html) {
        const sitemapReferences = this.findSitemapReferences(content.html);
        
        if (sitemapReferences.length > 0) {
          if (validSitemaps.length === 0) {
            score = Math.max(score, 40); // Points for references even if not accessible
            evidence.push(EvidenceHelper.success(XmlSitemapTopic.SITEMAP_FOUND, `Found ${sitemapReferences.length} sitemap reference(s) in HTML`, { score: 40, maxScore: 70 }));
          } else {
            score = Math.min(100, score + 10); // Bonus for having references too
            evidence.push(EvidenceHelper.success(XmlSitemapTopic.SITEMAP_FOUND, `Found ${sitemapReferences.length} sitemap reference(s) in HTML`, { score: 10, maxScore: 10 }));
          }
          sitemapReferences.forEach(ref => evidence.push(EvidenceHelper.info(XmlSitemapTopic.SITEMAP_CHECK, `  • ${ref}`)));
        } else if (validSitemaps.length === 0) {
          evidence.push(EvidenceHelper.error(XmlSitemapTopic.NO_SITEMAP, 'No sitemap references found in HTML', { score: 0, maxScore: 70 }));
          recommendations.push(`Expected locations: ${sitemapUrls.join(', ')}`);
        }

        // Check for sitemap link in HTML head
        const hasSitemapLink = this.checkForSitemapLink(content.html);
        if (hasSitemapLink) {
          score = Math.min(100, score + 10);
          evidence.push(EvidenceHelper.success(XmlSitemapTopic.SITEMAP_FOUND, 'Sitemap link found in HTML <head>', { score: 10, maxScore: 10 }));
        }

        // Check for multiple sitemap types (news, video, image)
        const specializedSitemaps = this.checkForSpecializedSitemaps(content.html);
        if (specializedSitemaps.length > 0) {
          score = Math.min(100, score + 15);
          evidence.push(EvidenceHelper.success(XmlSitemapTopic.SITEMAP, 'Specialized sitemaps detected:', { score: 15, maxScore: 15 }));
          specializedSitemaps.forEach(type => evidence.push(EvidenceHelper.info(XmlSitemapTopic.SITEMAP_CHECK, `  • ${type} sitemap`)));
        }
      }

      // Check robots.txt for sitemap references
      robotsSitemaps = await this.checkRobotsTxtForSitemaps(domain);
      if (robotsSitemaps.length > 0) {
        score = Math.min(100, score + 15);
        evidence.push(EvidenceHelper.success(XmlSitemapTopic.SITEMAP, 'Sitemap(s) referenced in robots.txt:', { score: 15, maxScore: 15 }));
        robotsSitemaps.forEach(sitemap => evidence.push(EvidenceHelper.info(XmlSitemapTopic.SITEMAP_CHECK, `  • ${sitemap}`)));
      } else if (validSitemaps.length === 0) {
        evidence.push(EvidenceHelper.warning(XmlSitemapTopic.SITEMAP, 'No sitemap reference in robots.txt'));
        recommendations.push('Consider adding sitemap reference to robots.txt');
      }

      // Final scoring adjustments
      if (score === 15) {
        evidence.push(EvidenceHelper.error(XmlSitemapTopic.SITEMAP, 'No XML sitemap detected', { score: 0, maxScore: 100 }));
        recommendations.push('Create an XML sitemap to help AI engines discover all your content');
        recommendations.push('Submit sitemap to search engines and reference in robots.txt');
      } else if (score < 60) {
        evidence.push(EvidenceHelper.warning(XmlSitemapTopic.SITEMAP, 'Limited sitemap implementation'));
      } else if (score < 100) {
        evidence.push(EvidenceHelper.info(XmlSitemapTopic.SITEMAP, '◐ Good sitemap implementation with room for improvement'));
      } else {
        evidence.push(EvidenceHelper.info(XmlSitemapTopic.SITEMAP, '● Excellent sitemap implementation'));
      }

      // Additional recommendations
      this.addSitemapRecommendations(evidence, content, recommendations);

    } catch (error) {
      evidence.push(EvidenceHelper.info(XmlSitemapTopic.SITEMAP_CHECK, `Error evaluating XML sitemap: ${error.message}`));
      score = 15; // Keep base score even on error
    }

    // Calculate score breakdown
    const scoreBreakdown: { component: string; points: number }[] = [
      { component: 'Base score', points: 15 }
    ];
    
    if (validSitemaps && validSitemaps.length > 0) {
      scoreBreakdown.push({ component: 'Valid sitemaps found', points: 70 });
    }
    if (robotsSitemaps && robotsSitemaps.length > 0) {
      scoreBreakdown.push({ component: 'Robots.txt reference', points: 15 });
    }
    
    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
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

  private findSitemapReferences(html: string): string[] {
    const references: string[] = [];
    const patterns = [
      /sitemap\.xml/gi,
      /sitemap_index\.xml/gi,
      /href=["'][^"']*sitemap[^"']*\.xml["']/gi,
      /<link[^>]+type=["']application\/xml\+sitemap["'][^>]*>/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = html.match(pattern);
      if (matches) {
        matches.forEach(match => {
          if (!references.includes(match)) {
            references.push(match.substring(0, 100) + (match.length > 100 ? '...' : ''));
          }
        });
      }
    });
    
    return references;
  }


  private checkForSitemapLink(html: string): boolean {
    const headSection = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] || '';
    return headSection.toLowerCase().includes('sitemap');
  }

  private checkForSpecializedSitemaps(html: string): string[] {
    const types: string[] = [];
    const htmlLower = html.toLowerCase();
    
    if (htmlLower.includes('news-sitemap') || htmlLower.includes('sitemap-news')) {
      types.push('News');
    }
    if (htmlLower.includes('video-sitemap') || htmlLower.includes('sitemap-video')) {
      types.push('Video');
    }
    if (htmlLower.includes('image-sitemap') || htmlLower.includes('sitemap-image')) {
      types.push('Image');
    }
    if (htmlLower.includes('mobile-sitemap') || htmlLower.includes('sitemap-mobile')) {
      types.push('Mobile');
    }
    
    return types;
  }

  private addSitemapRecommendations(evidence: EvidenceItem[], content: PageContent, recommendations: string[]): void {
    // Page type specific recommendations
    const pageTypeRecommendations: { [key: string]: string } = {
      blogPost: 'Ensure blog posts are included in sitemap with lastmod dates',
      productDetailPage: 'Include product pages with priority and changefreq attributes',
      productCategoryPage: 'Add category pages to sitemap with appropriate priority',
      searchErrorPage: 'Exclude error pages from sitemap'
    };
    
    const recommendation = pageTypeRecommendations[content.pageType || ''];
    if (recommendation) {
      evidence.push(EvidenceHelper.info(XmlSitemapTopic.SITEMAP_CHECK, 'Page-specific recommendation'));
      recommendations.push(recommendation);
    }
    
    // General best practices
    if (!evidence.some(e => e.content.includes('lastmod'))) {
      evidence.push(EvidenceHelper.info(XmlSitemapTopic.SITEMAP_CHECK, 'Best practice'));
      recommendations.push('Include <lastmod> tags in sitemap for freshness signals');
    }
    if (!evidence.some(e => e.content.includes('priority'))) {
      evidence.push(EvidenceHelper.info(XmlSitemapTopic.SITEMAP_CHECK, 'Best practice'));
      recommendations.push('Use <priority> tags to indicate page importance (0.0-1.0)');
    }
  }

  private getSiteUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}/`;
    } catch {
      return url;
    }
  }

  private async checkSitemapLocations(sitemapUrls: string[]): Promise<Array<{
    url: string;
    type: string;
    urls: number;
    lastModified?: string;
  }>> {
    const validSitemaps = [];
    
    for (const sitemapUrl of sitemapUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(sitemapUrl, {
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; AEO-Analyzer/1.0; +https://example.com/bot)'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('xml') || contentType.includes('text')) {
            // Fetch the actual content to analyze
            const contentController = new AbortController();
            const contentTimeoutId = setTimeout(() => contentController.abort(), 15000);
            
            const contentResponse = await fetch(sitemapUrl, {
              signal: contentController.signal,
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; AEO-Analyzer/1.0; +https://example.com/bot)'
              }
            });
            
            clearTimeout(contentTimeoutId);
            
            if (contentResponse.ok) {
              const xmlContent = await contentResponse.text();
              const sitemapInfo = this.analyzeSitemapContent(sitemapUrl, xmlContent);
              if (sitemapInfo) {
                validSitemaps.push(sitemapInfo);
              }
            }
          }
        }
      } catch (error) {
        // Silently continue to next sitemap URL
        console.debug(`Failed to check sitemap at ${sitemapUrl}:`, error.message);
      }
    }
    
    return validSitemaps;
  }

  private analyzeSitemapContent(url: string, xmlContent: string): {
    url: string;
    type: string;
    urls: number;
    lastModified?: string;
  } | null {
    try {
      const urlMatches = xmlContent.match(/<loc>/g);
      const sitemapMatches = xmlContent.match(/<sitemap>/g);
      const lastModMatch = xmlContent.match(/<lastmod>([^<]+)<\/lastmod>/);
      
      let type = 'sitemap';
      let urlCount = 0;
      
      if (sitemapMatches) {
        type = 'sitemap index';
        urlCount = sitemapMatches.length;
      } else if (urlMatches) {
        type = 'URL sitemap';
        urlCount = urlMatches.length;
      }
      
      return {
        url,
        type,
        urls: urlCount,
        lastModified: lastModMatch ? lastModMatch[1] : undefined
      };
    } catch (error) {
      console.debug(`Failed to analyze sitemap content for ${url}:`, error);
      return null;
    }
  }

  private async checkRobotsTxtForSitemaps(domain: string): Promise<string[]> {
    try {
      const robotsUrl = `https://${domain}/robots.txt`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(robotsUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AEO-Analyzer/1.0; +https://example.com/bot)'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const robotsContent = await response.text();
        const sitemapLines = robotsContent
          .split('\n')
          .filter(line => line.toLowerCase().startsWith('sitemap:'))
          .map(line => line.substring(8).trim());
        
        return sitemapLines;
      }
    } catch (error) {
      console.debug(`Failed to check robots.txt for ${domain}:`, error.message);
    }
    
    return [];
  }
}