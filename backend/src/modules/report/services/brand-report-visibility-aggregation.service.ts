import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BrandReport, BrandReportDocument } from '../schemas/brand-report.schema';
import { AggregatedReportQueryDto } from '../dto/aggregated-report-query.dto';
import { 
  AggregatedVisibilityResponseDto,
  VisibilityChartDataDto,
  CompetitorDataDto,
  TopMentionDto,
  TopDomainDto,
  DomainSourceAnalysisDto
} from '../dto/aggregated-visibility-response.dto';
import { 
  ModelVisibilityItem,
  BrandReportVisibilitySelect,
  ArenaMetric
} from '../types/brand-report.types';
import { ExplorerData } from '../interfaces/report.interfaces';
import { BrandReportVariationCalculatorService } from './brand-report-variation-calculator.service';
import { ProjectService } from '../../project/services/project.service';

/**
 * Service for aggregating visibility data across multiple reports
 * Handles visibility metrics, competitor analysis, and mention tracking
 */
@Injectable()
export class BrandReportVisibilityAggregationService {
  private readonly logger = new Logger(BrandReportVisibilityAggregationService.name);

  constructor(
    @InjectModel(BrandReport.name)
    private brandReportModel: Model<BrandReportDocument>,
    private variationCalculator: BrandReportVariationCalculatorService,
    @Inject(forwardRef(() => ProjectService))
    private projectService: ProjectService,
  ) {}

  async getAggregatedVisibility(
    projectId: string,
    query: AggregatedReportQueryDto
  ): Promise<AggregatedVisibilityResponseDto> {
    const reports = await this.fetchReportsForAggregation(projectId, query);


    if (reports.length === 0) {
      return this.createEmptyVisibilityResponse();
    }

    const availableModels = this.extractAvailableModels(reports);
    const selectedModels = this.filterSelectedModels(query.models, availableModels);

    // Get project information for domain classification
    const project = await this.projectService.findById(projectId);
    

    const aggregationResult = this.aggregateVisibilityData(reports, selectedModels);
    
    let scoreVariation = 0;
    if (query.includeVariation) {
      scoreVariation = await this.variationCalculator.calculateVariation(
        projectId,
        query,
        selectedModels,
        'visibility'
      );
    }

    const competitors = await this.processCompetitors(
      aggregationResult.competitorMap,
      projectId,
      query
    );

    const topMentions = this.processTopMentions(aggregationResult.mentionTracker);
    const topDomains = this.processTopDomains(aggregationResult.domainTracker);
    
    // Calculate domain source analysis for visibility citations only
    const domainSourceAnalysis = this.calculateDomainSourceAnalysis(
      aggregationResult.domainTracker,
      project?.website,
      project?.competitorDetails
    );

    // Collect all detailedResults from reports
    interface DetailedResult {
      model: string;
      promptIndex: number;
      brandMentioned: boolean;
      extractedCompanies: string[];
      originalPrompt: string;
      llmResponse: string;
      usedWebSearch: boolean;
      citations: any[];
      toolUsage: any[];
      queries?: string[];
    }
    
    const detailedResults: DetailedResult[] = [];
    reports.forEach(report => {
      if (report.visibility?.detailedResults) {
        report.visibility.detailedResults.forEach((result: DetailedResult) => {
          // Apply model filter if specified
          if (!selectedModels || selectedModels.length === 0 || selectedModels.includes(result.model)) {
            detailedResults.push(result);
          }
        });
      }
    });

    const response = {
      averageScore: aggregationResult.averageScore,
      scoreVariation,
      availableModels,
      chartData: aggregationResult.chartData,
      modelBreakdown: aggregationResult.modelBreakdown,
      competitors,
      topMentions,
      topDomains,
      reportCount: reports.length,
      dateRange: {
        start: reports[0].reportDate.toISOString(),
        end: reports[reports.length - 1].reportDate.toISOString()
      },
      totalPromptsTested: aggregationResult.totalPromptsTested || 0,
      domainSourceAnalysis,
      detailedResults
    };


    return response;
  }

