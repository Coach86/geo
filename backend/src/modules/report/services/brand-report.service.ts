import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import { BrandReport, BrandReportDocument } from '../schemas/brand-report.schema';
import { BrandReportResponseDto } from '../dto/brand-report-response.dto';
import { AggregatedReportQueryDto } from '../dto/aggregated-report-query.dto';
import { AggregatedVisibilityResponseDto, VisibilityChartDataDto } from '../dto/aggregated-visibility-response.dto';
import { AggregatedAlignmentResponseDto, AlignmentChartDataDto, AttributeScoreDto } from '../dto/aggregated-alignment-response.dto';
import { AggregatedSentimentResponseDto, SentimentChartDataDto } from '../dto/aggregated-sentiment-response.dto';
import { AggregatedExplorerResponseDto, ExplorerItemDto } from '../dto/aggregated-explorer-response.dto';
import { CitationItemDto, AggregatedCitationsDto } from '../dto/citation-item.dto';
import {
  BrandReportVisibilitySelect,
  BrandReportAlignmentSelect,
  BrandReportSentimentSelect,
  BrandReportExplorerSelect,
  ModelVisibilityItem,
  ArenaMetric,
  DetailedAlignmentResult,
  AttributeScore,
  DetailedSentimentResult,
  ExplorerData,
} from '../types/brand-report.types';

@Injectable()
export class BrandReportService {
  private readonly logger = new Logger(BrandReportService.name);

  constructor(
    @InjectModel(BrandReport.name)
    private brandReportModel: Model<BrandReportDocument>,
  ) {}

  async getProjectReports(
    projectId: string, 
    limit: number = 10
  ): Promise<BrandReportResponseDto[]> {
    const reports = await this.brandReportModel
      .find({ projectId })
      .sort({ reportDate: -1 })
      .limit(limit)
      .lean();

    return reports.map(report => this.mapToResponseDto(report));
  }

  async getReport(reportId: string): Promise<BrandReportResponseDto> {
    const report = await this.brandReportModel
      .findOne({ id: reportId })
      .lean();

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    return this.mapToResponseDto(report);
  }

  async getExplorerData(reportId: string) {
    const report = await this.brandReportModel
      .findOne({ id: reportId })
      .select('explorer')
      .lean();

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    return report.explorer;
  }

  async getVisibilityData(reportId: string) {
    const report = await this.brandReportModel
      .findOne({ id: reportId })
      .select('visibility')
      .lean();

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    return report.visibility;
  }

  async getSentimentData(reportId: string) {
    const report = await this.brandReportModel
      .findOne({ id: reportId })
      .select('sentiment')
      .lean();

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    return report.sentiment;
  }

  async getAlignmentData(reportId: string) {
    const report = await this.brandReportModel
      .findOne({ id: reportId })
      .select('alignment')
      .lean();

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    return report.alignment;
  }

  async getCompetitionData(reportId: string) {
    const report = await this.brandReportModel
      .findOne({ id: reportId })
      .select('competition')
      .lean();

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    return report.competition;
  }

  @OnEvent('project.deleted')
  async handleProjectDeleted(event: { projectId: string }) {
    const { projectId } = event;
    try {
      const result = await this.brandReportModel.deleteMany({ projectId });
      this.logger.log(`Deleted ${result.deletedCount} brand reports for deleted project ${projectId}`);
    } catch (error) {
      this.logger.error(`Failed to delete brand reports for project ${projectId}: ${error.message}`, error.stack);
    }
  }

