import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BrandReport, BrandReportDocument } from '../schemas/brand-report.schema';
import { AggregatedReportQueryDto } from '../dto/aggregated-report-query.dto';
import { 
  AggregatedAlignmentResponseDto,
  AlignmentChartDataDto,
  AttributeScoreDto
} from '../dto/aggregated-alignment-response.dto';
import { 
  DetailedAlignmentResult,
  AttributeScore,
  BrandReportAlignmentSelect
} from '../types/brand-report.types';
import { Citation } from '../types/citation.types';
import { CitationItemDto } from '../dto/citation-item.dto';
import { BrandReportVariationCalculatorService } from './brand-report-variation-calculator.service';
import { BrandReportCitationExtractorService } from './brand-report-citation-extractor.service';

/**
 * Service for aggregating alignment data across multiple reports
 * Handles attribute scores and alignment metrics
 */
@Injectable()
export class BrandReportAlignmentAggregationService {
  private readonly logger = new Logger(BrandReportAlignmentAggregationService.name);

  constructor(
    @InjectModel(BrandReport.name)
    private brandReportModel: Model<BrandReportDocument>,
    private variationCalculator: BrandReportVariationCalculatorService,
    private citationExtractor: BrandReportCitationExtractorService,
  ) {}

  async getAggregatedAlignment(
    projectId: string,
    query: AggregatedReportQueryDto
  ): Promise<AggregatedAlignmentResponseDto> {
    const reports = await this.fetchReportsForAggregation(projectId, query);

    if (reports.length === 0) {
      return this.createEmptyAlignmentResponse();
    }

    const { availableModels, allAttributes } = this.extractModelsAndAttributes(reports);
    const selectedModels = this.filterSelectedModels(query.models, availableModels);

    const aggregationResult = this.aggregateAlignmentData(reports, selectedModels);

    let scoreVariation = 0;
    if (query.includeVariation) {
      scoreVariation = await this.variationCalculator.calculateVariation(
        projectId,
        query,
        selectedModels,
        'alignment'
      );
    }

    const attributeBreakdown = this.createAttributeBreakdown(
      aggregationResult.attributeTotals
    );

    const citations = this.processCitations(aggregationResult.citations);

    return {
      averageScore: aggregationResult.averageScore,
      scoreVariation,
      availableModels,
      chartData: aggregationResult.chartData,
      aggregatedAttributeScores: aggregationResult.aggregatedAttributeScores,
      attributeBreakdown,
      reportCount: reports.length,
      dateRange: {
        start: reports[0].reportDate.toISOString(),
        end: reports[reports.length - 1].reportDate.toISOString()
      },
      citations: citations.items.length > 0 ? citations : undefined
    };
  }

