import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BrandReport, BrandReportDocument } from '../schemas/brand-report.schema';
import { AggregatedReportQueryDto } from '../dto/aggregated-report-query.dto';
import { 
  AggregatedVisibilityResponseDto,
  VisibilityChartDataDto,
  CompetitorDataDto,
  TopMentionDto,
  TopDomainDto
} from '../dto/aggregated-visibility-response.dto';
import { 
  ModelVisibilityItem,
  BrandReportVisibilitySelect,
  ArenaMetric
} from '../types/brand-report.types';
import { ExplorerData } from '../interfaces/report.interfaces';
import { BrandReportVariationCalculatorService } from './brand-report-variation-calculator.service';

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
  ) {}

  async getAggregatedVisibility(
    projectId: string,
    query: AggregatedReportQueryDto
  ): Promise<AggregatedVisibilityResponseDto> {
    const reports = await this.fetchReportsForAggregation(projectId, query);

    // Debug log to check what was fetched
    this.logger.debug(`[getAggregatedVisibility] Fetched ${reports.length} reports for project ${projectId}`);
    if (reports.length > 0) {
      this.logger.debug(`[getAggregatedVisibility] First report check:`, {
        hasVisibility: !!reports[0].visibility,
        visibilityKeys: reports[0].visibility ? Object.keys(reports[0].visibility) : [],
        hasTopMentions: !!reports[0].visibility?.topMentions,
        topMentionsLength: reports[0].visibility?.topMentions?.length || 0
      });
    }

    if (reports.length === 0) {
      return this.createEmptyVisibilityResponse();
    }

    const availableModels = this.extractAvailableModels(reports);
    const selectedModels = this.filterSelectedModels(query.models, availableModels);

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
      }
    };

    // Debug log the response
    this.logger.debug(`[getAggregatedVisibility] Returning response:`, {
      topMentionsCount: topMentions.length,
      topMentionsSample: topMentions.slice(0, 3),
      hasData: topMentions.length > 0
    });

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

    // Debug logging
    this.logger.debug(`[fetchReportsForAggregation] Fetched ${reports.length} reports`);
    if (reports.length > 0) {
      this.logger.debug(`[fetchReportsForAggregation] First report visibility structure:`, {
        hasVisibility: !!reports[0].visibility,
        hasTopMentions: !!reports[0].visibility?.topMentions,
        topMentionsLength: reports[0].visibility?.topMentions?.length || 0,
        topMentionsSample: reports[0].visibility?.topMentions?.slice(0, 2) || []
      });
    }

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
    reports: BrandReportVisibilitySelect[],
    selectedModels: string[]
  ) {
    let totalScore = 0;
    let scoreCount = 0;
    const competitorMap: Record<string, { scores: number[]; dates: string[] }> = {};
    const chartData: VisibilityChartDataDto[] = [];
    const modelScores: Record<string, { total: number; count: number }> = {};
    const mentionTracker: Map<string, { displayName: string; count: number }> = new Map();
    const domainTracker: Map<string, number> = new Map();

    reports.forEach(report => {
      const visData = report.visibility;
      if (!visData) return;

      this.trackMentions(visData, mentionTracker, selectedModels);
      this.trackDomains(visData, domainTracker, selectedModels);

      const reportResult = this.processReportVisibility(
        visData,
        selectedModels,
        modelScores
      );

      if (reportResult.modelCount > 0) {
        const avgScore = reportResult.score / reportResult.modelCount;
        totalScore += avgScore;
        scoreCount++;

        const dataPoint = this.createChartDataPoint(
          report.reportDate,
          avgScore,
          visData,
          competitorMap
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
      domainTracker
    };
  }

  private trackMentions(
    visData: any,
    mentionTracker: Map<string, { displayName: string; count: number }>,
    selectedModels?: string[]
  ): void {
    // Debug logging
    this.logger.debug(`[trackMentions] Processing visibility data:`, {
      hasTopMentions: !!visData.topMentions,
      topMentionsLength: visData.topMentions?.length || 0,
      hasDetailedResults: !!visData.detailedResults,
      detailedResultsLength: visData.detailedResults?.length || 0,
      selectedModels: selectedModels || 'all'
    });

    // Use detailedResults for model-specific filtering if available and models are selected
    if (selectedModels && selectedModels.length > 0 && visData.detailedResults) {
      this.logger.debug(`[trackMentions] Using detailedResults for model filtering`);
      
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
      this.logger.debug(`[trackMentions] Using aggregated topMentions`);
      
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

    // Debug log final state
    this.logger.debug(`[trackMentions] Mention tracker state:`, {
      trackerSize: mentionTracker.size,
      trackerEntries: Array.from(mentionTracker.entries()).slice(0, 5)
    });
  }

  private trackDomains(
    visData: any,
    domainTracker: Map<string, number>,
    selectedModels?: string[]
  ): void {
    // Debug logging
    this.logger.debug(`[trackDomains] Processing visibility data:`, {
      hasTopDomains: !!visData.topDomains,
      topDomainsLength: visData.topDomains?.length || 0,
      hasDetailedResults: !!visData.detailedResults,
      detailedResultsLength: visData.detailedResults?.length || 0,
      selectedModels: selectedModels || 'all'
    });

    // Use detailedResults for model-specific filtering if available and models are selected
    if (selectedModels && selectedModels.length > 0 && visData.detailedResults) {
      this.logger.debug(`[trackDomains] Using detailedResults for model filtering`);
      
      visData.detailedResults.forEach((result: any) => {
        // Only process results from selected models
        if (selectedModels.includes(result.model) && result.citations) {
          result.citations.forEach((citation: any) => {
            if (citation.url) {
              try {
                const url = new URL(citation.url);
                const domain = url.hostname.toLowerCase();
                const currentCount = domainTracker.get(domain) || 0;
                domainTracker.set(domain, currentCount + 1);
              } catch (error) {
                // Invalid URL, skip
                this.logger.debug(`[trackDomains] Invalid URL skipped: ${citation.url}`);
              }
            }
          });
        }
      });
    } else {
      // Fallback to aggregated topDomains if no model filtering or no detailedResults
      this.logger.debug(`[trackDomains] Using aggregated topDomains`);
      
      if (visData.topDomains && Array.isArray(visData.topDomains)) {
        visData.topDomains.forEach((domainItem: any) => {
          if (domainItem.domain && domainItem.count) {
            const currentCount = domainTracker.get(domainItem.domain) || 0;
            domainTracker.set(domainItem.domain, currentCount + domainItem.count);
          }
        });
      }
    }

    // Debug log final state
    this.logger.debug(`[trackDomains] Domain tracker state:`, {
      trackerSize: domainTracker.size,
      trackerEntries: Array.from(domainTracker.entries()).slice(0, 5)
    });
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
    competitorMap: Record<string, { scores: number[]; dates: string[] }>
  ): VisibilityChartDataDto {
    const dataPoint: VisibilityChartDataDto = {
      date: new Date(reportDate).toISOString().split('T')[0],
      brand: Math.round(avgScore),
      competitors: {}
    };

    if (visData.arenaMetrics && Array.isArray(visData.arenaMetrics)) {
      visData.arenaMetrics.forEach((competitor: ArenaMetric) => {
        if (competitor.name && competitor.global) {
          const globalScore = parseInt(competitor.global.replace('%', ''), 10);
          
          if (!competitorMap[competitor.name]) {
            competitorMap[competitor.name] = { scores: [], dates: [] };
          }
          competitorMap[competitor.name].scores.push(globalScore);
          competitorMap[competitor.name].dates.push(reportDate.toISOString());
          
          dataPoint.competitors[competitor.name] = globalScore;
        }
      });
    }

    return dataPoint;
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
          name
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
    // Debug logging
    this.logger.debug(`[processTopMentions] Processing mentions:`, {
      trackerSize: mentionTracker.size,
      trackerSample: Array.from(mentionTracker.entries()).slice(0, 3)
    });

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

    // Debug log result
    this.logger.debug(`[processTopMentions] Returning top mentions:`, {
      resultLength: result.length,
      totalMentions,
      topMentions: result.slice(0, 3)
    });

    return result;
  }

  private processTopDomains(
    domainTracker: Map<string, number>
  ): TopDomainDto[] {
    const domainEntries = Array.from(domainTracker.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    const totalCitations = domainEntries.reduce((sum, item) => sum + item.count, 0);
    
    return domainEntries.map(item => ({
      domain: item.domain,
      count: item.count,
      percentage: totalCitations > 0 ? Math.round((item.count / totalCitations) * 100 * 10) / 10 : 0 // Round to 1 decimal
    }));
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
      dateRange: { start: '', end: '' }
    };
  }
}