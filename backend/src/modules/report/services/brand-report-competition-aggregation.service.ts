import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BrandReport, BrandReportDocument } from '../schemas/brand-report.schema';
import { AggregatedReportQueryDto } from '../dto/aggregated-report-query.dto';
import { 
  AggregatedCompetitionResponseDto,
  CompetitorInsightDto,
  CompetitionChartDataDto
} from '../dto/aggregated-competition-response.dto';
import { DetailedCompetitionResult } from '../types/competition.types';
import { CitationItemDto } from '../dto/citation-item.dto';
import { BrandReportCitationExtractorService } from './brand-report-citation-extractor.service';

/**
 * Service for aggregating competition data across multiple reports
 * Handles competitor analysis and comparative insights
 */
@Injectable()
export class BrandReportCompetitionAggregationService {
  private readonly logger = new Logger(BrandReportCompetitionAggregationService.name);

  constructor(
    @InjectModel(BrandReport.name)
    private brandReportModel: Model<BrandReportDocument>,
    private citationExtractor: BrandReportCitationExtractorService,
  ) {}

  async getAggregatedCompetition(
    projectId: string,
    query: AggregatedReportQueryDto
  ): Promise<AggregatedCompetitionResponseDto> {
    const reports = await this.fetchReportsForAggregation(projectId, query);

    if (reports.length === 0) {
      return this.createEmptyCompetitionResponse();
    }

    const brandName = reports[0].brandName || 'Brand';
    const aggregationResult = this.aggregateCompetitionData(reports);

    const selectedModels = this.filterSelectedModels(
      query.models,
      aggregationResult.availableModels
    );

    const filteredCitations = this.filterCitationsByModels(
      aggregationResult.citations,
      selectedModels
    );

    const competitorInsights = this.buildCompetitorInsights(
      aggregationResult.competitorStrengths,
      aggregationResult.competitorWeaknesses
    );

    const commonStrengths = this.findCommonItems(
      Object.values(aggregationResult.competitorStrengths)
    );
    const commonWeaknesses = this.findCommonItems(
      Object.values(aggregationResult.competitorWeaknesses)
    );

    return {
      brandName,
      competitors: aggregationResult.competitors,
      availableModels: aggregationResult.availableModels,
      competitorInsights,
      commonStrengths,
      commonWeaknesses,
      chartData: aggregationResult.chartData,
      reportCount: reports.length,
      dateRange: {
        start: reports[0].reportDate.toISOString(),
        end: reports[reports.length - 1].reportDate.toISOString()
      },
      citations: filteredCitations.length > 0 ? {
        items: filteredCitations,
        uniqueDomains: new Set(filteredCitations.map(c => c.domain)).size,
        totalCitations: filteredCitations.reduce((sum, c) => sum + c.count, 0)
      } : undefined
    };
  }