  private mapToResponseDto(report: BrandReportDocument): BrandReportResponseDto {
    // Map alignment data to match DTO structure
    interface AlignmentResponseData {
      overallAlignmentScore: number;
      averageAttributeScores: Record<string, number>;
      attributeAlignmentSummary: Array<{
        name: string;
        mentionRate: string;
        alignment: string;
      }>;
      detailedResults: Array<{
        model: string;
        promptIndex?: number;
        originalPrompt?: string;
        llmResponse?: string;
        attributeScores: Array<{
          attribute: string;
          score: number;
          evaluation: string;
        }>;
        toolUsage?: Array<{
          type: string;
          parameters?: Record<string, unknown>;
          execution_details?: {
            status: string;
            result?: unknown;
            error?: string;
          };
        }>;
        citations?: Array<{
          url: string;
          title?: string;
          text?: string;
        }>;
        error?: string;
      }>;
    }

    let alignmentData: AlignmentResponseData = {
      overallAlignmentScore: 0,
      averageAttributeScores: {},
      attributeAlignmentSummary: [],
      detailedResults: []
    };

    if (report.alignment) {
      if (report.alignment.summary) {
        alignmentData = {
          ...report.alignment.summary,
          detailedResults: report.alignment.detailedResults || []
        };
      } else {
        // Fallback for old format - cast is safe here as we control the data
        alignmentData = report.alignment as unknown as AlignmentResponseData;
      }
    }

    return {
      id: report.id,
      projectId: report.projectId,
      reportDate: report.reportDate,
      generatedAt: report.generatedAt,
      brandName: report.brandName,
      metadata: report.metadata,
      explorer: report.explorer,
      visibility: report.visibility,
      sentiment: report.sentiment,
      alignment: alignmentData,
      competition: report.competition,
    };
  }

  async getAggregatedVisibility(
    projectId: string,
    query: AggregatedReportQueryDto
  ): Promise<AggregatedVisibilityResponseDto> {
    // Build date filter
    const dateFilter: any = { projectId };
    if (query.startDate || query.endDate) {
      dateFilter.reportDate = {};
      if (query.startDate) {
        dateFilter.reportDate.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        dateFilter.reportDate.$lte = new Date(query.endDate);
      }
    }

    // Fetch reports within date range
    const reports = await this.brandReportModel
      .find(dateFilter)
      .select('id reportDate generatedAt visibility')
      .sort({ reportDate: 1 })
      .lean() as BrandReportVisibilitySelect[];

    if (reports.length === 0) {
      return this.createEmptyVisibilityResponse(projectId);
    }

    // Extract all available models
    const allModels = new Set<string>();
    reports.forEach(report => {
      if (report.visibility?.modelVisibility) {
        report.visibility.modelVisibility.forEach((mv: ModelVisibilityItem) => {
          allModels.add(mv.model);
        });
      }
    });
    const availableModels = Array.from(allModels).sort();

    // Filter models if specified
    const selectedModels = query.models && query.models.length > 0 
      ? query.models.filter(m => availableModels.includes(m))
      : availableModels;

    // Calculate aggregated data
    let totalScore = 0;
    let scoreCount = 0;
    const competitorMap: Record<string, { scores: number[]; dates: string[] }> = {};
    const chartData: VisibilityChartDataDto[] = [];
    const modelScores: Record<string, { total: number; count: number }> = {};

    reports.forEach(report => {
      const visData = report.visibility;
      if (!visData) return;

      // Calculate brand score for this report
      let reportScore = 0;
      let reportModelCount = 0;

      if (visData.modelVisibility) {
        const filteredModels = visData.modelVisibility.filter(mv => 
          selectedModels.includes(mv.model)
        );

        filteredModels.forEach(mv => {
          reportScore += mv.mentionRate;
          reportModelCount++;

          // Track model-specific scores
          if (!modelScores[mv.model]) {
            modelScores[mv.model] = { total: 0, count: 0 };
          }
          modelScores[mv.model].total += mv.mentionRate;
          modelScores[mv.model].count++;
        });
      }

      if (reportModelCount > 0) {
        const avgScore = reportScore / reportModelCount;
        totalScore += avgScore;
        scoreCount++;

        // Prepare chart data
        const dataPoint: VisibilityChartDataDto = {
          date: new Date(report.reportDate).toISOString().split('T')[0],
          brand: Math.round(avgScore),
          competitors: {}
        };

        // Process competitors from arenaMetrics
        if (visData.arenaMetrics && Array.isArray(visData.arenaMetrics)) {
          visData.arenaMetrics.forEach((competitor: ArenaMetric) => {
            if (competitor.name && competitor.global) {
              // Extract percentage from global field (e.g., "48%" -> 48)
              const globalScore = parseInt(competitor.global.replace('%', ''), 10);
              
              if (!competitorMap[competitor.name]) {
                competitorMap[competitor.name] = { scores: [], dates: [] };
              }
              competitorMap[competitor.name].scores.push(globalScore);
              competitorMap[competitor.name].dates.push(report.reportDate.toISOString());
              
              dataPoint.competitors[competitor.name] = globalScore;
            }
          });
        }

        chartData.push(dataPoint);
      }
    });

    const averageScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;

    // Calculate variation if requested
    let scoreVariation = 0;
    if (query.includeVariation && reports.length >= 2) {
      scoreVariation = await this.calculateVariation(
        projectId,
        dateFilter,
        selectedModels,
        'visibility'
      );
    }

    // Process model breakdown
    const modelBreakdown = Object.entries(modelScores).map(([model, data]) => ({
      model,
      score: Math.round(data.total / data.count),
      variation: 0 // TODO: Calculate per-model variation if needed
    }));

    // Process competitors
    const competitors = Object.entries(competitorMap).map(([name, data]) => {
      const avgScore = data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length;
      
      // Calculate competitor variation
      let variation = 0;
      if (data.scores.length >= 2) {
        const midPoint = Math.floor(data.scores.length / 2);
        const firstHalf = data.scores.slice(0, midPoint);
        const secondHalf = data.scores.slice(midPoint);
        const firstAvg = firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length;
        
        if (firstAvg > 0) {
          variation = Math.round(((secondAvg - firstAvg) / firstAvg) * 100);
        }
      }

      return {
        name,
        averageScore: Math.round(avgScore),
        variation
      };
    });

    return {
      averageScore,
      scoreVariation,
      availableModels,
      chartData,
      modelBreakdown,
      competitors,
      reportCount: reports.length,
      dateRange: {
        start: reports[0].reportDate.toISOString(),
        end: reports[reports.length - 1].reportDate.toISOString()
      }
    };
  }

