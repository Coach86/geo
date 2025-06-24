import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BrandReport, BrandReportDocument } from '../schemas/brand-report.schema';
import { AggregatedReportQueryDto } from '../dto/aggregated-report-query.dto';
import { 
  AggregatedSentimentResponseDto,
  SentimentChartDataDto
} from '../dto/aggregated-sentiment-response.dto';
import { DetailedSentimentResult } from '../types/sentiment.types';
import { Citation } from '../types/citation.types';
import { CitationItemDto } from '../dto/citation-item.dto';
import { BrandReportVariationCalculatorService } from './brand-report-variation-calculator.service';
import { ExplorerData, SentimentData } from '../interfaces/report.interfaces';

// Define proper types for sentiment report data
interface SentimentReportData {
  id: string;
  reportDate: Date;
  generatedAt: Date;
  sentiment: SentimentData;
  explorer?: ExplorerData;
  alignment?: any;
  competition?: any;
  visibility?: any;
}

interface ModelSentiment {
  model: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  status: 'green' | 'yellow' | 'red';
  positiveKeywords: string[];
  negativeKeywords: string[];
}

interface HeatmapEntry {
  question: string;
  results: {
    model: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    status: 'green' | 'yellow' | 'red';
    llmResponse?: string;
    citations?: Citation[];
  }[];
}

interface ExplorerCitation {
  website: string;
  link?: string;
  model: string;
  promptType: string;
  promptIndex: number;
  source?: string;
}

/**
 * Service for aggregating sentiment data across multiple reports
 * Handles sentiment distribution and emotional analysis
 */
@Injectable()
export class BrandReportSentimentAggregationService {
  private readonly logger = new Logger(BrandReportSentimentAggregationService.name);

  constructor(
    @InjectModel(BrandReport.name)
    private brandReportModel: Model<BrandReportDocument>,
    private variationCalculator: BrandReportVariationCalculatorService,
  ) {}

