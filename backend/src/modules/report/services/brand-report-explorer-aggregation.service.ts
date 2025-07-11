import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BrandReport, BrandReportDocument } from '../schemas/brand-report.schema';
import { AggregatedReportQueryDto } from '../dto/aggregated-report-query.dto';
import { 
  AggregatedExplorerResponseDto,
  ExplorerItemDto
} from '../dto/aggregated-explorer-response.dto';
import { BrandReportExplorerSelect } from '../types/brand-report.types';
import { ExplorerData } from '../interfaces/report.interfaces';
import { ProjectService } from '../../project/services/project.service';

// Define proper types for web search results
interface WebSearchResult {
  query: string;
  timestamp?: string;
  models: string[];
  promptTypes: string[];
  citations: {
    website: string;
    link?: string;
    model: string;
    promptType: string;
    promptIndex: number;
    source?: string;
  }[];
}

/**
 * Service for aggregating explorer data across multiple reports
 * Handles web search results, keywords, and source analysis
 */
@Injectable()
export class BrandReportExplorerAggregationService {
  private readonly logger = new Logger(BrandReportExplorerAggregationService.name);

  constructor(
    @InjectModel(BrandReport.name)
    private brandReportModel: Model<BrandReportDocument>,
    @Inject(forwardRef(() => ProjectService))
    private projectService: ProjectService,
  ) {}

  async getAggregatedExplorer(
    projectId: string,
    query: AggregatedReportQueryDto
  ): Promise<AggregatedExplorerResponseDto> {
    const reports = await this.fetchReportsForAggregation(projectId, query);

    if (reports.length === 0) {
      return this.createEmptyExplorerResponse();
    }

    // Get project information for domain classification
    const project = await this.projectService.findById(projectId);
    
    const aggregationResult = this.aggregateExplorerData(reports, query.models, project?.website, project?.competitorDetails);

    const webAccessPercentage = aggregationResult.totalPrompts > 0
      ? Math.round((aggregationResult.promptsWithWebAccess / aggregationResult.totalPrompts) * 100)
      : 0;

    return {
      summary: {
        totalPrompts: aggregationResult.totalPrompts,
        promptsWithWebAccess: aggregationResult.promptsWithWebAccess,
        webAccessPercentage,
        totalCitations: aggregationResult.actualCitationCount,
        uniqueSources: aggregationResult.uniqueSourcesCount
      },
      topKeywords: aggregationResult.topKeywords,
      topSources: aggregationResult.topSources,
      webSearchResults: aggregationResult.allWebSearchResults,
      domainSourceAnalysis: aggregationResult.domainSourceAnalysis,
      availableModels: aggregationResult.availableModels,
      reportCount: reports.length,
      dateRange: {
        start: reports[0].reportDate.toISOString(),
        end: reports[reports.length - 1].reportDate.toISOString()
      }
    };
  }

  private async fetchReportsForAggregation(
    projectId: string,
    query: AggregatedReportQueryDto
  ): Promise<BrandReportExplorerSelect[]> {
    if (query.latestOnly) {
      const latestReport = await this.brandReportModel
        .findOne({ projectId })
        .select('id reportDate generatedAt explorer')
        .sort({ reportDate: -1 })
        .lean();

      return latestReport ? [latestReport] : [];
    }

    const dateFilter: Record<string, unknown> = { projectId };
    if (query.startDate || query.endDate) {
      dateFilter.reportDate = {};
      if (query.startDate) {
        (dateFilter.reportDate as Record<string, unknown>).$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const endDate = new Date(query.endDate);
        endDate.setDate(endDate.getDate() + 1);
        (dateFilter.reportDate as Record<string, unknown>).$lt = endDate;
      }
    }

    return await this.brandReportModel
      .find(dateFilter)
      .select('id reportDate generatedAt explorer')
      .sort({ reportDate: -1 })
      .limit(10)
      .lean();
  }