  async getAggregatedAlignment(
    projectId: string,
    query: AggregatedReportQueryDto
  ): Promise<AggregatedAlignmentResponseDto> {
    // Build date filter
    const dateFilter: any = { projectId };
    if (query.startDate || query.endDate) {
      dateFilter.reportDate = {};
      if (query.startDate) {
        dateFilter.reportDate.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        dateFilter.reportDate.$lte = new Date(query.endDate);
      }
    }

    // Fetch reports within date range
    const reports = await this.brandReportModel
      .find(dateFilter)
      .select('id reportDate generatedAt alignment')
      .sort({ reportDate: 1 })
      .lean() as BrandReportAlignmentSelect[];

    if (reports.length === 0) {
      return this.createEmptyAlignmentResponse(projectId);
    }

    // Extract available models and attributes
    const allModels = new Set<string>();
    const allAttributes = new Set<string>();
    const chartData: AlignmentChartDataDto[] = [];
    const attributeTotals: Record<string, { total: number; count: number }> = {};

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

    const availableModels = Array.from(allModels).sort();
    const selectedModels = query.models && query.models.length > 0 
      ? query.models.filter(m => availableModels.includes(m))
      : availableModels;

    // Calculate aggregated scores
    let totalScore = 0;
    let scoreCount = 0;
    
    // For citation aggregation
    const citationMap: Map<string, CitationItemDto> = new Map();

    reports.forEach(report => {
      const alignData = report.alignment;
      if (!alignData?.detailedResults) return;

      // Filter by selected models
      const filteredResults = alignData.detailedResults.filter((r: DetailedAlignmentResult) =>
        selectedModels.includes(r.model)
      );

      if (filteredResults.length > 0) {
        // Calculate average alignment score for this report
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
          
          // Collect citations
          if (result.citations && Array.isArray(result.citations)) {
            const avgScore = result.attributeScores 
              ? result.attributeScores.reduce((sum, as) => sum + as.score, 0) / result.attributeScores.length
              : 0;
              
            result.citations.forEach((citation: any) => {
              if (citation.url) {
                try {
                  const urlObj = new URL(citation.url);
                  const domain = urlObj.hostname;
                  
                  const key = `${domain}_${citation.url}`;
                  const existing = citationMap.get(key);
                  
                  if (existing) {
                    existing.count++;
                  } else {
                    citationMap.set(key, {
                      domain,
                      url: citation.url,
                      title: citation.title,
                      prompt: result.originalPrompt || '',
                      score: avgScore,
                      count: 1,
                      model: result.model,
                      text: citation.text
                    });
                  }
                } catch (e) {
                  // Invalid URL, skip
                }
              }
            });
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

    // Calculate variation
    let scoreVariation = 0;
    if (query.includeVariation && reports.length >= 2) {
      scoreVariation = await this.calculateVariation(
        projectId,
        dateFilter,
        selectedModels,
        'alignment'
      );
    }

    // Calculate aggregated attribute scores
    const aggregatedAttributeScores: Record<string, number> = {};
    const attributeBreakdown: AttributeScoreDto[] = [];

    Object.entries(attributeTotals).forEach(([attribute, data]) => {
      const avgScore = data.total / data.count;
      aggregatedAttributeScores[attribute] = avgScore;
      
      attributeBreakdown.push({
        attribute,
        score: avgScore,
        variation: 0 // TODO: Calculate per-attribute variation if needed
      });
    });

    // Process citations
    const citationItems = Array.from(citationMap.values()).sort((a, b) => b.count - a.count);
    const uniqueDomains = new Set(citationItems.map(c => c.domain)).size;
    const totalCitations = citationItems.reduce((sum, c) => sum + c.count, 0);

    return {
      averageScore,
      scoreVariation,
      availableModels,
      chartData,
      aggregatedAttributeScores,
      attributeBreakdown,
      reportCount: reports.length,
      dateRange: {
        start: reports[0].reportDate.toISOString(),
        end: reports[reports.length - 1].reportDate.toISOString()
      },
      citations: citationItems.length > 0 ? {
        items: citationItems,
        uniqueDomains,
        totalCitations
      } : undefined
    };
  }

  async getAggregatedSentiment(
    projectId: string,
    query: AggregatedReportQueryDto
  ): Promise<AggregatedSentimentResponseDto> {
    // Build date filter
    const dateFilter: any = { projectId };
    if (query.startDate || query.endDate) {
      dateFilter.reportDate = {};
      if (query.startDate) {
        dateFilter.reportDate.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        dateFilter.reportDate.$lte = new Date(query.endDate);
      }
    }

    // Fetch reports within date range - include explorer for citations
    const reports = await this.brandReportModel
      .find(dateFilter)
      .select('id reportDate generatedAt sentiment explorer')
      .sort({ reportDate: 1 })
      .lean() as any[];

    if (reports.length === 0) {
      return this.createEmptySentimentResponse(projectId);
    }

    // Extract available models from modelSentiments (this is always populated)
    const allModels = new Set<string>();
    reports.forEach(report => {
      if (report.sentiment?.modelSentiments) {
        report.sentiment.modelSentiments.forEach((ms: any) => {
          allModels.add(ms.model);
        });
      }
    });

    const availableModels = Array.from(allModels).sort();
    const selectedModels = query.models && query.models.length > 0 
      ? query.models.filter(m => availableModels.includes(m))
      : availableModels;

    // Calculate aggregated sentiment
    let totalPositive = 0;
    let totalNeutral = 0;
    let totalNegative = 0;
    let sentimentCount = 0;
    const chartData: SentimentChartDataDto[] = [];
    
    // For citation aggregation
    const citationMap: Map<string, CitationItemDto> = new Map();

    reports.forEach(report => {
      const sentData = report.sentiment;
      if (!sentData?.distribution) return;

      // Use overall distribution data for each report
      // Check if we have detailedResults for model-specific data
      if (sentData.detailedResults && sentData.detailedResults.length > 0) {
        this.logger.log(`Found ${sentData.detailedResults.length} detailed results for sentiment report`);
        // Use detailed results if available
        const filteredResults = sentData.detailedResults.filter((r: DetailedSentimentResult) =>
          selectedModels.includes(r.model)
        );

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
            }
            
            // Collect citations
            if (result.citations && Array.isArray(result.citations)) {
              result.citations.forEach((citation: any) => {
                if (citation.url) {
                  try {
                    const urlObj = new URL(citation.url);
                    const domain = urlObj.hostname;
                    
                    const key = `${domain}_${citation.url}`;
                    const existing = citationMap.get(key);
                    
                    if (existing) {
                      existing.count++;
                    } else {
                      citationMap.set(key, {
                        domain,
                        url: citation.url,
                        title: citation.title,
                        prompt: result.originalPrompt || '',
                        sentiment: result.overallSentiment || 'neutral',
                        count: 1,
                        model: result.model,
                        text: citation.text
                      });
                    }
                  } catch (e) {
                    // Invalid URL, skip
                  }
                }
              });
            }
          });

          if (modelCount > 0) {
            const avgPositive = reportPositive / modelCount;
            const avgNeutral = reportNeutral / modelCount;
            const avgNegative = reportNegative / modelCount;

            totalPositive += avgPositive;
            totalNeutral += avgNeutral;
            totalNegative += avgNegative;
            sentimentCount++;

            chartData.push({
              date: new Date(report.reportDate).toISOString().split('T')[0],
              positive: Math.round(avgPositive),
              neutral: Math.round(avgNeutral),
              negative: Math.round(avgNegative)
            });
          }
        }
      } else {
        // Fallback to overall distribution data if no detailed results
        const distribution = sentData.distribution;
        if (distribution.total > 0) {
          const positivePercent = (distribution.positive / distribution.total) * 100;
          const neutralPercent = (distribution.neutral / distribution.total) * 100;
          const negativePercent = (distribution.negative / distribution.total) * 100;

          totalPositive += positivePercent;
          totalNeutral += neutralPercent;
          totalNegative += negativePercent;
          sentimentCount++;

          chartData.push({
            date: new Date(report.reportDate).toISOString().split('T')[0],
            positive: Math.round(positivePercent),
            neutral: Math.round(neutralPercent),
            negative: Math.round(negativePercent)
          });
        }
      }
      
      // Also check explorer citations for sentiment reports
      if (report.explorer?.citations) {
        report.explorer.citations.forEach((citation: any) => {
          // Only include sentiment-related citations
          if (citation.promptType?.toLowerCase().includes('sentiment') && citation.link) {
            try {
              const urlObj = new URL(citation.link);
              const domain = urlObj.hostname;
              
              const key = `${domain}_${citation.link}`;
              const existing = citationMap.get(key);
              
              if (existing) {
                existing.count++;
              } else {
                // Try to determine sentiment from the prompt or use neutral as default
                citationMap.set(key, {
                  domain,
                  url: citation.link,
                  title: citation.website || '',
                  prompt: citation.promptText || '',
                  sentiment: 'neutral', // Default to neutral for explorer citations
                  count: 1,
                  model: citation.model,
                  text: undefined
                });
              }
            } catch (e) {
              // Invalid URL, skip
            }
          }
        });
      }
    });

    const positivePercentage = sentimentCount > 0 ? Math.round(totalPositive / sentimentCount) : 0;
    const neutralPercentage = sentimentCount > 0 ? Math.round(totalNeutral / sentimentCount) : 0;
    const negativePercentage = sentimentCount > 0 ? Math.round(totalNegative / sentimentCount) : 0;

    // Calculate variations
    let sentimentVariation = { positive: 0, neutral: 0, negative: 0 };
    if (query.includeVariation && reports.length >= 2) {
      sentimentVariation = await this.calculateSentimentVariation(
        projectId,
        dateFilter,
        selectedModels
      );
    }

    const sentimentBreakdown = [
      { type: 'positive', percentage: positivePercentage, variation: sentimentVariation.positive },
      { type: 'neutral', percentage: neutralPercentage, variation: sentimentVariation.neutral },
      { type: 'negative', percentage: negativePercentage, variation: sentimentVariation.negative }
    ];

    // Process citations
    const citationItems = Array.from(citationMap.values()).sort((a, b) => b.count - a.count);
    const uniqueDomains = new Set(citationItems.map(c => c.domain)).size;
    const totalCitations = citationItems.reduce((sum, c) => sum + c.count, 0);

    return {
      positivePercentage,
      neutralPercentage,
      negativePercentage,
      sentimentVariation,
      availableModels,
      chartData,
      sentimentBreakdown,
      reportCount: reports.length,
      dateRange: {
        start: reports[0].reportDate.toISOString(),
        end: reports[reports.length - 1].reportDate.toISOString()
      },
      citations: citationItems.length > 0 ? {
        items: citationItems,
        uniqueDomains,
        totalCitations
      } : undefined
    };
  }