  private async fetchReportsForAggregation(
    projectId: string,
    query: AggregatedReportQueryDto
  ): Promise<(BrandReportVisibilitySelect & { explorer?: ExplorerData })[]> {
    if (query.latestOnly) {
      const latestReport = await this.brandReportModel
        .findOne({ projectId })
        .select('id reportDate generatedAt visibility explorer')
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

    const reports = await this.brandReportModel
      .find(dateFilter)
      .select('id reportDate generatedAt visibility explorer')
      .sort({ reportDate: -1 })
      .limit(10)
      .lean();


    return reports;
  }

  private extractAvailableModels(reports: BrandReportVisibilitySelect[]): string[] {
    const allModels = new Set<string>();
    reports.forEach(report => {
      if (report.visibility?.modelVisibility) {
        report.visibility.modelVisibility.forEach((mv: ModelVisibilityItem) => {
          allModels.add(mv.model);
        });
      }
    });
    return Array.from(allModels).sort();
  }

  private filterSelectedModels(requestedModels: string[] | undefined, availableModels: string[]): string[] {
    return requestedModels && requestedModels.length > 0
      ? requestedModels.filter(m => availableModels.includes(m))
      : availableModels;
  }

  private aggregateVisibilityData(
    reports: (BrandReportVisibilitySelect & { explorer?: ExplorerData })[],
    selectedModels: string[]
  ) {
    let totalScore = 0;
    let scoreCount = 0;
    let totalPromptsTested = 0;
    const competitorMap: Record<string, { scores: number[]; dates: string[] }> = {};
    const chartData: VisibilityChartDataDto[] = [];
    const modelScores: Record<string, { total: number; count: number }> = {};
    const mentionTracker: Map<string, { displayName: string; count: number }> = new Map();
    const domainTracker: Map<string, number> = new Map();

    reports.forEach(report => {
      const visData = report.visibility;
      if (!visData) return;

      this.trackMentions(visData, mentionTracker, selectedModels);
      
      this.trackDomains(visData, domainTracker, selectedModels, report.explorer);

      const reportResult = this.processReportVisibility(
        visData,
        selectedModels,
        modelScores
      );

      // Count prompts tested based on selected models
      if (selectedModels && selectedModels.length > 0 && visData.detailedResults) {
        // Count only prompts from selected models
        const promptsInReport = visData.detailedResults.filter((result: any) => 
          selectedModels.includes(result.model)
        ).length;
        totalPromptsTested += promptsInReport;
      } else if (visData.promptsTested) {
        // Use pre-aggregated count when no model filter
        totalPromptsTested += visData.promptsTested;
      } else if (visData.detailedResults) {
        // Fallback to counting all detailed results
        totalPromptsTested += visData.detailedResults.length;
      }

      if (reportResult.modelCount > 0) {
        const avgScore = reportResult.score / reportResult.modelCount;
        totalScore += avgScore;
        scoreCount++;

        const dataPoint = this.createChartDataPoint(
          report.reportDate,
          avgScore,
          visData,
          competitorMap,
          selectedModels
        );
        chartData.push(dataPoint);
      }
    });

    const averageScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;

    const modelBreakdown = Object.entries(modelScores).map(([model, data]) => ({
      model,
      score: Math.round(data.total / data.count),
      variation: 0
    }));

    return {
      averageScore,
      chartData,
      modelBreakdown,
      competitorMap,
      mentionTracker,
      domainTracker,
      totalPromptsTested
    };
  }

  private trackMentions(
    visData: any,
    mentionTracker: Map<string, { displayName: string; count: number }>,
    selectedModels?: string[]
  ): void {

    // Use detailedResults for model-specific filtering if available and models are selected
    if (selectedModels && selectedModels.length > 0 && visData.detailedResults && visData.detailedResults.length > 0) {
      
      visData.detailedResults.forEach((result: any) => {
        // Only process results from selected models
        if (selectedModels.includes(result.model) && result.extractedCompanies) {
          result.extractedCompanies.forEach((company: string) => {
            if (company && company.trim()) {
              const normalizedMention = company.toLowerCase().trim();
              
              if (!mentionTracker.has(normalizedMention)) {
                mentionTracker.set(normalizedMention, {
                  displayName: company,
                  count: 0
                });
              }
              
              const tracker = mentionTracker.get(normalizedMention)!;
              tracker.count += 1; // Each mention from detailedResults counts as 1
            }
          });
        }
      });
    } else {
      // Fallback to aggregated topMentions if no model filtering or no detailedResults
      
      if (visData.topMentions) {
        visData.topMentions.forEach((mentionItem: any) => {
          if (mentionItem.mention && mentionItem.count) {
            const normalizedMention = mentionItem.mention.toLowerCase().trim();
            
            if (!mentionTracker.has(normalizedMention)) {
              mentionTracker.set(normalizedMention, {
                displayName: mentionItem.mention,
                count: 0
              });
            }
            
            const tracker = mentionTracker.get(normalizedMention)!;
            tracker.count += mentionItem.count;
          }
        });
      }
    }

  }

  private trackDomains(
    visData: any,
    domainTracker: Map<string, number>,
    selectedModels?: string[],
    explorerData?: ExplorerData
  ): void {

    // Use explorer data if available - it has citations with promptType
    if (explorerData?.webSearchResults && explorerData.webSearchResults.length > 0) {
      
      explorerData.webSearchResults.forEach((searchResult: any) => {
        if (searchResult.citations && Array.isArray(searchResult.citations)) {
          searchResult.citations.forEach((citation: any) => {
            // Only count citations from visibility prompts
            if (citation.promptType === 'visibility' && citation.website) {
              // Filter by selected models if provided
              if (!selectedModels || selectedModels.length === 0 || selectedModels.includes(citation.model)) {
                const domain = citation.website.toLowerCase();
                const currentCount = domainTracker.get(domain) || 0;
                domainTracker.set(domain, currentCount + 1);
              }
            }
          });
        }
      });
    } else if (visData.detailedResults && visData.detailedResults.length > 0) {
      // Fallback to detailedResults if no explorer data
      
      visData.detailedResults.forEach((result: any) => {
        // Filter by selected models - all detailedResults in visibility are visibility prompts
        if (!selectedModels || selectedModels.length === 0 || selectedModels.includes(result.model)) {
          if (result.citations) {
            result.citations.forEach((citation: any) => {
              // Process visibility citations from detailedResults
              if (citation.url) {
                try {
                  const url = new URL(citation.url);
                  const domain = url.hostname.toLowerCase();
                  const currentCount = domainTracker.get(domain) || 0;
                  domainTracker.set(domain, currentCount + 1);
                } catch (error) {
                  // Invalid URL, skip
                }
              }
            });
          }
        }
      });
    } else {
      // Fallback to aggregated topDomains if no model filtering or no detailedResults
      
      if (visData.topDomains && Array.isArray(visData.topDomains)) {
        visData.topDomains.forEach((domainItem: any) => {
          if (domainItem.domain && domainItem.count) {
            const currentCount = domainTracker.get(domainItem.domain) || 0;
            domainTracker.set(domainItem.domain, currentCount + domainItem.count);
          }
        });
      }
    }

  }

  private processReportVisibility(
    visData: any,
    selectedModels: string[],
    modelScores: Record<string, { total: number; count: number }>
  ): { score: number; modelCount: number } {
    let reportScore = 0;
    let reportModelCount = 0;

    if (visData.modelVisibility) {
      const filteredModels = visData.modelVisibility.filter((mv: ModelVisibilityItem) =>
        selectedModels.includes(mv.model)
      );

      filteredModels.forEach((mv: ModelVisibilityItem) => {
        reportScore += mv.mentionRate;
        reportModelCount++;

        if (!modelScores[mv.model]) {
          modelScores[mv.model] = { total: 0, count: 0 };
        }
        modelScores[mv.model].total += mv.mentionRate;
        modelScores[mv.model].count++;
      });
    }

    return { score: reportScore, modelCount: reportModelCount };
  }

  private createChartDataPoint(
    reportDate: Date,
    avgScore: number,
    visData: any,
    competitorMap: Record<string, { scores: number[]; dates: string[] }>,
    selectedModels?: string[]
  ): VisibilityChartDataDto {
    const dataPoint: VisibilityChartDataDto = {
      date: new Date(reportDate).toISOString().split('T')[0],
      brand: Math.round(avgScore),
      competitors: {}
    };

    if (visData.arenaMetrics && Array.isArray(visData.arenaMetrics)) {
      visData.arenaMetrics.forEach((competitor: ArenaMetric) => {
        if (competitor.name) {
          let competitorScore: number;
          
          // If models are selected, calculate filtered score
          if (selectedModels && selectedModels.length > 0 && competitor.modelsMentionsRate) {
            competitorScore = this.calculateFilteredCompetitorScore(
              competitor.modelsMentionsRate,
              selectedModels
            );
          } else {
            // Otherwise use the global score
            competitorScore = parseInt(competitor.global.replace('%', ''), 10);
          }
          
          if (!competitorMap[competitor.name]) {
            competitorMap[competitor.name] = { scores: [], dates: [] };
          }
          competitorMap[competitor.name].scores.push(competitorScore);
          competitorMap[competitor.name].dates.push(reportDate.toISOString());
          
          dataPoint.competitors[competitor.name] = competitorScore;
        }
      });
    }

    return dataPoint;
  }

  private calculateFilteredCompetitorScore(
    modelsMentionsRate: Array<{ model: string; mentionsRate: number }>,
    selectedModels: string[]
  ): number {
    const filteredRates = modelsMentionsRate.filter(mmr => 
      selectedModels.includes(mmr.model)
    );
    
    if (filteredRates.length === 0) return 0;
    
    const totalRate = filteredRates.reduce((sum, mmr) => sum + (mmr.mentionsRate || 0), 0);
    return Math.round(totalRate / filteredRates.length);
  }

  private async processCompetitors(
    competitorMap: Record<string, { scores: number[]; dates: string[] }>,
    projectId: string,
    query: AggregatedReportQueryDto
  ): Promise<CompetitorDataDto[]> {
    const competitors: CompetitorDataDto[] = [];

    for (const [name, data] of Object.entries(competitorMap)) {
      const avgScore = data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length;
      
      let variation = 0;
      if (query.includeVariation) {
        variation = await this.variationCalculator.calculateCompetitorVariation(
          projectId,
          query,
          name,
          query.models
        );
      }

      competitors.push({
        name,
        averageScore: Math.round(avgScore),
        variation
      });
    }

    return competitors;
  }

  private processTopMentions(
    mentionTracker: Map<string, { displayName: string; count: number }>
  ): TopMentionDto[] {

    const mentionEntries = Array.from(mentionTracker.entries())
      .map(([_, data]) => ({
        mention: data.displayName,
        count: data.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    const totalMentions = mentionEntries.reduce((sum, item) => sum + item.count, 0);
    
    const result = mentionEntries.map(item => ({
      mention: item.mention,
      count: item.count,
      percentage: totalMentions > 0 ? Math.round((item.count / totalMentions) * 100) : 0
    }));


    return result;
  }

  private processTopDomains(
    domainTracker: Map<string, number>
  ): TopDomainDto[] {
    const allDomainEntries = Array.from(domainTracker.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count);
    
    // Get top 9 domains
    const topNineDomains = allDomainEntries.slice(0, 9);
    
    // Calculate "Others" count - sum of all domains beyond the top 9
    const othersCount = allDomainEntries
      .slice(9)
      .reduce((sum, item) => sum + item.count, 0);
    
    // Include "Others" only if there are domains beyond the top 9
    const finalDomains = [...topNineDomains];
    if (othersCount > 0) {
      finalDomains.push({ domain: 'Others', count: othersCount });
    }
    
    // Calculate total citations for percentage calculation
    const totalCitations = allDomainEntries.reduce((sum, item) => sum + item.count, 0);
    
    return finalDomains.map(item => ({
      domain: item.domain,
      count: item.count,
      percentage: totalCitations > 0 ? Math.round((item.count / totalCitations) * 100 * 10) / 10 : 0 // Round to 1 decimal
    }));
  }

  private calculateDomainSourceAnalysis(
    domainTracker: Map<string, number>,
    projectWebsite?: string,
    competitorDetails?: Array<{ name: string; website?: string }>
  ): DomainSourceAnalysisDto | undefined {
    if (domainTracker.size === 0) {
      return undefined;
    }

    let brandDomainCount = 0;
    let otherSourcesCount = 0;
    let unknownSourcesCount = 0;
    const competitorCounts: Record<string, number> = {};

    // Extract brand domain
    const brandDomain = projectWebsite ? this.extractBrandDomain(projectWebsite) : null;
    
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

    // Classify each domain
    domainTracker.forEach((count, domain) => {
      if (brandDomain && this.isDomainMatch(domain, brandDomain)) {
        brandDomainCount += count;
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
          unknownSourcesCount += count;
        }
        
        otherSourcesCount += count;
      }
    });

    const totalCitations = brandDomainCount + otherSourcesCount;
    
    if (totalCitations === 0) {
      return undefined;
    }

    // Create competitor breakdown
    const competitorBreakdown = Object.entries(competitorCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / totalCitations) * 1000) / 10
      }))
      .sort((a, b) => b.count - a.count);

