import { Injectable, Logger } from '@nestjs/common';
import { ComparisonResults, WebSearchSummary } from '@/modules/batch/interfaces/batch.interfaces';
import { BatchReportInput } from '../interfaces/report-input.interfaces';
import { ReportTransformationService } from './report-transformation.service';
import { Project } from '@/modules/project/entities/project.entity';
import { getMarketFlag } from '@/common/constants/markets';
import {
  WeeklyBrandReportEntity,
  ApiSentimentResult,
  ApiQuestionResult,
  DatabaseSentimentResult,
  DatabaseQuestionResult,
  CitationsData,
} from '../interfaces/report-types';
import { WeeklyBrandReportDocument } from '../schemas/weekly-brand-report.schema';
import { ReportContentResponseDto } from '../dto/report-content-response.dto';
/**
 * Service dedicated to converting between different report formats
 * Acts as an explicit conversion layer between batch results and report entities
 */
@Injectable()
export class ReportConverterService {
  private readonly logger = new Logger(ReportConverterService.name);

  constructor(private readonly transformationService: ReportTransformationService) {}

  private formatPercentage(value?: number): number {
    return value ? Math.round(value * 100) : 0;
  }

  private normalizeUrl(url: string): string {
    return url
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/+$/, '');
  }

  private getTraceDataForReport(input: BatchReportInput): {
    consultedWebsites: Array<{ url: string; count: number }>;
  } {
    const urlCounts = new Map<string, number>();

    const processWebsites = (webSearchSummary: WebSearchSummary) => {
      if (
        webSearchSummary?.consultedWebsites &&
        Array.isArray(webSearchSummary.consultedWebsites)
      ) {
        webSearchSummary.consultedWebsites.forEach((url: string) => {
          const normalizedUrl = this.normalizeUrl(url);
          urlCounts.set(normalizedUrl, (urlCounts.get(normalizedUrl) || 0) + 1);
        });
      }
    };

    if (input.spontaneous?.webSearchSummary) {
      processWebsites(input.spontaneous.webSearchSummary);
    }

    if (input.sentiment?.webSearchSummary) {
      processWebsites(input.sentiment.webSearchSummary);
    }

    if (input.comparison?.webSearchSummary) {
      processWebsites(input.comparison.webSearchSummary);
    }

    if (input.accord?.webSearchSummary) {
      processWebsites(input.accord.webSearchSummary);
    }

    const sortedWebsites = Array.from(urlCounts.entries())
      .map(([url, count]) => ({ url, count }))
      .sort((a, b) => b.count - a.count);

    return { consultedWebsites: sortedWebsites };
  }

  private getPulseDataForReport(input: BatchReportInput): WeeklyBrandReportEntity['pulse'] {
    const formattedPulse = this.transformationService.formatPulseModelVisibility(input.spontaneous);
    return {
      promptsTested: input.spontaneous?.results
        ? new Set(input.spontaneous.results.map((r) => r.promptIndex)).size
        : 0,
      modelVisibility: formattedPulse,
    };
  }

  private getToneDataForReport(input: BatchReportInput): WeeklyBrandReportEntity['tone'] {
    const formattedTone = this.transformationService.formatToneData(input.sentiment);
    return formattedTone;
  }

  private getAccordDataForReport(
    input: BatchReportInput,
    project: Project,
  ): WeeklyBrandReportEntity['accord'] {
    // Calculate average of attribute scores
    const attributeScores = input.accord?.summary?.averageAttributeScores || {};
    const scores = Object.values(attributeScores);
    const avgScore =
      scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0.5;

    const accordValue = `${Math.round(avgScore * 10)}/10`;
    const accordStatus = (avgScore > 0.6 ? 'green' : 'yellow') as 'green' | 'yellow' | 'red';

    const safeAttributes = this.transformationService.generateAttributesList(
      project,
      input.accord,
    );
    return {
      attributes: safeAttributes,
      score: {
        value: accordValue,
        status: accordStatus,
      },
    };
  }

  private getArenaDataForReport(
    input: BatchReportInput,
    project: Project,
  ): WeeklyBrandReportEntity['arena'] {
    // Only pass the comparison data, regardless of format
    const formattedArena = this.transformationService.formatArenaData(
      input.spontaneous,
      project?.competitors || [],
    );
    return formattedArena;
  }

  /**
   * Converts batch report input data to a complete report entity
   * This is the main transformation function that explicitly shows how
   * raw batch data is converted to the structured report format
   *
   * @param input Batch report data from the batch module
   * @param project Optional company project for additional metadata
   * @returns A fully formed report entity with both new and legacy structures
   */
  convertBatchInputToReportEntity(
    input: BatchReportInput,
    project: Project,
  ): WeeklyBrandReportEntity {
    this.logger.debug(`Converting batch input to report entity for project ${input.projectId}`);
    // Get config data for models list by using the llmVersions keys
    const modelsList = Object.keys(input.llmVersions || {})
      .map((provider) => `${provider}`)
      .join(', ');
    // Format sentiment value and status with helper methods
    const sentimentValue = input.sentiment?.summary?.overallSentimentPercentage;

    const sentimentStatus = this.transformationService.getSentimentStatus(
      input.sentiment?.summary?.overallSentiment || 'neutral',
    ) as 'green' | 'yellow' | 'red';

    // Calculate accord score based on attribute scores
    const attributeScores =
      input.accord?.summary && (input.accord.summary as any).averageAttributeScores
        ? (Object.values((input.accord.summary as any).averageAttributeScores) as number[])
        : [];
    const avgScore =
      attributeScores.length > 0
        ? attributeScores.reduce((sum, score) => sum + score, 0) / attributeScores.length
        : 0;

    const accordValue = `${Math.round(avgScore * 10)}/10`;
    const accordStatus = (avgScore > 0.6 ? 'green' : 'yellow') as 'green' | 'yellow' | 'red';

    return {
      // Base fields
      id: '', // This will be set by the persistence layer
      projectId: input.projectId,
      generatedAt: input.generatedAt || new Date(),
      date: input.date,
      batchExecutionId: input.batchExecutionId,
      // New structured fields
      brand: project?.brandName || input.projectId,
      metadata: {
        url: project?.website || `Unknown Website`,
        market: project?.market || 'Unknown Market',
        flag: getMarketFlag(project?.market),
        competitors: project?.competitors?.join(', ') || 'Unknown Competitors',
        date: input.date.toISOString().split('T')[0],
        models: modelsList,
      },
      kpi: {
        pulse: {
          value: `${this.formatPercentage(input.spontaneous?.summary?.mentionRate)}`,
          description: 'Global Visibility Score across all tested models',
        },
        tone: {
          value: `${this.formatPercentage(sentimentValue)}`,
          status: sentimentStatus,
          description: 'Overall sentiment score across all models',
        },
        accord: {
          value: accordValue,
          status: accordStatus,
          description: 'Brand compliance with provided attributes',
        },
        arena: {
          competitors: this.getArenaDataForReport(input, project)?.competitors,
          description: 'Top competitors mentioned by AI models',
        },
      },
      pulse: this.getPulseDataForReport(input),
      tone: this.getToneDataForReport(input),
      accord: this.getAccordDataForReport(input, project),
      arena: this.getArenaDataForReport(input, project),
      brandBattle: this.getBrandBattleDataForReport(input),
      trace: this.getTraceDataForReport(input),
      citationsData: this.getCitationsDataForReport(input),
      llmVersions: input.llmVersions || {},
    };
  }

  private getBrandBattleDataForReport(
    input: BatchReportInput,
  ): WeeklyBrandReportEntity['brandBattle'] {
    return this.transformationService.getBrandBattleData(input.comparison);
  }

  /**
   * Convert a report entity to the API response DTO
   *
   * @param reportEntity Report entity to convert to API response
   * @returns ReportContentResponseDto for API response
   */
  /**
   * Convert a MongoDB document to a fully formatted entity
   * @param document The MongoDB document from the database
   * @param project The project for additional context
   * @returns A properly formatted WeeklyBrandReportEntity
   */
  convertDocumentToEntity(
    document: Record<string, any>,
    project: Project,
  ): WeeklyBrandReportEntity {
    // For MongoDB documents that already have formatted data, use it directly
    if (document.brand && document.metadata && document.kpi) {
      const entity: WeeklyBrandReportEntity = {
        id: document.id,
        projectId: document.projectId,
        brand: document.brand,
        date: document.date,
        generatedAt: document.generatedAt,
        batchExecutionId: document.batchExecutionId,
        metadata: document.metadata,
        kpi: document.kpi,
        pulse: {
          promptsTested: document.pulse?.promptsTested || 0,
          modelVisibility: document.pulse?.modelVisibility || [],
        },
        tone: {
          sentiments: document.tone?.sentiments || [],
          questions: document.tone?.questions || [],
        },
        accord: document.accord || {
          attributes: [],
          score: { value: '0/10', status: 'yellow' },
        },
        arena: document.arena || {
          competitors: [],
          battle: { competitors: [] },
        },
        brandBattle: document.brandBattle || {
          competitorAnalyses: [],
          commonStrengths: [],
          commonWeaknesses: [],
        },
        trace: document.trace || {
          consultedWebsites: [],
        },
        citationsData: document.citationsData || {
          summary: {
            totalPrompts: 0,
            promptsWithWebAccess: 0,
            webAccessPercentage: 0,
            totalCitations: 0,
            uniqueSources: 0,
          },
          citationsByModel: [],
          sourceStatistics: [],
          topSources: [],
          topKeywords: [],
        },
        llmVersions: document.llmVersions,
      };

      return entity;
    }

    // Otherwise, convert from raw batch data
    const batchInput: BatchReportInput = {
      projectId: document.projectId,
      date: document.date,
      llmVersions: document.llmVersions || {},
      generatedAt: document.generatedAt,
      batchExecutionId: document.batchExecutionId,
      spontaneous: document.spontaneous,
      sentiment: document.sentiment,
      comparison: document.comparison,
      brandBattle: document.brandBattle,
    };

    return this.convertBatchInputToReportEntity(batchInput, project);
  }

  /**
   * Convert a report entity to a response DTO for the API
   * @param entity The report entity to convert
   * @returns A properly formatted ReportContentResponseDto
   */
  convertEntityToResponseDto(reportEntity: WeeklyBrandReportEntity): ReportContentResponseDto {
    // Create a response DTO that matches the entity structure
    const responseDto: ReportContentResponseDto = {
      id: reportEntity.id,
      projectId: reportEntity.projectId,
      generatedAt: reportEntity.generatedAt,
      batchExecutionId: reportEntity.batchExecutionId,
      brand: reportEntity.brand,
      metadata: reportEntity.metadata,
      kpi: reportEntity.kpi,
      pulse: reportEntity.pulse,
      tone: reportEntity.tone,
      accord: reportEntity.accord,
      arena: reportEntity.arena,
      brandBattle: reportEntity.brandBattle,
      trace: reportEntity.trace,
      citationsData: reportEntity.citationsData,
      // Only include raw data in development mode
      ...(process.env.NODE_ENV === 'development' &&
        reportEntity.rawData && {
          rawData: reportEntity.rawData,
        }),
    };

    return responseDto;
  }

  private getCitationsDataForReport(input: BatchReportInput): CitationsData {
    const allCitations: Array<{
      modelId: string;
      modelProvider: string;
      promptIndex: number;
      promptType: string;
      citations: any[];
      webSearchQueries: any[];
    }> = [];

    // Collect citations from all pipeline results
    const collectCitations = (results: any[] | undefined, promptType: string) => {
      if (!results) {
        this.logger.debug(`No results for ${promptType} pipeline`);
        return;
      }

      this.logger.debug(`Processing ${results.length} results for ${promptType} pipeline`);

      results.forEach((result, index) => {

        // Extract web search queries - check multiple locations
        let webSearchQueries: any[] = [];

        // First check if webSearchQueries is already extracted by batch execution service
        if (result.webSearchQueries && Array.isArray(result.webSearchQueries)) {
          webSearchQueries = result.webSearchQueries;
          this.logger.debug(`Found ${webSearchQueries.length} pre-extracted web search queries for ${result.llmModel}`);
        }
        // Fallback to extracting from toolUsage if not pre-extracted
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
          if (extractedQueries.length > 0) {
            this.logger.debug(`Extracted ${extractedQueries.length} web search queries from toolUsage for ${result.llmModel}`);
          }
        }

        // Always add an entry if we have citations OR web search queries
        // This ensures we capture ALL web search queries for keyword counting
        if ((result.citations && result.citations.length > 0) || webSearchQueries.length > 0) {
          this.logger.debug(`Adding entry for ${result.llmModel}: ${result.citations?.length || 0} citations, ${webSearchQueries.length} queries`);
          
          
          allCitations.push({
            modelId: result.llmModel,
            modelProvider: result.llmProvider,
            promptIndex: index,
            promptType,
            citations: result.citations || [],
            webSearchQueries: webSearchQueries,
          });
        } else if (result.usedWebSearch) {
          // Model used web search but we couldn't find queries or citations
          this.logger.warn(`Model ${result.llmModel} used web search but has no citations or queries`);
        }
      });
    };


    // Collect from all pipelines
    collectCitations(input.spontaneous?.results, 'spontaneous');
    collectCitations(input.accord?.results, 'accuracy');
    collectCitations(input.sentiment?.results, 'sentiment');
    collectCitations(input.comparison?.results, 'comparison');

    this.logger.debug(`Total citations collected: ${allCitations.length}`);

    // Calculate summary statistics
    const totalPrompts = [
      input.spontaneous?.results?.length || 0,
      input.accord?.results?.length || 0,
      input.sentiment?.results?.length || 0,
      input.comparison?.results?.length || 0,
    ].reduce((sum, count) => sum + count, 0);

    const promptsWithWebAccess = allCitations.length;
    const webAccessPercentage = totalPrompts > 0 ? (promptsWithWebAccess / totalPrompts) * 100 : 0;

    // Aggregate source statistics
    const sourceMap = new Map<string, {
      totalMentions: number;
      citedByModels: Set<string>;
      associatedQueries: Set<string>;
    }>();

    let totalCitations = 0;

    allCitations.forEach(({ modelId, citations, webSearchQueries }) => {
      // First, add all web search queries to the associated queries for each domain
      const queriesForThisModel = webSearchQueries.map((q: any) =>
        typeof q === 'string' ? q : (q.query || q)
      );

      citations.forEach((citation: any) => {
        totalCitations++;
        const domain = this.extractDomain(citation.url || citation.source || '');

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

          // Add all web search queries that led to this citation
          queriesForThisModel.forEach((query: string) => {
            if (query) {
              stats.associatedQueries.add(query);
            }
          });

          // Also add any query directly on the citation (legacy support)
          if (citation.query) {
            stats.associatedQueries.add(citation.query);
          }
        }
      });
    });

    // Convert source statistics to array
    const sourceStatistics = Array.from(sourceMap.entries()).map(([domain, stats]) => ({
      domain,
      totalMentions: stats.totalMentions,
      citedByModels: Array.from(stats.citedByModels),
      associatedQueries: Array.from(stats.associatedQueries),
    }));

    // Get top sources
    const topSources = sourceStatistics
      .sort((a, b) => b.totalMentions - a.totalMentions)
      .slice(0, 10)
      .map(source => ({
        domain: source.domain,
        count: source.totalMentions,
        percentage: totalCitations > 0 ? (source.totalMentions / totalCitations) * 100 : 0,
      }));

    // Extract keywords ONLY from web search queries
    const keywordMap = new Map<string, number>();
    let totalQueriesProcessed = 0;
    let totalCitationsWithQueries = 0;
    let totalCitationsWithoutQueries = 0;

    // First, let's understand the data structure
    allCitations.forEach(({ webSearchQueries }) => {
      if (webSearchQueries && webSearchQueries.length > 0) {
        totalCitationsWithQueries++;
      } else {
        totalCitationsWithoutQueries++;
      }
    });

    this.logger.log(`Citations analysis: ${totalCitationsWithQueries} with queries, ${totalCitationsWithoutQueries} without queries`);

    allCitations.forEach(({ webSearchQueries, modelId, promptType }, citationIndex) => {
      // Extract keywords from web search queries
      webSearchQueries.forEach((queryObj: any) => {
        const query = typeof queryObj === 'string' ? queryObj : (queryObj.query || queryObj);
        if (query) {
          totalQueriesProcessed++;
          this.logger.debug(`Processing query from ${modelId} (${promptType}): "${query}"`);
          
          // Simple split by spaces and count occurrences (strict equality)
          const words = query.toLowerCase().split(' ').filter((word: string) => word.trim() !== '');
          this.logger.debug(`Words extracted: ${words.join(', ')}`);
          
          
          words.forEach((word: string) => {
              keywordMap.set(word, (keywordMap.get(word) || 0) + 1);
          });
        }
      });
    });

    this.logger.log(`Total queries processed for keywords: ${totalQueriesProcessed}`);
    this.logger.log(`Total unique keywords found: ${keywordMap.size}`);

    // Count total web search queries for percentage calculation
    const totalWebSearchQueries = allCitations.reduce(
      (sum, item) => sum + item.webSearchQueries.length,
      0
    );

    // Get top keywords
    const totalKeywordOccurrences = Array.from(keywordMap.values()).reduce((sum, count) => sum + count, 0);
    
    const topKeywords = Array.from(keywordMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword, count]) => ({
        keyword,
        count,
        // Percentage should be based on total queries, not total keyword occurrences
        percentage: totalWebSearchQueries > 0 ? (count / totalWebSearchQueries) * 100 : 0,
      }));

    // Format citations by model
    const citationsByModel = allCitations.map(item => ({
      modelId: item.modelId,
      modelProvider: item.modelProvider,
      promptIndex: item.promptIndex,
      promptType: item.promptType,
      usedWebSearch: item.citations.length > 0 || item.webSearchQueries.length > 0,
      webSearchQueries: item.webSearchQueries.map((query: any) => {
        // Handle different query formats
        if (typeof query === 'string') {
          return {
            query: query,
            timestamp: new Date().toISOString(),
          };
        } else if (query.query) {
          // Already in the correct format from batch execution service
          return {
            query: query.query,
            timestamp: query.timestamp || new Date().toISOString(),
          };
        } else {
          // Fallback
          return {
            query: String(query),
            timestamp: new Date().toISOString(),
          };
        }
      }),
      citations: item.citations.map((c: any) => ({
        source: c.source || this.extractDomain(c.url || ''),
        url: c.url || '',
        title: c.title || '',
        snippet: c.snippet || '',
        relevanceScore: c.relevanceScore || c.score,
      })),
    }));

    return {
      summary: {
        totalPrompts,
        promptsWithWebAccess,
        webAccessPercentage,
        totalCitations,
        uniqueSources: sourceMap.size,
      },
      citationsByModel,
      sourceStatistics,
      topSources,
      topKeywords,
    };
  }

  private extractDomain(url: string): string {
    try {
      if (!url) return '';
      // Handle URLs that might not have protocol
      const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`;
      const urlObj = new URL(urlWithProtocol);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url; // Return as-is if not a valid URL
    }
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are',
      'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'done',
      'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
      'this', 'that', 'these', 'those', 'with', 'from', 'for', 'about',
      'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'between', 'under', 'over', 'then', 'than', 'when', 'where', 'what',
      'who', 'whom', 'whose', 'which', 'why', 'how'
    ]);
    return stopWords.has(word);
  }
}