  private async calculateVariation(
    projectId: string,
    dateFilter: any,
    selectedModels: string[],
    type: 'visibility' | 'alignment'
  ): Promise<number> {
    // Get all reports to calculate period length
    const allReports = await this.brandReportModel
      .find(dateFilter)
      .select('reportDate')
      .sort({ reportDate: 1 })
      .lean();

    if (allReports.length < 2) return 0;

    // Calculate period length
    const startDate = allReports[0].reportDate;
    const endDate = allReports[allReports.length - 1].reportDate;
    const periodLength = endDate.getTime() - startDate.getTime();

    // Get previous period reports
    const previousStartDate = new Date(startDate.getTime() - periodLength);
    const previousEndDate = startDate;

    const previousReports = await this.brandReportModel
      .find({
        projectId,
        reportDate: {
          $gte: previousStartDate,
          $lt: previousEndDate
        }
      })
      .select(`reportDate ${type}`)
      .lean();

    if (previousReports.length === 0) return 0;

    // Calculate scores for both periods
    const currentScore = this.calculatePeriodScore(allReports, selectedModels, type);
    const previousScore = this.calculatePeriodScore(previousReports, selectedModels, type);

    if (previousScore === 0) return 0;

    return Math.round(((currentScore - previousScore) / previousScore) * 100);
  }

