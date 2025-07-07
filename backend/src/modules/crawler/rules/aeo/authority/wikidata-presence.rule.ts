import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult,
  PageContent,
  Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';

// Evidence topics for this rule
enum WikidataPresenceTopic {
  SEARCH_RESULTS = 'Wikidata Search Results',
  ENTITY_FOUND = 'Wikidata Entity Found',
  ENTITY_DETAILS = 'Entity Quality Analysis',
  NO_ENTITIES = 'No Wikidata Presence',
  ALTERNATIVE_SEARCH = 'Alternative Search Attempts'
}

interface WikidataSearchResult {
  id: string;
  title: string;
  pageid: number;
  display?: {
    label?: {
      value: string;
      language: string;
    };
    description?: {
      value: string;
      language: string;
    };
  };
  repository?: string;
  url?: string;
}

interface WikidataEntity {
  id: string;
  type: string;
  labels?: Record<string, { language: string; value: string }>;
  descriptions?: Record<string, { language: string; value: string }>;
  claims?: Record<string, any[]>;
  sitelinks?: Record<string, { site: string; title: string; url?: string }>;
  aliases?: Record<string, Array<{ language: string; value: string }>>;
}

/**
 * Wikidata Presence Rule - Analyzes brand presence on Wikidata
 * 
 * This rule searches for Wikidata entities related to the brand/website
 * and evaluates the quality and authority of the Wikidata presence.
 */
@Injectable()
export class WikidataPresenceRule extends BaseAEORule {
  private readonly WIKIDATA_API_BASE = 'https://www.wikidata.org/w/api.php';
  
  constructor() {
    super(
      'wikidata-presence',
      'Wikidata Presence',
      'AUTHORITY',
      {
        impactScore: 3, // High impact
        pageTypes: [], // Off-site rule
        isDomainLevel: true // Domain-level analysis
      }
    );
  }
  