  private async fetchReportsForAggregation(
    projectId: string,
    query: AggregatedReportQueryDto
  ): Promise<Array<{
    id: string;
    reportDate: Date;
    generatedAt: Date;
    alignment: {
      summary?: {
        overallAlignmentScore: number;
        averageAttributeScores: Record<string, number>;
        attributeAlignmentSummary: Array<{
          name: string;
          mentionRate: string;
          alignment: string;
        }>;
      };
      detailedResults?: DetailedAlignmentResult[];
    };
  }>> {
    if (query.latestOnly) {
      const latestReport = await this.brandReportModel
        .findOne({ projectId })
        .select('id reportDate generatedAt alignment')
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
      .select('id reportDate generatedAt alignment')
      .sort({ reportDate: -1 })
      .limit(10)
      .lean();
  }

  private extractModelsAndAttributes(reports: Array<{
    alignment?: {
      detailedResults?: DetailedAlignmentResult[];
    };
  }>) {
    const allModels = new Set<string>();
    const allAttributes = new Set<string>();

    reports.forEach(report => {
      if (report.alignment?.detailedResults) {
        report.alignment.detailedResults.forEach((result: DetailedAlignmentResult) => {
          allModels.add(result.model);
          result.attributeScores?.forEach((as: AttributeScore) => {
            allAttributes.add(as.attribute);
          });
        });
      }
    });

    return {
      availableModels: Array.from(allModels).sort(),
      allAttributes: Array.from(allAttributes)
    };
  }

  private filterSelectedModels(
    requestedModels: string[] | undefined,
    availableModels: string[]
  ): string[] {
    return requestedModels && requestedModels.length > 0
      ? requestedModels.filter(m => availableModels.includes(m))
      : availableModels;
  }

  private aggregateAlignmentData(
    reports: Array<{
      id: string;
      reportDate: Date;
      alignment?: {
        detailedResults?: DetailedAlignmentResult[];
      };
    }>,
    selectedModels: string[]
  ) {
    let totalScore = 0;
    let scoreCount = 0;
    const chartData: AlignmentChartDataDto[] = [];
    const attributeTotals: Record<string, { total: number; count: number }> = {};
    const citationDetails: DetailedAlignmentResult[] = [];

    reports.forEach(report => {
      const alignData = report.alignment;
      if (!alignData?.detailedResults) return;

      const filteredResults = alignData.detailedResults.filter(
        (r: DetailedAlignmentResult) => selectedModels.includes(r.model)
      );

      if (filteredResults.length > 0) {
        let reportTotal = 0;
        let attributeCount = 0;

        filteredResults.forEach((result: DetailedAlignmentResult) => {
          result.attributeScores?.forEach((as: AttributeScore) => {
            if (!attributeTotals[as.attribute]) {
              attributeTotals[as.attribute] = { total: 0, count: 0 };
            }
            attributeTotals[as.attribute].total += as.score;
            attributeTotals[as.attribute].count++;
            reportTotal += as.score;
            attributeCount++;
          });

          if (result.citations && result.citations.length > 0) {
            citationDetails.push(result);
          }
        });

        if (attributeCount > 0) {
          const reportScore = (reportTotal / attributeCount) * 100;
          totalScore += reportScore;
          scoreCount++;

          chartData.push({
            date: new Date(report.reportDate).toISOString().split('T')[0],
            score: Math.round(reportScore),
            reportId: report.id
          });
        }
      }
    });

    const averageScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;

    const aggregatedAttributeScores: Record<string, number> = {};
    Object.entries(attributeTotals).forEach(([attribute, data]) => {
      aggregatedAttributeScores[attribute] = data.total / data.count;
    });

    return {
      averageScore,
      chartData,
      attributeTotals,
      aggregatedAttributeScores,
      citations: citationDetails
    };
  }

  private createAttributeBreakdown(
    attributeTotals: Record<string, { total: number; count: number }>
  ): AttributeScoreDto[] {
    return Object.entries(attributeTotals).map(([attribute, data]) => ({
      attribute,
      score: data.total / data.count,
      variation: 0 // TODO: Calculate per-attribute variation if needed
    }));
  }

  private processCitations(detailedResults: DetailedAlignmentResult[]) {
    // Create a new array with score information for each result
    const resultsWithScores = detailedResults.map(result => ({
      ...result,
      sentiment: undefined, // No sentiment for alignment
      // Calculate average score for this result
      avgScore: result.attributeScores 
        ? result.attributeScores.reduce((sum, as) => sum + as.score, 0) / result.attributeScores.length
        : 0
    }));

    // Use the citation extractor, but we need to adapt it
    const citationMap = new Map<string, CitationItemDto>();
    
    resultsWithScores.forEach(result => {
      if (result.citations && Array.isArray(result.citations)) {
        result.citations.forEach((citation: Citation) => {
          if (citation.url) {
            try {
              const urlObj = new URL(citation.url);
              const domain = urlObj.hostname.replace('www.', '');
              const key = `${domain}_${citation.url}`;
              
              const existing = citationMap.get(key);
              if (existing) {
                existing.count++;
                if (result.originalPrompt && !existing.prompts.includes(result.originalPrompt)) {
                  existing.prompts.push(result.originalPrompt);
                }
                if (!existing.scores) existing.scores = [];
                if (!existing.scores.includes(result.avgScore)) {
                  existing.scores.push(result.avgScore);
                }
                if (result.model && !existing.models.includes(result.model)) {
                  existing.models.push(result.model);
                }
              } else {
                const newCitation: CitationItemDto = {
                  domain,
                  url: citation.url,
                  title: citation.title || '',
                  prompts: result.originalPrompt ? [result.originalPrompt] : [],
                  scores: [result.avgScore],
                  count: 1,
                  models: result.model ? [result.model] : [],
                  text: citation.text
                };
                citationMap.set(key, newCitation);
              }
            } catch (e) {
              this.logger.warn(`Invalid URL in alignment citation: ${citation.url}`);
            }
          }
        });
      }
    });

    const items = Array.from(citationMap.values()).sort((a, b) => b.count - a.count);
    const uniqueDomains = new Set(items.map(c => c.domain)).size;
    const totalCitations = items.reduce((sum, c) => sum + c.count, 0);

    return { items, uniqueDomains, totalCitations };
  }

  private createEmptyAlignmentResponse(): AggregatedAlignmentResponseDto {
    return {
      averageScore: 0,
      scoreVariation: 0,
      availableModels: [],
      chartData: [],
      aggregatedAttributeScores: {},
      attributeBreakdown: [],
      reportCount: 0,
      dateRange: { start: '', end: '' }
    };
  }
}