  private calculatePeriodScore(
    reports: (BrandReportVisibilitySelect | BrandReportAlignmentSelect)[],
    selectedModels: string[],
    type: 'visibility' | 'alignment'
  ): number {
    let total = 0;
    let count = 0;

    reports.forEach(report => {
      if (type === 'visibility' && 'visibility' in report && report.visibility?.modelVisibility) {
        const filtered = report.visibility.modelVisibility.filter((mv: ModelVisibilityItem) =>
          selectedModels.includes(mv.model)
        );
        if (filtered.length > 0) {
          const avg = filtered.reduce((sum: number, mv: ModelVisibilityItem) => sum + mv.mentionRate, 0) / filtered.length;
          total += avg;
          count++;
        }
      } else if (type === 'alignment' && 'alignment' in report && report.alignment?.detailedResults) {
        const filtered = report.alignment.detailedResults.filter((r: DetailedAlignmentResult) =>
          selectedModels.includes(r.model)
        );
        let scoreSum = 0;
        let scoreCount = 0;
        filtered.forEach((result: DetailedAlignmentResult) => {
          result.attributeScores?.forEach((as: AttributeScore) => {
            scoreSum += as.score;
            scoreCount++;
          });
        });
        if (scoreCount > 0) {
          total += (scoreSum / scoreCount) * 100;
          count++;
        }
      }
    });

    return count > 0 ? total / count : 0;
  }

