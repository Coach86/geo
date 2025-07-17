import { Injectable, Logger } from '@nestjs/common';
import {
  SentimentResults,
  AlignmentResults as AccuracyResults,
  CompetitionResults,
  VisibilityResults as SpontaneousResults,
} from '../interfaces/batch.interfaces';
import { ExplorerData } from '../../report/interfaces/report.interfaces';
import { ReportDataUtilitiesService } from './report-data-utilities.service';

/**
 * Service responsible for building explorer data from pipeline results.
 * Handles web search analysis, citations processing, and keyword extraction.
 */
@Injectable()
export class ExplorerDataService {
  private readonly logger = new Logger(ExplorerDataService.name);

  constructor(
    private readonly reportDataUtilitiesService: ReportDataUtilitiesService,
  ) {}

  /**
   * Build explorer data from all pipeline results
   */
  buildExplorerData(
    spontaneousResults: SpontaneousResults,
    sentimentResults: SentimentResults,
    accuracyResults: AccuracyResults,
    comparisonResults: CompetitionResults,
    projectWebsite?: string,
    competitorDetails?: Array<{ name: string; website?: string }>,
  ): ExplorerData {
    // Build citations data
    const allCitationsData: Array<{
      modelId: string;
      modelProvider: string;
      promptIndex: number;
      promptType: string;
      citations: any[];
      webSearchQueries: any[];
    }> = [];

    // Collect citations from all pipeline results
    const collectCitations = (results: any[] | undefined, promptType: string) => {
      if (!results) return;

      results.forEach((result, index) => {
        // Extract web search queries
        let webSearchQueries: any[] = [];

        // Check if webSearchQueries is already extracted
        if (result.webSearchQueries && Array.isArray(result.webSearchQueries)) {
          webSearchQueries = result.webSearchQueries;
        }
        // Fallback to extracting from toolUsage
        else if (result.toolUsage && Array.isArray(result.toolUsage)) {
          const extractedQueries: any[] = [];
          result.toolUsage.forEach((tool: any) => {
            if (tool.type === 'web_search' || tool.type === 'search' || tool.type?.includes('search')) {
              const query = tool.input?.query || tool.parameters?.query || tool.parameters?.q || tool.query;
              if (query) {
                extractedQueries.push({
                  query: query,
                  timestamp: new Date().toISOString(),
                });
              }
            }
          });
          webSearchQueries = extractedQueries;
        }

        // Add entry if we have citations OR web search queries
        if ((result.citations && result.citations.length > 0) || webSearchQueries.length > 0) {
          allCitationsData.push({
            modelId: result.llmModel || 'unknown',
            modelProvider: result.llmProvider || 'unknown',
            promptIndex: result.promptIndex ?? index,
            promptType,
            citations: result.citations || [],
            webSearchQueries: webSearchQueries,
          });
        }
      });
    };

    // Collect from all pipelines
    collectCitations(spontaneousResults?.results, 'visibility');
    collectCitations(sentimentResults?.results, 'sentiment');
    collectCitations(accuracyResults?.results, 'alignment');
    collectCitations(comparisonResults?.results, 'competition');

    // Calculate statistics
    const totalPrompts = this.reportDataUtilitiesService.countPromptsExecuted(spontaneousResults, sentimentResults, accuracyResults, comparisonResults);
    const promptsWithWebAccess = allCitationsData.length;
    const webAccessPercentage = totalPrompts > 0 ? (promptsWithWebAccess / totalPrompts) * 100 : 0;

    // Aggregate source statistics
    const sourceMap = new Map<string, {
      totalMentions: number;
      citedByModels: Set<string>;
      associatedQueries: Set<string>;
    }>();

    let totalCitations = 0;
    
    // Build query-based structure
    const webSearchResults: any[] = [];
    const queryToCitationsMap = new Map<string, {
      query: string;
      timestamp?: string;
      citations: any[];
      models: Set<string>;
      promptTypes: Set<string>;
    }>();

    allCitationsData.forEach(({ modelId, modelProvider, promptIndex, promptType, citations, webSearchQueries }) => {
      // Count all citations for statistics
      citations.forEach((citation: any) => {
        totalCitations++;
        const domain = this.reportDataUtilitiesService.extractDomain(citation.url || citation.source || '');
        
        // Update source statistics
        if (domain) {
          if (!sourceMap.has(domain)) {
            sourceMap.set(domain, {
              totalMentions: 0,
              citedByModels: new Set(),
              associatedQueries: new Set(),
            });
          }
          const stats = sourceMap.get(domain)!;
          stats.totalMentions++;
          stats.citedByModels.add(modelId);
        }
      });
      
      // Only add to webSearchResults if we have web search queries
      if (webSearchQueries.length > 0) {
        // Process each web search query
        webSearchQueries.forEach((queryObj: any) => {
          const query = typeof queryObj === 'string' ? queryObj : (queryObj.query || queryObj);
          const timestamp = typeof queryObj === 'object' ? queryObj.timestamp : undefined;
          
          if (!queryToCitationsMap.has(query)) {
            queryToCitationsMap.set(query, {
              query,
              timestamp,
              citations: [],
              models: new Set(),
              promptTypes: new Set(),
            });
          }
          
          const entry = queryToCitationsMap.get(query)!;
          
          // Add citations for this query
          citations.forEach((citation: any) => {
            const domain = this.reportDataUtilitiesService.extractDomain(citation.url || citation.source || '');
            
            entry.citations.push({
              website: domain,
              link: citation.url,
              model: modelId,
              promptType,
              promptIndex,
              source: citation.source || domain,
            });
            
            entry.models.add(modelId);
            entry.promptTypes.add(promptType);
            
            // Add query association to existing source stats
            if (domain && sourceMap.has(domain)) {
              sourceMap.get(domain)!.associatedQueries.add(query);
            }
          });
        });
      }
    });

    // Convert map to array for webSearchResults
    webSearchResults.push(...Array.from(queryToCitationsMap.values()).map(entry => ({
      query: entry.query,
      timestamp: entry.timestamp,
      models: Array.from(entry.models),
      promptTypes: Array.from(entry.promptTypes),
      citations: entry.citations,
    })));

    // Get top sources
    const topSources = Array.from(sourceMap.entries())
      .map(([domain, stats]) => ({
        domain,
        count: stats.totalMentions,
        percentage: totalCitations > 0 ? (stats.totalMentions / totalCitations) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Extract keywords from web search queries
    const topKeywords = this.extractTopKeywords(allCitationsData);

    // Calculate domain source analysis
    const domainSourceAnalysis = this.calculateDomainSourceAnalysis(
      sourceMap,
      totalCitations,
      projectWebsite,
      competitorDetails
    );

    // Calculate brand mention metrics
    const brandMentionMetrics = this.calculateBrandMentionMetrics(
      allCitationsData,
      totalCitations,
      projectWebsite
    );

    return {
      summary: {
        totalPrompts,
        promptsWithWebAccess,
        webAccessPercentage,
        totalCitations,
        uniqueSources: sourceMap.size,
      },
      topKeywords,
      topSources,
      webSearchResults,
      webAccess: {
        totalResponses: totalPrompts,
        successfulQueries: promptsWithWebAccess,
        failedQueries: 0,
      },
      domainSourceAnalysis,
      brandMentionMetrics,
    };
  }

  /**
   * Extract keywords from web search queries
   */
  private extractTopKeywords(allCitationsData: any[]): any[] {
    const keywordMap = new Map<string, number>();
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are',
      'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'done',
      'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
      'this', 'that', 'these', 'those', 'with', 'from', 'for', 'about',
      'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'between', 'under', 'over', 'then', 'than', 'when', 'where', 'what',
      'who', 'whom', 'whose', 'which', 'why', 'how'
    ]);

    allCitationsData.forEach(({ webSearchQueries }) => {
      webSearchQueries.forEach((queryObj: any) => {
        const query = typeof queryObj === 'string' ? queryObj : (queryObj.query || queryObj);
        if (query) {
          // Simple split by spaces and filter stop words
          const words = query.toLowerCase().split(/\s+/).filter((word: string) => 
            word.trim() !== '' && !stopWords.has(word) && word.length > 2
          );
          
          words.forEach((word: string) => {
            keywordMap.set(word, (keywordMap.get(word) || 0) + 1);
          });
        }
      });
    });

    // Count total web search queries for percentage calculation
    const totalWebSearchQueries = allCitationsData.reduce(
      (sum, item) => sum + item.webSearchQueries.length,
      0
    );

    // Get top keywords
    return Array.from(keywordMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword, count]) => ({
        keyword,
        count,
        percentage: totalWebSearchQueries > 0 ? (count / totalWebSearchQueries) * 100 : 0,
      }));
  }

  /**
   * Calculate domain source analysis
   */
  private calculateDomainSourceAnalysis(
    sourceMap: Map<string, any>,
    totalCitations: number,
    projectWebsite?: string,
    competitorDetails?: Array<{ name: string; website?: string }>
  ): ExplorerData['domainSourceAnalysis'] | undefined {
    if (!projectWebsite || totalCitations === 0) return undefined;

    // Extract brand domain without TLD
    const brandDomain = this.reportDataUtilitiesService.extractBrandDomain(projectWebsite);
    
    if (!brandDomain) return undefined;

    let brandDomainCount = 0;
    let otherSourcesCount = 0;
    const competitorCounts: Record<string, number> = {};
    let unknownSourcesCount = 0;
    
    // Extract competitor domains
    const competitorDomains: Record<string, string> = {};
    if (competitorDetails && Array.isArray(competitorDetails)) {
      competitorDetails.forEach(competitor => {
        if (competitor.website) {
          const competitorDomain = this.reportDataUtilitiesService.extractBrandDomain(competitor.website);
          if (competitorDomain) {
            competitorDomains[competitorDomain] = competitor.name;
          }
        }
      });
    }
    
    // Count sources from brand domain vs competitors vs others
    sourceMap.forEach((stats, domain) => {
      if (this.reportDataUtilitiesService.isDomainMatch(domain, brandDomain)) {
        brandDomainCount += stats.totalMentions;
      } else {
        // Check if it's a competitor domain
        let isCompetitorDomain = false;
        for (const [competitorDomain, competitorName] of Object.entries(competitorDomains)) {
          if (this.reportDataUtilitiesService.isDomainMatch(domain, competitorDomain)) {
            competitorCounts[competitorName] = (competitorCounts[competitorName] || 0) + stats.totalMentions;
            isCompetitorDomain = true;
            break;
          }
        }
        
        if (!isCompetitorDomain) {
          unknownSourcesCount += stats.totalMentions;
        }
        
        otherSourcesCount += stats.totalMentions;
      }
    });
    
    const brandDomainPercentage = (brandDomainCount / totalCitations) * 100;
    const otherSourcesPercentage = (otherSourcesCount / totalCitations) * 100;
    const unknownSourcesPercentage = (unknownSourcesCount / totalCitations) * 100;
    
    // Create competitor breakdown
    const competitorBreakdown = Object.entries(competitorCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / totalCitations) * 1000) / 10 // Round to 1 decimal
      }))
      .sort((a, b) => b.count - a.count);
    
    this.logger.log(`Domain source analysis: ${brandDomainCount} from brand domain (${brandDomainPercentage.toFixed(1)}%), ${otherSourcesCount} from other sources (${otherSourcesPercentage.toFixed(1)}%)`);
    if (competitorBreakdown.length > 0) {
      this.logger.log(`Competitor breakdown: ${competitorBreakdown.map(c => `${c.name}: ${c.count} (${c.percentage}%)`).join(', ')}`);
    }
    
    return {
      brandDomainPercentage: Math.round(brandDomainPercentage * 10) / 10, // Round to 1 decimal
      otherSourcesPercentage: Math.round(otherSourcesPercentage * 10) / 10,
      brandDomainCount,
      otherSourcesCount,
      competitorBreakdown: competitorBreakdown.length > 0 ? competitorBreakdown : undefined,
      unknownSourcesCount,
      unknownSourcesPercentage: Math.round(unknownSourcesPercentage * 10) / 10,
    };
  }

  /**
   * Calculate brand mention metrics
   */
  private calculateBrandMentionMetrics(
    allCitationsData: any[],
    totalCitations: number,
    projectWebsite?: string
  ): ExplorerData['brandMentionMetrics'] | undefined {
    // Extract brand name from project details
    const brandName = this.reportDataUtilitiesService.extractBrandNameFromProject(projectWebsite);
    
    if (!brandName || totalCitations === 0) return undefined;

    let citationsWithBrandMentions = 0;
    const domainMentionCounts = new Map<string, { mentionCount: number; totalCount: number }>();
    const modelMentionCounts = new Map<string, { mentionCount: number; totalCitations: number }>();
    
    // Process all citations to check for brand mentions
    allCitationsData.forEach(({ modelId, citations }) => {
      citations.forEach((citation: any) => {
        const domain = this.reportDataUtilitiesService.extractDomain(citation.url || citation.link || citation.source || '');
        
        // Initialize domain counts if not exists
        if (domain && !domainMentionCounts.has(domain)) {
          domainMentionCounts.set(domain, { mentionCount: 0, totalCount: 0 });
        }
        
        // Initialize model counts if not exists
        if (!modelMentionCounts.has(modelId)) {
          modelMentionCounts.set(modelId, { mentionCount: 0, totalCitations: 0 });
        }
        
        // Count total citations
        if (domain) {
          domainMentionCounts.get(domain)!.totalCount++;
        }
        modelMentionCounts.get(modelId)!.totalCitations++;
        
        // Check if brand is mentioned
        if (citation.brandMentioned === true) {
          citationsWithBrandMentions++;
          
          if (domain) {
            domainMentionCounts.get(domain)!.mentionCount++;
          }
          modelMentionCounts.get(modelId)!.mentionCount++;
        }
      });
    });
    
    // Calculate brand mention rate
    const brandMentionRate = (citationsWithBrandMentions / totalCitations) * 100;
    
    // Get top domains with brand mentions
    const topDomainsWithBrandMentions = Array.from(domainMentionCounts.entries())
      .filter(([_, counts]) => counts.mentionCount > 0)
      .map(([domain, counts]) => ({
        domain,
        mentionCount: counts.mentionCount,
        totalCount: counts.totalCount,
        mentionRate: Math.round((counts.mentionCount / counts.totalCount) * 1000) / 10 // Round to 1 decimal
      }))
      .sort((a, b) => b.mentionCount - a.mentionCount)
      .slice(0, 10);
    
    // Get brand mentions by model
    const brandMentionsByModel = Array.from(modelMentionCounts.entries())
      .map(([model, counts]) => ({
        model,
        mentionCount: counts.mentionCount,
        totalCitations: counts.totalCitations,
        mentionRate: Math.round((counts.mentionCount / counts.totalCitations) * 1000) / 10 // Round to 1 decimal
      }))
      .sort((a, b) => b.mentionRate - a.mentionRate);
    
    this.logger.log(`Brand mention metrics: ${citationsWithBrandMentions}/${totalCitations} citations mention the brand (${brandMentionRate.toFixed(1)}%)`);
    
    return {
      citationsWithBrandMentions,
      totalCitationsAnalyzed: totalCitations,
      brandMentionRate: Math.round(brandMentionRate * 10) / 10, // Round to 1 decimal
      topDomainsWithBrandMentions,
      brandMentionsByModel
    };
  }
}