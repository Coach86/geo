import { Injectable, Logger } from '@nestjs/common';
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
  ) {}

  async getAggregatedExplorer(
    projectId: string,
    query: AggregatedReportQueryDto
  ): Promise<AggregatedExplorerResponseDto> {
    const reports = await this.fetchReportsForAggregation(projectId, query);

    if (reports.length === 0) {
      return this.createEmptyExplorerResponse();
    }

    const aggregationResult = this.aggregateExplorerData(reports);

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

  private aggregateExplorerData(reports: BrandReportExplorerSelect[]) {
    const keywordCounts: Record<string, number> = {};
    const sourceCounts: Record<string, number> = {};
    const allWebSearchResults: WebSearchResult[] = [];
    const uniqueSourcesSet = new Set<string>();
    
    let totalPrompts = 0;
    let promptsWithWebAccess = 0;
    let actualCitationCount = 0;
    
    // Domain source analysis aggregation
    let totalBrandDomainCount = 0;
    let totalOtherSourcesCount = 0;

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
        }
      );

      // Aggregate keywords
      this.aggregateKeywords(explorerData, keywordCounts);

      // Aggregate sources
      this.aggregateSources(explorerData, sourceCounts, uniqueSourcesSet);

      // Process web search results and citations
      const citationResult = this.processCitations(
        explorerData,
        sourceCounts,
        uniqueSourcesSet
      );
      actualCitationCount += citationResult.citationCount;

      if (explorerData.webSearchResults) {
        allWebSearchResults.push(...explorerData.webSearchResults);
      }
      
      // Aggregate domain source analysis
      if (explorerData.domainSourceAnalysis) {
        totalBrandDomainCount += explorerData.domainSourceAnalysis.brandDomainCount || 0;
        totalOtherSourcesCount += explorerData.domainSourceAnalysis.otherSourcesCount || 0;
      }
    });

    // Convert aggregated data to sorted arrays
    const topKeywords = this.createTopItemsList(keywordCounts, 10);
    const topSources = this.createTopItemsList(sourceCounts, 10);
    
    // Calculate aggregated domain source percentages
    const totalDomainCounts = totalBrandDomainCount + totalOtherSourcesCount;
    const domainSourceAnalysis = totalDomainCounts > 0 ? {
      brandDomainPercentage: Math.round((totalBrandDomainCount / totalDomainCounts) * 1000) / 10,
      otherSourcesPercentage: Math.round((totalOtherSourcesCount / totalDomainCounts) * 1000) / 10,
      brandDomainCount: totalBrandDomainCount,
      otherSourcesCount: totalOtherSourcesCount,
    } : undefined;

    return {
      totalPrompts,
      promptsWithWebAccess,
      actualCitationCount,
      uniqueSourcesCount: uniqueSourcesSet.size,
      topKeywords,
      topSources,
      allWebSearchResults: this.deduplicateWebSearchResults(allWebSearchResults),
      domainSourceAnalysis
    };
  }

  private aggregateSummaryData(
    explorerData: ExplorerData,
    currentData: { totalPrompts: number; promptsWithWebAccess: number },
    updateCallback: (data: { totalPrompts: number; promptsWithWebAccess: number }) => void
  ): void {
    if (explorerData.summary) {
      currentData.totalPrompts += explorerData.summary.totalPrompts || 0;
      currentData.promptsWithWebAccess += explorerData.summary.promptsWithWebAccess || 0;
      updateCallback(currentData);
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
    uniqueSourcesSet: Set<string>
  ): { citationCount: number } {
    let citationCount = 0;

    // Process web search results
    if (explorerData.webSearchResults && Array.isArray(explorerData.webSearchResults)) {
      explorerData.webSearchResults.forEach(searchResult => {
        if (searchResult.citations && Array.isArray(searchResult.citations)) {
          citationCount += searchResult.citations.length;
          
          searchResult.citations.forEach((citation) => {
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
}