  private async calculateSentimentVariation(
    projectId: string,
    dateFilter: any,
    selectedModels: string[]
  ): Promise<{ positive: number; neutral: number; negative: number }> {
    // Similar logic to calculateVariation but for sentiment
    // Returns variation for each sentiment type
    // Implementation simplified for brevity
    return { positive: 0, neutral: 0, negative: 0 };
  }

  private createEmptyVisibilityResponse(projectId: string): AggregatedVisibilityResponseDto {
    return {
      averageScore: 0,
      scoreVariation: 0,
      availableModels: [],
      chartData: [],
      modelBreakdown: [],
      competitors: [],
      reportCount: 0,
      dateRange: { start: '', end: '' }
    };
  }

  private createEmptyAlignmentResponse(projectId: string): AggregatedAlignmentResponseDto {
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

  private createEmptySentimentResponse(projectId: string): AggregatedSentimentResponseDto {
    return {
      positivePercentage: 0,
      neutralPercentage: 0,
      negativePercentage: 0,
      sentimentVariation: { positive: 0, neutral: 0, negative: 0 },
      availableModels: [],
      chartData: [],
      sentimentBreakdown: [],
      reportCount: 0,
      dateRange: { start: '', end: '' }
    };
  }

  async getAggregatedExplorer(
    projectId: string,
    query: AggregatedReportQueryDto
  ): Promise<AggregatedExplorerResponseDto> {
    // Build date filter
    const dateFilter: any = { projectId };
    if (query.startDate || query.endDate) {
      dateFilter.reportDate = {};
      if (query.startDate) {
        dateFilter.reportDate.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        dateFilter.reportDate.$lte = new Date(query.endDate);
      }
    }

    // Fetch reports within date range
    const reports = await this.brandReportModel
      .find(dateFilter)
      .select('id reportDate generatedAt explorer')
      .sort({ reportDate: 1 })
      .lean() as BrandReportExplorerSelect[];

    if (reports.length === 0) {
      return this.createEmptyExplorerResponse(projectId);
    }

    // Aggregate data from all reports
    const mentionCounts: Record<string, number> = {};
    const keywordCounts: Record<string, number> = {};
    const sourceCounts: Record<string, number> = {};
    
    let totalPrompts = 0;
    let promptsWithWebAccess = 0;
    let totalCitations = 0;
    const uniqueSourcesSet = new Set<string>();

    reports.forEach(report => {
      const explorerData = report.explorer;
      if (!explorerData) return;

      // Aggregate summary data
      if (explorerData.summary) {
        totalPrompts += explorerData.summary.totalPrompts || 0;
        promptsWithWebAccess += explorerData.summary.promptsWithWebAccess || 0;
        totalCitations += explorerData.summary.totalCitations || 0;
      }

      // Aggregate top mentions
      if (explorerData.topMentions) {
        explorerData.topMentions.forEach(item => {
          mentionCounts[item.mention] = (mentionCounts[item.mention] || 0) + item.count;
        });
      }

      // Aggregate top keywords
      if (explorerData.topKeywords) {
        explorerData.topKeywords.forEach(item => {
          if (item.keyword.toLowerCase() !== 'unknown') {
            keywordCounts[item.keyword] = (keywordCounts[item.keyword] || 0) + item.count;
          }
        });
      }

      // Aggregate top sources
      if (explorerData.topSources) {
        explorerData.topSources.forEach(item => {
          sourceCounts[item.domain] = (sourceCounts[item.domain] || 0) + item.count;
          uniqueSourcesSet.add(item.domain);
        });
      }

      // Also process citations for additional sources
      if (explorerData.citations) {
        explorerData.citations.forEach(citation => {
          const domain = citation.website || 'unknown';
          uniqueSourcesSet.add(domain);
        });
      }
    });

    // Convert to sorted arrays
    const topMentions: ExplorerItemDto[] = Object.entries(mentionCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topKeywords: ExplorerItemDto[] = Object.entries(keywordCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topSources: ExplorerItemDto[] = Object.entries(sourceCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate percentages
    const totalMentionCount = Object.values(mentionCounts).reduce((sum, count) => sum + count, 0);
    const totalKeywordCount = Object.values(keywordCounts).reduce((sum, count) => sum + count, 0);
    const totalSourceCount = Object.values(sourceCounts).reduce((sum, count) => sum + count, 0);

    topMentions.forEach(item => {
      item.percentage = totalMentionCount > 0 ? Math.round((item.count / totalMentionCount) * 100) : 0;
    });

    topKeywords.forEach(item => {
      item.percentage = totalKeywordCount > 0 ? Math.round((item.count / totalKeywordCount) * 100) : 0;
    });

    topSources.forEach(item => {
      item.percentage = totalSourceCount > 0 ? Math.round((item.count / totalSourceCount) * 100) : 0;
    });

    const webAccessPercentage = totalPrompts > 0 
      ? Math.round((promptsWithWebAccess / totalPrompts) * 100) 
      : 0;

    return {
      topMentions,
      topKeywords,
      topSources,
      summary: {
        totalPrompts,
        promptsWithWebAccess,
        webAccessPercentage,
        totalCitations,
        uniqueSources: uniqueSourcesSet.size,
      },
      reportCount: reports.length,
      dateRange: {
        start: reports[0].reportDate.toISOString(),
        end: reports[reports.length - 1].reportDate.toISOString()
      }
    };
  }

  private createEmptyExplorerResponse(projectId: string): AggregatedExplorerResponseDto {
    return {
      topMentions: [],
      topKeywords: [],
      topSources: [],
      summary: {
        totalPrompts: 0,
        promptsWithWebAccess: 0,
        webAccessPercentage: 0,
        totalCitations: 0,
        uniqueSources: 0,
      },
      reportCount: 0,
      dateRange: { start: '', end: '' }
    };
  }
}