  private async fetchReportsForAggregation(
    projectId: string,
    query: AggregatedReportQueryDto
  ): Promise<Array<{
    id: string;
    reportDate: Date;
    generatedAt: Date;
    competition: any;
    brandName: string;
  }>> {
    if (query.latestOnly) {
      const latestReport = await this.brandReportModel
        .findOne({ projectId })
        .select('id reportDate generatedAt competition brandName')
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
      .select('id reportDate generatedAt competition brandName')
      .sort({ reportDate: -1 })
      .limit(10)
      .lean();
  }

  private aggregateCompetitionData(reports: any[]) {
    const allCompetitors = new Set<string>();
    const allModels = new Set<string>();
    const chartData: CompetitionChartDataDto[] = [];
    const competitorStrengths: Record<string, string[]> = {};
    const competitorWeaknesses: Record<string, string[]> = {};
    const detailedResults: DetailedCompetitionResult[] = [];

    reports.forEach(report => {
      if (!report.competition) return;

      // Extract competitors
      if (report.competition.competitors) {
        report.competition.competitors.forEach((comp: string) => {
          allCompetitors.add(comp);
        });
      }

      // Process detailed results
      if (report.competition.detailedResults) {
        report.competition.detailedResults.forEach((result: DetailedCompetitionResult) => {
          allModels.add(result.model);
          detailedResults.push(result);

          // Aggregate strengths and weaknesses
          if (!competitorStrengths[result.competitor]) {
            competitorStrengths[result.competitor] = [];
            competitorWeaknesses[result.competitor] = [];
          }

          if (result.brandStrengths) {
            competitorStrengths[result.competitor].push(...result.brandStrengths);
          }

          if (result.brandWeaknesses) {
            competitorWeaknesses[result.competitor].push(...result.brandWeaknesses);
          }
        });
      }

      // Build chart data
      const competitorCounts = this.buildCompetitorCounts(report.competition);
      chartData.push({
        date: report.reportDate.toISOString(),
        competitors: competitorCounts,
        reportId: report.id
      });
    });

    const citations = detailedResults.length > 0 
      ? this.citationExtractor.extractCitationsFromCompetition(detailedResults)
      : { items: [], uniqueDomains: 0, totalCitations: 0 };

    return {
      competitors: Array.from(allCompetitors),
      availableModels: Array.from(allModels).sort(),
      competitorStrengths,
      competitorWeaknesses,
      chartData,
      citations: citations.items
    };
  }

  private buildCompetitorCounts(
    competition: any
  ): Record<string, { strengthsCount: number; weaknessesCount: number }> {
    const competitorCounts: Record<string, { strengthsCount: number; weaknessesCount: number }> = {};

    competition.competitorAnalyses?.forEach((analysis: any) => {
      let strengthsCount = 0;
      let weaknessesCount = 0;

      analysis.analysisByModel?.forEach((modelAnalysis: any) => {
        strengthsCount += modelAnalysis.strengths?.length || 0;
        weaknessesCount += modelAnalysis.weaknesses?.length || 0;
      });

      competitorCounts[analysis.competitor] = { strengthsCount, weaknessesCount };
    });

    return competitorCounts;
  }

  private filterSelectedModels(
    requestedModels: string[] | undefined,
    availableModels: string[]
  ): string[] {
    return requestedModels && requestedModels.length > 0
      ? requestedModels.filter(m => availableModels.includes(m))
      : availableModels;
  }

  private filterCitationsByModels(
    citations: CitationItemDto[],
    selectedModels: string[]
  ): CitationItemDto[] {
    return citations.filter(citation =>
      citation.models.some(model => selectedModels.includes(model))
    );
  }

  private buildCompetitorInsights(
    competitorStrengths: Record<string, string[]>,
    competitorWeaknesses: Record<string, string[]>
  ): CompetitorInsightDto[] {
    const competitors = new Set([
      ...Object.keys(competitorStrengths),
      ...Object.keys(competitorWeaknesses)
    ]);

    return Array.from(competitors).map(competitor => {
      const strengths = competitorStrengths[competitor] || [];
      const weaknesses = competitorWeaknesses[competitor] || [];

      // Count occurrences with case-insensitive normalization
      const strengthCounts = this.countOccurrences(strengths);
      const weaknessCounts = this.countOccurrences(weaknesses);

      // Get top 5 of each
      const topStrengths = this.getTopItems(strengthCounts, 5);
      const topWeaknesses = this.getTopItems(weaknessCounts, 5);

      return {
        competitor,
        strengthsCount: strengths.length,
        weaknessesCount: weaknesses.length,
        topStrengths,
        topWeaknesses
      };
    });
  }

  private countOccurrences(items: string[]): Record<string, number> {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      const normalized = item.toLowerCase().trim();
      counts[normalized] = (counts[normalized] || 0) + 1;
    });
    return counts;
  }

  private getTopItems(counts: Record<string, number>, limit: number): string[] {
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([item]) => item);
  }

  private findCommonItems(itemArrays: string[][]): string[] {
    if (itemArrays.length === 0) return [];

    // Count occurrences across all arrays
    const overallCounts: Record<string, number> = {};
    const arrayCount = itemArrays.length;

    itemArrays.forEach(items => {
      const uniqueItems = new Set(items.map(item => item.toLowerCase().trim()));
      uniqueItems.forEach(item => {
        overallCounts[item] = (overallCounts[item] || 0) + 1;
      });
    });

    // Find items that appear in at least half of the arrays
    const threshold = Math.floor(arrayCount / 2);
    return Object.entries(overallCounts)
      .filter(([_, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([item]) => item);
  }

  private createEmptyCompetitionResponse(): AggregatedCompetitionResponseDto {
    return {
      brandName: '',
      competitors: [],
      availableModels: [],
      competitorInsights: [],
      commonStrengths: [],
      commonWeaknesses: [],
      chartData: [],
      reportCount: 0,
      dateRange: { start: '', end: '' }
    };
  }
}