  private aggregateExplorerData(
    reports: BrandReportExplorerSelect[], 
    modelFilter?: string[],
    projectWebsite?: string,
    competitorDetails?: Array<{ name: string; website?: string }>
  ) {
    const keywordCounts: Record<string, number> = {};
    const sourceCounts: Record<string, number> = {};
    const allWebSearchResults: WebSearchResult[] = [];
    const uniqueSourcesSet = new Set<string>();
    const availableModelsSet = new Set<string>();
    
    let totalPrompts = 0;
    let promptsWithWebAccess = 0;
    let actualCitationCount = 0;
    
    // Domain source analysis aggregation
    let totalBrandDomainCount = 0;
    let totalOtherSourcesCount = 0;
    let totalUnknownSourcesCount = 0;
    const competitorCounts: Record<string, number> = {};

    reports.forEach(report => {
      const explorerData = report.explorer;
      if (!explorerData) return;

      // Aggregate summary data
      this.aggregateSummaryData(
        explorerData,
        { totalPrompts, promptsWithWebAccess },
        (data) => {
          totalPrompts = data.totalPrompts;
          promptsWithWebAccess = data.promptsWithWebAccess;
        },
        modelFilter
      );

      // Aggregate keywords (not filtered by model)
      this.aggregateKeywords(explorerData, keywordCounts);

      // When filtering by model, don't aggregate sources from topSources
      // Only count sources from actual citations that match the model filter
      if (!modelFilter || modelFilter.length === 0) {
        // No filter - aggregate all sources normally
        this.aggregateSources(explorerData, sourceCounts, uniqueSourcesSet);
      }

      // Process web search results and citations
      const citationResult = this.processCitations(
        explorerData,
        sourceCounts,
        uniqueSourcesSet,
        modelFilter
      );
      actualCitationCount += citationResult.citationCount;

      if (explorerData.webSearchResults) {
        // Collect available models
        explorerData.webSearchResults.forEach(result => {
          if (result.citations) {
            result.citations.forEach(citation => {
              if (citation.model) {
                availableModelsSet.add(citation.model);
              }
            });
          }
        });
        
        // Filter web search results by model if modelFilter is provided
        if (modelFilter && modelFilter.length > 0) {
          const filteredResults = explorerData.webSearchResults.map(result => ({
            ...result,
            citations: result.citations.filter(citation => 
              modelFilter.includes(citation.model)
            )
          })).filter(result => result.citations.length > 0);
          allWebSearchResults.push(...filteredResults);
        } else {
          allWebSearchResults.push(...explorerData.webSearchResults);
        }
      }
      
      // Aggregate domain source analysis
      // When filtering by model, we should recalculate domain analysis from filtered citations
      if (!modelFilter || modelFilter.length === 0) {
        // No model filter - use pre-aggregated data
        if (explorerData.domainSourceAnalysis) {
          totalBrandDomainCount += explorerData.domainSourceAnalysis.brandDomainCount || 0;
          totalOtherSourcesCount += explorerData.domainSourceAnalysis.otherSourcesCount || 0;
          totalUnknownSourcesCount += explorerData.domainSourceAnalysis.unknownSourcesCount || 0;
          
          // Aggregate competitor breakdowns
          if (explorerData.domainSourceAnalysis.competitorBreakdown) {
            explorerData.domainSourceAnalysis.competitorBreakdown.forEach(competitor => {
              competitorCounts[competitor.name] = (competitorCounts[competitor.name] || 0) + competitor.count;
            });
          }
        }
      }
    });

    // Convert aggregated data to sorted arrays
    const topKeywords = this.createTopItemsList(keywordCounts, 10);
    const topSources = this.createTopItemsList(sourceCounts, 10);
    
    // If model filter is applied and we have project website, calculate domain source analysis from filtered sources
    if (modelFilter && modelFilter.length > 0 && projectWebsite && sourceCounts) {
      // Extract brand domain
      const brandDomain = this.extractBrandDomain(projectWebsite);
      
      // Extract competitor domains
      const competitorDomains: Record<string, string> = {};
      if (competitorDetails && Array.isArray(competitorDetails)) {
        competitorDetails.forEach(competitor => {
          if (competitor.website) {
            const competitorDomain = this.extractBrandDomain(competitor.website);
            if (competitorDomain) {
              competitorDomains[competitorDomain] = competitor.name;
            }
          }
        });
      }
      
      // Calculate counts from filtered sources
      Object.entries(sourceCounts).forEach(([domain, count]) => {
        if (brandDomain && this.isDomainMatch(domain, brandDomain)) {
          totalBrandDomainCount += count;
        } else {
          let isCompetitorDomain = false;
          for (const [competitorDomain, competitorName] of Object.entries(competitorDomains)) {
            if (this.isDomainMatch(domain, competitorDomain)) {
              competitorCounts[competitorName] = (competitorCounts[competitorName] || 0) + count;
              isCompetitorDomain = true;
              break;
            }
          }
          
          if (!isCompetitorDomain) {
            totalUnknownSourcesCount += count;
          }
          
          totalOtherSourcesCount += count;
        }
      });
    }
    
    // Calculate aggregated domain source percentages
    const totalDomainCounts = totalBrandDomainCount + totalOtherSourcesCount;
    
    // Create competitor breakdown
    const competitorBreakdown = Object.entries(competitorCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalDomainCounts > 0 ? Math.round((count / totalDomainCounts) * 1000) / 10 : 0
      }))
      .sort((a, b) => b.count - a.count);
    
    const domainSourceAnalysis = totalDomainCounts > 0 ? {
      brandDomainPercentage: Math.round((totalBrandDomainCount / totalDomainCounts) * 1000) / 10,
      otherSourcesPercentage: Math.round((totalOtherSourcesCount / totalDomainCounts) * 1000) / 10,
      brandDomainCount: totalBrandDomainCount,
      otherSourcesCount: totalOtherSourcesCount,
      competitorBreakdown: competitorBreakdown.length > 0 ? competitorBreakdown : undefined,
      unknownSourcesCount: totalUnknownSourcesCount,
      unknownSourcesPercentage: totalDomainCounts > 0 ? Math.round((totalUnknownSourcesCount / totalDomainCounts) * 1000) / 10 : 0,
    } : undefined;

    // Don't deduplicate - show all web search results
    // This matches the visibility table behavior
    const finalCitationCount = allWebSearchResults.reduce((count, result) => {
      return count + (result.citations?.length || 0);
    }, 0);

    return {
      totalPrompts,
      promptsWithWebAccess,
      actualCitationCount: finalCitationCount, // Use count from all results without deduplication
      uniqueSourcesCount: uniqueSourcesSet.size,
      topKeywords,
      topSources,
      allWebSearchResults: allWebSearchResults, // Return all results without deduplication
      domainSourceAnalysis,
      availableModels: Array.from(availableModelsSet).sort()
    };
  }

  private aggregateSummaryData(
    explorerData: ExplorerData,
    currentData: { totalPrompts: number; promptsWithWebAccess: number },
    updateCallback: (data: { totalPrompts: number; promptsWithWebAccess: number }) => void,
    modelFilter?: string[]
  ): void {
    // If no model filter, use the pre-aggregated summary
    if (!modelFilter || modelFilter.length === 0) {
      if (explorerData.summary) {
        currentData.totalPrompts += explorerData.summary.totalPrompts || 0;
        currentData.promptsWithWebAccess += explorerData.summary.promptsWithWebAccess || 0;
        updateCallback(currentData);
      }
    } else {
      // When filtering by models, count unique prompts (model + promptType + promptIndex combinations)
      if (explorerData.webSearchResults && Array.isArray(explorerData.webSearchResults)) {
        const uniquePrompts = new Set<string>();
        const uniquePromptsWithAccess = new Set<string>();
        
        explorerData.webSearchResults.forEach(searchResult => {
          if (searchResult.citations && Array.isArray(searchResult.citations)) {
            searchResult.citations.forEach(citation => {
              if (modelFilter.includes(citation.model)) {
                // Create unique key for this prompt execution
                const promptKey = `${citation.model}-${citation.promptType}-${citation.promptIndex}`;
                uniquePrompts.add(promptKey);
                uniquePromptsWithAccess.add(promptKey);
              }
            });
          }
        });
        
        currentData.totalPrompts += uniquePrompts.size;
        currentData.promptsWithWebAccess += uniquePromptsWithAccess.size;
        updateCallback(currentData);
      }
    }
  }

  private aggregateKeywords(
    explorerData: ExplorerData,
    keywordCounts: Record<string, number>
  ): void {
    if (explorerData.topKeywords) {
      explorerData.topKeywords.forEach(item => {
        if (item.keyword.toLowerCase() !== 'unknown') {
          keywordCounts[item.keyword] = (keywordCounts[item.keyword] || 0) + item.count;
        }
      });
    }
  }

  private aggregateSources(
    explorerData: ExplorerData,
    sourceCounts: Record<string, number>,
    uniqueSourcesSet: Set<string>
  ): void {
    if (explorerData.topSources) {
      explorerData.topSources.forEach(item => {
        sourceCounts[item.domain] = (sourceCounts[item.domain] || 0) + item.count;
        if (item.domain) {
          uniqueSourcesSet.add(item.domain.toLowerCase());
        }
      });
    }
  }

  private processCitations(
    explorerData: ExplorerData,
    sourceCounts: Record<string, number>,
    uniqueSourcesSet: Set<string>,
    modelFilter?: string[]
  ): { citationCount: number } {
    let citationCount = 0;

    // Process web search results
    if (explorerData.webSearchResults && Array.isArray(explorerData.webSearchResults)) {
      explorerData.webSearchResults.forEach(searchResult => {
        if (searchResult.citations && Array.isArray(searchResult.citations)) {
          // Filter citations by model if modelFilter is provided
          const citations = modelFilter && modelFilter.length > 0
            ? searchResult.citations.filter(citation => modelFilter.includes(citation.model))
            : searchResult.citations;
          
          citationCount += citations.length;
          
          citations.forEach((citation) => {
            if (citation.website) {
              const domain = citation.website.toLowerCase();
              uniqueSourcesSet.add(domain);
              sourceCounts[domain] = (sourceCounts[domain] || 0) + 1;
            }
          });
        }
      });
    }

    // Note: ExplorerData doesn't have a direct citations property
    // Citations are contained within webSearchResults

    return { citationCount };
  }

  private createTopItemsList(
    counts: Record<string, number>,
    limit: number
  ): ExplorerItemDto[] {
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  private deduplicateWebSearchResults(results: WebSearchResult[]): WebSearchResult[] {
    // Deduplicate by query to avoid duplicate entries
    const uniqueResults = new Map<string, WebSearchResult>();
    
    results.forEach(result => {
      if (result.query) {
        const existingResult = uniqueResults.get(result.query);
        if (!existingResult || 
            (result.citations && result.citations.length > (existingResult.citations?.length || 0))) {
          uniqueResults.set(result.query, result);
        }
      }
    });

    return Array.from(uniqueResults.values())
      .sort((a, b) => {
        // Sort by timestamp if available, otherwise by citation count
        if (a.timestamp && b.timestamp) {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        }
        return (b.citations?.length || 0) - (a.citations?.length || 0);
      });
  }

  private createEmptyExplorerResponse(): AggregatedExplorerResponseDto {
    return {
      summary: {
        totalPrompts: 0,
        promptsWithWebAccess: 0,
        webAccessPercentage: 0,
        totalCitations: 0,
        uniqueSources: 0
      },
      topKeywords: [],
      topSources: [],
      webSearchResults: [],
      reportCount: 0,
      dateRange: { start: '', end: '' }
    };
  }

  /**
   * Extract brand domain from website URL (without TLD)
   */
  private extractBrandDomain(website: string): string {
    try {
      const url = new URL(website);
      const hostname = url.hostname.replace('www.', '');
      // Extract domain name without TLD (e.g., "sfr" from "sfr.fr")
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        return parts[0]; // Return the first part before the TLD
      }
      return hostname;
    } catch {
      return '';
    }
  }

  /**
   * Check if a domain matches the brand domain
   */
  private isDomainMatch(domain: string, brandDomain: string): boolean {
    if (!domain || !brandDomain) return false;
    
    // Remove www. prefix if present
    const cleanDomain = domain.replace('www.', '');
    
    // Check if the domain contains the brand domain
    // This will match "sfr.fr", "sfr.com", "business.sfr.fr", etc.
    return cleanDomain.includes(brandDomain + '.');
  }
}