  async getAggregatedSentiment(
    projectId: string,
    query: AggregatedReportQueryDto
  ): Promise<AggregatedSentimentResponseDto> {
    const reports = await this.fetchReportsForAggregation(projectId, query);

    if (reports.length === 0) {
      return this.createEmptySentimentResponse();
    }

    const availableModels = this.extractAvailableModels(reports);
    const selectedModels = this.filterSelectedModels(query.models, availableModels);

    const aggregationResult = this.aggregateSentimentData(reports, selectedModels);

    let sentimentVariation = { positive: 0, neutral: 0, negative: 0 };
    let overallVariation = 0;
    if (query.includeVariation) {
      // Calculate overall sentiment variation
      overallVariation = await this.variationCalculator.calculateSentimentVariation(
        projectId,
        query,
        selectedModels
      );
      
      // Calculate variation per sentiment type
      sentimentVariation = await this.calculateSentimentTypeVariations(
        projectId,
        query,
        selectedModels
      );
      
      this.logger.log(`[DEBUG] Overall variation: ${overallVariation}`);
      this.logger.log(`[DEBUG] Sentiment variations: positive=${sentimentVariation.positive}, neutral=${sentimentVariation.neutral}, negative=${sentimentVariation.negative}`);
    }

    const overallSentiment = this.determineOverallSentiment(
      aggregationResult.positivePercentage,
      aggregationResult.neutralPercentage,
      aggregationResult.negativePercentage
    );

    const citations = this.processCitations(aggregationResult.citations);

    return {
      positivePercentage: aggregationResult.positivePercentage,
      neutralPercentage: aggregationResult.neutralPercentage,
      negativePercentage: aggregationResult.negativePercentage,
      overallVariation: query.includeVariation ? overallVariation : undefined,
      sentimentVariation,
      availableModels,
      chartData: aggregationResult.chartData,
      sentimentBreakdown: [
        {
          type: 'positive',
          percentage: aggregationResult.positivePercentage,
          variation: sentimentVariation.positive
        },
        {
          type: 'neutral',
          percentage: aggregationResult.neutralPercentage,
          variation: sentimentVariation.neutral
        },
        {
          type: 'negative',
          percentage: aggregationResult.negativePercentage,
          variation: sentimentVariation.negative
        }
      ],
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
  ): Promise<SentimentReportData[]> {
    if (query.latestOnly) {
      const latestReport = await this.brandReportModel
        .findOne({ projectId })
        .select('id reportDate generatedAt sentiment explorer alignment competition visibility')
        .sort({ reportDate: -1 })
        .lean();

      return latestReport ? [latestReport as any] : [];
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
      .select('id reportDate generatedAt sentiment explorer alignment competition visibility')
      .sort({ reportDate: -1 })
      .limit(10)
      .lean();

    return reports as any[];
  }

  private extractAvailableModels(reports: SentimentReportData[]): string[] {
    const allModels = new Set<string>();
    
    reports.forEach(report => {
      if (report.sentiment?.modelSentiments) {
        report.sentiment.modelSentiments.forEach((ms: ModelSentiment) => {
          allModels.add(ms.model);
        });
      }
    });

    return Array.from(allModels).sort();
  }

  private filterSelectedModels(
    requestedModels: string[] | undefined,
    availableModels: string[]
  ): string[] {
    return requestedModels && requestedModels.length > 0
      ? requestedModels.filter(m => availableModels.includes(m))
      : availableModels;
  }

  private aggregateSentimentData(reports: SentimentReportData[], selectedModels: string[]) {
    let totalPositive = 0;
    let totalNeutral = 0;
    let totalNegative = 0;
    let sentimentCount = 0;
    const chartData: SentimentChartDataDto[] = [];
    const citationMap = new Map<string, CitationItemDto>();

    reports.forEach(report => {
      const sentData = report.sentiment;
      if (!sentData?.distribution) return;

      const reportResult = this.processReportSentiment(
        sentData,
        selectedModels,
        report.reportDate
      );

      if (reportResult) {
        totalPositive += reportResult.positive;
        totalNeutral += reportResult.neutral;
        totalNegative += reportResult.negative;
        sentimentCount++;
        
        chartData.push({
          date: new Date(report.reportDate).toISOString().split('T')[0],
          positive: Math.round(reportResult.positive),
          neutral: Math.round(reportResult.neutral),
          negative: Math.round(reportResult.negative)
        });
      }

      // Process citations from various sources
      this.extractCitationsFromSentiment(
        sentData,
        report.explorer,
        selectedModels,
        citationMap,
        report
      );
    });

    const positivePercentage = sentimentCount > 0 ? Math.round(totalPositive / sentimentCount) : 0;
    const neutralPercentage = sentimentCount > 0 ? Math.round(totalNeutral / sentimentCount) : 0;
    const negativePercentage = sentimentCount > 0 ? Math.round(totalNegative / sentimentCount) : 0;

    return {
      positivePercentage,
      neutralPercentage,
      negativePercentage,
      chartData,
      citations: Array.from(citationMap.values())
    };
  }

  private processReportSentiment(
    sentData: SentimentData,
    selectedModels: string[],
    reportDate: Date
  ): { positive: number; neutral: number; negative: number } | null {
    if (sentData.detailedResults && sentData.detailedResults.length > 0) {
      const filteredResults = selectedModels.length > 0 
        ? sentData.detailedResults.filter(
            (r: DetailedSentimentResult) => selectedModels.includes(r.model)
          )
        : sentData.detailedResults; // If no models selected, use all results

      if (filteredResults.length > 0) {
        let reportPositive = 0;
        let reportNeutral = 0;
        let reportNegative = 0;
        let modelCount = 0;

        filteredResults.forEach((result: DetailedSentimentResult) => {
          if (result.sentimentBreakdown) {
            reportPositive += result.sentimentBreakdown.positive || 0;
            reportNeutral += result.sentimentBreakdown.neutral || 0;
            reportNegative += result.sentimentBreakdown.negative || 0;
            modelCount++;
          } else if (result.sentiment) {
            // Convert sentiment string to percentages
            if (result.sentiment === 'positive') {
              reportPositive += 100;
            } else if (result.sentiment === 'neutral') {
              reportNeutral += 100;
            } else if (result.sentiment === 'negative') {
              reportNegative += 100;
            }
            modelCount++;
          }
        });

        if (modelCount > 0) {
          return {
            positive: reportPositive / modelCount,
            neutral: reportNeutral / modelCount,
            negative: reportNegative / modelCount
          };
        }
      }
    } else if (sentData.distribution && sentData.distribution.total > 0) {
      // Fallback to overall distribution
      const distribution = sentData.distribution;
      return {
        positive: (distribution.positive / distribution.total) * 100,
        neutral: (distribution.neutral / distribution.total) * 100,
        negative: (distribution.negative / distribution.total) * 100
      };
    }

    return null;
  }

  private extractCitationsFromSentiment(
    sentData: SentimentData,
    explorer: ExplorerData | undefined,
    selectedModels: string[],
    citationMap: Map<string, CitationItemDto>,
    fullReport?: any
  ): void {
    // Extract from detailed results
    if (sentData.detailedResults) {
      this.extractFromDetailedResults(sentData.detailedResults, selectedModels, citationMap);
    }

    // Extract from heatmap data
    if (sentData.heatmapData) {
      this.extractFromHeatmapData(sentData.heatmapData, selectedModels, citationMap);
    }

    // Extract from explorer data webSearchResults
    if (explorer?.webSearchResults) {
      explorer.webSearchResults.forEach(searchResult => {
        if (searchResult.citations) {
          this.extractFromExplorerData(searchResult.citations, selectedModels, citationMap, sentData, fullReport);
        }
      });
    }
  }

  private extractFromDetailedResults(
    detailedResults: DetailedSentimentResult[],
    selectedModels: string[],
    citationMap: Map<string, CitationItemDto>
  ): void {
    detailedResults
      .filter((r: DetailedSentimentResult) => selectedModels.includes(r.model))
      .forEach((result: DetailedSentimentResult) => {
        if (result.citations && Array.isArray(result.citations)) {
          result.citations.forEach((citation: Citation) => {
            this.addCitationToMap(
              citation,
              citationMap,
              result.originalPrompt || '',
              result.overallSentiment || result.sentiment || 'neutral',
              result.model
            );
          });
        }
      });
  }

  private extractFromHeatmapData(
    heatmapData: HeatmapEntry[],
    selectedModels: string[],
    citationMap: Map<string, CitationItemDto>
  ): void {
    heatmapData.forEach((heatmapEntry: HeatmapEntry) => {
      if (heatmapEntry.results && Array.isArray(heatmapEntry.results)) {
        heatmapEntry.results
          .filter((r) => selectedModels.length === 0 || selectedModels.includes(r.model))
          .forEach((result) => {
            if (result.citations && Array.isArray(result.citations)) {
              result.citations.forEach((citation: Citation) => {
                this.addCitationToMap(
                  citation,
                  citationMap,
                  heatmapEntry.question || '',
                  result.sentiment || 'neutral',
                  result.model
                );
              });
            }
          });
      }
    });
  }

  private extractFromExplorerData(
    citations: ExplorerCitation[],
    selectedModels: string[],
    citationMap: Map<string, CitationItemDto>,
    sentData?: SentimentData,
    fullReport?: any
  ): void {
    citations
      .filter((c: ExplorerCitation) => 
        // Only include sentiment citations for the sentiment page
        c.promptType === 'sentiment' && 
        (selectedModels.length === 0 || selectedModels.includes(c.model))
      )
      .forEach((citation: ExplorerCitation) => {
        if (citation.link) {
          // Try to get the actual prompt from detailedResults using promptType and promptIndex
          let actualPrompt = '';
          
          // Check sentiment data - we only process sentiment citations now
          if (sentData?.detailedResults) {
            const detailedResult = sentData.detailedResults.find(
              r => r.model === citation.model && r.promptIndex === citation.promptIndex
            );
            if (detailedResult && detailedResult.originalPrompt) {
              actualPrompt = detailedResult.originalPrompt;
            }
          }
          
          // If we still couldn't find the actual prompt, use a more descriptive fallback
          if (!actualPrompt) {
            // Since we only process sentiment citations, use sentiment-specific fallback
            const promptNumber = citation.promptIndex + 1;
            actualPrompt = `Brand sentiment query #${promptNumber}`;
          }
          
          this.addCitationToMap(
            { url: citation.link, title: citation.website },
            citationMap,
            actualPrompt,
            'neutral',
            citation.model
          );
        }
      });
  }

  private addCitationToMap(
    citation: Citation | ExplorerCitation | { url?: string; link?: string; title?: string; website?: string; text?: string },
    citationMap: Map<string, CitationItemDto>,
    prompt: string,
    sentiment: string,
    model: string
  ): void {
    const url = ('url' in citation ? citation.url : undefined) || ('link' in citation ? citation.link : undefined);
    if (!url) return;
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      const key = `${domain}_${url}`;

      const existing = citationMap.get(key);
      if (existing) {
        existing.count++;
        if (prompt && !existing.prompts.includes(prompt)) {
          existing.prompts.push(prompt);
        }
        if (!existing.sentiments) existing.sentiments = [];
        if (!existing.sentiments.includes(sentiment)) {
          existing.sentiments.push(sentiment);
        }
        if (!existing.models.includes(model)) {
          existing.models.push(model);
        }
      } else {
        const newCitation: CitationItemDto = {
          domain,
          url: url!,
          title: ('title' in citation ? citation.title : undefined) || ('website' in citation ? citation.website : undefined) || '',
          prompts: prompt ? [prompt] : [],
          sentiments: [sentiment],
          count: 1,
          models: [model],
          text: 'text' in citation ? citation.text : undefined
        };
        citationMap.set(key, newCitation);
      }
    } catch (e) {
      this.logger.warn(`Invalid URL: ${url}`);
    }
  }

  private determineOverallSentiment(
    positive: number,
    neutral: number,
    negative: number
  ): 'positive' | 'neutral' | 'negative' {
    if (positive > neutral && positive > negative) {
      return 'positive';
    } else if (negative > neutral && negative > positive) {
      return 'negative';
    }
    return 'neutral';
  }

  private processCitations(citations: CitationItemDto[]) {
    const items = citations.sort((a, b) => b.count - a.count);
    const uniqueDomains = new Set(items.map(c => c.domain)).size;
    const totalCitations = items.reduce((sum, c) => sum + c.count, 0);

    return { items, uniqueDomains, totalCitations };
  }

  private createEmptySentimentResponse(): AggregatedSentimentResponseDto {
    return {
      positivePercentage: 0,
      neutralPercentage: 0,
      negativePercentage: 0,
      overallVariation: undefined,
      sentimentVariation: { positive: 0, neutral: 0, negative: 0 },
      availableModels: [],
      chartData: [],
      sentimentBreakdown: [
        { type: 'positive', percentage: 0, variation: 0 },
        { type: 'neutral', percentage: 0, variation: 0 },
        { type: 'negative', percentage: 0, variation: 0 }
      ],
      reportCount: 0,
      dateRange: { start: '', end: '' }
    };
  }

  private async calculateSentimentTypeVariations(
    projectId: string,
    query: AggregatedReportQueryDto,
    selectedModels: string[]
  ): Promise<{ positive: number; neutral: number; negative: number }> {
    const dateFilter = this.buildDateFilter(projectId, query);
    const currentReports = await this.brandReportModel
      .find(dateFilter)
      .select('reportDate sentiment')
      .sort({ reportDate: 1 })
      .lean();

    if (currentReports.length === 0) {
      return { positive: 0, neutral: 0, negative: 0 };
    }

    // Calculate period dates for previous period
    const { previousStartDate, previousEndDate } = this.calculatePeriodDates(query, currentReports);

    if (!previousStartDate || !previousEndDate) {
      return { positive: 0, neutral: 0, negative: 0 };
    }

    const previousReports = await this.brandReportModel
      .find({
        projectId,
        reportDate: { $gte: previousStartDate, $lt: previousEndDate }
      })
      .select('reportDate sentiment')
      .lean();

    if (previousReports.length === 0) {
      return { positive: 0, neutral: 0, negative: 0 };
    }

    // Calculate current period percentages
    const currentAgg = this.aggregateSentimentData(currentReports as SentimentReportData[], selectedModels);
    
    // Calculate previous period percentages
    const previousAgg = this.aggregateSentimentData(previousReports as SentimentReportData[], selectedModels);

    // Calculate variations as simple differences
    const variations = {
      positive: Math.round(currentAgg.positivePercentage - previousAgg.positivePercentage),
      neutral: Math.round(currentAgg.neutralPercentage - previousAgg.neutralPercentage),
      negative: Math.round(currentAgg.negativePercentage - previousAgg.negativePercentage)
    };
    
    this.logger.log(`[DEBUG] calculateSentimentTypeVariations - Current: pos=${currentAgg.positivePercentage}%, neu=${currentAgg.neutralPercentage}%, neg=${currentAgg.negativePercentage}%`);
    this.logger.log(`[DEBUG] calculateSentimentTypeVariations - Previous: pos=${previousAgg.positivePercentage}%, neu=${previousAgg.neutralPercentage}%, neg=${previousAgg.negativePercentage}%`);
    this.logger.log(`[DEBUG] calculateSentimentTypeVariations - Variations: pos=${variations.positive}, neu=${variations.neutral}, neg=${variations.negative}`);
    
    return variations;
  }

  private buildDateFilter(
    projectId: string,
    query: AggregatedReportQueryDto
  ): Record<string, unknown> {
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
    
    return dateFilter;
  }

  private calculatePeriodDates(
    query: AggregatedReportQueryDto,
    allReports: any[]
  ): { previousStartDate?: Date; previousEndDate?: Date } {
    let periodLength: number;
    let previousStartDate: Date | undefined;
    let previousEndDate: Date | undefined;

    if (query.startDate && query.endDate) {
      const queryStart = new Date(query.startDate);
      const queryEnd = new Date(query.endDate);
      periodLength = queryEnd.getTime() - queryStart.getTime();
      
      if (periodLength > 0) {
        previousEndDate = queryStart;
        previousStartDate = new Date(queryStart.getTime() - periodLength);
      }
    } else {
      const startDate = allReports[0].reportDate;
      const endDate = allReports[allReports.length - 1].reportDate;
      periodLength = endDate.getTime() - startDate.getTime();

      if (periodLength > 0) {
        previousEndDate = startDate;
        previousStartDate = new Date(startDate.getTime() - periodLength);
      }
    }

    return { previousStartDate, previousEndDate };
  }
}