    return {
      brandDomainPercentage: Math.round((brandDomainCount / totalCitations) * 1000) / 10,
      otherSourcesPercentage: Math.round((otherSourcesCount / totalCitations) * 1000) / 10,
      brandDomainCount,
      otherSourcesCount,
      competitorBreakdown: competitorBreakdown.length > 0 ? competitorBreakdown : undefined,
      unknownSourcesCount,
      unknownSourcesPercentage: Math.round((unknownSourcesCount / totalCitations) * 1000) / 10
    };
  }

  private extractBrandDomain(website: string): string | null {
    try {
      // Handle URLs with or without protocol
      let url = website;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      const parsed = new URL(url);
      // Remove 'www.' prefix if present
      return parsed.hostname.toLowerCase().replace(/^www\./, '');
    } catch (error) {
      // If URL parsing fails, try to extract domain manually
      const domain = website.toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0];
      
      return domain || null;
    }
  }

  private isDomainMatch(domain1: string, domain2: string): boolean {
    // Normalize domains for comparison
    const normalize = (d: string) => d.toLowerCase().replace(/^www\./, '');
    return normalize(domain1) === normalize(domain2);
  }

  private createEmptyVisibilityResponse(): AggregatedVisibilityResponseDto {
    return {
      averageScore: 0,
      scoreVariation: 0,
      availableModels: [],
      chartData: [],
      modelBreakdown: [],
      competitors: [],
      topMentions: [],
      topDomains: [],
      reportCount: 0,
      dateRange: { start: '', end: '' },
      totalPromptsTested: 0,
      domainSourceAnalysis: undefined
    };
  }
}