  private extractBrandName(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      // Remove www prefix
      let brand = hostname.replace(/^www\./, '');
      
      // Remove common TLDs - handle country codes like .fr, .de, .uk
      brand = brand.replace(/\.(com|org|net|io|co|ai|app|dev|fr|de|uk|es|it|nl|be|ch|at)$/i, '');
      
      // If there are still dots, take the first part (main domain)
      const parts = brand.split('.');
      brand = parts.length > 1 ? parts[0] : brand;
      
      // Capitalize first letter
      return brand.charAt(0).toUpperCase() + brand.slice(1);
    } catch {
      return url;
    }
  }
  
  private async searchWikidata(searchTerm: string): Promise<WikidataSearchResult[]> {
    try {
      const response = await axios.get(this.WIKIDATA_API_BASE, {
        params: {
          action: 'wbsearchentities',
          search: searchTerm,
          language: 'en',
          limit: 10,
          format: 'json',
          origin: '*'
        },
        timeout: 10000
      });
      
      return response.data?.search || [];
    } catch (error) {
      console.error('Wikidata search error:', error);
      return [];
    }
  }
  
  private async getEntityInfo(entityId: string): Promise<WikidataEntity | null> {
    try {
      const response = await axios.get(this.WIKIDATA_API_BASE, {
        params: {
          action: 'wbgetentities',
          ids: entityId,
          languages: 'en',
          format: 'json',
          origin: '*'
        },
        timeout: 10000
      });
      
      const entities = response.data?.entities;
      if (entities && entities[entityId]) {
        return entities[entityId];
      }
      return null;
    } catch (error) {
      console.error('Wikidata entity info error:', error);
      return null;
    }
  }
  
  private isEntityAboutBrand(
    entity: WikidataSearchResult | WikidataEntity,
    brandName: string
  ): boolean {
    const brand = brandName.toLowerCase();
    
    // Check title/label
    if ('title' in entity) {
      const title = entity.title.toLowerCase();
      if (title.includes(brand)) {
        return true;
      }
    }
    
    // For search results, check display label as well
    if ('display' in entity && entity.display?.label?.value) {
      const label = entity.display.label.value.toLowerCase();
      if (label.includes(brand)) {
        return true;
      }
    }
    
    if ('labels' in entity && entity.labels?.en) {
      const label = entity.labels.en.value.toLowerCase();
      if (label.includes(brand)) {
        return true;
      }
    }
    
    // Check description for relevance
    if ('display' in entity && entity.display?.description) {
      const description = entity.display.description.value.toLowerCase();
      
      // Direct brand mention in description
      if (description.includes(brand)) {
        return true;
      }
      
      // Check if it's a business-related entity (even without brand name in description)
      const businessKeywords = [
        'company', 'organization', 'business', 'corporation', 
        'website', 'platform', 'software', 'provider', 'service',
        'technology', 'solution', 'management', 'system', 'tool'
      ];
      
      const hasBusinessKeyword = businessKeywords.some(keyword => 
        description.includes(keyword)
      );
      
      // If title contains brand and description is business-related, consider it a match
      if ('title' in entity && entity.title.toLowerCase().includes(brand) && hasBusinessKeyword) {
        return true;
      }
    }
    
    if ('descriptions' in entity && entity.descriptions?.en) {
      const description = entity.descriptions.en.value.toLowerCase();
      
      // Direct brand mention in description
      if (description.includes(brand)) {
        return true;
      }
      
      // Check if it's a business-related entity (even without brand name in description)
      const businessKeywords = [
        'company', 'organization', 'business', 'corporation', 
        'website', 'platform', 'software', 'provider', 'service',
        'technology', 'solution', 'management', 'system', 'tool'
      ];
      
      const hasBusinessKeyword = businessKeywords.some(keyword => 
        description.includes(keyword)
      );
      
      // If label contains brand and description is business-related, consider it a match
      if (entity.labels?.en && entity.labels.en.value.toLowerCase().includes(brand) && hasBusinessKeyword) {
        return true;
      }
    }
    
    // Check aliases
    if ('aliases' in entity && entity.aliases?.en) {
      const aliasMatch = entity.aliases.en.some(alias => 
        alias.value.toLowerCase().includes(brand)
      );
      if (aliasMatch) {
        return true;
      }
    }
    
    return false;
  }
  
  private calculateScore(
    searchResults: WikidataSearchResult[],
    entityInfo: WikidataEntity | null,
    brandName: string
  ): number {
    let score = 0;
    
    // Filter results to only those actually about the brand
    const relevantResults = searchResults.filter(result => 
      this.isEntityAboutBrand(result, brandName)
    );
    
    // Base score for having any relevant Wikidata presence (50 points)
    if (relevantResults.length > 0) {
      score += 50;
    }
    
    // No additional points for exact match - it's included in the base 50
    
    if (entityInfo) {
      // Entity has description (10 points)
      if (entityInfo.descriptions?.en) {
        score += 10;
      }
      
      // Entity has multiple language labels (10 points)
      if (entityInfo.labels && Object.keys(entityInfo.labels).length > 1) {
        score += 10;
      }
      
      // Entity has claims (properties) (up to 20 points)
      if (entityInfo.claims) {
        const claimCount = Object.keys(entityInfo.claims).length;
        if (claimCount > 10) {
          score += 20;
        } else if (claimCount > 5) {
          score += 10;
        } else if (claimCount > 0) {
          score += 5;
        }
      }
      
      // Entity has sitelinks (Wikipedia pages in different languages) (up to 15 points)
      if (entityInfo.sitelinks) {
        const sitelinkCount = Object.keys(entityInfo.sitelinks).length;
        if (sitelinkCount > 3) {
          score += 15;
        } else if (sitelinkCount > 0) {
          score += 10;
        }
      }
      
      // Entity has aliases (5 points)
      if (entityInfo.aliases?.en && entityInfo.aliases.en.length > 0) {
        score += 5;
      }
    }
    
    return Math.min(score, 100);
  }
  
  async evaluate(url: string, content: PageContent): Promise<RuleResult> {
    const evidence: EvidenceItem[] = [];
    const details: Record<string, any> = {};
    
    // Extract brand name from URL
    const brandName = this.extractBrandName(url);
    details.searchedBrand = brandName;
    
    let relevantEntityInfo: WikidataEntity | null = null;
    let searchResults: WikidataSearchResult[] = [];
    
    try {
      // Search Wikidata for the brand
      searchResults = await this.searchWikidata(brandName);
      details.searchResultsCount = searchResults.length;
      
      if (searchResults.length === 0) {
        evidence.push(EvidenceHelper.error(WikidataPresenceTopic.NO_ENTITIES, `No Wikidata entities found for "${brandName}"`, { score: 0 }));
        details.hasWikidataPresence = false;
      } else {
        // Filter for relevant results
        const relevantResults = searchResults.filter(result => 
          this.isEntityAboutBrand(result, brandName)
        );
        
        // Show search results with code snippet
        const searchResultsList = searchResults.slice(0, 3).map(result => {
          const label = result.display?.label?.value || result.title;
          const description = result.display?.description?.value || 'No description';
          return `• "${label}" (${result.id}): ${description}`;
        }).join('\n');
        evidence.push(EvidenceHelper.info(WikidataPresenceTopic.SEARCH_RESULTS, `Found ${searchResults.length} search results for "${brandName}"`, {
          code: searchResultsList
        }));
        
        if (relevantResults.length === 0) {
          evidence.push(EvidenceHelper.error(WikidataPresenceTopic.NO_ENTITIES, `None of the results are about the brand "${brandName}"`, { score: 0 }));
          details.hasWikidataPresence = false;
          
          // Show code snippet of what was actually found
          const topResults = searchResults.slice(0, 2);
          if (topResults.length > 0) {
            const resultSnippets = topResults.map(result => {
              const label = result.display?.label?.value || result.title;
              const description = result.display?.description?.value || 'No description';
              return `"${label}" (${result.id}): ${description}`;
            }).join('\n');
            evidence.push(EvidenceHelper.info(WikidataPresenceTopic.SEARCH_RESULTS, 'Search returned these results instead:', {
              code: resultSnippets
            }));
          }
          
          // Show why top results were rejected
          searchResults.slice(0, 2).forEach(result => {
            const label = result.display?.label?.value || result.title;
            evidence.push(EvidenceHelper.info(WikidataPresenceTopic.SEARCH_RESULTS, `  • "${label}" (${result.id}) - Not about the brand`));
          });
        } else {
          const baseScore = 50; // Base score for having Wikidata presence
          evidence.push(EvidenceHelper.success(WikidataPresenceTopic.ENTITY_FOUND, `Found ${relevantResults.length} Wikidata entit${relevantResults.length === 1 ? 'y' : 'ies'} about "${brandName}"`, { score: baseScore }));
          details.hasWikidataPresence = true;
          details.searchResults = relevantResults.map(r => ({
            id: r.id,
            title: r.title,
            description: r.display?.description?.value,
            label: r.display?.label?.value
          }));
          
          // Show URLs of found entities in code snippet
          const entityUrls = relevantResults.map(result => {
            const label = result.display?.label?.value || result.title;
            return `• "${label}" (${result.id}): https://www.wikidata.org/wiki/${result.id}`;
          }).join('\n');
          evidence.push(EvidenceHelper.info(WikidataPresenceTopic.ENTITY_FOUND, 'Wikidata entities found:', {
            code: entityUrls
          }));
          
          // Get detailed info for the most relevant result
          const mostRelevant = relevantResults[0];
          
          if (mostRelevant) {
            const entityInfo = await this.getEntityInfo(mostRelevant.id);
          
            if (entityInfo && this.isEntityAboutBrand(entityInfo, brandName)) {
              relevantEntityInfo = entityInfo;
              const primaryUrl = `https://www.wikidata.org/wiki/${entityInfo.id}`;
              evidence.push(EvidenceHelper.success(WikidataPresenceTopic.ENTITY_FOUND, `Primary Wikidata entity: "${entityInfo.labels?.en?.value || mostRelevant.title}" (${entityInfo.id})`, {
                code: `Primary entity URL: ${primaryUrl}`
              }));
              
              if (entityInfo.descriptions?.en) {
                evidence.push(EvidenceHelper.success(WikidataPresenceTopic.ENTITY_DETAILS, `Entity has description: "${entityInfo.descriptions.en.value}"`, { score: 10 }));
                details.entityDescription = entityInfo.descriptions.en.value;
              }
              
              if (entityInfo.labels) {
                const languageCount = Object.keys(entityInfo.labels).length;
                const labelScore = languageCount > 1 ? 10 : 0;
                evidence.push(EvidenceHelper.info(WikidataPresenceTopic.ENTITY_DETAILS, `Entity has labels in ${languageCount} language${languageCount === 1 ? '' : 's'}`, { score: labelScore }));
                details.labelLanguages = languageCount;
              }
              
              if (entityInfo.claims) {
                const claimCount = Object.keys(entityInfo.claims).length;
                let claimScore = 0;
                if (claimCount > 10) claimScore = 20;
                else if (claimCount > 5) claimScore = 10;
                else if (claimCount > 0) claimScore = 5;
                
                evidence.push(EvidenceHelper.info(WikidataPresenceTopic.ENTITY_DETAILS, `Entity has ${claimCount} properties/claims`, { score: claimScore }));
                details.claimCount = claimCount;
              }
              
              if (entityInfo.sitelinks) {
                const sitelinkCount = Object.keys(entityInfo.sitelinks).length;
                let sitelinkScore = 0;
                if (sitelinkCount > 3) sitelinkScore = 15;
                else if (sitelinkCount > 0) sitelinkScore = 10;
                
                evidence.push(EvidenceHelper.info(WikidataPresenceTopic.ENTITY_DETAILS, `Entity linked to ${sitelinkCount} Wikipedia page${sitelinkCount === 1 ? '' : 's'}`, { score: sitelinkScore }));
                details.sitelinkCount = sitelinkCount;
                
                // Show some sitelinks
                if (sitelinkCount > 0) {
                  const sitelinks = Object.entries(entityInfo.sitelinks).slice(0, 3).map(([key, link]) => 
                    `${key}: ${link.title}`
                  ).join('\n');
                  evidence.push(EvidenceHelper.info(WikidataPresenceTopic.ENTITY_DETAILS, 'Connected Wikipedia pages:', {
                    code: sitelinks + (sitelinkCount > 3 ? '\n... (truncated)' : '')
                  }));
                }
              }
              
              if (entityInfo.aliases?.en) {
                const aliasCount = entityInfo.aliases.en.length;
                const aliasScore = aliasCount > 0 ? 5 : 0;
                evidence.push(EvidenceHelper.info(WikidataPresenceTopic.ENTITY_DETAILS, `Entity has ${aliasCount} alias${aliasCount === 1 ? '' : 'es'}`, { score: aliasScore }));
                details.aliasCount = aliasCount;
              }
            } else if (entityInfo) {
              evidence.push(EvidenceHelper.error(WikidataPresenceTopic.NO_ENTITIES, `Entity "${entityInfo.labels?.en?.value || mostRelevant.title}" is not about the brand`, { score: 0 }));
              details.hasWikidataPresence = false;
            }
          }
        }
      }
      
      // Alternative brand names search
      const alternativeSearches = [
        brandName.replace(/\s+/g, ''),
        brandName + ' company',
        brandName + ' corporation',
        brandName + ' organization'
      ];
      
      for (const altSearch of alternativeSearches) {
        if (altSearch !== brandName) {
          const altResults = await this.searchWikidata(altSearch);
          if (altResults.length > 0 && searchResults.length === 0) {
            evidence.push(EvidenceHelper.info(WikidataPresenceTopic.ALTERNATIVE_SEARCH, `Found results with alternative search: "${altSearch}"`));
            details.alternativeSearchResults = altResults.slice(0, 2).map(r => ({ id: r.id, title: r.title }));
            
            // Show alternative search URLs
            const altUrls = altResults.slice(0, 2).map(result => 
              `• "${result.title}" (${result.id}): https://www.wikidata.org/wiki/${result.id}`
            ).join('\n');
            evidence.push(EvidenceHelper.info(WikidataPresenceTopic.ALTERNATIVE_SEARCH, 'Alternative search results:', {
              code: altUrls
            }));
          }
        }
      }
      
    } catch (error) {
      evidence.push(EvidenceHelper.error(WikidataPresenceTopic.SEARCH_RESULTS, 'Error accessing Wikidata API', { score: 0 }));
      details.error = error instanceof Error ? error.message : 'Unknown error';
    }
    
    // Calculate score based on relevant results only
    const relevantResults = searchResults.filter(result => 
      this.isEntityAboutBrand(result, brandName)
    );
    
    const score = this.calculateScore(
      relevantResults,
      relevantEntityInfo,
      brandName
    );
    
    // Set additional details
    details.score = score;
    details.analysisType = 'off-site';
    details.criteria = 'Authority Building';
    details.element = 'Wikidata Presence';
    details.applicationLevel = 'Off-Site';
    details.seoLlmType = 'SEO adapted to LLM';
    details.impact = 'High';
    details.importance = 'Wikidata presence provides structured data validation and enhances brand authority in AI systems and knowledge graphs.';
    details.checklist = [
      'Company Wikidata entity exists',
      'Entity has comprehensive properties and claims',
      'Multiple language labels available',
      'Connected to Wikipedia pages',
      'Proper aliases and alternative names'
    ];
    
    const issues = [];
    if (score < 20) {
      issues.push({
        severity: 'high' as const,
        description: 'No Wikidata presence found for the brand',
        recommendation: 'Consider creating a Wikidata entity following notability guidelines and ensuring proper structured data'
      });
    } else if (score < 50) {
      issues.push({
        severity: 'medium' as const,
        description: 'Limited Wikidata presence or entity quality',
        recommendation: 'Improve Wikidata entity with more comprehensive properties, multiple language labels, and Wikipedia connections'
      });
    } else if (score < 80) {
      issues.push({
        severity: 'low' as const,
        description: 'Wikidata presence exists but could be enhanced',
        recommendation: 'Enhance entity with additional properties, claims, and language variations'
      });
    }
    
    // Calculate score breakdown
    let scoreBreakdown = 'Base: 0';
    const relevantCount = relevantResults.length;
    if (relevantCount > 0) scoreBreakdown += ', Wikidata Presence: +50';
    if (relevantEntityInfo) {
      if (relevantEntityInfo.descriptions?.en) scoreBreakdown += ', Description: +10';
      if (relevantEntityInfo.labels && Object.keys(relevantEntityInfo.labels).length > 1) scoreBreakdown += ', Multi-language: +10';
      if (relevantEntityInfo.claims) {
        const claimCount = Object.keys(relevantEntityInfo.claims).length;
        if (claimCount > 10) scoreBreakdown += ', Rich Claims (10+): +20';
        else if (claimCount > 5) scoreBreakdown += ', Claims (5+): +10';
        else if (claimCount > 0) scoreBreakdown += ', Claims: +5';
      }
      if (relevantEntityInfo.sitelinks) {
        const sitelinkCount = Object.keys(relevantEntityInfo.sitelinks).length;
        if (sitelinkCount > 3) scoreBreakdown += ', Wikipedia Links (3+): +15';
        else if (sitelinkCount > 0) scoreBreakdown += ', Wikipedia Links: +10';
      }
      if (relevantEntityInfo.aliases?.en && relevantEntityInfo.aliases.en.length > 0) scoreBreakdown += ', Aliases: +5';
    }
    evidence.push(EvidenceHelper.score(`Final Score: ${score}/100 (${scoreBreakdown})`));
    
    return this.createResult(score, evidence, issues, details);
  }
}