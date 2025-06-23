import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import { BrandReport, BrandReportDocument } from '../schemas/brand-report.schema';
import { BrandReportResponseDto } from '../dto/brand-report-response.dto';
import { AggregatedReportQueryDto } from '../dto/aggregated-report-query.dto';
import { AggregatedVisibilityResponseDto, VisibilityChartDataDto, CompetitorDataDto, TopMentionDto } from '../dto/aggregated-visibility-response.dto';
import { AggregatedAlignmentResponseDto, AlignmentChartDataDto, AttributeScoreDto } from '../dto/aggregated-alignment-response.dto';
import { AggregatedSentimentResponseDto, SentimentChartDataDto } from '../dto/aggregated-sentiment-response.dto';
import { AggregatedExplorerResponseDto, ExplorerItemDto } from '../dto/aggregated-explorer-response.dto';
import { AggregatedCompetitionResponseDto, CompetitorInsightDto, CompetitionChartDataDto } from '../dto/aggregated-competition-response.dto';
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

    // Debug logging
    this.logger.log(`[REPORT-001] Retrieved competition data for report ${reportId}: ${JSON.stringify({
      hasCompetition: !!report.competition,
      hasDetailedResults: !!report.competition?.detailedResults,
      detailedResultsCount: report.competition?.detailedResults?.length || 0,
      firstDetailedResult: report.competition?.detailedResults?.[0] ? {
        model: report.competition.detailedResults[0].model,
        competitor: report.competition.detailedResults[0].competitor,
        citationsCount: report.competition.detailedResults[0].citations?.length || 0,
        hasLlmResponse: !!report.competition.detailedResults[0].llmResponse,
        llmResponseLength: report.competition.detailedResults[0].llmResponse?.length || 0
      } : null
    })}`);

    // Extract citations from detailedResults if available
    let citations = null;
    if (report.competition?.detailedResults) {
      citations = this.extractCitationsFromCompetition(report.competition.detailedResults);
    }

    return {
      ...report.competition,
      citations
    };
  }

  private extractCitationsFromCompetition(detailedResults: any[]) {
    const citationMap = new Map<string, CitationItemDto>();
    
    detailedResults.forEach(result => {
      if (result.citations && Array.isArray(result.citations)) {
        result.citations.forEach((citation: any) => {
          if (citation.url) {
            try {
              const urlObj = new URL(citation.url);
              const domain = urlObj.hostname.replace('www.', '');
              
              this.aggregateCitation(
                citationMap,
                citation,
                domain,
                citation.url,
                result.originalPrompt,
                undefined, // sentiment not applicable
                undefined, // score not applicable
                result.model,
                citation.title,
                citation.text
              );
            } catch (e) {
              // Invalid URL, skip
              this.logger.warn(`Invalid URL in competition citation: ${citation.url}`);
            }
          }
        });
      }
    });

    return {
      items: Array.from(citationMap.values()),
      uniqueDomains: new Set(Array.from(citationMap.values()).map(c => c.domain)).size,
      totalCitations: Array.from(citationMap.values()).reduce((sum, c) => sum + c.count, 0)
    };
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

  /**
   * Helper method to fetch reports based on query parameters
   */
  private async fetchReportsForAggregation<T>(
    projectId: string,
    query: AggregatedReportQueryDto,
    selectFields: string
  ): Promise<T[]> {
    if (query.latestOnly) {
      // Fetch only the latest report
      const latestReport = await this.brandReportModel
        .findOne({ projectId })
        .select(selectFields)
        .sort({ reportDate: -1 })
        .lean() as T;

      return latestReport ? [latestReport] : [];
    } else {
      // Build date filter
      const dateFilter: any = { projectId };
      if (query.startDate || query.endDate) {
        dateFilter.reportDate = {};
        if (query.startDate) {
          dateFilter.reportDate.$gte = new Date(query.startDate);
        }
        if (query.endDate) {
          // For end date, include the entire day by using the start of the next day
          const endDate = new Date(query.endDate);
          endDate.setDate(endDate.getDate() + 1);
          dateFilter.reportDate.$lt = endDate;
        }
      }

      // Fetch reports within date range
      return await this.brandReportModel
        .find(dateFilter)
        .select(selectFields)
        .sort({ reportDate: 1 })
        .lean() as T[];
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
    // Fetch reports using helper method
    const reports = await this.fetchReportsForAggregation<BrandReportVisibilitySelect & { explorer?: ExplorerData }>(
      projectId,
      query,
      'id reportDate generatedAt visibility explorer'
    );

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
    
    // Track mentions with original casing preserved
    const mentionTracker: Map<string, { displayName: string; count: number }> = new Map();

    reports.forEach(report => {
      const visData = report.visibility;
      if (!visData) return;

      // Aggregate top mentions from visibility data
      if (report.visibility?.topMentions) {
        report.visibility.topMentions.forEach(mentionItem => {
          if (mentionItem.mention && mentionItem.count) {
            // Normalize the mention for aggregation
            const normalizedMention = mentionItem.mention.toLowerCase().trim();
            
            if (!mentionTracker.has(normalizedMention)) {
              mentionTracker.set(normalizedMention, {
                displayName: mentionItem.mention, // Preserve original casing
                count: 0
              });
            }
            
            const tracker = mentionTracker.get(normalizedMention)!;
            tracker.count += mentionItem.count;
          }
        });
      }

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
    if (query.includeVariation) {
      scoreVariation = await this.calculateVariation(
        projectId,
        query,
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
    const competitors: CompetitorDataDto[] = [];
    for (const [name, data] of Object.entries(competitorMap)) {
      const avgScore = data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length;
      
      // Calculate competitor variation
      let variation = 0;
      if (query.includeVariation) {
        variation = await this.calculateCompetitorVariation(
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

    // Process top mentions from the tracker
    const mentionEntries = Array.from(mentionTracker.entries())
      .map(([normalized, data]) => ({ 
        mention: data.displayName, 
        count: data.count 
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 mentions
    
    const totalMentions = mentionEntries.reduce((sum, item) => sum + item.count, 0);
    
    const topMentions: TopMentionDto[] = mentionEntries.map(item => ({
      mention: item.mention,
      count: item.count,
      percentage: totalMentions > 0 ? Math.round((item.count / totalMentions) * 100) : 0
    }));

    // Add logging for debugging
    this.logger.log(`Aggregated visibility data: ${mentionTracker.size} unique mentions across ${reports.length} reports`);
    if (topMentions.length > 0) {
      this.logger.log(`Top aggregated mention: ${topMentions[0].mention} (${topMentions[0].count} total mentions, ${topMentions[0].percentage}%)`);
    }

    return {
      averageScore,
      scoreVariation,
      availableModels,
      chartData,
      modelBreakdown,
      competitors,
      topMentions,
      reportCount: reports.length,
      dateRange: {
        start: reports[0].reportDate.toISOString(),
        end: reports[reports.length - 1].reportDate.toISOString()
      }
    };
  }

  /**
   * Helper function to properly aggregate citations with deduplication
   */
  private aggregateCitation(
    citationMap: Map<string, CitationItemDto>,
    citation: any,
    domain: string,
    url: string,
    prompt?: string,
    sentiment?: string,
    score?: number,
    model?: string,
    title?: string,
    text?: string
  ): void {
    const key = `${domain}_${url}`;
    const existing = citationMap.get(key);
    
    if (existing) {
      // Increment count
      existing.count++;
      
      // Aggregate prompts array with deduplication
      if (prompt && !existing.prompts.includes(prompt)) {
        existing.prompts.push(prompt);
      }
      
      // Aggregate sentiments array with deduplication
      if (sentiment) {
        if (!existing.sentiments) {
          existing.sentiments = [];
        }
        if (!existing.sentiments.includes(sentiment)) {
          existing.sentiments.push(sentiment);
        }
      }
      
      // Aggregate scores array with deduplication
      if (score !== undefined) {
        if (!existing.scores) {
          existing.scores = [];
        }
        if (!existing.scores.includes(score)) {
          existing.scores.push(score);
        }
      }
      
      // Aggregate models array with deduplication
      if (model && !existing.models.includes(model)) {
        existing.models.push(model);
      }
    } else {
      // Create new citation entry using array-based structure
      const newCitation: CitationItemDto = {
        domain,
        url,
        title: title || '',
        prompts: prompt ? [prompt] : [],
        sentiments: sentiment ? [sentiment] : undefined,
        scores: score !== undefined ? [score] : undefined,
        count: 1,
        models: model ? [model] : [],
        text
      };
      
      citationMap.set(key, newCitation);
    }
  }

  async getAggregatedAlignment(
    projectId: string,
    query: AggregatedReportQueryDto
  ): Promise<AggregatedAlignmentResponseDto> {
    // Fetch reports using helper method
    const reports = await this.fetchReportsForAggregation<BrandReportAlignmentSelect>(
      projectId,
      query,
      'id reportDate generatedAt alignment'
    );

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
                  
                  this.aggregateCitation(
                    citationMap,
                    citation,
                    domain,
                    citation.url,
                    result.originalPrompt || '',
                    undefined, // no sentiment for alignment
                    avgScore,
                    result.model,
                    citation.title,
                    citation.text
                  );
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
    if (query.includeVariation) {
      scoreVariation = await this.calculateVariation(
        projectId,
        query,
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
    // Fetch reports using helper method - include explorer for citations
    const reports = await this.fetchReportsForAggregation<any>(
      projectId,
      query,
      'id reportDate generatedAt sentiment explorer'
    );

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
      if (!sentData?.distribution) {
        this.logger.log(`Skipping report ${report.id} - no sentiment distribution`);
        return;
      }

      // Log report info for debugging
      this.logger.log(`Processing sentiment report ${report.id} with date ${report.reportDate}`);
      this.logger.log(`Report has explorer data: ${!!report.explorer}`);
      this.logger.log(`Report has sentiment detailedResults: ${!!(sentData.detailedResults && sentData.detailedResults.length > 0)}`);

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

          filteredResults.forEach((result: any) => {
            // Handle both old format (sentimentBreakdown) and new format (sentiment string)
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
            
            // Collect citations
            if (result.citations && Array.isArray(result.citations)) {
              result.citations.forEach((citation: any) => {
                if (citation.url) {
                  try {
                    const urlObj = new URL(citation.url);
                    const domain = urlObj.hostname;
                    
                    this.aggregateCitation(
                      citationMap,
                      citation,
                      domain,
                      citation.url,
                      result.originalPrompt || '',
                      result.overallSentiment || 'neutral',
                      undefined, // no score for sentiment
                      result.model,
                      citation.title,
                      citation.text
                    );
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
      
      // Check heatmapData for citations (sentiment stores details here instead of detailedResults)
      if (sentData.heatmapData && Array.isArray(sentData.heatmapData)) {
        this.logger.log(`Found ${sentData.heatmapData.length} heatmap entries for sentiment report`);
        
        sentData.heatmapData.forEach((heatmapEntry: any) => {
          if (heatmapEntry.results && Array.isArray(heatmapEntry.results)) {
            heatmapEntry.results.forEach((result: any) => {
              // Check if model is selected
              const isModelSelected = selectedModels.length === 0 || selectedModels.includes(result.model);
              
              if (isModelSelected && result.citations && Array.isArray(result.citations)) {
                this.logger.log(`Found ${result.citations.length} citations for model ${result.model}`);
                
                result.citations.forEach((citation: any) => {
                  if (citation.url) {
                    try {
                      const urlObj = new URL(citation.url);
                      const domain = urlObj.hostname;
                      
                      this.aggregateCitation(
                        citationMap,
                        citation,
                        domain,
                        citation.url,
                        heatmapEntry.question || '',
                        result.sentiment || 'neutral',
                        undefined, // no score for sentiment heatmap
                        result.model,
                        citation.title || '',
                        citation.text
                      );
                    } catch (e) {
                      this.logger.warn(`Invalid URL in heatmap citation: ${citation.url}`);
                    }
                  }
                });
              }
            });
          }
        });
      }
      
      // Also check explorer citations for sentiment reports
      this.logger.log(`About to check explorer citations. Has explorer: ${!!report.explorer}, Has citations: ${!!(report.explorer?.citations)}`);
      if (report.explorer?.citations) {
        this.logger.log(`Checking explorer citations for sentiment report, found ${report.explorer.citations.length} citations`);
        
        // Log first few citations to see their structure
        if (report.explorer.citations.length > 0) {
          this.logger.log(`Sample citation: ${JSON.stringify(report.explorer.citations[0])}`);
        }
        
        report.explorer.citations.forEach((citation: any) => {
          // Log all prompt types to debug
          if (citation.promptType) {
            this.logger.log(`Citation promptType: ${citation.promptType}`);
          }
          
          // Include ALL citations for debugging - we'll filter later
          // Just check if the model is in selected models
          const isModelSelected = selectedModels.length === 0 || selectedModels.includes(citation.model);
          
          // For now, include all citations with links for debugging
          if (isModelSelected && citation.link) {
            try {
              const urlObj = new URL(citation.link);
              const domain = urlObj.hostname;
              
              // Get prompt text - it might be stored directly or need to be inferred
              const promptText = citation.promptText || `${citation.promptType} prompt` || '';
              
              this.aggregateCitation(
                citationMap,
                citation,
                domain,
                citation.link,
                promptText,
                'neutral', // Default to neutral for explorer citations
                undefined, // no score for explorer citations
                citation.model,
                citation.website || '',
                undefined
              );
            } catch (e) {
              this.logger.warn(`Invalid URL in citation: ${citation.link}`);
            }
          }
        });
        this.logger.log(`Added ${citationMap.size} citations from explorer data`);
      }
    });

    const positivePercentage = sentimentCount > 0 ? Math.round(totalPositive / sentimentCount) : 0;
    const neutralPercentage = sentimentCount > 0 ? Math.round(totalNeutral / sentimentCount) : 0;
    const negativePercentage = sentimentCount > 0 ? Math.round(totalNegative / sentimentCount) : 0;

    // Calculate variations
    let sentimentVariation = { positive: 0, neutral: 0, negative: 0 };
    if (query.includeVariation) {
      sentimentVariation = await this.calculateSentimentVariation(
        projectId,
        query,
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

    // Log citation summary
    this.logger.log(`Citation summary: ${citationItems.length} items, ${uniqueDomains} domains, ${totalCitations} total`);
    if (citationItems.length > 0) {
      this.logger.log(`First citation: ${JSON.stringify(citationItems[0])}`);
    }

    const result = {
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

    this.logger.log(`Returning sentiment response with citations: ${result.citations ? 'YES' : 'NO'}`);
    
    return result;
  }

  async getAggregatedCompetition(
    projectId: string,
    query: AggregatedReportQueryDto
  ): Promise<AggregatedCompetitionResponseDto> {
    // Fetch reports using helper method
    const reports = await this.fetchReportsForAggregation<any>(
      projectId,
      query,
      'id reportDate generatedAt competition brandName'
    );

    if (reports.length === 0) {
      return this.createEmptyCompetitionResponse(projectId);
    }

    // Extract brand name and competitors
    const brandName = reports[0].brandName || 'Brand';
    const allCompetitors = new Set<string>();
    const allModels = new Set<string>();
    const chartData: CompetitionChartDataDto[] = [];
    const competitorStrengths: Record<string, string[]> = {};
    const competitorWeaknesses: Record<string, string[]> = {};
    const allStrengths: string[] = [];
    const allWeaknesses: string[] = [];

    // Aggregate citation data
    const citationMap = new Map<string, CitationItemDto>();

    reports.forEach(report => {
      if (report.competition) {
        // Extract competitors
        if (report.competition.competitors) {
          report.competition.competitors.forEach((comp: string) => allCompetitors.add(comp));
        }

        // Extract models and aggregate strengths/weaknesses
        if (report.competition.detailedResults) {
          report.competition.detailedResults.forEach((result: any) => {
            allModels.add(result.model);

            // Aggregate strengths and weaknesses by competitor
            if (!competitorStrengths[result.competitor]) {
              competitorStrengths[result.competitor] = [];
              competitorWeaknesses[result.competitor] = [];
            }

            if (result.brandStrengths) {
              competitorStrengths[result.competitor].push(...result.brandStrengths);
              allStrengths.push(...result.brandStrengths);
            }

            if (result.brandWeaknesses) {
              competitorWeaknesses[result.competitor].push(...result.brandWeaknesses);
              allWeaknesses.push(...result.brandWeaknesses);
            }

            // Aggregate citations
            if (result.citations && Array.isArray(result.citations)) {
              result.citations.forEach((citation: any) => {
                if (citation.url) {
                  try {
                    const urlObj = new URL(citation.url);
                    const domain = urlObj.hostname.replace('www.', '');
                    
                    this.aggregateCitation(
                      citationMap,
                      citation,
                      domain,
                      citation.url,
                      result.originalPrompt || '',
                      undefined, // no sentiment for competition
                      undefined, // no score for competition
                      result.model,
                      citation.title || '',
                      citation.text
                    );
                  } catch (e) {
                    this.logger.warn(`Invalid URL in competition citation: ${citation.url}`);
                  }
                }
              });
            }
          });
        }

        // Build chart data
        const competitorCounts: Record<string, { strengthsCount: number; weaknessesCount: number }> = {};
        report.competition.competitorAnalyses?.forEach((analysis: any) => {
          let strengthsCount = 0;
          let weaknessesCount = 0;

          analysis.analysisByModel?.forEach((modelAnalysis: any) => {
            strengthsCount += modelAnalysis.strengths?.length || 0;
            weaknessesCount += modelAnalysis.weaknesses?.length || 0;
          });

          competitorCounts[analysis.competitor] = { strengthsCount, weaknessesCount };
        });

        chartData.push({
          date: report.reportDate.toISOString(),
          competitors: competitorCounts,
          reportId: report.id
        });
      }
    });

    const availableModels = Array.from(allModels).sort();
    const selectedModels = query.models && query.models.length > 0 
      ? query.models.filter(model => availableModels.includes(model))
      : availableModels;

    // Filter citations by selected models
    const citationItems = Array.from(citationMap.values()).filter(citation => 
      citation.models.some(model => selectedModels.includes(model))
    );

    const uniqueDomains = new Set(citationItems.map(c => c.domain)).size;
    const totalCitations = citationItems.reduce((sum, c) => sum + c.count, 0);

    // Build competitor insights
    const competitorsList = Array.from(allCompetitors);
    const competitorInsights: CompetitorInsightDto[] = competitorsList.map(competitor => {
      const strengths = competitorStrengths[competitor] || [];
      const weaknesses = competitorWeaknesses[competitor] || [];

      // Count occurrences
      const strengthCounts: Record<string, number> = {};
      const weaknessCounts: Record<string, number> = {};

      strengths.forEach(s => {
        const normalized = s.toLowerCase();
        strengthCounts[normalized] = (strengthCounts[normalized] || 0) + 1;
      });

      weaknesses.forEach(w => {
        const normalized = w.toLowerCase();
        weaknessCounts[normalized] = (weaknessCounts[normalized] || 0) + 1;
      });

      // Get top 5 of each
      const topStrengths = Object.entries(strengthCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([s]) => s);

      const topWeaknesses = Object.entries(weaknessCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([w]) => w);

      return {
        competitor,
        strengthsCount: strengths.length,
        weaknessesCount: weaknesses.length,
        topStrengths,
        topWeaknesses
      };
    });

    // Find common strengths and weaknesses
    const commonStrengths = this.findCommonItems(Object.values(competitorStrengths));
    const commonWeaknesses = this.findCommonItems(Object.values(competitorWeaknesses));

    return {
      brandName,
      competitors: competitorsList,
      availableModels,
      competitorInsights,
      commonStrengths,
      commonWeaknesses,
      chartData,
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

  private findCommonItems(arrays: string[][]): string[] {
    if (arrays.length === 0) return [];
    if (arrays.length === 1) return arrays[0].slice(0, 5); // Return top 5

    // Count occurrences across arrays
    const itemCounts: Record<string, number> = {};
    
    arrays.forEach(array => {
      const seen = new Set<string>();
      array.forEach(item => {
        const normalized = item.toLowerCase();
        if (!seen.has(normalized)) {
          seen.add(normalized);
          itemCounts[normalized] = (itemCounts[normalized] || 0) + 1;
        }
      });
    });

    // Find items that appear in at least half of the arrays
    const threshold = Math.ceil(arrays.length / 2);
    return Object.entries(itemCounts)
      .filter(([_, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([item]) => item);
  }

  private async calculateVariation(
    projectId: string,
    query: AggregatedReportQueryDto,
    selectedModels: string[],
    type: 'visibility' | 'alignment'
  ): Promise<number> {
    this.logger.log(`[calculateVariation] Starting for type: ${type}, projectId: ${projectId}, selectedModels: ${selectedModels.join(',')}`);
    this.logger.log(`[calculateVariation] Query dates: ${query.startDate} to ${query.endDate}`);

    // Build date filter
    const dateFilter: any = { projectId };
    if (query.startDate || query.endDate) {
      dateFilter.reportDate = {};
      if (query.startDate) {
        dateFilter.reportDate.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        // For end date, include the entire day by using the start of the next day
        const endDate = new Date(query.endDate);
        endDate.setDate(endDate.getDate() + 1);
        dateFilter.reportDate.$lt = endDate;
      }
    }

    // Get all reports within the date filter
    const allReports = await this.brandReportModel
      .find(dateFilter)
      .select(`reportDate ${type}`)
      .sort({ reportDate: 1 })
      .lean();

    this.logger.log(`[calculateVariation] Found ${allReports.length} reports in date range`);
    if (allReports.length > 0) {
      this.logger.log(`[calculateVariation] First report date: ${allReports[0].reportDate}, Last report date: ${allReports[allReports.length - 1].reportDate}`);
    }

    if (allReports.length === 0) return 0;

    let periodLength: number;
    let previousStartDate: Date;
    let previousEndDate: Date;

    // Use query date range if provided, otherwise fall back to report dates
    if (query.startDate && query.endDate) {
      const queryStart = new Date(query.startDate);
      const queryEnd = new Date(query.endDate);
      periodLength = queryEnd.getTime() - queryStart.getTime();
      
      this.logger.log(`[calculateVariation] Using query date range: ${query.startDate} to ${query.endDate}`);
      this.logger.log(`[calculateVariation] Period length: ${periodLength}ms (${periodLength / (1000 * 60 * 60 * 24)} days)`);

      // Calculate previous period of same length
      if (periodLength === 0) {
        this.logger.log(`[calculateVariation] Single point in time - looking for previous report before ${queryStart}`);
        // Single point in time - find the most recent previous report
        const previousReport = await this.brandReportModel
          .findOne({
            projectId,
            reportDate: { $lt: queryStart }
          })
          .select(`reportDate ${type}`)
          .sort({ reportDate: -1 })
          .lean();

        this.logger.log(`[calculateVariation] Previous report found: ${!!previousReport}`);
        if (previousReport) {
          this.logger.log(`[calculateVariation] Previous report date: ${previousReport.reportDate}`);
          return this.calculateSinglePointVariation(allReports, [previousReport], selectedModels, type);
        } else {
          this.logger.log(`[calculateVariation] No previous report found for single point query`);
          return 0;
        }
      } else {
        // Time range - get previous period of same length
        previousEndDate = queryStart;
        previousStartDate = new Date(queryStart.getTime() - periodLength);
        this.logger.log(`[calculateVariation] Time range - looking for reports between ${previousStartDate.toISOString()} and ${previousEndDate.toISOString()}`);
      }
    } else {
      // Fall back to report dates (legacy behavior)
      const startDate = allReports[0].reportDate;
      const endDate = allReports[allReports.length - 1].reportDate;
      periodLength = endDate.getTime() - startDate.getTime();

      this.logger.log(`[calculateVariation] Using report dates: ${startDate} to ${endDate}`);
      this.logger.log(`[calculateVariation] Period length: ${periodLength}ms (${periodLength / (1000 * 60 * 60 * 24)} days)`);

      if (periodLength === 0) {
        this.logger.log(`[calculateVariation] Single point in time - looking for previous report before ${startDate}`);
        const previousReport = await this.brandReportModel
          .findOne({
            projectId,
            reportDate: { $lt: startDate }
          })
          .select(`reportDate ${type}`)
          .sort({ reportDate: -1 })
          .lean();

        if (previousReport) {
          return this.calculateSinglePointVariation(allReports, [previousReport], selectedModels, type);
        }
        return 0;
      } else {
        previousEndDate = startDate;
        previousStartDate = new Date(startDate.getTime() - periodLength);
      }
    }

    // Get previous period reports
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

    this.logger.log(`[calculateVariation] Found ${previousReports.length} previous reports`);
    if (previousReports.length > 0) {
      previousReports.forEach((report, idx) => {
        this.logger.log(`[calculateVariation] Previous report ${idx + 1}: ${report.reportDate.toISOString()}`);
      });
    }

    if (previousReports.length === 0) {
      this.logger.log(`[calculateVariation] No previous reports found, returning 0`);
      return 0;
    }

    // Calculate scores for both periods
    const currentScore = this.calculatePeriodScore(allReports, selectedModels, type);
    const previousScore = this.calculatePeriodScore(previousReports, selectedModels, type);

    this.logger.log(`[calculateVariation] Current score: ${currentScore}, Previous score: ${previousScore}`);

    if (previousScore === 0) {
      this.logger.log(`[calculateVariation] Previous score is 0, returning 0`);
      return 0;
    }

    const variation = Math.round(((currentScore - previousScore) / previousScore) * 100);
    this.logger.log(`[calculateVariation] Calculated variation: ${variation}%`);

    return variation;
  }

  private calculateSinglePointVariation(
    currentReports: any[],
    previousReports: any[],
    selectedModels: string[],
    type: 'visibility' | 'alignment'
  ): number {
    const currentScore = this.calculatePeriodScore(currentReports, selectedModels, type);
    const previousScore = this.calculatePeriodScore(previousReports, selectedModels, type);

    this.logger.log(`[calculateSinglePointVariation] Current score: ${currentScore}, Previous score: ${previousScore}`);

    if (previousScore === 0) {
      this.logger.log(`[calculateSinglePointVariation] Previous score is 0, returning 0`);
      return 0;
    }

    const variation = Math.round(((currentScore - previousScore) / previousScore) * 100);
    this.logger.log(`[calculateSinglePointVariation] Calculated variation: ${variation}%`);

    return variation;
  }

  private async calculateCompetitorVariation(
    projectId: string,
    query: AggregatedReportQueryDto,
    competitorName: string
  ): Promise<number> {
    this.logger.log(`[calculateCompetitorVariation] Starting for competitor: ${competitorName}, projectId: ${projectId}`);
    this.logger.log(`[calculateCompetitorVariation] Query dates: ${query.startDate} to ${query.endDate}`);

    // Build date filter
    const dateFilter: any = { projectId };
    if (query.startDate || query.endDate) {
      dateFilter.reportDate = {};
      if (query.startDate) {
        dateFilter.reportDate.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        // For end date, include the entire day by using the start of the next day
        const endDate = new Date(query.endDate);
        endDate.setDate(endDate.getDate() + 1);
        dateFilter.reportDate.$lt = endDate;
      }
    }

    // Get all reports within the date filter
    const allReports = await this.brandReportModel
      .find(dateFilter)
      .select('reportDate visibility')
      .sort({ reportDate: 1 })
      .lean();

    this.logger.log(`[calculateCompetitorVariation] Found ${allReports.length} reports in date range`);

    if (allReports.length === 0) return 0;

    let periodLength: number;
    let previousStartDate: Date;
    let previousEndDate: Date;

    // Use query date range if provided, otherwise fall back to report dates
    if (query.startDate && query.endDate) {
      const queryStart = new Date(query.startDate);
      const queryEnd = new Date(query.endDate);
      periodLength = queryEnd.getTime() - queryStart.getTime();
      
      this.logger.log(`[calculateCompetitorVariation] Using query date range: ${query.startDate} to ${query.endDate}`);
      this.logger.log(`[calculateCompetitorVariation] Period length: ${periodLength}ms (${periodLength / (1000 * 60 * 60 * 24)} days)`);

      // Calculate previous period of same length
      if (periodLength === 0) {
        this.logger.log(`[calculateCompetitorVariation] Single point in time - looking for previous report before ${queryStart}`);
        // Single point in time - find the most recent previous report
        const previousReport = await this.brandReportModel
          .findOne({
            projectId,
            reportDate: { $lt: queryStart }
          })
          .select('reportDate visibility')
          .sort({ reportDate: -1 })
          .lean();

        this.logger.log(`[calculateCompetitorVariation] Previous report found: ${!!previousReport}`);
        if (previousReport) {
          const currentScore = this.calculateCompetitorPeriodScore(allReports, competitorName);
          const previousScore = this.calculateCompetitorPeriodScore([previousReport], competitorName);
          
          if (previousScore === 0) return 0;
          return Math.round(((currentScore - previousScore) / previousScore) * 100);
        } else {
          this.logger.log(`[calculateCompetitorVariation] No previous report found for single point query`);
          return 0;
        }
      } else {
        // Time range - get previous period of same length
        previousEndDate = queryStart;
        previousStartDate = new Date(queryStart.getTime() - periodLength);
        this.logger.log(`[calculateCompetitorVariation] Time range - looking for reports between ${previousStartDate.toISOString()} and ${previousEndDate.toISOString()}`);
      }
    } else {
      // Fall back to report dates (legacy behavior)
      const startDate = allReports[0].reportDate;
      const endDate = allReports[allReports.length - 1].reportDate;
      periodLength = endDate.getTime() - startDate.getTime();

      this.logger.log(`[calculateCompetitorVariation] Using report dates: ${startDate} to ${endDate}`);
      this.logger.log(`[calculateCompetitorVariation] Period length: ${periodLength}ms`);

      if (periodLength === 0) {
        this.logger.log(`[calculateCompetitorVariation] Single point in time - looking for previous report before ${startDate}`);
        const previousReport = await this.brandReportModel
          .findOne({
            projectId,
            reportDate: { $lt: startDate }
          })
          .select('reportDate visibility')
          .sort({ reportDate: -1 })
          .lean();

        if (previousReport) {
          const currentScore = this.calculateCompetitorPeriodScore(allReports, competitorName);
          const previousScore = this.calculateCompetitorPeriodScore([previousReport], competitorName);
          
          if (previousScore === 0) return 0;
          return Math.round(((currentScore - previousScore) / previousScore) * 100);
        }
        return 0;
      } else {
        previousEndDate = startDate;
        previousStartDate = new Date(startDate.getTime() - periodLength);
      }
    }

    // Get previous period reports
    const previousReports = await this.brandReportModel
      .find({
        projectId,
        reportDate: {
          $gte: previousStartDate,
          $lt: previousEndDate
        }
      })
      .select('reportDate visibility')
      .lean();

    this.logger.log(`[calculateCompetitorVariation] Found ${previousReports.length} previous reports`);
    if (previousReports.length > 0) {
      previousReports.forEach((report, idx) => {
        this.logger.log(`[calculateCompetitorVariation] Previous report ${idx + 1}: ${report.reportDate.toISOString()}`);
      });
    }

    if (previousReports.length === 0) {
      this.logger.log(`[calculateCompetitorVariation] No previous reports found, returning 0`);
      return 0;
    }

    // Calculate competitor scores for both periods
    const currentScore = this.calculateCompetitorPeriodScore(allReports, competitorName);
    const previousScore = this.calculateCompetitorPeriodScore(previousReports, competitorName);

    this.logger.log(`[calculateCompetitorVariation] Current score: ${currentScore}, Previous score: ${previousScore}`);

    if (previousScore === 0) {
      this.logger.log(`[calculateCompetitorVariation] Previous score is 0, returning 0`);
      return 0;
    }

    const variation = Math.round(((currentScore - previousScore) / previousScore) * 100);
    this.logger.log(`[calculateCompetitorVariation] Calculated variation: ${variation}%`);

    return variation;
  }

  private calculateCompetitorPeriodScore(
    reports: any[],
    competitorName: string
  ): number {
    let totalScore = 0;
    let scoreCount = 0;

    this.logger.log(`[calculateCompetitorPeriodScore] Processing ${reports.length} reports for competitor: ${competitorName}`);

    reports.forEach((report, index) => {
      this.logger.log(`[calculateCompetitorPeriodScore] Report ${index + 1}: ${report.reportDate}`);
      
      if (report.visibility?.arenaMetrics && Array.isArray(report.visibility.arenaMetrics)) {
        this.logger.log(`[calculateCompetitorPeriodScore] Found ${report.visibility.arenaMetrics.length} arenaMetrics`);
        
        const competitor = report.visibility.arenaMetrics.find(
          (metric: any) => metric.name === competitorName
        );
        
        this.logger.log(`[calculateCompetitorPeriodScore] Competitor ${competitorName} found: ${!!competitor}`);
        
        if (competitor && competitor.global) {
          const globalScore = parseInt(competitor.global.replace('%', ''), 10);
          this.logger.log(`[calculateCompetitorPeriodScore] Raw global: "${competitor.global}", parsed score: ${globalScore}`);
          
          if (!isNaN(globalScore)) {
            totalScore += globalScore;
            scoreCount++;
            this.logger.log(`[calculateCompetitorPeriodScore] Added score: ${globalScore}, running total: ${totalScore}, count: ${scoreCount}`);
          }
        } else {
          this.logger.log(`[calculateCompetitorPeriodScore] Competitor data invalid - competitor: ${!!competitor}, global: ${competitor?.global}`);
        }
      } else {
        this.logger.log(`[calculateCompetitorPeriodScore] No arenaMetrics found in report`);
      }
    });

    const averageScore = scoreCount > 0 ? totalScore / scoreCount : 0;
    this.logger.log(`[calculateCompetitorPeriodScore] Final result for ${competitorName}: ${averageScore} (total: ${totalScore}, count: ${scoreCount})`);

    return averageScore;
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
    query: AggregatedReportQueryDto,
    selectedModels: string[]
  ): Promise<{ positive: number; neutral: number; negative: number }> {
    // Build date filter
    const dateFilter: any = { projectId };
    if (query.startDate || query.endDate) {
      dateFilter.reportDate = {};
      if (query.startDate) {
        dateFilter.reportDate.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        // For end date, include the entire day by using the start of the next day
        const endDate = new Date(query.endDate);
        endDate.setDate(endDate.getDate() + 1);
        dateFilter.reportDate.$lt = endDate;
      }
    }

    // Get all reports within the date filter
    const allReports = await this.brandReportModel
      .find(dateFilter)
      .select('reportDate sentiment')
      .sort({ reportDate: 1 })
      .lean();

    if (allReports.length === 0) {
      return { positive: 0, neutral: 0, negative: 0 };
    }

    let periodLength: number;
    let previousStartDate: Date;
    let previousEndDate: Date;

    // Use query date range if provided, otherwise fall back to report dates
    if (query.startDate && query.endDate) {
      const queryStart = new Date(query.startDate);
      const queryEnd = new Date(query.endDate);
      periodLength = queryEnd.getTime() - queryStart.getTime();
      
      this.logger.log(`[calculateSentimentVariation] Using query date range: ${query.startDate} to ${query.endDate}`);
      this.logger.log(`[calculateSentimentVariation] Period length: ${periodLength}ms (${periodLength / (1000 * 60 * 60 * 24)} days)`);

      // Calculate previous period of same length
      if (periodLength === 0) {
        // Single point in time - find the most recent previous report
        const previousReport = await this.brandReportModel
          .findOne({
            projectId,
            reportDate: { $lt: queryStart }
          })
          .select('reportDate sentiment')
          .sort({ reportDate: -1 })
          .lean();

        if (previousReport) {
          const currentSentiment = this.calculatePeriodSentiment(allReports, selectedModels);
          const previousSentiment = this.calculatePeriodSentiment([previousReport], selectedModels);
          
          const calculateVariation = (current: number, previous: number) => {
            if (previous === 0) return 0;
            return Math.round(((current - previous) / previous) * 100);
          };

          return {
            positive: calculateVariation(currentSentiment.positive, previousSentiment.positive),
            neutral: calculateVariation(currentSentiment.neutral, previousSentiment.neutral),
            negative: calculateVariation(currentSentiment.negative, previousSentiment.negative)
          };
        } else {
          return { positive: 0, neutral: 0, negative: 0 };
        }
      } else {
        // Time range - get previous period of same length
        previousEndDate = queryStart;
        previousStartDate = new Date(queryStart.getTime() - periodLength);
        this.logger.log(`[calculateSentimentVariation] Time range - looking for reports between ${previousStartDate.toISOString()} and ${previousEndDate.toISOString()}`);
      }
    } else {
      // Fall back to report dates (legacy behavior)
      const startDate = allReports[0].reportDate;
      const endDate = allReports[allReports.length - 1].reportDate;
      periodLength = endDate.getTime() - startDate.getTime();

      this.logger.log(`[calculateSentimentVariation] Using report dates: ${startDate} to ${endDate}`);
      this.logger.log(`[calculateSentimentVariation] Period length: ${periodLength}ms`);

      if (periodLength === 0) {
        const previousReport = await this.brandReportModel
          .findOne({
            projectId,
            reportDate: { $lt: startDate }
          })
          .select('reportDate sentiment')
          .sort({ reportDate: -1 })
          .lean();

        if (previousReport) {
          const currentSentiment = this.calculatePeriodSentiment(allReports, selectedModels);
          const previousSentiment = this.calculatePeriodSentiment([previousReport], selectedModels);
          
          const calculateVariation = (current: number, previous: number) => {
            if (previous === 0) return 0;
            return Math.round(((current - previous) / previous) * 100);
          };

          return {
            positive: calculateVariation(currentSentiment.positive, previousSentiment.positive),
            neutral: calculateVariation(currentSentiment.neutral, previousSentiment.neutral),
            negative: calculateVariation(currentSentiment.negative, previousSentiment.negative)
          };
        }
        return { positive: 0, neutral: 0, negative: 0 };
      } else {
        previousEndDate = startDate;
        previousStartDate = new Date(startDate.getTime() - periodLength);
      }
    }

    // Get previous period reports
    const previousReports = await this.brandReportModel
      .find({
        projectId,
        reportDate: {
          $gte: previousStartDate,
          $lt: previousEndDate
        }
      })
      .select('reportDate sentiment')
      .lean();

    this.logger.log(`[calculateSentimentVariation] Found ${previousReports.length} previous reports`);

    if (previousReports.length === 0) {
      return { positive: 0, neutral: 0, negative: 0 };
    }

    // Calculate sentiment percentages for both periods
    const currentSentiment = this.calculatePeriodSentiment(allReports, selectedModels);
    const previousSentiment = this.calculatePeriodSentiment(previousReports, selectedModels);

    // Calculate variations
    const calculateVariation = (current: number, previous: number) => {
      if (previous === 0) return 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return {
      positive: calculateVariation(currentSentiment.positive, previousSentiment.positive),
      neutral: calculateVariation(currentSentiment.neutral, previousSentiment.neutral),
      negative: calculateVariation(currentSentiment.negative, previousSentiment.negative)
    };
  }

  private calculatePeriodSentiment(
    reports: any[],
    selectedModels: string[]
  ): { positive: number; neutral: number; negative: number } {
    let totalPositive = 0;
    let totalNeutral = 0;
    let totalNegative = 0;
    let sentimentCount = 0;

    this.logger.log(`[calculatePeriodSentiment] Processing ${reports.length} reports with ${selectedModels.length} selected models`);

    reports.forEach(report => {
      const sentData = report.sentiment;
      if (!sentData?.distribution) {
        this.logger.log(`[calculatePeriodSentiment] Skipping report ${report.id} - no sentiment distribution`);
        return;
      }

      // Use the same logic as the main aggregation method
      // Check if we have detailedResults for model-specific data
      if (sentData.detailedResults && sentData.detailedResults.length > 0) {
        this.logger.log(`[calculatePeriodSentiment] Found ${sentData.detailedResults.length} detailed results for report ${report.id}`);
        // Use detailed results if available
        const filteredResults = sentData.detailedResults.filter((r: any) =>
          selectedModels.includes(r.model)
        );

        if (filteredResults.length > 0) {
          let reportPositive = 0;
          let reportNeutral = 0;
          let reportNegative = 0;
          let modelCount = 0;

          filteredResults.forEach((result: any) => {
            // Handle both old format (sentimentBreakdown) and new format (sentiment string)
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
            const avgPositive = reportPositive / modelCount;
            const avgNeutral = reportNeutral / modelCount;
            const avgNegative = reportNegative / modelCount;

            totalPositive += avgPositive;
            totalNeutral += avgNeutral;
            totalNegative += avgNegative;
            sentimentCount++;

            this.logger.log(`[calculatePeriodSentiment] Report ${report.id}: P:${avgPositive}, N:${avgNeutral}, Neg:${avgNegative}`);
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

          this.logger.log(`[calculatePeriodSentiment] Report ${report.id} (fallback): P:${positivePercent}, N:${neutralPercent}, Neg:${negativePercent}`);
        }
      }
    });

    const positivePercentage = sentimentCount > 0 ? Math.round(totalPositive / sentimentCount) : 0;
    const neutralPercentage = sentimentCount > 0 ? Math.round(totalNeutral / sentimentCount) : 0;
    const negativePercentage = sentimentCount > 0 ? Math.round(totalNegative / sentimentCount) : 0;

    this.logger.log(`[calculatePeriodSentiment] Final averages: P:${positivePercentage}, N:${neutralPercentage}, Neg:${negativePercentage} (from ${sentimentCount} reports)`);

    return {
      positive: positivePercentage,
      neutral: neutralPercentage,
      negative: negativePercentage
    };
  }

  private createEmptyVisibilityResponse(projectId: string): AggregatedVisibilityResponseDto {
    return {
      averageScore: 0,
      scoreVariation: 0,
      availableModels: [],
      chartData: [],
      modelBreakdown: [],
      competitors: [],
      topMentions: [],
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

  private createEmptyCompetitionResponse(projectId: string): AggregatedCompetitionResponseDto {
    return {
      brandName: 'Brand',
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

  async getAggregatedExplorer(
    projectId: string,
    query: AggregatedReportQueryDto
  ): Promise<AggregatedExplorerResponseDto> {
    // Fetch reports using helper method
    const reports = await this.fetchReportsForAggregation<BrandReportExplorerSelect>(
      projectId,
      query,
      'id reportDate generatedAt explorer'
    );

    if (reports.length === 0) {
      return this.createEmptyExplorerResponse(projectId);
    }

    // Aggregate data from all reports
    const keywordCounts: Record<string, number> = {};
    const sourceCounts: Record<string, number> = {};
    const allWebSearchResults: any[] = [];
    
    let totalPrompts = 0;
    let promptsWithWebAccess = 0;
    let actualCitationCount = 0;
    const uniqueSourcesSet = new Set<string>();

    reports.forEach(report => {
      const explorerData = report.explorer;
      if (!explorerData) return;

      // Aggregate summary data
      if (explorerData.summary) {
        totalPrompts += explorerData.summary.totalPrompts || 0;
        promptsWithWebAccess += explorerData.summary.promptsWithWebAccess || 0;
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
          // Normalize domain to lowercase for unique counting
          if (item.domain) {
            uniqueSourcesSet.add(item.domain.toLowerCase());
          }
        });
      }

      // Collect webSearchResults and count actual citations
      if (explorerData.webSearchResults && Array.isArray(explorerData.webSearchResults)) {
        explorerData.webSearchResults.forEach(searchResult => {
          // Count each citation in the webSearchResults
          if (searchResult.citations && Array.isArray(searchResult.citations)) {
            actualCitationCount += searchResult.citations.length;
            
            // Also track unique sources from citations
            searchResult.citations.forEach(citation => {
              if (citation.website) {
                // Normalize website to lowercase for unique counting
                uniqueSourcesSet.add(citation.website.toLowerCase());
                
                // Also update source counts for consistency
                const domain = citation.website.toLowerCase();
                sourceCounts[domain] = (sourceCounts[domain] || 0) + 1;
              }
            });
          }
        });
        allWebSearchResults.push(...explorerData.webSearchResults);
      }

      // Also process old-format citations if present
      if (explorerData.citations && Array.isArray(explorerData.citations)) {
        actualCitationCount += explorerData.citations.length;
        explorerData.citations.forEach(citation => {
          if (citation.website) {
            // Normalize website to lowercase for unique counting
            uniqueSourcesSet.add(citation.website.toLowerCase());
            
            // Also update source counts for consistency
            const domain = citation.website.toLowerCase();
            sourceCounts[domain] = (sourceCounts[domain] || 0) + 1;
          }
        });
      }
    });

    // Convert to sorted arrays
    const topKeywords: ExplorerItemDto[] = Object.entries(keywordCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topSources: ExplorerItemDto[] = Object.entries(sourceCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate percentages
    const totalKeywordCount = Object.values(keywordCounts).reduce((sum, count) => sum + count, 0);
    const totalSourceCount = Object.values(sourceCounts).reduce((sum, count) => sum + count, 0);

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
      topKeywords,
      topSources,
      summary: {
        totalPrompts,
        promptsWithWebAccess,
        webAccessPercentage,
        totalCitations: actualCitationCount,
        uniqueSources: uniqueSourcesSet.size,
      },
      webSearchResults: allWebSearchResults,
      reportCount: reports.length,
      dateRange: {
        start: reports[0].reportDate.toISOString(),
        end: reports[reports.length - 1].reportDate.toISOString()
      }
    };
  }

  private createEmptyExplorerResponse(projectId: string): AggregatedExplorerResponseDto {
    return {
      topKeywords: [],
      topSources: [],
      summary: {
        totalPrompts: 0,
        promptsWithWebAccess: 0,
        webAccessPercentage: 0,
        totalCitations: 0,
        uniqueSources: 0,
      },
      webSearchResults: [],
      reportCount: 0,
      dateRange: { start: '', end: '' }
    };
  }
}